import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNotification } from "@/hooks/use-mobile-notification";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface UserProfile {
  id: string;
  gender: string | null;
  subscription_status: string | null;
  onboarding_completed: boolean | null;
  ethnicity: string[] | null;
  photos: string[] | null;
  looking_for_country: string[] | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  wali_name: string | null;
  wali_phone: string | null;
  wali_email: string | null;
  is_canceled: boolean | null;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, forceRecovery } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { showNotification } = useMobileNotification();

  // Route classifications
  const isPublicRoute = ['/login', '/signup', '/forgot-password', '/reset-password', '/affiliate'].includes(location.pathname);
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');
  const isShopRoute = location.pathname === '/shop';
  const isMobileCheckout = location.pathname === '/mobile-checkout';
  const isAffiliateRoute = location.pathname === '/affiliate/dashboard';
  const isGoogleAccountFixRoute = location.pathname === '/google-account-fix';
  const isGoogleFixWaliRoute = location.pathname === '/google-fix-wali';

  const searchParams = new URLSearchParams(location.search);
  const paymentSuccess = searchParams.get('success') === 'true';
  const isFromGoogle = searchParams.get('fromGoogle') === 'true';

  // Session storage flags
  const googleAccountFixCompleted = sessionStorage.getItem("googleAccountFixCompleted") === "true";
  const waliInfoCompleted = sessionStorage.getItem("waliInfoCompleted") === "true";

  // Payment success handler
  useEffect(() => {
    if (paymentSuccess && profile) {
      if (isMobile) {
        showNotification("Payment Successful! Your subscription has been activated.", "success");
      } else {
        toast({
          title: "Payment Successful!",
          description: "Your subscription has been activated.",
          variant: "default",
        });
      }
      
      if (profile.gender === 'male' || isFromGoogle) {
        window.location.replace('/onboarding/ethnicity');
      } else {
        const newUrl = location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [paymentSuccess, profile, location.pathname, toast, isMobile, showNotification, isFromGoogle]);

  // Profile fetching with error recovery
  const fetchProfile = async (userId: string, attempt: number = 0) => {
    try {
      setProfileError(null);
      console.log(`Fetching profile for user: ${userId} (attempt ${attempt + 1})`);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, gender, subscription_status, is_canceled, ethnicity, photos, 
          looking_for_country, first_name, last_name, date_of_birth, 
          wali_name, wali_phone, wali_email, onboarding_completed
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error);
        
        // Handle specific auth errors that indicate session issues
        if (error.message.includes('JWT') || 
            error.message.includes('refresh_token_not_found') ||
            error.code === 'PGRST301') {
          console.log("Auth error detected, triggering recovery");
          setProfileError("Authentication session expired. Please sign in again.");
          return null;
        }
        
        throw error;
      }

      if (!data) {
        console.log("No profile found for user");
        setProfileError("Profile not found. Please complete signup.");
        return null;
      }

      console.log("Profile fetched successfully:", { 
        id: data.id, 
        gender: data.gender, 
        subscription_status: data.subscription_status,
        onboarding_completed: data.onboarding_completed 
      });
      
      return data as UserProfile;
    } catch (error: any) {
      console.error(`Profile fetch failed (attempt ${attempt + 1}):`, error);
      
      if (attempt < 2) {
        // Retry with exponential backoff
        setTimeout(() => {
          fetchProfile(userId, attempt + 1);
        }, 1000 * (attempt + 1));
        return null;
      }
      
      setProfileError("Unable to load profile. Please try refreshing the page.");
      return null;
    }
  };

  // Load profile when user is available
  useEffect(() => {
    if (user && !isPublicRoute) {
      setProfileLoading(true);
      fetchProfile(user.id).then((profileData) => {
        setProfile(profileData);
        setProfileLoading(false);
      });
    } else {
      setProfileLoading(false);
    }
  }, [user, isPublicRoute]);

  // Loading states
  if (isLoading || (user && profileLoading && !isPublicRoute)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-nikkah-pink" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Error state with recovery option
  if (profileError && user && !isPublicRoute) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{profileError}</p>
          <div className="space-y-3">
            <Button 
              onClick={() => {
                setRetryCount(prev => prev + 1);
                setProfileError(null);
                if (user) {
                  setProfileLoading(true);
                  fetchProfile(user.id).then((profileData) => {
                    setProfile(profileData);
                    setProfileLoading(false);
                  });
                }
              }}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={forceRecovery}
              className="w-full"
            >
              Sign Out & Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Public routes - allow access
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // No profile data and not on public routes - redirect to signup
  if (!profile) {
    const referralCode = searchParams.get("ref");
    const redirectPath = `/signup?step=2&fromGoogle=true${referralCode ? `&ref=${referralCode}` : ''}`;
    return <Navigate to={redirectPath} replace />;
  }

  // Affiliate user - redirect to affiliate dashboard
  if (profile.gender === 'affiliate' && !isAffiliateRoute) {
    console.log("Redirecting affiliate user to affiliate dashboard");
    sessionStorage.setItem("googleAccountFixCompleted", "true");
    return <Navigate to="/affiliate/dashboard" replace />;
  }

  // Google account fix needed
  const needsGoogleFix = !profile.first_name || !profile.last_name || !profile.date_of_birth;
  if (needsGoogleFix && !googleAccountFixCompleted && !isGoogleAccountFixRoute && !isGoogleFixWaliRoute && profile.gender !== 'affiliate') {
    console.log("Redirecting to Google account fix page");
    return <Navigate to="/google-account-fix" replace />;
  }

  // Female users need wali information
  const needsWaliInfo = profile.gender === 'female' && (!profile.wali_name || !profile.wali_phone || !profile.wali_email);
  if (needsWaliInfo && !waliInfoCompleted && !isGoogleFixWaliRoute && !isGoogleAccountFixRoute && profile.gender !== 'affiliate') {
    console.log("Female user needs to complete wali information");
    return <Navigate to="/google-fix-wali" replace />;
  }

  // Onboarding completion check
  const validEthnicity = profile.ethnicity && Array.isArray(profile.ethnicity) && profile.ethnicity.length > 0;
  const validPhotos = profile.photos && Array.isArray(profile.photos) && profile.photos.filter(photo => photo && photo.trim() !== "").length > 0;
  const validCountry = profile.looking_for_country && Array.isArray(profile.looking_for_country) && profile.looking_for_country.length > 0;
  
  const onboardingComplete = validEthnicity && validPhotos && validCountry;
  
  if (!profile.onboarding_completed && profile.gender !== 'affiliate') {
    if (isOnboardingRoute) {
      return <>{children}</>; // Allow access to onboarding pages
    }
    if (!isShopRoute && !isMobileCheckout) {
      return <Navigate to="/onboarding/ethnicity" replace />;
    }
  }

  // All checks passed - render children
  return <>{children}</>;
};

export default ProtectedRoute;
