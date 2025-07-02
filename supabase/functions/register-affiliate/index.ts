
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
    
    const { userId } = await req.json();
    
    if (!userId) {
      console.error("Missing user ID");
      return new Response(
        JSON.stringify({ error: 'Missing user ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Attempting to register affiliate for user: ${userId}`);
    
    // Get the user's profile to verify it's an affiliate
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', userId)
      .single();
    
    if (profileError || !profileData) {
      console.error("Error fetching user profile:", profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found', details: profileError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user is marked as an affiliate
    if (profileData.gender !== 'affiliate') {
      console.error("User is not marked as an affiliate", profileData.gender);
      return new Response(
        JSON.stringify({ error: 'User is not marked as an affiliate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Call the manual_register_affiliate database function
    const { data: affiliateResult, error: affiliateError } = await supabase.rpc(
      'manual_register_affiliate', 
      { p_user_id: userId }
    );
    
    if (affiliateError) {
      console.error("Error registering affiliate:", affiliateError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to register affiliate', details: affiliateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the affiliate record after registration
    const { data: affiliateData, error: fetchError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError || !affiliateData) {
      console.error("Error fetching new affiliate data:", fetchError);
      return new Response(
        JSON.stringify({ 
          error: 'Affiliate registered but unable to fetch details',
          affiliateId: affiliateResult,
          details: fetchError?.message
        }),
        { status: 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Successfully registered affiliate: ${affiliateData.id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Affiliate registered successfully',
        affiliate: affiliateData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
