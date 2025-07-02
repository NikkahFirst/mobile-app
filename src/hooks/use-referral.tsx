
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { checkOnboardingReferral } from '@/components/handleReferral';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to trigger referral processing when a user completes onboarding
 * @param onboardingCompleted Boolean indicating if onboarding is complete
 */
export const useOnboardingReferral = (onboardingCompleted: boolean) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userGender, setUserGender] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  useEffect(() => {
    const processReferral = async () => {
      if (onboardingCompleted && user && !isProcessing) {
        try {
          setIsProcessing(true);
          console.log('Onboarding completed, processing referral for user:', user.id);
          
          // Get user profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('gender, referred_by, subscription_status, subscription_plan')
            .eq('id', user.id)
            .single();
            
          if (!error && data) {
            setUserGender(data.gender);
            
            // Only proceed if there's a referral code
            if (data.referred_by) {
              console.log('Found referral code:', data.referred_by);
              
              try {
                // Process any referral bonuses
                await checkOnboardingReferral(user.id);
                
                if (data.gender === 'female') {
                  toast({
                    title: "Profile Completed!",
                    description: "Your profile is now complete. Referral bonus has been applied.",
                  });
                } else {
                  toast({
                    title: "Profile Completed!",
                    description: "Your profile is now complete.",
                  });
                }
              } catch (error) {
                console.error('Error processing referral after onboarding:', error);
              }
            } else {
              console.log('No referral code found for user:', user.id);
            }
          }
        } catch (err) {
          console.error('Error processing referral:', err);
        } finally {
          setIsProcessing(false);
        }
      }
    };
    
    processReferral();
  }, [onboardingCompleted, user, toast, isProcessing]);
};
