
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { Stripe } from 'https://esm.sh/stripe@12.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  
  try {
    const { paymentIntentId, setupIntentId, subscriptionId, userId, planName, planPrice } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[CHECK-PAYMENT] Processing payment check for user ${userId}, plan ${planName}`);
    
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    let paymentSucceeded = false;
    let activeSubscription = false;
    let customerId = null;
    let priceId = null;
    let subscriptionObject = null;
    let existingSubscriptionId = null;
    
    if (paymentIntentId) {
      console.log(`[CHECK-PAYMENT] Checking payment status for intent: ${paymentIntentId}`);
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      console.log(`[CHECK-PAYMENT] Payment intent status: ${paymentIntent.status}`);
      
      paymentSucceeded = paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing';
      customerId = paymentIntent.customer?.toString();
      
      const isSubPayment = paymentIntent.metadata?.is_subscription === 'true';
      
      if (isSubPayment) {
        console.log("[CHECK-PAYMENT] This payment is for a subscription");
        priceId = paymentIntent.metadata?.price_id;
        
        if (customerId) {
          const existingSubscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
          });
          
          if (existingSubscriptions.data.length > 0) {
            existingSubscriptionId = existingSubscriptions.data[0].id;
            subscriptionObject = existingSubscriptions.data[0];
            activeSubscription = true;
            console.log(`[CHECK-PAYMENT] Found existing active subscription: ${existingSubscriptionId}`);
          } else if (paymentSucceeded && priceId) {
            try {
              const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                description: `NikkahFirst - ${planName || 'Subscription'} for user ${userId}`,
                metadata: {
                  user_id: userId,
                  plan_name: planName || 'Subscription'
                }
              });
              
              console.log(`[CHECK-PAYMENT] Created new subscription: ${subscription.id}`);
              existingSubscriptionId = subscription.id;
              subscriptionObject = subscription;
              activeSubscription = true;
            } catch (subErr) {
              console.error("[CHECK-PAYMENT] Error creating subscription:", subErr);
              throw new Error(`Payment succeeded but subscription creation failed: ${subErr.message}`);
            }
          }
        }
      } else if (planName === 'Monthly Plan' || planName === 'Annual Plan') {
        if (paymentSucceeded && customerId) {
          const interval = planName === 'Monthly Plan' ? 'month' : 'year';
          
          const priceList = await stripe.prices.list({
            product: planName === 'Monthly Plan' ? 'prod_S4KNAABpFaxtLX' : 'prod_S4KNcjJ6aOaZde',
            active: true,
            type: 'recurring',
          });
          
          if (priceList.data.length > 0) {
            priceId = priceList.data[0].id;
            
            const existingSubscriptions = await stripe.subscriptions.list({
              customer: customerId,
              status: 'active',
              limit: 1
            });
            
            if (existingSubscriptions.data.length > 0) {
              existingSubscriptionId = existingSubscriptions.data[0].id;
              subscriptionObject = existingSubscriptions.data[0];
              activeSubscription = true;
              console.log(`[CHECK-PAYMENT] Found existing active subscription: ${existingSubscriptionId}`);
            } else {
              try {
                const subscription = await stripe.subscriptions.create({
                  customer: customerId,
                  items: [{ price: priceId }],
                  description: `NikkahFirst - ${planName} subscription for user ${userId}`,
                  metadata: {
                    user_id: userId,
                    plan_name: planName
                  }
                });
                
                console.log(`[CHECK-PAYMENT] Created new subscription: ${subscription.id}`);
                existingSubscriptionId = subscription.id;
                subscriptionObject = subscription;
                activeSubscription = true;
              } catch (subErr) {
                console.error("[CHECK-PAYMENT] Error creating subscription:", subErr);
                throw new Error(`Payment succeeded but subscription creation failed: ${subErr.message}`);
              }
            }
          }
        }
      }
    } else if (setupIntentId) {
      console.log(`[CHECK-PAYMENT] Checking setup intent status: ${setupIntentId}`);
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      console.log(`[CHECK-PAYMENT] Setup intent status: ${setupIntent.status}`);
      
      paymentSucceeded = setupIntent.status === 'succeeded';
      
      if (paymentSucceeded && subscriptionId) {
        console.log(`[CHECK-PAYMENT] Checking subscription: ${subscriptionId}`);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        activeSubscription = subscription.status === 'active' || subscription.status === 'trialing';
        subscriptionObject = subscription;
        existingSubscriptionId = subscriptionId;
        console.log(`[CHECK-PAYMENT] Subscription status: ${subscription.status}, active: ${activeSubscription}`);
      }
    } else if (subscriptionId) {
      console.log(`[CHECK-PAYMENT] Checking subscription: ${subscriptionId}`);
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      activeSubscription = subscription.status === 'active' || subscription.status === 'trialing';
      paymentSucceeded = activeSubscription;
      subscriptionObject = subscription;
      existingSubscriptionId = subscriptionId;
      console.log(`[CHECK-PAYMENT] Subscription status: ${subscription.status}, active: ${activeSubscription}`);
    } else {
      return new Response(
        JSON.stringify({ error: 'Either paymentIntentId, setupIntentId, or subscriptionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!paymentSucceeded) {
      return new Response(
        JSON.stringify({ success: false, message: 'Payment has not succeeded yet', status: 'failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (paymentIntentId && !setupIntentId && !subscriptionId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status === 'processing') {
        console.log("[CHECK-PAYMENT] Payment is still processing. Webhook will handle completion later.");
        return new Response(
          JSON.stringify({ success: true, message: 'Payment is processing', status: 'processing' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_plan, subscription_id, referred_by, has_received_initial_allocation, requests_remaining')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error(`[CHECK-PAYMENT] Error fetching profile data: ${profileError.message}`);
      throw new Error(`Error fetching profile data: ${profileError.message}`);
    }
    
    console.log(`[CHECK-PAYMENT] Current profile data for user ${userId}: `, profileData);
    
    if (profileData?.subscription_status === 'active' && 
        profileData?.subscription_plan === planName && 
        (profileData?.subscription_id === existingSubscriptionId || profileData?.subscription_id === subscriptionId)) {
        
      console.log(`[CHECK-PAYMENT] Payment already processed for user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Payment already processed', alreadyProcessed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[CHECK-PAYMENT] Payment verified, calling update-payment-status to handle profile updates`);
    
    // Note: We're still passing requestsAmount as it's used for Unlimited plan or one-time purchases
    let requestsAmount = null;
    if (planName === 'Unlimited Plan' || planName === 'Limited Offer - Unlimited Plan') {
      requestsAmount = 999999;
    }
    
    try {
      const updateResponse = await fetch(
        `${supabaseUrl}/functions/v1/update-payment-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            paymentIntentId,
            subscriptionId: existingSubscriptionId || subscriptionId,
            userId,
            planName,
            requestsAmount,
            planPrice: planPrice || (subscriptionObject?.items?.data?.[0]?.price?.unit_amount ? 
              `£${(subscriptionObject.items.data[0].price.unit_amount / 100).toFixed(2)}` : null)
          })
        }
      );
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`[CHECK-PAYMENT] update-payment-status returned error status ${updateResponse.status}: ${errorText}`);
        throw new Error(`Error updating payment status: HTTP ${updateResponse.status} - ${errorText}`);
      }
      
      const updateResult = await updateResponse.json();
      
      console.log(`[CHECK-PAYMENT] update-payment-status response:`, updateResult);
      
      if (!updateResult.success) {
        throw new Error(`Error updating payment status: ${updateResult.error || 'Unknown error'}`);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: activeSubscription ? 'Subscription confirmed and processed' : 'Payment confirmed and processed',
          isSubscription: activeSubscription,
          subscriptionId: existingSubscriptionId || subscriptionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      console.error(`[CHECK-PAYMENT] Error calling update-payment-status:`, error);
      throw new Error(`Error processing payment update: ${error.message}`);
    }
  } catch (error) {
    console.error('[CHECK-PAYMENT] Error checking payment status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
