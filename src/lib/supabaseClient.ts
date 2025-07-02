
import { createClient } from '@supabase/supabase-js';

// These environment variables are automatically injected by Vite
const supabaseUrl = 'https://utzulhprsfbyaxjzmxmk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0enVsaHByc2ZieWF4anpteG1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NDkwNjYsImV4cCI6MjA1NzAyNTA2Nn0.8SAXVRHiOlkEuNtW2DsknoiSB2kbMjogQCqq27TVl-U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Handle getSignedPhotoUrl to handle placeholder and skip_photos cases
export const getSignedPhotoUrl = async (path: string) => {
  if (!path) return null;
  
  // Return placeholder image path for users who skipped photos or have placeholder.jpg
  if (path === 'placeholder.jpg' || path === '/placeholder.svg') {
    return '/placeholder.svg';
  }

  const { data, error } = await supabase.storage
    .from('profile-pictures')
    .createSignedUrl(path, 60 * 60); // 1 hour expiry

  if (error) {
    console.error('Error getting signed photo URL:', error.message);
    return null;
  }

  return data?.signedUrl || null;
};

// ✅ Add getUserRemainingRequests function
export const getUserRemainingRequests = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: { requests_remaining: 0 }, error: null };
  
  const userId = sessionData.session.user.id;
  return await supabase
    .from('profiles')
    .select('requests_remaining')
    .eq('id', userId)
    .single();
};

// ✅ Keep validateProfileData after that
export const validateProfileData = (profileData: any) => {
  console.log("Validating profile data:", profileData);
  const errors: Record<string, string> = {};
  let isValid = true;

  // Validate date of birth
  if (!profileData.date_of_birth) {
    errors.date_of_birth = "Date of birth is required";
    isValid = false;
  }

  // Validate wali information if provided
  if (profileData.wali_name !== null && !profileData.wali_name) {
    errors.wali_name = "Wali name is required";
    isValid = false;
  }

  if (profileData.wali_phone !== null && !profileData.wali_phone) {
    errors.wali_phone = "Wali phone is required";
    isValid = false;
  }

  if (profileData.wali_name && (!profileData.wali_email || profileData.wali_email === '')) {
    errors.wali_email = "Wali email is required when wali name is provided";
    isValid = false;
  }

  if (profileData.subscription_plan && ['Monthly Plan', 'Annual Plan', 'Unlimited Plan'].includes(profileData.subscription_plan)) {
    if (profileData.subscription_status === 'active' && profileData.subscription_plan !== 'Unlimited Plan' && !profileData.subscription_id) {
      errors.subscription_id = "Subscription ID is required for active subscriptions";
      isValid = false;
    }
  }

  console.log("Validation result:", { isValid, errors });
  return { isValid, errors };
};
