
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
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
    const { 
      paymentIntentId, 
      subscriptionId, 
      userId, 
      planName, 
      requestsAmount, 
      planPrice
    } = await req.json()
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[UPDATE-PAYMENT] Starting payment update for user ${userId}, plan ${planName}`);
    
    // Log the Stripe key presence (not the actual key)
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    console.log(`Stripe key exists: ${!!stripeKey}`);
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    
    // Initialize Stripe and Supabase
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Check if we're handling a one-time payment or a subscription
    let isSubscription = false;
    let paymentSucceeded = false;
    let customerInfo = null;
    
    if (paymentIntentId) {
      // One-time payment flow
      console.log(`[UPDATE-PAYMENT] Verifying payment status for intent: ${paymentIntentId}`);
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      paymentSucceeded = paymentIntent.status === 'succeeded';
      
      if (paymentIntent.customer) {
        customerInfo = await stripe.customers.retrieve(paymentIntent.customer.toString());
      }
    } else if (subscriptionId) {
      // Subscription flow
      console.log(`[UPDATE-PAYMENT] Verifying subscription: ${subscriptionId}`);
      isSubscription = true;
      
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        paymentSucceeded = subscription.status === 'active' || subscription.status === 'trialing';
        
        if (subscription.customer) {
          customerInfo = await stripe.customers.retrieve(subscription.customer.toString());
        }
      } catch (error) {
        console.error(`[UPDATE-PAYMENT] Error retrieving subscription: ${error.message}`);
        
        // Try with expanded path to get invoice and payment info
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['latest_invoice.payment_intent', 'customer']
          });
          
          if (subscription.status === 'incomplete' && 
              subscription.latest_invoice && 
              typeof subscription.latest_invoice !== 'string' && 
              subscription.latest_invoice.payment_intent) {
            
            const paymentIntent = typeof subscription.latest_invoice.payment_intent === 'string' 
              ? await stripe.paymentIntents.retrieve(subscription.latest_invoice.payment_intent)
              : subscription.latest_invoice.payment_intent;
              
            paymentSucceeded = paymentIntent.status === 'succeeded';
            
            // Complete the subscription if payment succeeded but subscription is still incomplete
            if (paymentSucceeded && subscription.status === 'incomplete') {
              await stripe.subscriptions.update(subscriptionId, {status: 'active'});
            }
          }
          
          if (subscription.customer) {
            customerInfo = typeof subscription.customer === 'string'
              ? await stripe.customers.retrieve(subscription.customer)
              : subscription.customer;
          }
        } catch (subError) {
          console.error(`[UPDATE-PAYMENT] Second attempt to retrieve subscription failed: ${subError.message}`);
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Either paymentIntentId or subscriptionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!paymentSucceeded) {
      return new Response(
        JSON.stringify({ success: false, message: 'Payment has not succeeded yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[UPDATE-PAYMENT] Payment succeeded, updating user profile for user: ${userId}`);
    
    // Create or retrieve Stripe customer
    let customerId = '';
    
    // Get existing Stripe customer ID if it exists and user profile data
    const { data: profileData, error: profileFetchError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, first_name, last_name, email, subscription_status, subscription_plan, has_received_initial_allocation, requests_remaining')
      .eq('id', userId)
      .single();
      
    if (profileFetchError) {
      console.error(`[UPDATE-PAYMENT] Error fetching profile: ${profileFetchError.message}`);
    }
    
    console.log(`[UPDATE-PAYMENT] Current profile data: `, profileData);
    
    // Check if profile already has the active subscription - avoid duplicate processing
    if (profileData?.subscription_status === 'active' && 
        profileData.subscription_plan === planName &&
        ((isSubscription && profileData.subscription_id === subscriptionId) || 
         (!isSubscription && planName === 'Unlimited Plan' || planName === 'Limited Offer - Unlimited Plan'))) {
      
      console.log(`[UPDATE-PAYMENT] Payment already processed for user ${userId}, plan ${planName}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment already processed', 
          alreadyProcessed: true,
          isSubscription,
          subscriptionId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
      
    if (profileData?.stripe_customer_id) {
      customerId = profileData.stripe_customer_id;
      
      // Update the customer information to ensure it's up to date
      if (profileData.first_name && profileData.last_name) {
        await stripe.customers.update(customerId, {
          name: `${profileData.first_name} ${profileData.last_name}`.trim(),
          email: profileData.email || undefined,
          description: `Supabase user: ${userId}` // Add description for future reference
        });
        console.log(`[UPDATE-PAYMENT] Updated existing customer: ${customerId} with name: ${profileData.first_name} ${profileData.last_name}`);
      }
    } else if (customerInfo) {
      customerId = customerInfo.id;
      
      // If we got customer from Stripe but it's not linked, update local DB
      await stripe.customers.update(customerId, {
        description: `Supabase user: ${userId}` // Use description instead of metadata
      });
      
      if (profileData && (profileData.first_name || profileData.last_name)) {
        await stripe.customers.update(customerId, {
          name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
          email: profileData.email || undefined,
        });
      }
      
      console.log(`[UPDATE-PAYMENT] Linked existing Stripe customer: ${customerId} to user: ${userId}`);
    } else {
      // Create new Stripe customer with user's name
      const customerName = profileData ? 
        `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() : 
        'NikkahFirst User';
        
      const customerEmail = profileData?.email;
      
      console.log(`[UPDATE-PAYMENT] Creating new customer with name: ${customerName}, email: ${customerEmail || 'not provided'}`);
      
      const customer = await stripe.customers.create({
        name: customerName,
        email: customerEmail,
        description: `Supabase user: ${userId}` // Use description instead of metadata
      });
      
      customerId = customer.id;
      console.log(`[UPDATE-PAYMENT] Created new customer with ID: ${customerId}`);
    }
    
    // Calculate next payment date based on whether this is a subscription or one-time payment
    let nextPaymentDate;
    if (isSubscription) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      nextPaymentDate = currentPeriodEnd.toISOString();
      console.log(`[UPDATE-PAYMENT] Next payment date set to: ${nextPaymentDate} based on subscription`);
    } else {
      // For one-time payments, there's no next payment (for unlimited) or it's 30 days from now
      if (planName === 'Unlimited Plan' || planName === 'Limited Offer - Unlimited Plan') {
        nextPaymentDate = null;
      } else {
        nextPaymentDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      console.log(`[UPDATE-PAYMENT] Next payment date set to: ${nextPaymentDate} for one-time payment`);
    }
    
    // For Unlimited plans, we still need to provide unlimited requests
    let requestsToAdd = 0;
    if (planName === 'Unlimited Plan' || planName === 'Limited Offer - Unlimited Plan') {
      requestsToAdd = 999999; // Unlimited plans get unlimited requests
      console.log(`[UPDATE-PAYMENT] Setting unlimited requests (${requestsToAdd}) for unlimited plan`);
    }
    
    // Extract amount from price string or use the plan's price if not available
    let amount;
    try {
      // Use predefined price mapping
      const priceMapping: Record<string, number> = {
        '£9.99': 999,
        '£74.99': 7499,
        '£99.99': 9999,
        '£49.99': 4999, // Limited time offer price
        '£3': 300,
        '£5': 500,
        '£10': 1000
      };
      
      amount = priceMapping[planPrice];
      
      if (!amount) {
        // Remove currency symbol and convert to pennies/cents for storage
        const priceNumber = parseFloat(planPrice.replace(/[^0-9.]/g, ''));
        amount = Math.round(priceNumber * 100); // Convert to pennies/cents
      }
      
      console.log(`[UPDATE-PAYMENT] Amount to be recorded: ${amount} (in pennies/cents)`);
    } catch (e) {
      // Fallback values if price string parsing fails
      if (planName === 'Monthly Plan') amount = 999;
      else if (planName === 'Annual Plan') amount = 7499; 
      else if (planName === 'Unlimited Plan') amount = 9999;
      else if (planName === 'Limited Offer - Unlimited Plan') amount = 4999;
      else amount = 0;
      console.log(`[UPDATE-PAYMENT] Using fallback amount: ${amount} for plan: ${planName}`);
    }
    
    try {
      // Call the begin_transaction function
      try {
        const { error: beginError } = await supabase.rpc('begin_transaction');
        if (beginError) {
          console.error(`[UPDATE-PAYMENT] Error starting transaction: ${beginError.message}`);
          throw new Error(`Error starting transaction: ${beginError.message}`);
        }
        console.log("[UPDATE-PAYMENT] Transaction started successfully");
      } catch (txStartError) {
        console.error(`[UPDATE-PAYMENT] Transaction start failed: ${txStartError.message}`);
        // Continue even if transaction fails to start
      }
      
      try {
        // Build the update object
        const updateObject: Record<string, any> = { 
          subscription_plan: planName,
          subscription_status: 'active',
          next_payment_date: nextPaymentDate,
          stripe_customer_id: customerId,
          subscription_id: isSubscription ? subscriptionId : null,
          renewal_date: nextPaymentDate,
          is_canceled: false,
          has_received_initial_allocation: true // Mark as having received initial allocation so monthly renewal works correctly
        };
        
        // Special case for unlimited plans where we still need to set the requests
        if (planName === 'Unlimited Plan' || planName === 'Limited Offer - Unlimited Plan') {
          updateObject.requests_remaining = 999999;
          
          // Record this as an allocation for tracking purposes
          try {
            // Check if allocation_history table exists and create it if not
            const { error: tableCheckError } = await supabase.from('allocation_history').select('id').limit(1);
            
            if (tableCheckError && tableCheckError.message && tableCheckError.message.includes('relation "allocation_history" does not exist')) {
              console.log("[UPDATE-PAYMENT] Creating allocation_history table...");
              
              const createTableSQL = `
                CREATE TABLE IF NOT EXISTS allocation_history (
                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  user_id UUID NOT NULL,
                  amount INTEGER NOT NULL,
                  allocation_type TEXT NOT NULL,
                  previous_amount INTEGER,
                  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
                );
              `;
              
              try {
                const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
                if (createError) {
                  console.error(`[UPDATE-PAYMENT] Error creating allocation_history table: ${createError.message}`);
                } else {
                  console.log("[UPDATE-PAYMENT] allocation_history table created successfully");
                }
              } catch (createTableError) {
                console.error(`[UPDATE-PAYMENT] Error executing SQL to create table: ${createTableError}`);
              }
            }
            
            // Record the unlimited allocation
            const { error: allocationRecordError } = await supabase
              .from('allocation_history')
              .insert({
                user_id: userId,
                amount: 999999,
                allocation_type: 'unlimited_plan',
                previous_amount: profileData?.requests_remaining || 0
              });
              
            if (allocationRecordError) {
              console.error(`[UPDATE-PAYMENT] Error recording allocation: ${allocationRecordError.message}`);
            } else {
              console.log("[UPDATE-PAYMENT] Unlimited allocation recorded successfully");
            }
          } catch (allocationError) {
            console.error(`[UPDATE-PAYMENT] Error in allocation record insert: ${allocationError}`);
          }
        }
        
        console.log(`[UPDATE-PAYMENT] Updating profile with: `, updateObject);
        
        // Update user profile with subscription info
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updateObject)
          .eq('id', userId);
        
        if (profileError) {
          throw new Error(`Error updating profile: ${profileError.message}`);
        }
        
        console.log("[UPDATE-PAYMENT] Profile updated successfully");
        
        // Record payment in history
        try {
          const { error: paymentError } = await supabase
            .from('payment_history')
            .insert({
              user_id: userId,
              amount: amount,
              currency: 'gbp',
              payment_method: 'card',
              payment_status: 'completed',
              description: `Payment for ${planName}`,
              stripe_payment_id: paymentIntentId || subscriptionId,
            });
          
          if (paymentError) {
            console.error(`[UPDATE-PAYMENT] Error recording payment: ${paymentError.message}`);
            // Continue even if payment record fails
          } else {
            console.log("[UPDATE-PAYMENT] Payment recorded successfully");
          }
        } catch (paymentRecordError) {
          console.error(`[UPDATE-PAYMENT] Error in payment record insert: ${paymentRecordError}`);
          // Continue even if payment record fails
        }
        
        // Process referral if the user was referred
        try {
          const { data: profileData, error: profileCheckError } = await supabase
            .from('profiles')
            .select('referred_by, gender')
            .eq('id', userId)
            .single();
            
          if (!profileCheckError && profileData?.referred_by) {
            console.log(`[UPDATE-PAYMENT] Found referral code for user ${userId}: ${profileData.referred_by}, processing after payment`);
            
            // Process the affiliate commission with force flag to ensure it works
            try {
              await supabase.functions.invoke('process-affiliate-signup', {
                body: {
                  userId,
                  referralCode: profileData.referred_by,
                  subscriptionPlan: planName,
                  immediate: true,
                  forceProcess: true,
                  userGender: profileData.gender
                }
              });
              
              console.log('[UPDATE-PAYMENT] Affiliate processing completed after payment');
            } catch (affiliateError) {
              console.error('[UPDATE-PAYMENT] Error processing affiliate:', affiliateError);
              // Continue even if affiliate processing fails
            }
          }
        } catch (referralError) {
          console.error('[UPDATE-PAYMENT] Error processing referral after payment:', referralError);
          // Don't fail the payment processing if referral processing fails
        }
        
        // Fetch the updated profile for logging
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('requests_remaining, subscription_status, subscription_plan')
          .eq('id', userId)
          .single();
        
        console.log(`[UPDATE-PAYMENT] Updated profile:`, updatedProfile);
        
        // Commit the transaction
        try {
          const { error: commitError } = await supabase.rpc('commit_transaction');
          if (commitError) {
            console.error(`[UPDATE-PAYMENT] Error committing transaction: ${commitError.message}`);
          } else {
            console.log("[UPDATE-PAYMENT] Transaction committed successfully");
          }
        } catch (commitError) {
          console.error(`[UPDATE-PAYMENT] Error in commit transaction: ${commitError}`);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: isSubscription ? 'Subscription activated successfully' : 'Payment completed successfully',
            isSubscription,
            subscriptionId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        // Rollback the transaction if any error occurs
        console.error(`[UPDATE-PAYMENT] Error in transaction, rolling back: ${error.message}`);
        try {
          const { error: rollbackError } = await supabase.rpc('rollback_transaction');
          if (rollbackError) {
            console.error(`[UPDATE-PAYMENT] Error rolling back transaction: ${rollbackError.message}`);
          } else {
            console.log("[UPDATE-PAYMENT] Transaction rolled back successfully");
          }
        } catch (rollbackError) {
          console.error(`[UPDATE-PAYMENT] Error in rollback transaction: ${rollbackError}`);
        }
        throw error;
      }
    } catch (error) {
      console.error('[UPDATE-PAYMENT] Error updating payment status:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[UPDATE-PAYMENT] Error updating payment status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
