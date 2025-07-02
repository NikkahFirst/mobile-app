
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Stripe } from "https://esm.sh/stripe@12.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { subscriptionId, userId } = await req.json();
    
    console.log("Cancellation request received:", { subscriptionId, userId });
    
    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: "Subscription ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY environment variable is not set");
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    
    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Attempting to fetch subscription from Stripe:", subscriptionId);
    
    // First, check if the subscription exists in Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log("Subscription retrieved:", subscription.id, "Status:", subscription.status);
      
      // Cancel the subscription in Stripe (set to expire at the end of the current period)
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      
      console.log(`Subscription ${subscriptionId} scheduled for cancellation`, {
        cancelAt: updatedSubscription.cancel_at,
        currentPeriodEnd: updatedSubscription.current_period_end
      });
      
      // Check if the profile record exists
      const { data: profileData, error: profileFetchError } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_id")
        .eq("id", userId)
        .single();
      
      if (profileFetchError) {
        console.error("Error fetching profile:", profileFetchError);
        return new Response(
          JSON.stringify({ error: "Error fetching profile data" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Update the profile to mark subscription as canceled
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active", // Keep as active until it expires
          is_canceled: true  // Mark as canceled
        })
        .eq("id", userId)
        .eq("subscription_id", subscriptionId);
      
      if (updateError) {
        console.error("Error updating profile:", updateError);
        return new Response(
          JSON.stringify({ error: "Error updating profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Subscription scheduled for cancellation at the end of the current billing period",
          canceledAt: updatedSubscription.cancel_at ? new Date(updatedSubscription.cancel_at * 1000).toISOString() : null,
          endDate: updatedSubscription.current_period_end ? new Date(updatedSubscription.current_period_end * 1000).toISOString() : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (stripeError) {
      console.error("Stripe error:", stripeError);
      
      // If the subscription doesn't exist in Stripe (perhaps it was already cancelled)
      // we'll just update our database
      if (stripeError.code === 'resource_missing') {
        console.log("Subscription not found in Stripe. Updating local database only.");
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_status: "inactive",
            subscription_id: null,
            subscription_plan: "Free Plan",
            is_canceled: false, // Reset the canceled flag
            requests_remaining: userId ? 3 : 0
          })
          .eq("id", userId);
        
        if (updateError) {
          console.error("Error updating profile after Stripe 404:", updateError);
          return new Response(
            JSON.stringify({ error: "Error updating profile" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: "Subscription has been cancelled.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // For other types of Stripe errors
      return new Response(
        JSON.stringify({ error: stripeError.message || "An error occurred with the payment processor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
