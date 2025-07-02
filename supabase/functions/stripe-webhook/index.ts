
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@12.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeWebhookSecret) {
      throw new Error("Missing Stripe webhook secret");
    }
    
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("Missing Stripe secret key");
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Webhook signature missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error.message);
      return new Response(
        JSON.stringify({ error: "Webhook signature verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Event received: ${event.type}`);
    
    let userId;
    let customerId;
    let subscriptionId;
    let planName;
    
    const calculateRequestsAmount = (plan) => {
      if (plan === 'Monthly Plan') return 10;
      if (plan === 'Annual Plan') return 15;
      if (plan === 'Unlimited Plan' || plan === 'Limited Offer - Unlimited Plan') return 999999;
      return 0;
    };

    const extractUserIdFromDescription = (description) => {
      if (!description) return null;
      
      const match = description.match(/Supabase user: ([0-9a-f-]+)/i);
      return match ? match[1] : null;
    };

    const extractUserIdFromMetadata = (metadata) => {
      if (!metadata || !metadata.user_id) return null;
      return metadata.user_id;
    };
    
    // Current timestamp for tracking allocations
    const currentTimestamp = new Date().toISOString();

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        
        if (session.mode === "subscription") {
          userId = session.client_reference_id;
          customerId = session.customer;
          subscriptionId = session.subscription;
          planName = session.metadata?.planName;
          
          if (!userId && customerId) {
            const customer = await stripe.customers.retrieve(customerId);
            userId = extractUserIdFromDescription(customer.description);
          }
          
          if (!userId || !customerId || !subscriptionId) {
            console.error("Missing required data from session:", { 
              userId, customerId, subscriptionId 
            });
            break;
          }
          
          console.log(`[WEBHOOK] Subscription created for userId: ${userId}, plan: ${planName}`);
          
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
          
          if (!planName) {
            const productId = subscription.items.data[0].price.product;
            const product = await stripe.products.retrieve(productId);
            planName = product.name;
          }
          
          const requestsToAdd = calculateRequestsAmount(planName);
          
          // First, check if the profile already has subscription details
          const { data: profileData } = await supabase
            .from("profiles")
            .select("requests_remaining, subscription_status, subscription_plan")
            .eq("id", userId)
            .single();
          
          // Only update requests if:
          // 1. This is a first-time subscription
          // 2. It's a plan upgrade/change
          // 3. Requests are currently null/zero
          const shouldUpdateRequests = 
            !profileData?.subscription_status || 
            profileData.subscription_status !== "active" ||
            profileData.subscription_plan !== planName ||
            !profileData.requests_remaining || 
            profileData.requests_remaining === 0;
            
          console.log(`[WEBHOOK] Current profile status: ${profileData?.subscription_status}, plan: ${profileData?.subscription_plan}, requests: ${profileData?.requests_remaining}`);
          console.log(`[WEBHOOK] Should update requests: ${shouldUpdateRequests}, requests to add: ${requestsToAdd}`);
            
          // Build update object based on whether we should update requests
          const updateObject = {
            subscription_id: subscriptionId,
            subscription_status: "active",
            subscription_plan: planName,
            stripe_customer_id: customerId,
            renewal_date: renewalDate,
            is_canceled: false
          };
          
          if (shouldUpdateRequests) {
            updateObject.requests_remaining = requestsToAdd;
            updateObject.last_allocation_timestamp = currentTimestamp;
            console.log(`[WEBHOOK] Setting requests to ${requestsToAdd} for user ${userId}`);
          } else {
            console.log(`[WEBHOOK] Keeping existing requests (${profileData?.requests_remaining}) for user ${userId}`);
          }
          
          const { data, error: updateError } = await supabase
            .from("profiles")
            .update(updateObject)
            .eq("id", userId)
            .select();
          
          if (updateError) {
            console.error("Error updating profile:", updateError);
          } else {
            console.log("Profile updated successfully:", data);
          }
          
          const amount = subscription.items.data[0].price.unit_amount || 0;
          const { error: paymentError } = await supabase.from("payment_history").insert({
            user_id: userId,
            amount: amount / 100,
            currency: subscription.currency,
            description: `Subscription payment - ${planName}`,
            payment_status: "completed",
            stripe_payment_id: subscriptionId,
            payment_method: "card",
          });
          
          if (paymentError) {
            console.error("Error recording payment:", paymentError);
          }
          
          try {
            const { data: referralData } = await supabase
              .from('profiles')
              .select('referred_by')
              .eq('id', userId)
              .single();
              
            if (referralData?.referred_by) {
              console.log("[STRIPE WEBHOOK] User was referred by:", referralData.referred_by);
              
              const { data: affiliateData, error: affiliateError } = await supabase
                .from('affiliates')
                .select('id, affiliate_code')
                .eq('affiliate_code', referralData.referred_by)
                .single();
                
              if (!affiliateError && affiliateData) {
                console.log("[STRIPE WEBHOOK] Processing commission for affiliate:", affiliateData.id);
                
                const { data: commissionResult, error: commissionError } = await supabase.functions.invoke('process-affiliate-signup', {
                  body: {
                    userId: userId,
                    referralCode: referralData.referred_by,
                    subscriptionPlan: planName
                  }
                });
                
                if (commissionError) {
                  console.error("[STRIPE WEBHOOK] Error processing affiliate commission:", commissionError);
                } else {
                  console.log("[STRIPE WEBHOOK] Affiliate commission processed successfully:", commissionResult);
                }
              } else {
                console.log("[STRIPE WEBHOOK] Referred by user ID, not an affiliate code");
              }
            } else {
              console.log("[STRIPE WEBHOOK] User was not referred by anyone");
            }
          } catch (referralError) {
            console.error("[STRIPE WEBHOOK] Error checking referral status:", referralError);
          }
        }
        break;
      
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        
        userId = extractUserIdFromMetadata(paymentIntent.metadata);
        
        if (!userId) {
          const description = paymentIntent.description || '';
          userId = extractUserIdFromDescription(description);
        }
        
        planName = paymentIntent.metadata?.plan_name;
        
        if (!planName && paymentIntent.description) {
          if (paymentIntent.description.includes("Monthly Plan")) {
            planName = "Monthly Plan";
          } else if (paymentIntent.description.includes("Annual Plan")) {
            planName = "Annual Plan";
          } else if (paymentIntent.description.includes("Unlimited Plan")) {
            planName = "Unlimited Plan";
          } else if (paymentIntent.description.includes("Limited Offer")) {
            planName = "Limited Offer - Unlimited Plan";
          }
        }
        
        customerId = paymentIntent.customer;
        
        if (planName === "Monthly Plan" || planName === "Annual Plan") {
          if (paymentIntent.metadata?.price_id && customerId) {
            const priceId = paymentIntent.metadata.price_id;
            
            const existingSubscriptions = await stripe.subscriptions.list({
              customer: customerId,
              status: 'active',
              limit: 1
            });
            
            if (existingSubscriptions.data.length === 0) {
              try {
                console.log(`Creating subscription from payment intent: ${paymentIntent.id}`);
                
                const subscription = await stripe.subscriptions.create({
                  customer: customerId,
                  items: [{ price: priceId }],
                  description: `NikkahFirst - ${planName} subscription for user ${userId}`,
                  metadata: {
                    user_id: userId,
                    plan_name: planName
                  }
                });
                
                subscriptionId = subscription.id;
                console.log(`Created subscription: ${subscriptionId}`);
              } catch (subErr) {
                console.error("Error creating subscription from payment intent:", subErr);
              }
            } else {
              subscriptionId = existingSubscriptions.data[0].id;
              console.log(`Found existing subscription: ${subscriptionId}`);
            }
          }
        }
        
        if (!userId) {
          console.error("Missing required user ID from payment intent");
          break;
        }
        
        console.log(`[WEBHOOK] Payment succeeded for userId: ${userId}, plan: ${planName}`);
        
        const requestsAmount = calculateRequestsAmount(planName);
        let subscriptionStatus = "active";
        let renewalDate = null;
        
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
          } catch (err) {
            console.error("Error retrieving subscription:", err);
          }
        }
        
        // First, check if the profile already has an active subscription
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("requests_remaining, subscription_status, subscription_plan")
          .eq("id", userId)
          .single();
         
        // Determine if we should update requests
        const shouldSetRequests = 
          !existingProfile?.subscription_status || 
          existingProfile.subscription_status !== "active" || 
          existingProfile.subscription_plan !== planName ||
          !existingProfile.requests_remaining ||
          existingProfile.requests_remaining === 0;
          
        console.log(`[WEBHOOK] Current profile status: ${existingProfile?.subscription_status}, plan: ${existingProfile?.subscription_plan}, requests: ${existingProfile?.requests_remaining}`);
        console.log(`[WEBHOOK] Should update requests: ${shouldSetRequests}, requests amount: ${requestsAmount}`);
          
        // Build update object based on whether we should update requests
        const updateObj = {
          subscription_id: subscriptionId,
          subscription_status: subscriptionStatus,
          subscription_plan: planName,
          stripe_customer_id: customerId,
          renewal_date: renewalDate,
          is_canceled: false
        };
        
        if (shouldSetRequests) {
          updateObj.requests_remaining = requestsAmount;
          updateObj.last_allocation_timestamp = currentTimestamp;
          console.log(`[WEBHOOK] Setting requests to ${requestsAmount} for user ${userId}`);
        } else {
          console.log(`[WEBHOOK] Keeping existing requests (${existingProfile?.requests_remaining}) for user ${userId}`);
        }
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updateObj)
          .eq("id", userId);
        
        if (updateError) {
          console.error("Error updating profile:", updateError);
        }
        
        const { error: paymentRecordError } = await supabase.from("payment_history").insert({
          user_id: userId,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
          description: `Payment for ${planName}${subscriptionId ? ' subscription' : ''}`,
          payment_status: "completed",
          stripe_payment_id: paymentIntent.id,
          payment_method: "card",
        });
        
        if (paymentRecordError) {
          console.error("Error recording payment:", paymentRecordError);
        }
        
        try {
          const { data: referralData } = await supabase
            .from('profiles')
            .select('referred_by')
            .eq('id', userId)
            .single();
            
          if (referralData?.referred_by) {
            console.log("[STRIPE WEBHOOK] Payment succeeded - user was referred by:", referralData.referred_by);
            
            const { data: affiliateData, error: affiliateError } = await supabase
              .from('affiliates')
              .select('id, affiliate_code')
              .eq('affiliate_code', referralData.referred_by)
              .single();
              
            if (!affiliateError && affiliateData) {
              console.log("[STRIPE WEBHOOK] Processing commission for affiliate:", affiliateData.id);
              
              const { data: commissionResult, error: commissionError } = await supabase.functions.invoke('process-affiliate-signup', {
                body: {
                  userId: userId,
                  referralCode: referralData.referred_by,
                  subscriptionPlan: planName
                }
              });
              
              if (commissionError) {
                console.error("[STRIPE WEBHOOK] Error processing affiliate commission:", commissionError);
              } else {
                console.log("[STRIPE WEBHOOK] Affiliate commission processed successfully:", commissionResult);
              }
            }
          }
        } catch (referralError) {
          console.error("[STRIPE WEBHOOK] Error checking referral status for payment intent:", referralError);
        }
        break;
      
      case "invoice.payment_succeeded":
        const invoice = event.data.object;
        subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          customerId = subscription.customer;
          
          const customer = await stripe.customers.retrieve(customerId);
          userId = extractUserIdFromDescription(customer.description);
          
          if (!userId) {
            console.error("Could not find userId for customer:", customerId);
            break;
          }
          
          const productId = subscription.items.data[0].price.product;
          const product = await stripe.products.retrieve(productId);
          planName = product.name;
          
          console.log(`[WEBHOOK] Subscription renewed for userId: ${userId}, plan: ${planName}`);
          
          const nextRenewalDate = new Date(subscription.current_period_end * 1000).toISOString();
          
          const requestsToAddOnRenewal = calculateRequestsAmount(planName);
          
          const { error: renewalUpdateError } = await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
              renewal_date: nextRenewalDate,
              requests_remaining: requestsToAddOnRenewal, // Directly set requests on renewal
              last_allocation_timestamp: currentTimestamp,
              is_canceled: false
            })
            .eq("id", userId);
          
          if (renewalUpdateError) {
            console.error("Error updating profile on renewal:", renewalUpdateError);
          }
          
          const { error: paymentError } = await supabase.from("payment_history").insert({
            user_id: userId,
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            description: `Subscription renewal - ${planName}`,
            payment_status: "completed",
            stripe_payment_id: invoice.id,
            payment_method: "card",
          });
          
          if (paymentError) {
            console.error("Error recording payment:", paymentError);
          }
        }
        break;
      
      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object;
        subscriptionId = deletedSubscription.id;
        customerId = deletedSubscription.customer;
        
        const deletedCustomer = await stripe.customers.retrieve(customerId);
        userId = extractUserIdFromDescription(deletedCustomer.description);
        
        if (!userId) {
          console.error("Could not find userId for customer:", customerId);
          break;
        }
        
        console.log(`Subscription canceled for userId: ${userId}`);
        
        const { error: deleteUpdateError } = await supabase
          .from("profiles")
          .update({
            subscription_status: "inactive",
            subscription_id: null,
            is_canceled: false
          })
          .eq("id", userId)
          .eq("subscription_id", subscriptionId);
        
        if (deleteUpdateError) {
          console.error("Error updating profile on subscription deletion:", deleteUpdateError);
        }
        break;
      
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }
    
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
