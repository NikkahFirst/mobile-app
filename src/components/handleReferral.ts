
import { supabase } from "@/lib/supabaseClient";

/**
 * Processes a referral code from URL parameters when a user signs up
 * @param userId The ID of the newly registered user
 */
export const handleReferralCode = async (userId: string) => {
  try {
    // Try to get referral code from multiple sources to ensure it's captured
    const urlParams = new URLSearchParams(window.location.search);
    const referralCode = urlParams.get("ref") || localStorage.getItem("pendingReferralCode");
    console.log("[REFERRAL] Final referralCode used:", referralCode);

    if (!referralCode || !userId) {
      console.log("[REFERRAL] No referral code found or user ID missing", { referralCode, userId });
      return;
    }

    console.log("[REFERRAL] Processing referral code", referralCode, "for user", userId);

    // Get user profile to check if they have already used a referral
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("gender, subscription_status, has_used_referral, onboarding_completed, subscription_plan")
      .eq("id", userId)
      .single();

    if (userError || !userData) {
      console.error("[REFERRAL] Error fetching user profile:", userError);
      return;
    }

    console.log("[REFERRAL] User profile data:", userData);

    // Only process if the user hasn't used a referral yet
    if (!userData.has_used_referral) {
      console.log("[REFERRAL] Applying referral code:", referralCode);

      // Store the original referral code directly - now works with TEXT column
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          referred_by: referralCode,
          has_used_referral: true
        })
        .eq("id", userId);

      if (updateError) {
        console.error("[REFERRAL] Error storing referral code:", updateError);
      } else {
        console.log("[REFERRAL] Successfully stored referral code in profile");
        
        // Clear the pending referral code from localStorage after successful update
        localStorage.removeItem("pendingReferralCode");
      }
    } else {
      console.log("[REFERRAL] User has already used a referral, skipping");
      return; // Exit early if already processed
    }

    // Check if this is an affiliate code - only proceed if user hasn't used a referral
    const { data: affiliateData, error: affiliateDataError } = await supabase
      .from("affiliates")
      .select("id, affiliate_code, is_approved")
      .eq("affiliate_code", referralCode)
      .single();

    if (!affiliateDataError && affiliateData?.is_approved) {
      console.log("[REFERRAL] Processing affiliate signup via Edge Function");

      // Add a check to prevent duplicate processing
      const { data: existingConversions, error: conversionError } = await supabase
        .from("affiliate_conversions")
        .select("id")
        .eq("referred_user_id", userId)
        .limit(1);
        
      if (!conversionError && existingConversions && existingConversions.length > 0) {
        console.log("[REFERRAL] Affiliate conversion already exists for this user, skipping");
        return;
      }

      const { data, error: functionError } = await supabase.functions.invoke("process-affiliate-signup", {
        body: {
          userId,
          referralCode,
          subscriptionPlan: userData.subscription_status === "active" ? userData.subscription_plan : null,
          userGender: userData.gender,
          forceProcess: true,
        },
      });

      if (functionError) {
        console.error("[REFERRAL] Error invoking process-affiliate-signup function:", functionError);
      } else {
        console.log("[REFERRAL] Successfully processed affiliate signup:", data);
      }
    } else {
      console.log("[REFERRAL] Not an approved affiliate code or affiliate not found.");
    }
  } catch (error) {
    console.error("[REFERRAL] Fatal error in handleReferralCode:", error);
  }
};

/**
 * Checks and processes a pending referral after a user subscribes
 * @param userId The ID of the user who just subscribed
 */
export const checkPendingReferral = async (userId: string) => {
  try {
    console.log('[REFERRAL] Checking for pending referral after subscription for user:', userId);
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('gender, referred_by, has_used_referral, subscription_status, onboarding_completed, subscription_plan')
      .eq('id', userId)
      .single();
    
    if (userError || !userData || !userData.referred_by) {
      console.log('[REFERRAL] No pending referral found or error:', userError, userData);
      return;
    }
    
    console.log('[REFERRAL] Found pending referral:', userData.referred_by);
    
    // Process for male users with active subscription
    if (userData.gender === 'male' && userData.subscription_status === 'active') {
      console.log('[REFERRAL] Processing pending referral for male user with subscription:', userData.subscription_plan);
      
      // Check if this is an affiliate code
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, is_approved')
        .eq('affiliate_code', userData.referred_by)
        .single();
        
      if (!affiliateError && affiliateData) {
        console.log('[REFERRAL] This is an affiliate code, affiliate status:', affiliateData.is_approved);
        
        // Only process for approved affiliates
        if (affiliateData.is_approved) {
          console.log('[REFERRAL] Invoking process-affiliate-signup function for approved affiliate');
          
          // Process affiliate commission through the edge function
          const { data, error } = await supabase.functions.invoke('process-affiliate-signup', {
            body: {
              userId: userId,
              referralCode: userData.referred_by,
              subscriptionPlan: userData.subscription_plan,
              userGender: userData.gender,
              forceProcess: true
            }
          });
          
          if (error) {
            console.error('[REFERRAL] Error processing affiliate signup:', error);
          } else {
            console.log('[REFERRAL] Successfully processed affiliate signup with result:', data);
          }
        } else {
          console.log('[REFERRAL] Affiliate not approved, skipping processing');
        }
        
        return;
      } else {
        console.log('[REFERRAL] Not an affiliate code, processing as regular referral');
      }
      
      // Process the regular pending referral
      const result = await processReferral(userData.referred_by, userId);
      
      if (result.success) {
        console.log('[REFERRAL] Successfully processed pending referral with result:', result.data);
      } else {
        console.error('[REFERRAL] Error processing pending referral:', result.error);
      }
    } else {
      console.log('[REFERRAL] User conditions not met for processing subscription referral:', {
        gender: userData.gender,
        subscriptionStatus: userData.subscription_status
      });
    }
    
  } catch (error) {
    console.error("[REFERRAL] Error processing pending referral:", error);
  }
};

