
export type SignedPhoto = string | {
  url: string;
  path: string;
};

export interface ProcessedProfile {
  signedPhotoUrl?: string | null;
  photosVisible?: boolean;
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  photos?: (string | SignedPhoto)[] | null;
  country?: string | null;
  age?: number;
  personality_compatibility?: number;
  [key: string]: any;
}

// Enhanced ProfileData interface to match the existing codebase
export interface ProfileData extends ProcessedProfile {
  date_of_birth?: string | null;
  gender?: string | null;
  ethnicity?: string[] | null;
  created_at?: string | null;
  onboarding_completed?: boolean;
  can_be_fetched?: boolean;
  email?: string | null;
  email_notifications?: boolean;
  height_cm?: number | null;
  weight_kg?: number | null;
  marital_status?: string | null;
  sect?: string | null;
  salah?: string | null;
  profession?: string | null;
  highest_education?: string | null;
  self_summary?: string | null;
  islamic_practices?: string | null;
  looking_for_ethnicity?: string[] | null;
  looking_for_summary?: string | null;
  looking_for_age_min?: number | null;
  looking_for_age_max?: number | null;
  looking_for_height_min?: number | null;
  looking_for_height_max?: number | null;
  looking_for_country?: string[] | null;
  phone_number?: string | null;
  wali_name?: string | null;
  wali_phone?: string | null;
  wali_email?: string | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  requests_remaining?: number | null;
  renewal_date?: string | null;
  last_seen?: string | null;
  last_online?: string | null;
  stripe_customer_id?: string | null;
  subscription_id?: string | null;
  referred_by?: string | null;
  has_used_referral?: boolean;
  is_canceled?: boolean;
  has_received_initial_allocation?: boolean;
  payment_reminder_sent?: boolean;
  open_to_all_ethnicities?: boolean;
  open_to_all_countries?: boolean;
  skip_photos?: boolean;
  updated_at?: string | null;
  next_payment_date?: string | null;
  // Ensure these are always present for compatibility
  signedPhotoUrl?: string | null;
  photosVisible?: boolean;
}

// Extended type for profiles with photo processing
export interface ExtendedProfile extends ProfileData {
  signedPhotoUrl?: string | null;
  photosVisible?: boolean;
}
