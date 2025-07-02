
// lib/validateProfile.ts
export const needsGoogleAccountFix = (profile: any) => {
  // Skip Google account fix for affiliate users
  if (profile?.gender === 'affiliate') {
    return false;
  }
  
  return (
    !profile?.first_name ||
    !profile?.last_name ||
    !profile?.gender ||
    !profile?.date_of_birth
  );
};

export const needsWaliInformation = (profile: any) => {
  if (profile?.gender !== 'female') {
    return false;
  }
  
  return (
    !profile?.wali_name ||
    !profile?.wali_phone ||
    !profile?.wali_email
  );
};

export const isOnboardingIncomplete = (profile: any) => {
  // Affiliates don't need onboarding
  if (profile?.gender === 'affiliate') {
    return false;
  }
  
  const hasEthnicity =
    profile?.ethnicity &&
    (typeof profile.ethnicity === 'string' || (Array.isArray(profile.ethnicity) && profile.ethnicity.length > 0));

  // Check if photos are required based on gender and skip_photos setting
  const isPhotoRequired = profile?.gender !== "female" || !profile?.skip_photos;

  const hasPhotos =
    Array.isArray(profile?.photos) &&
    profile.photos.length > 0 && 
    profile.photos.some((p: string) => typeof p === 'string' && p.trim() !== '');

  const hasLookingForCountry =
    (Array.isArray(profile?.looking_for_country) && profile.looking_for_country.length > 0) ||
    (typeof profile?.looking_for_country === 'string' && profile.looking_for_country.trim() !== '');

  return !(hasEthnicity && (hasPhotos || !isPhotoRequired) && hasLookingForCountry);
};
