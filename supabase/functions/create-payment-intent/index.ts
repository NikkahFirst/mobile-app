
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Stripe } from 'https://esm.sh/stripe@12.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Product IDs for different plans
const PRODUCTS = {
  'Monthly Plan': 'prod_S4KNAABpFaxtLX',
  'Annual Plan': 'prod_S4KNcjJ6aOaZde',
  'Unlimited Plan': 'prod_S4KNs7uG5AeDKw',
  'Limited Offer - Unlimited Plan': 'prod_RHiY62BhA54XXU' // Limited time offer product
};

// Price mapping to ensure correct amounts
const PRICE_MAPPING = {
  '£9.99': 999,
  '£74.99': 7499,
  '£99.99': 9999,
  '£49.99': 4999, // Limited time offer price
  '£3': 300,
  '£5': 500,
  '£10': 1000
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Parse request body
    const { planName, planPrice, userId, redirectMode = false } = await req.json()
    
    // Log the Stripe key presence (not the actual key)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log(`Stripe key exists: ${!!stripeKey}`);
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    // Initialize Stripe with the secret key
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })
    
    console.log(`Creating payment for plan: ${planName}, price: ${planPrice}, userId: ${userId}, redirectMode: ${redirectMode}`)
    
    // Get amount from the mapping or extract it from the price string
    let amount = PRICE_MAPPING[planPrice];
    if (!amount) {
      // Fallback to extracting from string if not in mapping
      const priceString = planPrice.replace(/[^0-9.]/g, '')
      amount = Math.round(parseFloat(priceString) * 100)
    }
    
    console.log(`Using amount: ${amount} (in smallest currency unit)`)
    
    // Check if this is a subscription plan or one-time payment
    const isSubscription = planName === 'Monthly Plan' || planName === 'Annual Plan';
    
    // First, find or create a customer for the user
    let customerId;
    if (userId) {
      // Search for existing customer with metadata matching userId
      const customerList = await stripe.customers.list({
        limit: 100
      });
      
      // Find customer with matching description
      const customer = customerList.data.find(c => 
        c.description && c.description.includes(`Supabase user: ${userId}`)
      );
      
      if (customer) {
        customerId = customer.id;
        console.log(`Found existing customer: ${customerId}`);
      } else {
        // Create a new customer
        const newCustomer = await stripe.customers.create({
          description: `Supabase user: ${userId}`
        });
        customerId = newCustomer.id;
        console.log(`Created new customer: ${customerId}`);
      }
    } else if (isSubscription) {
      throw new Error('User ID is required for subscriptions');
    }
    
    if (isSubscription) {
      // For subscriptions, prepare required resources
      console.log(`Creating payment for subscription plan: ${planName}`);
      
      // If redirectMode is true, create a checkout session instead of a payment intent
      if (redirectMode) {
        console.log(`Creating checkout session for subscription in redirect mode`);
        
        // Create the subscription price if it doesn't exist
        const interval = planName === 'Monthly Plan' ? 'month' : 'year';
        
        // Get or create price for the subscription
        const priceList = await stripe.prices.list({
          product: PRODUCTS[planName],
          active: true,
          type: 'recurring',
        });
        
        let priceId;
        if (priceList.data.length > 0) {
          // Use existing price
          priceId = priceList.data[0].id;
          console.log(`Using existing price: ${priceId}`);
        } else {
          // Create a new price
          const price = await stripe.prices.create({
            product: PRODUCTS[planName],
            unit_amount: amount,
            currency: 'gbp',
            recurring: { interval },
          });
          priceId = price.id;
          console.log(`Created new price: ${priceId}`);
        }
        
        // Create a checkout session
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${req.headers.get('origin')}/dashboard?success=true`,
          cancel_url: `${req.headers.get('origin')}/shop`,
        });
        
        return new Response(
          JSON.stringify({ 
            url: session.url
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // For direct payment flow (in the PaymentDialog component)
        console.log(`Creating direct payment for subscription: ${planName}`);
        
        // Get or create the price for the subscription
        const interval = planName === 'Monthly Plan' ? 'month' : 'year';
        
        // First, check if there's an existing active subscription for this customer
        if (customerId) {
          const existingSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
          });
          
          if (existingSubscriptions.data.length > 0) {
            console.log(`Customer already has an active subscription: ${existingSubscriptions.data[0].id}`);
            // We could handle this differently, but for now we'll continue with creating a new payment
          }
        }
        
        // Get or create the price for the subscription
        const priceList = await stripe.prices.list({
          product: PRODUCTS[planName],
          active: true,
          type: 'recurring',
        });
        
        let priceId;
        if (priceList.data.length > 0) {
          // Use existing price
          priceId = priceList.data[0].id;
          console.log(`Using existing price: ${priceId}`);
        } else {
          // Create a new price
          const price = await stripe.prices.create({
            product: PRODUCTS[planName],
            unit_amount: amount,
            currency: 'gbp',
            recurring: { interval },
          });
          priceId = price.id;
          console.log(`Created new price: ${priceId}`);
        }
        
        // For subscriptions, we return the customer ID and price ID
        // so the frontend can use them to create a subscription
        return new Response(
          JSON.stringify({ 
            customerId,
            priceId,
            isSubscription: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // One-time payment (Unlimited Plan or Limited Offer)
      
      if (redirectMode) {
        // Create a Checkout Session for redirect mode
        console.log(`Creating checkout session for one-time payment in redirect mode`);
        
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'gbp',
                product_data: {
                  name: `NikkahFirst - ${planName}`,
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${req.headers.get('origin')}/dashboard?success=true`,
          cancel_url: `${req.headers.get('origin')}/shop`,
        });
        
        return new Response(
          JSON.stringify({ url: session.url }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Create a PaymentIntent for client-side confirmation
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'gbp',
          customer: customerId,
          automatic_payment_methods: {
            enabled: true,
          },
          description: `NikkahFirst - ${planName} for user ${userId}`,
        });
        
        console.log(`Payment intent created: ${paymentIntent.id} with amount: ${amount}`);
        
        // Return the client secret
        return new Response(
          JSON.stringify({ 
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            isSubscription: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
