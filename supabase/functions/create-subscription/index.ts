
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Stripe } from 'https://esm.sh/stripe@12.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    // Parse request body
    const requestData = await req.json();
    console.log("Received request data:", JSON.stringify(requestData));
    
    const { customerId, priceId, userId, planName } = requestData;
    
    if (!customerId || !priceId) {
      console.error("Missing required parameters:", { customerId, priceId });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: customerId and priceId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!userId) {
      console.error("Missing userId parameter");
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Log the Stripe key presence (not the actual key)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log(`Stripe key exists: ${!!stripeKey}`);
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY environment variable is not set");
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    // Initialize Stripe with the secret key
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })
    
    console.log(`Creating subscription for customer: ${customerId}, price: ${priceId}, userId: ${userId}, planName: ${planName || 'not specified'}`);
    
    // Determine the number of requests based on the plan name - log but let webhook handle setting
    let requestsPerPeriod = 10; // Default for Monthly Plan
    if (planName === 'Annual Plan') {
      requestsPerPeriod = 15;
    } else if (planName === 'Unlimited Plan' || planName === 'Limited Offer - Unlimited Plan') {
      requestsPerPeriod = 999999;
    }
    console.log(`Plan ${planName} corresponds to ${requestsPerPeriod} requests, webhook will handle setting this`);
    
    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',  // Ensure the first payment completes
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      description: `NikkahFirst - ${planName || 'Subscription'} for user ${userId}`,
      metadata: {
        userId: userId,
        planName: planName || 'Subscription',
        requestsPerPeriod: requestsPerPeriod.toString()
      }
    });
    
    console.log(`Created subscription: ${subscription.id}, status: ${subscription.status}`);
    
    // Check if subscription has a latest_invoice with payment_intent
    let clientSecret = null;
    let paymentIntentId = null;
    if (subscription.latest_invoice && 
        typeof subscription.latest_invoice !== 'string' && 
        subscription.latest_invoice.payment_intent && 
        typeof subscription.latest_invoice.payment_intent !== 'string') {
      clientSecret = subscription.latest_invoice.payment_intent.client_secret;
      paymentIntentId = subscription.latest_invoice.payment_intent.id;
      console.log(`Subscription payment intent ID: ${paymentIntentId}, Status: ${subscription.latest_invoice.payment_intent.status}`);
    }
    
    return new Response(
      JSON.stringify({ 
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret,
        paymentIntentId,
        requestsPerPeriod
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating subscription:', error.message);
    console.error('Error details:', error);
    
    // Return a more descriptive error response
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: typeof error === 'object' ? JSON.stringify(error) : 'Unknown error',
        type: error.type || 'unknown'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
});
