
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
    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse request body
    const requestBody = await req.json();
    
    // Check if this is a request to get affiliate ID only
    if (requestBody.getAffiliateId === true && requestBody.userId) {
      const userId = requestBody.userId === 'current' ? user.id : requestBody.userId;
      
      console.log(`Getting affiliate data for user ${userId}`);
      
      // Get affiliate info using service role to bypass RLS
      // We're using the service role client so we don't hit RLS policies
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, payment_email, paypal_email, wise_email, payment_method, preferred_payment_method, total_earned, total_paid')
        .eq('user_id', userId)
        .single();
        
      if (affiliateError) {
        console.error("Error fetching affiliate data:", affiliateError);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve affiliate data' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!affiliateData) {
        return new Response(
          JSON.stringify({ error: 'Affiliate not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Affiliate data retrieved successfully", 
          data: affiliateData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // This is a payment info update request
    const { 
      affiliateId, 
      paymentEmail,
      wiseEmail,
      paymentMethod,
      preferredPaymentMethod 
    } = requestBody;
    
    if (!affiliateId) {
      return new Response(
        JSON.stringify({ error: 'Missing affiliate ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Updating payment info for affiliate ${affiliateId}`);
    
    // Check if admin is making this request, or if it's the affiliate themselves
    // Instead of querying the admin_access table directly which might cause RLS recursion,
    // Let's use a simple direct query with the service role client that bypasses RLS
    let isAdmin = false;
    
    // Check if user exists in admin_access table - using direct query approach
    const { data: adminData, error: adminError } = await supabase
      .from('admin_access')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (adminError) {
      console.error("Error checking admin status:", adminError);
      // Continue with non-admin flow
    } else {
      isAdmin = !!adminData; // Convert to boolean
    }
    
    // If not admin, check if user owns this affiliate account
    if (!isAdmin) {
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('id', affiliateId)
        .single();
        
      if (affiliateError || !affiliateData) {
        console.error("Error fetching affiliate ownership:", affiliateError);
        return new Response(
          JSON.stringify({ error: 'Affiliate not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
        
      if (affiliateData.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized to update this affiliate' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Update the affiliate information
    const updates: Record<string, any> = {};
    
    if (paymentEmail !== undefined) {
      updates.payment_email = paymentEmail;
      // Also update the paypal_email field for backward compatibility
      updates.paypal_email = paymentEmail;
    }
    
    if (wiseEmail !== undefined) {
      updates.wise_email = wiseEmail;
    }
    
    if (paymentMethod !== undefined) {
      updates.payment_method = paymentMethod;
    }
    
    if (preferredPaymentMethod !== undefined) {
      updates.preferred_payment_method = preferredPaymentMethod;
    }
    
    console.log("Updating affiliate with:", updates);
    
    const { data, error } = await supabase
      .from('affiliates')
      .update(updates)
      .eq('id', affiliateId)
      .select();
      
    if (error) {
      console.error("Error updating affiliate:", error);
      throw new Error(`Failed to update affiliate: ${error.message}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Affiliate information updated successfully",
        data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error updating affiliate information:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update affiliate information" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
