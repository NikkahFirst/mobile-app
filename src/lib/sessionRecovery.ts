
import { supabase } from '@/lib/supabaseClient';

export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
  
  // Clear app-specific session storage
  sessionStorage.removeItem("googleAccountFixCompleted");
  sessionStorage.removeItem("currentOnboardingStep");
  sessionStorage.removeItem("alreadyRedirected");
  sessionStorage.removeItem("redirectAttempts");
  sessionStorage.removeItem("redirectedFromOnboarding");
  sessionStorage.removeItem("waliInfoCompleted");
};

export const forceSignOut = async () => {
  try {
    cleanupAuthState();
    
    // Attempt global sign out
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.warn('Global sign out failed, continuing with cleanup:', err);
    }
    
    // Force page reload for clean state
    window.location.href = '/login';
  } catch (error) {
    console.error('Error in force sign out:', error);
    // Force redirect even if signout fails
    window.location.href = '/login';
  }
};

export const recoverSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session recovery error:', error);
      // If we get specific auth errors, force cleanup
      if (error.message.includes('refresh_token_not_found') || 
          error.message.includes('Invalid Refresh Token') ||
          error.status === 400 || 
          error.status === 403) {
        await forceSignOut();
        return null;
      }
    }
    
    return session;
  } catch (error) {
    console.error('Session recovery failed:', error);
    await forceSignOut();
    return null;
  }
};
