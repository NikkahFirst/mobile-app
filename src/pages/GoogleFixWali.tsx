import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { countryCodes, getPhoneLengthForCountry } from "@/lib/countryCodes";

const GoogleFixWali = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { showNotification } = useMobileNotification();
  const isMobile = useIsMobile();
  
  const [formData, setFormData] = useState({
    waliName: '',
    waliPhone: '',
    waliEmail: '',
    dialCode: '+44', // Default to UK
    skipPhotos: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  // If user has a session stored from a previous onboarding attempt,
  // get it when they complete this form to continue where they left off
  const storedOnboardingStep = sessionStorage.getItem("currentOnboardingStep");

  useEffect(() => {
    // Redirect if user is not logged in
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if the user already has wali details
    const loadUserData = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('wali_name, wali_phone, wali_email, gender')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("Error loading user data:", error);
          return;
        }

        // If user is not female, redirect to appropriate page
        if (data && data.gender !== 'female') {
          const redirectPath = storedOnboardingStep || '/onboarding/ethnicity';
          navigate(redirectPath, { replace: true });
          return;
        }

        // If user already has wali details, skip to onboarding
        if (data && data.wali_name && data.wali_phone && data.wali_email) {
          const redirectPath = storedOnboardingStep || '/onboarding/ethnicity';
          navigate(redirectPath, { replace: true });
          return;
        }

        // Pre-fill form with any existing wali information
        if (data) {
          setFormData({
            waliName: data.wali_name || '',
            waliPhone: data.wali_phone ? data.wali_phone.replace(/^\+\d+\s*/, '') : '',
            waliEmail: data.wali_email || '',
            dialCode: data.wali_phone ? data.wali_phone.match(/^\+\d+/)?.[0] || '+44' : '+44',
            skipPhotos: data.skip_photos || false
          });
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      }
    };

    loadUserData();
  }, [user, navigate, storedOnboardingStep]);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.waliName.trim()) {
      newErrors.waliName = "Wali name is required";
    }
    
    if (!formData.waliPhone.trim()) {
      newErrors.waliPhone = "Wali phone is required";
    } else {
      // Validate phone length based on country code
      const expectedLength = getPhoneLengthForCountry(formData.dialCode);
      const phoneDigits = formData.waliPhone.replace(/\D/g, '');
      if (phoneDigits.length !== expectedLength) {
        newErrors.waliPhone = `Phone number should be ${expectedLength} digits for ${formData.dialCode}`;
      }
    }
    
    if (!formData.waliEmail.trim()) {
      newErrors.waliEmail = "Wali email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.waliEmail)) {
      newErrors.waliEmail = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const phoneDigits = e.target.value.replace(/\D/g, '');
    const expectedLength = getPhoneLengthForCountry(formData.dialCode);
    
    if (phoneDigits.length <= expectedLength) {
      setFormData(prev => ({ ...prev, waliPhone: phoneDigits }));
    }
    
    // Clear error when field is edited
    if (errors.waliPhone) {
      setErrors(prev => ({ ...prev, waliPhone: '' }));
    }
  };

  const handleDialCodeChange = (value: string) => {
    setFormData(prev => ({ ...prev, dialCode: value }));
    
    // Clear error when field is edited
    if (errors.waliPhone) {
      setErrors(prev => ({ ...prev, waliPhone: '' }));
    }
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
      
      // Create full international phone number
      const fullPhoneNumber = `${formData.dialCode} ${formData.waliPhone}`;
      
      // Update the profile with wali information
      const { error } = await supabase
        .from('profiles')
        .update({
          wali_name: formData.waliName,
          wali_phone: fullPhoneNumber,
          wali_email: formData.waliEmail,
          skip_photos: formData.skipPhotos
        })
        .eq('id', user.id);
        
      if (error) {
        throw error;
      }

      // Refresh the user profile data
      if (user.id) {
        await refreshProfile(user.id);
      }
      
      const successMessage = "Wali information updated successfully!";
      if (isMobile) {
        showNotification(successMessage, "success");
      } else {
        toast({
          title: "Success",
          description: successMessage,
          variant: "default",
        });
      }
      
      // Mark that the user has completed the wali information
      sessionStorage.setItem("waliInfoCompleted", "true");
      
      // Redirect to stored onboarding step if available, otherwise start with ethnicity
      const redirectPath = storedOnboardingStep || '/onboarding/ethnicity';
      navigate(redirectPath, { replace: true });
      
    } catch (error: any) {
      console.error("Error updating wali information:", error);
      
      const errorMessage = error.message || "Failed to update wali information";
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
            <CardTitle className="text-2xl">Wali Information</CardTitle>
            <CardDescription>
              As a female user, please provide your wali (guardian) details to complete your NikkahFirst profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waliName">Wali's Full Name</Label>
                <Input
                  id="waliName"
                  name="waliName"
                  value={formData.waliName}
                  onChange={handleChange}
                  placeholder="Enter your wali's full name"
                  className={errors.waliName ? "border-red-500" : ""}
                />
                {errors.waliName && (
                  <p className="text-red-500 text-sm">{errors.waliName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="waliPhone">Wali's Phone Number</Label>
                <div className="flex space-x-2">
                  <div className="w-1/3">
                    <Select 
                      value={formData.dialCode}
                      onValueChange={handleDialCodeChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.dial_code}>
                            {country.flag} {country.dial_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-2/3">
                    <Input
                      id="waliPhone"
                      name="waliPhone"
                      type="tel"
                      value={formData.waliPhone}
                      onChange={handlePhoneChange}
                      placeholder="Phone number"
                      className={errors.waliPhone ? "border-red-500" : ""}
                    />
                  </div>
                </div>
                {errors.waliPhone && (
                  <p className="text-red-500 text-sm">{errors.waliPhone}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="waliEmail">Wali's Email</Label>
                <Input
                  id="waliEmail"
                  name="waliEmail"
                  type="email"
                  value={formData.waliEmail}
                  onChange={handleChange}
                  placeholder="Enter your wali's email address"
                  className={errors.waliEmail ? "border-red-500" : ""}
                />
                {errors.waliEmail && (
                  <p className="text-red-500 text-sm">{errors.waliEmail}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="skipPhotos"
                    checked={formData.skipPhotos}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({
                        ...prev,
                        skipPhotos: checked === true
                      }));
                    }}
                  />
                  <Label htmlFor="skipPhotos">I prefer not to upload photos</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  If checked, a placeholder image will be used for your profile.
                </p>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Continue to Onboarding"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GoogleFixWali;
