
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const { affiliateId, amount, paymentMethod, paymentDetails } = await req.json();
    
    if (!affiliateId || !amount) {
      console.error("Missing required parameters:", { affiliateId, amount });
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[AFFILIATE PAYOUT] Processing payout for affiliate ${affiliateId}: ${amount}`);
    
    // Create the payout record
    const { data: payoutData, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .insert({
        affiliate_id: affiliateId,
        amount,
        payment_method: paymentMethod || 'PayPal',
        payment_details: paymentDetails,
        status: 'pending',
        period_start: new Date(new Date().setDate(1)).toISOString(),  // First day of current month
        period_end: new Date().toISOString()
      })
      .select();
      
    if (payoutError) {
      console.error("[AFFILIATE PAYOUT] Error creating payout record:", payoutError);
      throw new Error(`Failed to create payout record: ${payoutError.message}`);
    }
    
    console.log("[AFFILIATE PAYOUT] Created payout record:", payoutData[0].id);
    
    // Get the affiliate's total earned to calculate new paid amount
    const { data: affiliateData, error: fetchError } = await supabase
      .from('affiliates')
      .select('total_earned, total_paid, user_id')
      .eq('id', affiliateId)
      .single();
      
    if (fetchError) {
      console.error("[AFFILIATE PAYOUT] Error fetching affiliate data:", fetchError);
      throw new Error(`Failed to fetch affiliate data: ${fetchError.message}`);
    }
    
    console.log("[AFFILIATE PAYOUT] Affiliate data:", { 
      total_earned: affiliateData.total_earned,
      total_paid: affiliateData.total_paid,
      user_id: affiliateData.user_id
    });
    
    // Calculate new paid amount
    const newPaidAmount = (affiliateData.total_paid || 0) + amount;
    console.log("[AFFILIATE PAYOUT] Updating paid amount from", affiliateData.total_paid, "to", newPaidAmount);
    
    // Update the affiliate's total_paid amount
    const { error: updateError } = await supabase
      .from('affiliates')
      .update({ total_paid: newPaidAmount })
      .eq('id', affiliateId);
      
    if (updateError) {
      console.error("[AFFILIATE PAYOUT] Error updating affiliate paid amount:", updateError);
      throw new Error(`Failed to update affiliate paid amount: ${updateError.message}`);
    }
    
    console.log("[AFFILIATE PAYOUT] Successfully updated affiliate paid amount");
    
    // Mark the corresponding conversions as paid
    const { data: conversionsUpdated, error: conversionError } = await supabase
      .from('affiliate_conversions')
      .update({ 
        is_paid: true, 
        payment_id: payoutData[0].id 
      })
      .eq('affiliate_id', affiliateId)
      .eq('is_paid', false)
      .select('id');
      
    if (conversionError) {
      console.error("[AFFILIATE PAYOUT] Error updating conversions:", conversionError);
      // Continue even if there's an error here, as the payout is already created
    } else {
      console.log(`[AFFILIATE PAYOUT] Marked ${conversionsUpdated?.length || 0} conversions as paid`);
    }
    
    // Get the affiliate's email for notification using a direct join query instead of relying on foreign key relationship
    const { data: affiliateUserData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('user_id')
      .eq('id', affiliateId)
      .single();
      
    if (!affiliateError && affiliateUserData) {
      // Now fetch the profile information using the user_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, email, email_notifications')
        .eq('id', affiliateUserData.user_id)
        .single();
        
      if (!profileError && profileData?.email_notifications) {
        try {
          console.log("[AFFILIATE PAYOUT] Sending email notification to", profileData.email);
          // Send email notification about the payout
          await supabase.functions.invoke("send-notification-email", {
            body: {
              to: profileData.email,
              type: "affiliate_payout",
              recipientName: profileData.first_name || "there",
              payoutData: {
                amount: formatCurrency(amount),
                method: paymentMethod || 'PayPal',
                date: new Date().toISOString()
              }
            }
          });
          console.log("[AFFILIATE PAYOUT] Email notification sent successfully");
        } catch (emailError) {
          console.error("[AFFILIATE PAYOUT] Error sending payout notification email:", emailError);
          // Non-critical error, continue
        }
      } else {
        console.log("[AFFILIATE PAYOUT] Email notification skipped:", 
          profileError ? "Error fetching profile" : "Email notifications disabled");
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Payout processed successfully",
        payoutId: payoutData[0].id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[AFFILIATE PAYOUT] Error processing affiliate payout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process payout" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount / 100);
}
