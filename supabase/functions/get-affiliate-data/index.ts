
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
    // Initialize Supabase client with service role key to bypass RLS
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
    
    console.log('Fetching affiliate data for user:', user.id);
    
    // Get the affiliate data for this user
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (affiliateError) {
      console.error('Error fetching affiliate data:', affiliateError);
      
      if (affiliateError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'No affiliate account found', isAffiliate: false }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Error fetching affiliate data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If affiliate account exists but is not approved
    if (!affiliateData.is_approved) {
      return new Response(
        JSON.stringify({ 
          isAffiliate: true,
          isPending: true,
          data: {
            id: affiliateData.id,
            affiliate_code: affiliateData.affiliate_code,
            is_approved: false,
            created_at: affiliateData.created_at
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get referral counts
    const { count: totalReferrals, error: referralCountError } = await supabase
      .from('affiliate_referrals')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateData.id);
      
    if (referralCountError) {
      console.error('Error counting referrals:', referralCountError);
    }
    
    // Get signups by gender
    const { data: genderBreakdown, error: genderError } = await supabase
      .from('affiliate_referrals')
      .select('referred_user_gender')
      .eq('affiliate_id', affiliateData.id);
      
    if (genderError) {
      console.error('Error getting gender breakdown:', genderError);
    }
    
    const maleCount = genderBreakdown?.filter(r => r.referred_user_gender === 'male').length || 0;
    const femaleCount = genderBreakdown?.filter(r => r.referred_user_gender === 'female').length || 0;
    
    // Get conversion count (paid commissions)
    const { count: paidConversions, error: paidError } = await supabase
      .from('affiliate_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateData.id)
      .eq('is_paid', true);
      
    if (paidError) {
      console.error('Error counting paid conversions:', paidError);
    }
    
    // Get unpaid conversions count
    const { count: unpaidConversions, error: unpaidError } = await supabase
      .from('affiliate_conversions')
      .select('*', { count: 'exact', head: true })
      .eq('affiliate_id', affiliateData.id)
      .eq('is_paid', false);
      
    if (unpaidError) {
      console.error('Error counting unpaid conversions:', unpaidError);
    }
    
    // Get recent referrals
    const { data: recentReferrals, error: recentError } = await supabase
      .from('affiliate_referrals')
      .select(`
        id,
        signup_date,
        referred_user_gender,
        referred_user_id,
        commission_amount,
        is_paid,
        profiles:referred_user_id (
          first_name,
          last_name,
          subscription_status,
          subscription_plan
        )
      `)
      .eq('affiliate_id', affiliateData.id)
      .order('signup_date', { ascending: false })
      .limit(10);
      
    if (recentError) {
      console.error('Error getting recent referrals:', recentError);
    }
    
    // Get recent payments
    const { data: recentPayments, error: paymentsError } = await supabase
      .from('affiliate_payouts')
      .select('*')
      .eq('affiliate_id', affiliateData.id)
      .order('payout_date', { ascending: false })
      .limit(5);
      
    if (paymentsError) {
      console.error('Error getting recent payments:', paymentsError);
    }
    
    return new Response(
      JSON.stringify({
        isAffiliate: true,
        isPending: false,
        data: affiliateData,
        stats: {
          totalReferrals: totalReferrals || 0,
          maleSignups: maleCount,
          femaleSignups: femaleCount,
          paidConversions: paidConversions || 0,
          unpaidConversions: unpaidConversions || 0,
          totalEarned: affiliateData.total_earned || 0,
          totalPaid: affiliateData.total_paid || 0,
          pendingAmount: (affiliateData.total_earned || 0) - (affiliateData.total_paid || 0)
        },
        recentReferrals,
        recentPayments
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in get-affiliate-data function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
