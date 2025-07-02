
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { handleReferralCode } from "@/components/handleReferral";



const GoogleAccountFix = () => {
  const { user, session, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showNotification } = useMobileNotification();
  const isMobile = useIsMobile();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // If user has a session stored from a previous onboarding attempt,
  // get it when they complete this form to continue where they left off
  const storedOnboardingStep = sessionStorage.getItem("currentOnboardingStep");

  // Get referral code from URL or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('ref') || localStorage.getItem('pendingReferralCode');

  // Save referral code to localStorage if it exists in URL
  useEffect(() => {
    const urlRefCode = urlParams.get('ref');
    if (urlRefCode) {
      console.log('[GOOGLE_ACCOUNT_FIX] Saving referral code to localStorage:', urlRefCode);
      localStorage.setItem('pendingReferralCode', urlRefCode);
    }
  }, []);

  useEffect(() => {
    // Redirect if user is not logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is an affiliate and redirect to affiliate dashboard
    const checkIfAffiliate = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', user.id)
          .single();

        if (!error && data && data.gender === 'affiliate') {
          // Clear any redirect-related session storage items
          sessionStorage.removeItem("alreadyRedirected");
          sessionStorage.removeItem("redirectAttempts");
          sessionStorage.removeItem("redirectedFromOnboarding");
          sessionStorage.setItem("googleAccountFixCompleted", "true");
          
          // Redirect to dedicated affiliate dashboard
          navigate('/affiliate/dashboard', { replace: true });
          return;
        }
      } catch (err) {
        console.error("Error checking if user is affiliate:", err);
      }
    };

    checkIfAffiliate();

    // Pre-fill form with any existing information
    const loadUserData = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, gender, date_of_birth')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error loading user data:", error);
          return;
        }

        if (data) {
          setFormData({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            gender: data.gender || '',
            dateOfBirth: data.date_of_birth || ''
          });
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      }
    };

    loadUserData();
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    
    if (!formData.gender) {
      newErrors.gender = "Gender is required";
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    } else {
      // Calculate age to ensure user is over 18
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        newErrors.dateOfBirth = "You must be at least 18 years old";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData(prev => ({ ...prev, gender: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (!user) {
        throw new Error("No authenticated user");
      }
      
      // Get referral code from localStorage or URL
      const pendingReferralCode = localStorage.getItem("pendingReferralCode") || urlParams.get("ref");
      console.log("[GOOGLE_ACCOUNT_FIX] Using referral code:", pendingReferralCode);
      
      // Prepare update data with profile details
      const profileData: any = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        onboarding_completed: false
      };
      
      // If we have a referral code, include it in the update
      if (pendingReferralCode) {
  const { data: existingProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('referred_by')
    .eq('id', user.id)
    .single();

  if (fetchError) {
    console.error("[GOOGLE_ACCOUNT_FIX] Failed to fetch existing referred_by:", fetchError);
  } else if (!existingProfile?.referred_by) {
    profileData.referred_by = pendingReferralCode;
    profileData.has_used_referral = true;
    console.log("[GOOGLE_ACCOUNT_FIX] Setting new referral code on profile:", pendingReferralCode);
  } else {
    console.log("[GOOGLE_ACCOUNT_FIX] User already has referred_by set, skipping referral update.");
  }
}


      // Update the user's profile with the missing information
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id);
        
      if (error) {
        throw error;
      }

      // IMPORTANT ADDITION: Also update the auth user metadata
      // so that the session reflects the correct information
      await supabase.auth.updateUser({
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender
        }
      });

      // Refresh the user profile data and apply referral code if any
      if (user.id) {
        await refreshProfile(user.id);
        await handleReferralCode(user.id);
        
        // After processing, check if referral was saved correctly
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('referred_by, has_used_referral')
          .eq('id', user.id)
          .single();
          
        console.log("[GOOGLE_ACCOUNT_FIX] Updated profile referral status:", updatedProfile);
      }
      
      // Clear the referral code from localStorage since it's now saved in the database
      localStorage.removeItem('pendingReferralCode');
      
      const successMessage = "Account information updated successfully!";
      if (isMobile) {
        showNotification(successMessage, "success");
      } else {
        toast({
          title: "Success",
          description: successMessage,
          variant: "default",
        });
      }
      
      // MODIFIED: Clear any redirect-related session storage items
      sessionStorage.removeItem("alreadyRedirected");
      sessionStorage.removeItem("redirectAttempts");
      sessionStorage.removeItem("redirectedFromOnboarding");
      
      // Mark that the user has completed the Google account fix
      sessionStorage.setItem("googleAccountFixCompleted", "true");
      
      // Special handling for affiliate users
      if (formData.gender === 'affiliate') {
        navigate('/affiliate/dashboard', { replace: true });
      }
      // Female users go to the wali information page
      else if (formData.gender === 'female') {
        navigate('/google-fix-wali', { replace: true });
      } 
      // Male users go to onboarding or stored step
      else {
        // For male users or other genders, redirect to stored onboarding step or start with ethnicity
        const redirectPath = storedOnboardingStep || '/onboarding/ethnicity';
        navigate(redirectPath, { replace: true });
      }
      
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      const errorMessage = error.message || "Failed to update account information";
      if (isMobile) {
        showNotification(errorMessage, "error");
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              We need a few more details to set up your NikkahFirst account
            </CardDescription>
            {referralCode && (
              <div className="mt-2 bg-green-50 p-2 rounded-md text-green-700 text-sm">
                <span className="font-medium">Referral code detected!</span> Your account will be linked to this referral.
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your first name"
                  className={errors.firstName ? "border-red-500" : ""}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm">{errors.firstName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter your last name"
                  className={errors.lastName ? "border-red-500" : ""}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm">{errors.lastName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup 
                  value={formData.gender} 
                  onValueChange={handleGenderChange}
                  className={errors.gender ? "border border-red-500 p-2 rounded-md" : ""}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">Female</Label>
                  </div>
                </RadioGroup>
                {errors.gender && (
                  <p className="text-red-500 text-sm">{errors.gender}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={errors.dateOfBirth ? "border-red-500" : ""}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                />
                {errors.dateOfBirth && (
                  <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleAccountFix;