/**
 * Checks and processes a pending referral after a user completes onboarding
 * @param userId The ID of the user who just completed onboarding
 */
export const checkOnboardingReferral = async (userId: string) => {
  try {
    console.log('[REFERRAL] Checking for pending referral after onboarding for user:', userId);
    
    if (!userId) {
      console.error('[REFERRAL] No user ID provided to checkOnboardingReferral');
      return;
    }
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('gender, referred_by, has_used_referral, onboarding_completed, subscription_status, subscription_plan')
      .eq('id', userId)
      .single();
    
    if (userError) {
      console.error('[REFERRAL] Error fetching user profile:', userError);
      return;
    }
    
    if (!userData || !userData.referred_by || !userData.onboarding_completed) {
      console.log('[REFERRAL] No pending referral found or onboarding not completed:', userData);
      return;
    }
    
    console.log('[REFERRAL] Found pending referral after onboarding:', userData);
    
    // Check if this is an affiliate code
    const { data: affiliateData, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, is_approved')
      .eq('affiliate_code', userData.referred_by)
      .single();
      
    if (!affiliateError && affiliateData) {
      console.log('[REFERRAL] This is an affiliate code, affiliate status:', affiliateData.is_approved);
      
      // Only process for approved affiliates
      if (affiliateData.is_approved) {
        // For male users, this will be processed if they have a subscription
        if (userData.gender === 'male' && userData.subscription_status === 'active') {
          console.log('[REFERRAL] Processing for male user with active subscription after onboarding');
          
          const { data, error } = await supabase.functions.invoke('process-affiliate-signup', {
            body: {
              userId: userId,
              referralCode: userData.referred_by,
              subscriptionPlan: userData.subscription_plan,
              userGender: userData.gender,
              forceProcess: true // Force processing even if validation would normally fail
            }
          });
          
          if (error) {
            console.error('[REFERRAL] Error processing affiliate signup for male user after onboarding:', error);
          } else {
            console.log('[REFERRAL] Successfully processed affiliate signup for male user after onboarding:', data);
          }
        } else if (userData.gender === 'female') {
          // Process for female users
          console.log('[REFERRAL] Processing for female user after onboarding');
          
          const { data, error } = await supabase.functions.invoke('process-affiliate-signup', {
            body: {
              userId: userId,
              referralCode: userData.referred_by,
              userGender: userData.gender,
              forceProcess: true // Force processing even if validation would normally fail
            }
          });
          
          if (error) {
            console.error('[REFERRAL] Error processing affiliate signup for female user:', error);
          } else {
            console.log('[REFERRAL] Successfully processed affiliate signup for female user:', data);
          }
        } else {
          console.log('[REFERRAL] Not processing affiliate commission - male user without subscription');
        }
      } else {
        console.log('[REFERRAL] Affiliate not approved, skipping processing');
      }
      
      return;
    }
    
    console.log('[REFERRAL] Processing regular referral for user after onboarding. Gender:', userData.gender);
    
    // Process for female users who completed onboarding
    if (userData.gender === 'female') {
      console.log('[REFERRAL] Processing pending referral for female user after onboarding');
      // Process the pending referral
      const result = await processReferral(userData.referred_by, userId);
      
      if (result.success) {
        console.log('[REFERRAL] Successfully processed referral for female user with result:', result.data);
      } else {
        console.error('[REFERRAL] Error processing onboarding referral:', result.error);
      }
    } 
    // For male users, check if they have active subscription too
    else if (userData.gender === 'male' && userData.subscription_status === 'active') {
      console.log('[REFERRAL] Processing pending referral for male user after onboarding with active subscription');
      const result = await processReferral(userData.referred_by, userId);
      
      if (result.success) {
        console.log('[REFERRAL] Successfully processed referral for male user with result:', result.data);
      } else {
        console.error('[REFERRAL] Error processing onboarding referral:', result.error);
      }
    } else {
      console.log('[REFERRAL] User conditions not met for referral processing:', {
        gender: userData.gender, 
        subscriptionStatus: userData.subscription_status
      });
    }
    
  } catch (error) {
    console.error("[REFERRAL] Error processing onboarding referral:", error);
  }
};

/**
 * Makes an API call to the process-referral edge function
 */
export const processReferral = async (referralCode: string, userId: string) => {
  try {
    console.log('[REFERRAL] Calling process-referral function with:', { referralCode, userId });
    
    const { data, error } = await supabase.functions.invoke('process-referral', {
      body: { referralCode, userId }
    });
    
    if (error) {
      console.error('[REFERRAL] Error invoking process-referral function:', error);
      throw error;
    }
    
    console.log('[REFERRAL] Referral process response:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[REFERRAL] Error processing referral:', error);
    return { success: false, error };
  }
};
