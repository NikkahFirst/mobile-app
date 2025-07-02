
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Commission amounts in pence (e.g., 500 = £5.00)
const COMMISSION_RATES = {
  'Monthly Plan': 500,
  'Annual Plan': 1000,
  'Unlimited Plan': 1500,
  'Limited Offer - Unlimited Plan': 1000
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
    
    const { userId, referralCode, subscriptionPlan, immediate = false, forceProcess = false, userGender = null, skipEmail = false } = await req.json();
    
    if (!userId || !referralCode) {
      console.error("Missing required parameters:", { userId, referralCode });
      return new Response(
        JSON.stringify({ error: 'Missing userId or referralCode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Processing affiliate signup for user ${userId} with referral code ${referralCode}`);
    console.log(`Parameters:`, { 
      userId, 
      referralCode, 
      subscriptionPlan, 
      immediate, 
      forceProcess,
      userGender,
      skipEmail
    });
    
    // 1. Verify the user exists and get their gender if not already provided
    let gender = userGender;
    if (!gender) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('gender, email, first_name, last_name')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error("Error fetching user profile:", userError);
        return new Response(
          JSON.stringify({ error: 'User not found', details: userError.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      gender = userData.gender;
    }
    
    // 2. Find affiliate by code
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, user_id, is_approved')
      .eq('affiliate_code', referralCode)
      .single();
    
    if (affiliateError || !affiliateData) {
      console.error("Affiliate not found with code:", referralCode);
      
      if (forceProcess) {
        console.log("Force processing enabled, but affiliate not found. Checking if this is a regular user referral code.");
        
        // Check if this is a user ID for regular referrals
        const { data: referrerUser, error: referrerError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', referralCode)
          .single();
        
        if (!referrerError && referrerUser) {
          console.log("Valid user ID found, processing as regular referral");
          
          // Process as regular referral using process-referral function
          const { data: referralData, error: referralError } = await supabase.functions.invoke('process-referral', {
            body: { referralCode, userId }
          });
          
          if (referralError) {
            console.error("Error processing regular referral:", referralError);
            return new Response(
              JSON.stringify({ error: 'Failed to process regular referral', details: referralError }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Regular referral processed successfully',
              data: referralData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Not a valid affiliate code or user ID
        return new Response(
          JSON.stringify({ error: 'Invalid referral code', details: 'Code is neither an affiliate code nor a valid user ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Affiliate not found', details: affiliateError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!affiliateData.is_approved && !forceProcess) {
      console.warn("Affiliate not approved:", affiliateData.id);
      return new Response(
        JSON.stringify({ error: 'Affiliate not approved' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ** IMPORTANT ** Check for existing conversion BEFORE creating a referral
    const { data: existingConversion, error: conversionCheckError } = await supabase
      .from('affiliate_conversions')
      .select('id')
      .eq('affiliate_id', affiliateData.id)
      .eq('referred_user_id', userId)
      .maybeSingle();
      
    if (existingConversion) {
      console.log(`Commission already processed for this referral. Conversion ID: ${existingConversion.id}`);
      
      // 3. Check if user was already referred by this affiliate (still record the referral if not)
      // This allows tracking the referral without duplicating the commission
      const { data: existingReferral, error: referralCheckError } = await supabase
        .from('affiliate_referrals')
        .select('id')
        .eq('affiliate_id', affiliateData.id)
        .eq('referred_user_id', userId)
        .maybeSingle();
      
      let referralId = existingReferral?.id;
      
      // Create referral record if it doesn't exist (rare case)
      if (!existingReferral) {
        const { data: newReferral, error: createError } = await supabase
          .from('affiliate_referrals')
          .insert({
            affiliate_id: affiliateData.id,
            referred_user_id: userId,
            referred_user_gender: gender,
            commission_amount: existingConversion.commission_amount
          })
          .select('id')
          .single();
        
        if (!createError && newReferral) {
          referralId = newReferral.id;
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Commission was already processed for this referral',
          alreadyProcessed: true,
          referralId,
          conversionId: existingConversion.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Check if user was already referred by this affiliate
    const { data: existingReferral, error: referralCheckError } = await supabase
      .from('affiliate_referrals')
      .select('id')
      .eq('affiliate_id', affiliateData.id)
      .eq('referred_user_id', userId)
      .single();
    
    // If there's already a referral record, we need to check if we're processing a conversion
    let referralId;
    if (!existingReferral) {
      // Create new referral record
      const { data: newReferral, error: createError } = await supabase
        .from('affiliate_referrals')
        .insert({
          affiliate_id: affiliateData.id,
          referred_user_id: userId,
          referred_user_gender: gender
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error("Error creating affiliate referral:", createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create referral record', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      referralId = newReferral.id;
      console.log(`Created new affiliate referral record: ${referralId}`);
    } else {
      referralId = existingReferral.id;
      console.log(`Found existing affiliate referral: ${referralId}`);
    }
    
    // 5. If we have a subscription plan, and user is male, process the commission
    let commissionProcessed = false;
    let shouldSendEmail = false;
    
    if (subscriptionPlan && (gender === 'male' || forceProcess)) {
      console.log(`Processing commission for ${gender} user with plan: ${subscriptionPlan}`);
      
      const commissionAmount = COMMISSION_RATES[subscriptionPlan] || 0;
      console.log(`Commission amount: ${commissionAmount} pence`);
      
      if (commissionAmount > 0) {
        try {
          // Create conversion record
          const { data: conversion, error: conversionError } = await supabase
            .from('affiliate_conversions')
            .insert({
              affiliate_id: affiliateData.id,
              referred_user_id: userId,
              subscription_plan: subscriptionPlan,
              commission_amount: commissionAmount
            })
            .select('id')
            .single();
          
          if (conversionError) {
            console.error("Error creating conversion record:", conversionError);
            throw conversionError;
          }
          
          console.log(`Created conversion record: ${conversion.id}`);
          // Flag to send email for newly created commission
          shouldSendEmail = true;
          
          // Update affiliate's total_earned
          const { data: earnedData, error: earnedError } = await supabase.rpc(
            'calculate_new_earned_amount',
            {
              p_affiliate_id: affiliateData.id,
              p_add_amount: commissionAmount
            }
          );
          
          if (earnedError) {
            console.error("Error calculating new earned amount:", earnedError);
            throw earnedError;
          }
          
          const { error: updateError } = await supabase
            .from('affiliates')
            .update({ total_earned: earnedData })
            .eq('id', affiliateData.id);
          
          if (updateError) {
            console.error("Error updating affiliate earned amount:", updateError);
            throw updateError;
          }
          
          console.log(`Successfully updated affiliate ${affiliateData.id} earned amount to ${earnedData}`);
          
          // Update referral record with commission info
          const { error: referralUpdateError } = await supabase
            .from('affiliate_referrals')
            .update({
              commission_amount: commissionAmount,
              subscription_date: new Date().toISOString()
            })
            .eq('id', referralId);
          
          if (referralUpdateError) {
            console.error("Error updating referral with commission:", referralUpdateError);
            throw referralUpdateError;
          }
          
          commissionProcessed = true;
          console.log("Commission processing completed successfully");
          
          // Send notification email to affiliate if applicable ONLY FOR NEW COMMISSIONS
          // AND only if skipEmail is not true
          if (shouldSendEmail && !skipEmail) {
            const { data: affiliateUser, error: userLookupError } = await supabase
              .from('profiles')
              .select('email, first_name, email_notifications')
              .eq('id', affiliateData.user_id)
              .single();
            
            if (!userLookupError && affiliateUser && affiliateUser.email_notifications) {
              try {
                console.log(`Sending commission notification email to ${affiliateUser.email}`);
                await supabase.functions.invoke('send-notification-email', {
                  body: {
                    to: affiliateUser.email,
                    type: 'affiliate_commission',
                    recipientName: affiliateUser.first_name || 'there',
                    commissionData: {
                      amount: formatCurrency(commissionAmount),
                      plan: subscriptionPlan,
                      date: new Date().toISOString()
                    }
                  }
                });
                console.log("Notification email sent successfully");
              } catch (emailError) {
                console.error("Error sending notification email:", emailError);
                // Don't fail the whole process if email fails
              }
            }
          }
        } catch (processingError) {
          console.error("Error processing commission:", processingError);
          return new Response(
            JSON.stringify({ error: 'Failed to process commission', details: processingError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log(`No commission for plan: ${subscriptionPlan}`);
      }
    } else {
      console.log(`Not processing commission. Gender: ${gender}, Plan: ${subscriptionPlan || 'none'}`);
    }
    
    // If immediate flag is set, process referral free requests bonus regardless of commission
    if ((immediate || forceProcess) && !commissionProcessed) {
      try {
        console.log("Processing immediate affiliate bonus");
        
        // Process the regular referral bonus too, if applicable
        // Add skipEmail=true to prevent duplicate emails from the chain
        const { data: referralData, error: referralError } = await supabase.functions.invoke('process-referral', {
          body: { referralCode, userId, skipEmail: true }
        });
        
        if (referralError) {
          console.warn("Error processing regular referral bonus:", referralError);
          // Continue anyway - this is a bonus feature
        } else {
          console.log("Successfully processed regular referral bonus");
        }
      } catch (bonusError) {
        console.warn("Error processing immediate bonus:", bonusError);
        // Continue anyway - this is a bonus feature
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: commissionProcessed 
          ? 'Affiliate commission processed successfully' 
          : 'Affiliate referral recorded successfully',
        commissionProcessed,
        emailSent: shouldSendEmail && !skipEmail,
        referralId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Unhandled error processing affiliate signup:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
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
