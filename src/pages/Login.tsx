
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Heart, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/context/AuthContext";
import { FormError } from "@/components/ui/form-error";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { supabase } from "@/lib/supabaseClient";
import { cleanupAuthState } from "@/lib/sessionRecovery";

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signIn, isLoading, user, signInWithGoogle, forceRecovery } = useAuth();
  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [showRecoveryOptions, setShowRecoveryOptions] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      console.log('[LOGIN] Saving referral code to localStorage:', refCode);
      localStorage.setItem('pendingReferralCode', refCode);
    }

    // Check if user is coming from a stuck state
    const isStuck = urlParams.get('stuck') === 'true';
    if (isStuck) {
      setShowRecoveryOptions(true);
      if (isMobile) {
        showNotification("We've detected you might be stuck in a login loop. Try the recovery options below.", "info");
      } else {
        toast({
          title: "Recovery Mode",
          description: "We've detected you might be stuck. Try the recovery options below.",
          variant: "default",
        });
      }
    }
  }, [isMobile, showNotification, toast]);

  useEffect(() => {
    const clearStaleSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session && new Date(data.session.expires_at * 1000) < new Date()) {
          await supabase.auth.signOut();
          console.log("Cleared stale session on login page");
        }
      } catch (error) {
        console.error("Error checking/clearing session:", error);
      }
    };
    
    clearStaleSession();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof errors];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      let errorMessage = error.message || "Failed to log in. Please check your credentials.";
      
      // Check for specific auth errors that indicate session issues
      if (errorMessage.includes("403") || 
          errorMessage.includes("Forbidden") ||
          errorMessage.includes("refresh_token_not_found") ||
          errorMessage.includes("Invalid Refresh Token")) {
        errorMessage = "Your session has expired. Please try the recovery options below.";
        setShowRecoveryOptions(true);
      }
      
      setErrors({ general: errorMessage });
      
      if (isMobile) {
        showNotification(errorMessage, "error");
      } else {
        toast({
          title: "Login failed",
          description: errorMessage,
          variant: "destruct‌ive",
        });
      }
    } else {
      if (isMobile) {
        showNotification("Logged in successfully", "success");
      } else {
        toast({
          title: "Logged in successfully",
          description: "Welcome back to NikkahFirst!",
        });
      }
    }
  };


  const handleClearCache = () => {
    cleanupAuthState();
    if (isMobile) {
      showNotification("Browser cache cleared. Please try signing in again.", "success");
    } else {
      toast({
        title: "Cache Cleared",
        description: "Browser cache cleared. Please try signing in again.",
        variant: "default",
      });
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (user) {
    return <div className="flex h-screen items-center justify-center">Redirecting...</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 hero-pattern">
        <Card className="w-full max-w-md shadow-lg border-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Heart className="h-10 w-10 fill-nikkah-pink text-nikkah-pink" />
            </div>
            <CardTitle className="text-2xl font-bold">Log in to NikkahFirst</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <div className="bg-destructive/10 p-3 rounded-md">
                  <FormError message={errors.general} />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={!!errors.email}
                  required
                />
                <FormError message={errors.email} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-nikkah-blue hover:text-nikkah-blue/90"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  error={!!errors.password}
                  required
                />
                <FormError message={errors.password} />
              </div>
              <Button type="submit" className="w-full bg-nikkah-pink hover:bg-nikkah-pink/90" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            
              

              {showRecoveryOptions && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <h3 className="font-medium text-yellow-800">Having trouble signing in?</h3>
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearCache}
                      className="w-full text-sm"
                    >
                      Clear Browser Cache
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={forceRecovery}
                      className="w-full text-sm"
                    >
                      Reset Authentication
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-nikkah-pink font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default Login;
