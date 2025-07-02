
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
    
    // Parse the request body
    const { referralCode, userId, skipEmail = false } = await req.json();
    
    if (!referralCode || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing referral: ${referralCode} for user: ${userId}`);
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('gender, has_used_referral, referred_by')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error("Error fetching user profile:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log("User data:", userData);
    
    // Check if this referral has already been processed
    if (userData.has_used_referral && userData.referred_by === referralCode) {
      console.log("User has already used this referral code, skipping duplicate processing");
      return new Response(
        JSON.stringify({ success: true, message: "Referral already processed", alreadyProcessed: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // First check if this is an affiliate code
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('affiliate_code', referralCode)
      .single();
    
    if (!affiliateError && affiliateData) {
      console.log(`Found affiliate with ID ${affiliateData.id}`);
      
      // Check for existing referral in affiliate_referrals
      const { data: existingReferral, error: checkReferralError } = await supabase
        .from('affiliate_referrals')
        .select('id')
        .eq('affiliate_id', affiliateData.id)
        .eq('referred_user_id', userId)
        .maybeSingle();
        
      if (!checkReferralError && existingReferral) {
        console.log(`Referral already exists in affiliate_referrals: ${existingReferral.id}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Referral already processed',
            alreadyProcessed: true,
            referralId: existingReferral.id
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // This is an affiliate code - ensure it's stored as a code, not a UUID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          referred_by: referralCode,
          has_used_referral: true
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error("Error updating user profile with referral:", updateError);
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Updated user ${userId} with affiliate code ${referralCode}`);
      
      // Check if the user is already subscribed (male users need subscription)
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_plan')
        .eq('id', userId)
        .single();
      
      // For a male user with an active subscription, process the commission immediately
      if (!subscriptionError && 
          subscriptionData && 
          userData.gender === 'male' && 
          subscriptionData.subscription_status === 'active' && 
          subscriptionData.subscription_plan) {
        
        console.log(`Processing affiliate commission for subscribed male user: ${userId}`);
        
        // Process the commission through the process-affiliate-signup function
        try {
          const { data: processResult, error: processError } = await supabase.functions.invoke(
            "process-affiliate-signup",
            {
              body: {
                userId: userId,
                referralCode: referralCode,
                subscriptionPlan: subscriptionData.subscription_plan,
                immediate: true,
                forceProcess: true,
                skipEmail: skipEmail // Pass the skipEmail parameter to prevent duplicate emails
              }
            }
          );
          
          if (processError) {
            console.error("Error processing affiliate commission:", processError);
          } else {
            console.log("Affiliate commission processed successfully:", processResult);
          }
        } catch (processError) {
          console.error("Exception processing affiliate commission:", processError);
        }
      } 
      // For female users, the referral is recorded but processed separately
      else if (userData.gender === 'female') {
        console.log(`Female user ${userId} referred by affiliate code ${referralCode}`);
        
        // Call the process-affiliate-signup function to record this properly
        try {
          const { data: processResult, error: processError } = await supabase.functions.invoke(
            "process-affiliate-signup",
            {
              body: {
                userId: userId,
                referralCode: referralCode,
                immediate: true,
                forceProcess: true,
                skipEmail: skipEmail // Pass the skipEmail parameter to prevent duplicate emails
              }
            }
          );
          
          if (processError) {
            console.error("Error processing female affiliate referral:", processError);
          } else {
            console.log("Female affiliate referral processed successfully:", processResult);
          }
        } catch (processError) {
          console.error("Exception processing female affiliate referral:", processError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Affiliate referral code applied successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If not an affiliate code, proceed with regular referral processing logic
    console.log("Not an affiliate code, processing as regular referral");
    
    // Check if the referral code corresponds to a user
    const { data: referrerData, error: referrerError } = await supabase
      .from('profiles')
      .select('id, gender')
      .eq('id', referralCode)
      .single();
    
    if (referrerError) {
      console.error("Error finding referrer:", referrerError);
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Don't allow self-referrals
    if (referrerData.id === userId) {
      console.log("Self-referral not allowed");
      return new Response(
        JSON.stringify({ error: 'You cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Now add the bonus to both users - 3 requests each
    const bonus = 3;
    
    const referrerGender = referrerData.gender;
    const userGender = userData.gender;
    
    console.log(`Processing referral. Referrer gender: ${referrerGender}, User gender: ${userGender}`);
    
    if ((userGender === 'female' && referrerGender === 'female') ||
        (userGender === 'female' && referrerGender === 'male') ||
        (userGender === 'male' && referrerGender === 'female')) {
      
      // Call the add_female_referral_bonus function
      try {
        console.log(`Adding female referral bonus for referrer ${referrerData.id} and referred user ${userId}`);
        
        const { data, error } = await supabase.rpc(
          'add_female_referral_bonus',
          {
            referrer_id: referrerData.id,
            referred_id: userId,
            bonus_amount: bonus
          }
        );
        
        if (error) {
          console.error("Error adding female referral bonus:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Added ${bonus} requests to both ${referrerData.id} and ${userId}`);
      } catch (error) {
        console.error("Exception adding female referral bonus:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (userGender === 'male' && referrerGender === 'male') {
      // Call the add_referral_bonus function
      try {
        console.log(`Adding male referral bonus for referrer ${referrerData.id} and referred user ${userId}`);
        
        const { data, error } = await supabase.rpc(
          'add_referral_bonus',
          {
            referrer_id: referrerData.id,
            referred_id: userId,
            bonus_amount: bonus
          }
        );
        
        if (error) {
          console.error("Error adding referral bonus:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        console.log(`Added ${bonus} requests to both ${referrerData.id} and ${userId}`);
      } catch (error) {
        console.error("Exception adding referral bonus:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      console.log(`Gender combination not handled: Referrer ${referrerGender}, User ${userGender}`);
    }
    
    // Mark this user as having used a referral
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        has_used_referral: true,
        referred_by: referralCode
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error("Error updating user's referral status:", updateError);
    }
    
    console.log(`Successfully processed referral for user ${userId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Both users have been awarded ${bonus} free requests!` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing referral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
