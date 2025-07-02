import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Heart, ArrowRight, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { countryCodes, getPhoneLengthForCountry } from "@/lib/countryCodes";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNotification } from "@/hooks/use-mobile-notification";

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^\d+$/;

const Signup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, user, signInWithGoogle, refreshProfile } = useAuth();

  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();
  const searchParams = new URLSearchParams(location.search);
  
  const initialGender = searchParams.get('gender') === 'female' ? 'female' : 'male';
  const referralCode = searchParams.get('ref') || localStorage.getItem('pendingReferralCode') || '';

  const fromGoogle = searchParams.get('fromGoogle') === 'true';

  const [step, setStep] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('step') === '2' && fromGoogle ? 2 : 1;
  });

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    gender: initialGender,
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    waliName: "",
    waliContact: "",
    waliCountryCode: "+1",
    waliEmail: "",
    referralCode: referralCode
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
useEffect(() => {
  const storedReferral = localStorage.getItem("pendingReferralCode");
  if (storedReferral && !formData.referralCode) {
    setFormData((prev) => ({ ...prev, referralCode: storedReferral }));
  }
}, []);

  // Enhanced referral code handling
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode && !formData.referralCode) {
      console.log('[SIGNUP] Storing referral code:', refCode);
      localStorage.setItem("pendingReferralCode", refCode);
      setFormData(prev => ({ ...prev, referralCode: refCode }));
    }
  }, [searchParams, formData.referralCode]); // Only re-run if these dependencies change

  useEffect(() => {
    if (user && !fromGoogle) {
        navigate('/dashboard');
    }
  }, [user, navigate, fromGoogle]);

  useEffect(() => {
    const handleGoogleRedirect = async () => {
      if (!fromGoogle) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          navigate('/google-error');
          return;
        }

        const userId = session.user.id;

        // Check if profile exists
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('gender')
          .eq('id', userId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking profile after Google login:', error);
          return;
        }

        if (profile?.gender) {
          // User already has gender → completed signup → go to dashboard
          navigate('/dashboard');
          return;
        }

        if (!profile) {
          // No profile yet → create a minimal one with empty photos array
          await supabase
            .from('profiles')
            .insert([{ id: userId, email: session.user.email, photos: [] }]);
        }

        // Pre-fill signup form
        const fullName = session.user.user_metadata?.full_name || '';
        const names = fullName ? fullName.split(' ') : [];
        const firstName = names[0] || '';
        const lastName = names.slice(1).join(' ') || '';

        // Step 1: Get email and name from Google
        setFormData(prev => ({
          ...prev,
          email: session.user.email || '',
          firstName,
          lastName,
        }));

        // Step 2: Restore referral code from localStorage (if available)
        const savedReferralCode = localStorage.getItem("pendingReferralCode");
        if (savedReferralCode) {
          console.log('[SIGNUP] Restoring saved referral code:', savedReferralCode);
          setFormData(prev => ({
            ...prev,
            referralCode: savedReferralCode
          }));
        }

      } catch (error) {
        console.error('Error handling Google redirect:', error);
      }
    };

    handleGoogleRedirect();
  }, [fromGoogle, navigate]);

  useEffect(() => {
  const ref = searchParams.get("ref");
  if (ref) {
    console.log("[SIGNUP] Detected referral code in query:", ref);
    localStorage.setItem("pendingReferralCode", ref);
    setFormData(prev => ({ ...prev, referralCode: ref }));
  }
}, []);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'waliContact' && value !== '') {
      if (!phoneRegex.test(value)) {
        return;
      }
      
      const maxLength = getPhoneLengthForCountry(formData.waliCountryCode);
      if (value.length > maxLength) {
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCountryCodeChange = (value: string) => {
    setFormData(prev => {
      const newPhoneLength = getPhoneLengthForCountry(value);
      const newWaliContact = prev.waliContact.length > newPhoneLength 
        ? prev.waliContact.substring(0, newPhoneLength) 
        : prev.waliContact;
      
      return { 
        ...prev, 
        waliCountryCode: value,
        waliContact: newWaliContact
      }
    });
  };

  const handleRadioChange = (value: string) => {
    setFormData(prev => ({ ...prev, gender: value }));
  };

  const validateEmail = (email: string): boolean => {
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string, countryCode: string): boolean => {
    if (!phoneRegex.test(phone)) return false;
    
    const expectedLength = getPhoneLengthForCountry(countryCode);
    return phone.length === expectedLength;
  };

  const validateAge = (birthDateString: string): boolean => {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 18;
  };

  const handleNextStep = () => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.email) {
        newErrors.email = "Email is required";
      } else if (!validateEmail(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
      
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    if (step === 2) {
      if (!formData.firstName) {
        newErrors.firstName = "First name is required";
      }
      
      if (!formData.lastName) {
        newErrors.lastName = "Last name is required";
      }
      
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = "Date of birth is required";
      } else if (!validateAge(formData.dateOfBirth)) {
        newErrors.dateOfBirth = "You must be at least 18 years old to register";
      }

      if (fromGoogle && !formData.gender) {
        newErrors.gender = "Please select your gender";
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    if (step === 3 && formData.gender === 'female') {
      if (!formData.waliName) {
        newErrors.waliName = "Wali's name is required";
      }
      
      if (!formData.waliContact) {
        newErrors.waliContact = "Wali's phone number is required";
      } else if (!validatePhone(formData.waliContact, formData.waliCountryCode)) {
        newErrors.waliContact = `Please enter a valid ${getPhoneLengthForCountry(formData.waliCountryCode)}-digit phone number`;
      }
      
      if (!formData.waliEmail) {
        newErrors.waliEmail = "Wali's email is required";
      } else if (!validateEmail(formData.waliEmail)) {
        newErrors.waliEmail = "Please enter a valid email address";
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }
    
    if (step === 3) {
      handleSubmit();
    } else {
      if (fromGoogle) {
        const nextStep = step + 1;
        const newUrl = `/signup?step=${nextStep}&fromGoogle=true`;
        window.history.replaceState(null, '', newUrl);
      }
      setStep(prev => prev + 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      let userId = null;
      
      if (fromGoogle) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          userId = session.user.id;
          console.log('Using existing Google user ID:', userId);
        } else {
          console.error('Google authentication session not found');
          if (isMobile) {
            showNotification("Authentication error. Please try logging in again.", "error");
          } else {
            toast({
              title: "Authentication error",
              description: "Please try logging in again.",
              variant: "destructive",
            });
          }
          setLoading(false);
          navigate('/login');
          return;
        }
      } else {
        const metadata = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender,
        };
        
        const { error } = await signUp(formData.email, formData.password, metadata);
        
        if (error) {
          toast({
            title: "Signup failed",
            description: error.message,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        const { data: { session: newSession } } = await supabase.auth.getSession();
        userId = newSession?.user?.id;
        await refreshProfile(userId); // Ensure session metadata is updated

      }
      
      if (!userId) {
        toast({
          title: "Authentication error",
          description: "Could not determine user ID. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const profileData: any = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        requests_remaining: formData.gender === 'female' ? 3 : 0,
        photos: [],
      };

      console.log('Updating profile with:', profileData);
      
      if (formData.gender === 'female') {
        profileData.wali_name = formData.waliName;
        profileData.wali_phone = `${formData.waliCountryCode} ${formData.waliContact.replace(/\s+/g, '')}`;

        profileData.wali_email = formData.waliEmail;
        
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        profileData.renewal_date = renewalDate.toISOString();
      }
      
      // Ensure referral code is added to profile data
      let finalReferralCode = formData.referralCode;
      if (!finalReferralCode) {
        finalReferralCode = localStorage.getItem("pendingReferralCode") || "";
      }

      if (finalReferralCode) {
        profileData.referred_by = finalReferralCode;
        profileData.has_used_referral = true;
        console.log('[SIGNUP] Applying referral code to profile:', finalReferralCode);
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          { id: userId, ...profileData }
        ], { onConflict: 'id' });
      
      if (profileError) {
        console.error("Error updating profile:", profileError);
        toast({
          title: "Failed to complete profile",
          description: profileError.message || "An error occurred while updating your profile information.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // After profile is updated, also update the user's metadata
      await supabase.auth.updateUser({
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          gender: formData.gender
        }
      });
      
      // Process the referral after creating the account
      if (finalReferralCode) {
        try {
          const { data, error: affiliateError } = await supabase.functions.invoke("process-affiliate-signup", {
            body: { 
              userId, 
              referralCode: finalReferralCode,
              forceProcess: true
            }
          });

          if (affiliateError) {
            console.error("Error processing referral code:", affiliateError);
          } else {
            console.log('[SIGNUP] Affiliate processing response:', data);
            toast({
              title: "Referral Code Applied",
              description: "Your referral code has been successfully recorded.",
            });
          }
        } catch (procError) {
          console.error("Exception processing affiliate referral:", procError);
        }
      }

      // Clear referral code from localStorage AFTER processing is complete
      localStorage.removeItem("pendingReferralCode");

      if (isMobile) {
        showNotification("Account created successfully. Welcome to NikkahFirst!", "success");
      } else {
        toast({
          title: "Account created successfully",
          description: "Welcome to NikkahFirst!",
        });
      }
      
      const targetPath = formData.gender === 'male' ? '/shop' : '/dashboard';
      window.history.replaceState({}, '', targetPath);
      // ✅ Prevent redirect to /google-account-fix
      sessionStorage.setItem("googleAccountFixCompleted", "true");

      window.location.href = targetPath;
      
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className={errors.email ? "border-red-500" : ""}
                required
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "border-red-500" : ""}
                required
              />
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? "border-red-500" : ""}
                required
              />
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword}</p>}
            </div>
            <div className="space-y-2">
              <Label>I am a</Label>
              <RadioGroup value={formData.gender} onValueChange={handleRadioChange} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Brother</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Sister</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            {fromGoogle && (
              <div className="space-y-2">
                <Label>I am a</Label>
                <RadioGroup value={formData.gender} onValueChange={handleRadioChange} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male">Brother</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female">Sister</Label>
                  </div>
                </RadioGroup>
                {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Your first name"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? "border-red-500" : ""}
                required
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Your last name"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? "border-red-500" : ""}
                required
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
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
                required
              />
              {errors.dateOfBirth && <p className="text-xs text-red-500">{errors.dateOfBirth}</p>}
            </div>
          </div>
        );
      case 3:
        if (formData.gender === 'female') {
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-800">
                  As a sister, you'll need to provide your Wali's (guardian's) contact information. 
                  This is an important step in ensuring the marriage process follows Islamic principles.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waliName">Wali's Name</Label>
                <Input
                  id="waliName"
                  name="waliName"
                  placeholder="Your Wali's full name"
                  value={formData.waliName}
                  onChange={handleChange}
                  className={errors.waliName ? "border-red-500" : ""}
                  required
                />
                {errors.waliName && <p className="text-xs text-red-500">{errors.waliName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="waliContact">Wali's Phone Number</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.waliCountryCode} 
                    onValueChange={handleCountryCodeChange}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="+1" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {countryCodes.map(code => (
                        <SelectItem key={code.code} value={code.dial_code}>
                          <span className="mr-2">{code.flag}</span> {code.dial_code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="waliContact"
                    name="waliContact"
                    placeholder={`${getPhoneLengthForCountry(formData.waliCountryCode)} digits`}
                    value={formData.waliContact}
                    onChange={handleChange}
                    className={`flex-1 ${errors.waliContact ? "border-red-500" : ""}`}
                    required
                    inputMode="numeric"
                    maxLength={getPhoneLengthForCountry(formData.waliCountryCode)}
                  />
                </div>
                {errors.waliContact && <p className="text-xs text-red-500">{errors.waliContact}</p>}
                <p className="text-xs text-gray-500">
                  Required format: {getPhoneLengthForCountry(formData.waliCountryCode)} digits without spaces or special characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="waliEmail">Wali's Email <span className="text-red-500">*</span></Label>
                <Input
                  id="waliEmail"
                  name="waliEmail"
                  type="email"
                  placeholder="Your Wali's email address"
                  value={formData.waliEmail}
                  onChange={handleChange}
                  className={errors.waliEmail ? "border-red-500" : ""}
                  required
                />
                {errors.waliEmail && <p className="text-xs text-red-500">{errors.waliEmail}</p>}
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-sm text-blue-800">
                  As a brother, you'll get access to the app to browse daily for profiles. You may only accpet requests or send requests if you purchase a plan.
                </p>
              </div>
            </div>
          );
        }
      default:
        return null;
    }
  };

  const handleGoogleSignIn = async () => {
  try {
    const urlParams = new URLSearchParams(location.search);
    const referralCode = urlParams.get("ref");

    if (referralCode) {
      localStorage.setItem("pendingReferralCode", referralCode);
    }

    sessionStorage.setItem("fromGoogleLogin", "true");

    const { error } = await signInWithGoogle();
    if (error) navigate("/google-error");
  } catch (e) {
    navigate("/google-error");
  }
};




  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 hero-pattern">
        <Card className="w-full max-w-md shadow-lg border-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Heart className="h-10 w-10 fill-nikkah-pink text-nikkah-pink" />
            </div>
            <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
            
            {referralCode && (
              <div className="inline-flex items-center bg-nikkah-pink/10 text-nikkah-pink px-3 py-1 rounded-full text-sm mt-2">
                <User className="h-3 w-3 mr-1" />
                Referred by a friend
              </div>
            )}
            
            <div className="flex justify-center mt-4">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-nikkah-pink text-white' : 'bg-gray-200'}`}>1</div>
                <div className={`w-16 h-1 ${step >= 2 ? 'bg-nikkah-pink' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-nikkah-pink text-white' : 'bg-gray-200'}`}>2</div>
                <div className={`w-16 h-1 ${step >= 3 ? 'bg-nikkah-pink' : 'bg-gray-200'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-nikkah-pink text-white' : 'bg-gray-200'}`}>3</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
            <Button 
              onClick={handleNextStep} 
              className="w-full mt-6 bg-nikkah-pink hover:bg-nikkah-pink/90"
              disabled={loading}
            >
              {loading ? "Processing..." : (
                <>
                  {step === 3
                    ? "Complete Signup" 
                    : (
                      <>
                        Next Step <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )
                  }
                </>
              )}
            </Button>

            {step === 1 && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-nikkah-pink font-medium hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Signup;
