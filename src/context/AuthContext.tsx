
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cleanupAuthState, forceSignOut, recoverSession } from '@/lib/sessionRecovery';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isRefreshing: boolean;
  signUp: (email: string, password: string, metadata: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkSubscription: () => Promise<{ isActive: boolean; isCancelled?: boolean; plan?: string; renewalDate?: string }>;
  refreshProfile: (userId: string) => Promise<void>;
  forceRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Request deduplication - moved outside component to avoid JSX parsing issues
const pendingRequests = new Map<string, Promise<any>>();

function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }
  
  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshProfile = async (userId: string) => {
    return deduplicate(`refresh-profile-${userId}`, async () => {
      setIsRefreshing(true);
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        if (session && profile) {
          const newSession = {
            ...session,
            user: {
              ...session.user,
              user_metadata: {
                ...session.user.user_metadata,
                ...profile
              }
            }
          };
          setSession(newSession);
          setUser(newSession.user);
        }
      } catch (error) {
        console.error('Error refreshing profile:', error);
      } finally {
        setIsRefreshing(false);
      }
    });
  };

  const forceRecovery = async () => {
    console.log('Force recovery initiated by user');
    await forceSignOut();
  };

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, session?.user?.id);
      
      // Handle authentication errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, attempting recovery');
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(async () => {
            if (mounted) {
              const recoveredSession = await recoverSession();
              if (!recoveredSession && retryCount >= maxRetries) {
                console.error('Session recovery failed after retries');
                await forceSignOut();
              }
            }
          }, 1000 * retryCount);
        } else {
          await forceSignOut();
        }
        return;
      }

      // Reset retry count on successful auth
      if (session) {
        retryCount = 0;
      }
      
      // Update state synchronously
      setSession(session);
      setUser(session?.user || null);
      
      // Handle profile initialization asynchronously with timeout
      if (session?.user && event === 'SIGNED_IN') {
        setTimeout(async () => {
          if (!mounted) return;
          
          try {
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('id, gender, requests_remaining')
              .eq('id', session.user.id)
              .maybeSingle();
            
            if (!error && profile && (profile.requests_remaining === null)) {
              if (profile.gender !== 'affiliate') {
                const initialRequests = profile.gender === 'female' ? 3 : 0;
                await supabase
                  .from('profiles')
                  .update({ requests_remaining: initialRequests })
                  .eq('id', profile.id);
              }
            }
          } catch (err) {
            console.error("Error updating requests remaining:", err);
          }
        }, 100);
      }
      
      if (mounted) {
        setIsLoading(false);
      }
    });

    // Get initial session with recovery
    const getInitialSession = async () => {
      try {
        const session = await recoverSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user || null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    getInitialSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    options?: { data?: Record<string, any> }
  ): Promise<{ error: any }> => {
    setIsLoading(true);
    try {
      // Clean up any existing auth state first
      cleanupAuthState();
      
      const redirectUrl = `${window.location.origin}/login?fromSignup=true`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...options,
          emailRedirectTo: redirectUrl
        }
      });
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Clean up existing state before signing in
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Global sign out failed during sign in, continuing:', err);
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Handle specific auth errors
        if (error.message.includes('refresh_token_not_found') || 
            error.message.includes('Invalid Refresh Token') ||
            error.status === 400 || 
            error.status === 403) {
          cleanupAuthState();
        }
      }
      
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      // Clean up existing state
      cleanupAuthState();

      const referralCode = localStorage.getItem('pendingReferralCode');
      console.log("[AUTH] Google sign-in with referral:", referralCode);

      const redirectTo = referralCode
        ? `${window.location.origin}/login?fromGoogle=true&ref=${referralCode}`
        : `${window.location.origin}/login?fromGoogle=true`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        }
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error("Google sign-in error:", error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      return { error };
    } catch (error) {
      console.error("Reset password error:", error);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        setUser(null);
        setSession(null);
        setIsLoading(false);
        navigate('/login');
        return { error: null };
      }
      
      const { error } = await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setIsLoading(false);
      
      // Complete cleanup
      cleanupAuthState();
      
      if (error) {
        console.error("Error signing out:", error);
        toast({
          title: "Warning",
          description: "Session expired. You've been logged out.",
          variant: "default",
        });
      }
      
      navigate('/login');
      return { error };
    } catch (error) {
      console.error("Error in signOut function:", error);
      setUser(null);
      setSession(null);
      setIsLoading(false);
      cleanupAuthState();
      navigate('/login');
      return { error };
    }
  };

  const checkSubscription = async () => {
    if (!user) return { isActive: false };
    
    return deduplicate(`check-subscription-${user.id}`, async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_id, subscription_plan, renewal_date, is_canceled')
          .eq('id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        return { 
          isActive: data?.subscription_status === 'active',
          isCancelled: data?.is_canceled === true,
          plan: data?.subscription_plan,
          renewalDate: data?.renewal_date
        };
      } catch (error) {
        console.error("Error checking subscription:", error);
        return { isActive: false };
      }
    });
  };

  const value = {
    user,
    session,
    isLoading,
    isRefreshing,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    checkSubscription,
    refreshProfile,
    forceRecovery,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
