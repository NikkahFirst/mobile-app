
import { getSignedPhotoUrl } from "@/lib/supabaseClient";
import { ProcessedProfile, ProfileData } from "@/types/photo";

// Helper function to process photos and add signedPhotoUrl field
export const processProfilePhotos = async (profile: any): Promise<ProcessedProfile> => {
  if (!profile) return profile;
  
  // Create a copy of the profile to work with
  const processedProfile: ProcessedProfile = { 
    ...profile,
    signedPhotoUrl: null,
    photosVisible: true
  };
  
  // If profile has photos, process them
  if (profile.photos && Array.isArray(profile.photos) && profile.photos.length > 0) {
    // Get first photo for preview purposes
    const firstPhoto = profile.photos[0];
    if (firstPhoto) {
      const signedUrl = await getSignedPhotoUrl(firstPhoto);
      processedProfile.signedPhotoUrl = signedUrl;
    }
  } else if ((profile.skip_photos === true) && profile.gender === 'female') {
    // For female users who skipped photos, use the new placeholder
    processedProfile.signedPhotoUrl = '/lovable-uploads/e492f048-5b1b-401a-99be-ca849afa5116.png';
  }
  
  return processedProfile;
};

// Helper function to process multiple profiles at once
export const processMultipleProfiles = async (profiles: any[]): Promise<ProcessedProfile[]> => {
  if (!profiles || !Array.isArray(profiles)) return [];
  
  return await Promise.all(profiles.map(processProfilePhotos));
};

// Helper function to convert ProcessedProfile to ProfileData for compatibility
export const toProfileData = (profile: ProcessedProfile): ProfileData => {
  return {
    ...profile,
    signedPhotoUrl: profile.signedPhotoUrl || null,
    photosVisible: profile.photosVisible !== false
  };
};
