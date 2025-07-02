import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from 'https://esm.sh/stripe@13.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body
    const { current_subscription_id, new_plan_name, user_id } = await req.json();

    if (!current_subscription_id || !new_plan_name || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Stripe
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') || '';
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    console.log(`Changing subscription ${current_subscription_id} to plan ${new_plan_name} for user ${user_id}`);

    // Determine the new monthly request allocation based on the plan
    let requestsAllocation = 10; // Default for Monthly Plan
    
    if (new_plan_name === "Annual Plan") {
      requestsAllocation = 15;
    } else if (new_plan_name === "Unlimited Plan") {
      requestsAllocation = 999999;
    }

    // Get the current subscription from Stripe
    const currentSubscription = await stripe.subscriptions.retrieve(current_subscription_id);
    
    // Determine the appropriate price ID based on the new plan name
    // This is a simplified example - in production you'd look up the proper price IDs
    let newPriceId;
    if (new_plan_name === "Monthly Plan") {
      newPriceId = "price_monthly"; // Replace with your actual price ID
    } else if (new_plan_name === "Annual Plan") {
      newPriceId = "price_annual"; // Replace with your actual price ID
    } else if (new_plan_name === "Unlimited Plan") {
      newPriceId = "price_unlimited"; // Replace with your actual price ID
    } else {
      throw new Error("Invalid plan name specified");
    }

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(current_subscription_id, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPriceId,
        },
      ],
    });

    console.log(`Subscription updated: ${JSON.stringify(updatedSubscription)}`);

    // Get the current user profile to check gender and handle requests appropriately
    const { data: userProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('requests_remaining, gender')
      .eq('id', user_id)
      .single();

    if (fetchError) {
      console.error(`Error fetching user profile: ${fetchError.message}`);
      throw new Error(`Failed to fetch user profile: ${fetchError.message}`);
    }

    // Calculate next renewal date (keep existing renewal date)
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('renewal_date')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error(`Error fetching current profile: ${profileError.message}`);
      throw new Error(`Failed to fetch current profile: ${profileError.message}`);
    }

    // Update user profile with new subscription details
    // For males: keep existing requests and add the difference if upgrading
    // For unlimited plan, set to a very high number
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_plan: new_plan_name,
        subscription_status: 'active',
        subscription_id: updatedSubscription.id,
        // For Unlimited plan, set to a very high number
        requests_remaining: new_plan_name === "Unlimited Plan" 
          ? 999999 
          : userProfile.requests_remaining, // Keep existing requests
        renewal_date: currentProfile.renewal_date // Keep existing renewal date
      })
      .eq('id', user_id);

    if (updateError) {
      console.error(`Error updating user profile: ${updateError.message}`);
      return new Response(
        JSON.stringify({ error: `Failed to update user profile: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Subscription changed to ${new_plan_name} successfully`,
        subscription: updatedSubscription 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error(`Error changing subscription plan: ${error.message}`);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
