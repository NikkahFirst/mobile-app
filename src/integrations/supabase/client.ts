import { supabase } from "@/lib/supabaseClient";
import type { TablesInsert, TablesUpdate } from "./types";

export { supabase }; // Export supabase so it can be imported by other components

export const getProfileById = async (id: string) => {
  return await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
};

export const updateProfile = async (
  id: string,
  updates: TablesUpdate<"profiles">
) => {
  return await supabase.from("profiles").update(updates).eq("id", id);
};

export const createProfile = async (profile: TablesInsert<"profiles">) => {
  return await supabase.from("profiles").insert([profile]);
};

export const getProfiles = async () => {
  return await supabase.from("profiles").select("*");
};

export const getAllProfiles = async () => {
  return await supabase.from("profiles").select("*").eq("can_be_fetched", true);
};

export const getProfilesForSearch = async (filters: any = {}, sorting: any = {}) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  // Get the current user's gender to apply visibility rules
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('gender')
    .eq('id', userId)
    .single();
  
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('can_be_fetched', true)
    .eq('onboarding_completed', true);  // Add this line to filter only completed profiles
  
  // If the current user is female, only show male profiles with active subscription
  if (currentUserProfile?.gender === 'female') {
    query = query.or(`gender.neq.male,and(gender.eq.male,subscription_status.eq.active)`);
  }
  
  // Apply filters if provided
  if (filters) {
    if (filters.country) {
      query = query.eq('country', filters.country);
    }
    if (filters.gender) {
      query = query.eq('gender', filters.gender);
    }
    if (filters.age_min) {
      query = query.gte('date_of_birth', filters.age_min);
    }
     if (filters.age_max) {
       query = query.lte('date_of_birth', filters.age_max);
     }
    if (filters.height_min) {
      query = query.gte('height_cm', filters.height_min);
    }
    if (filters.height_max) {
      query = query.lte('height_cm', filters.height_max);
    }
    if (filters.ethnicity && filters.ethnicity.length > 0) {
      query = query.contains('ethnicity', filters.ethnicity);
    }
  }
  
  // Apply sorting if provided
  if (sorting && sorting.field) {
    const ascending = sorting.order === 'asc';
    query = query.order(sorting.field, { ascending });
  }
  
  const { data, error } = await query;
  
  // If data is found, sanitize the profiles to use display_name or "Anonymous"
  if (data) {
    return {
      data: data.map((profile: any) => ({
        ...profile,
        first_name: profile.display_name || "Anonymous",
        last_name: "" // Don't display last name anymore
      })),
      error
    };
  }
  
  return { data, error };
};

export const sendMatchRequest = async (requested_id: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  // Check if the user has enough requests remaining
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('requests_remaining')
    .eq('id', userId)
    .single();
  
  if (profileError) {
    console.error("Error checking requests remaining:", profileError);
    return { data: null, error: profileError };
  }
  
  if (userProfile.requests_remaining === 0 || userProfile.requests_remaining === null) {
    return { data: null, error: { message: "You have no requests remaining. Please purchase more or wait for renewal." }, noRequests: true };
  }
  
  // Check if the requested user has already sent a request to this user
  const { data: existingIncomingRequests, error: incomingRequestsError } = await supabase
    .from('match_requests')
    .select('*')
    .eq('requester_id', requested_id)
    .eq('requested_id', userId);
    
  if (incomingRequestsError) {
    console.error("Error checking incoming match requests:", incomingRequestsError);
    return { data: null, error: incomingRequestsError };
  }
  
  if (existingIncomingRequests && existingIncomingRequests.length > 0) {
    console.log("User cannot request someone who has already requested them.");
    return { data: null, error: { message: "This user has already requested to match with you. Please check your incoming requests." } };
  }
  
  // Get requester profile details for the email
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('first_name, email')
    .eq('id', userId)
    .single();
  
  // Get requested user profile details for the email
  const { data: requestedProfile } = await supabase
    .from('profiles')
    .select('first_name, email, email_notifications')
    .eq('id', requested_id)
    .single();
  
  const { data: existingRequests, error: existingRequestsError } = await supabase
    .from('match_requests')
    .select('*')
    .eq('requester_id', userId)
    .eq('requested_id', requested_id);

  if (existingRequestsError) {
    console.error("Error checking existing match requests:", existingRequestsError);
    return { data: null, error: existingRequestsError };
  }

  if (existingRequests && existingRequests.length > 0) {
    console.log("Match request already sent to this user.");
    return { data: null, error: { message: "Match request already sent to this user." }, alreadyRequested: true };
  }
  
  // Create the match request
  const { data, error } = await supabase
    .from("match_requests")
    .insert([{ requester_id: userId, requested_id: requested_id }]);
  
  if (!error) {
    // Deduct one request from the user's remaining requests
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ requests_remaining: userProfile.requests_remaining - 1 })
      .eq('id', userId);
    
    if (updateError) {
      console.error("Error updating requests remaining:", updateError);
    }
    
    // Send email notification if email_notifications is enabled
    if (requestedProfile?.email_notifications) {
      try {
        console.log("Sending match request email notification");
        const emailResponse = await supabase.functions.invoke("send-notification-email", {
          body: {
            to: requestedProfile.email,
            type: "match_request",
            senderName: requesterProfile?.first_name || "Someone",
            recipientName: requestedProfile?.first_name || "there"
          }
        });
        console.log("Email notification response:", emailResponse);
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }
  }
  
  return { data, error, alreadyRequested: true };
};

export const updateMatchRequest = async (id: string, status: string) => {
  // Get the match request details first
  const { data: requestData, error: fetchError } = await supabase
    .from('match_requests')
    .select('*')
    .eq('id', id)
    .single();
    
  if (fetchError) {
    console.error("Error fetching match request details:", fetchError);
    return { data: null, error: fetchError };
  }

  const { data, error } = await supabase
    .from('match_requests')
    .update({ status })
    .eq('id', id);
  
  // If request was accepted, create a match record
  if (status === 'accepted' && !error && requestData) {
    // Create a new match record
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([{ 
        user_one_id: requestData.requester_id, 
        user_two_id: requestData.requested_id 
      }]);
      
    if (matchError) {
      console.error("Error creating match:", matchError);
      return { data, error: matchError };
    }
    
    // Clean up any photo requests between the matched users
    try {
      await supabase
        .from('photo_reveal_requests')
        .update({ status: 'matched' })
        .or(`(requester_id.eq.${requestData.requester_id}.and.requested_id.eq.${requestData.requested_id}),(requester_id.eq.${requestData.requested_id}.and.requested_id.eq.${requestData.requester_id})`);
    } catch (error) {
      console.error("Error cleaning up photo requests after match:", error);
    }
    
    // Get requester profile details
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('first_name, email, email_notifications')
      .eq('id', requestData.requester_id)
      .single();
    
    // Get responder profile details
    const { data: responderProfile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', requestData.requested_id)
      .single();
    
    // Send email notification if email_notifications is enabled
    if (requesterProfile?.email_notifications) {
      try {
        console.log("Sending match accepted email notification");
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: requesterProfile.email,
            type: "match_accepted",
            senderName: responderProfile?.first_name || "Someone",
            recipientName: requesterProfile?.first_name || "there"
          }
        });
      } catch (emailError) {
        console.error("Failed to send match accepted email notification:", emailError);
      }
    }
  }
  
  return { data, error };
};

export const checkIfAlreadyRequested = async (requested_id: string, requester_id?: string, checkIncoming = false) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  let query = supabase
    .from('match_requests')
    .select('*');
  
  if (checkIncoming) {
    // Check if the requested_id has sent a request to the current user
    query = query.eq('requester_id', requested_id).eq('requested_id', userId);
  } else if (requester_id) {
    // Check if requester_id has sent a request to requested_id
    query = query.eq('requester_id', requester_id).eq('requested_id', requested_id);
  } else {
    // Check if current user has sent a request to requested_id
    query = query.eq('requester_id', userId).eq('requested_id', requested_id);
  }
  
  const { data, error } = await query;
  return { data, error };
};

export const getUserMatches = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  if (!userId) {
    return { data: [], error: { message: "Not authenticated" } };
  }
  
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      user_one:user_one_id (
        id,
        first_name,
        photos,
        country,
        wali_name,
        wali_phone,
        wali_email,
        last_seen,
        gender
      ),
      user_two:user_two_id (
        id,
        first_name,
        photos,
        country,
        wali_name,
        wali_phone,
        wali_email,
        last_seen,
        gender
      )
    `)
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);
  
  if (error) {
    console.error("Error fetching matches:", error);
    return { data: null, error };
  }
  
  return { data, error };
};

export const hidePhotosFromMatch = async (matchId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  if (!userId) {
    return { data: null, error: { message: "Not authenticated" } };
  }
  
  // Check if the user is female (only females can hide photos)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('gender')
    .eq('id', userId)
    .single();
    
  if (!userProfile || userProfile.gender !== 'female') {
    return { data: null, error: { message: "Only female users can hide photos" } };
  }
  
  // Update the match to set photos as hidden
  const { data, error } = await supabase
    .from('matches')
    .update({ photos_hidden: true })
    .eq('id', matchId)
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);
  
  return { data, error };
};

export const unhidePhotosFromMatch = async (matchId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  if (!userId) {
    return { data: null, error: { message: "Not authenticated" } };
  }
  
  // Check if the user is female (only females can unhide photos)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('gender')
    .eq('id', userId)
    .single();
    
  if (!userProfile || userProfile.gender !== 'female') {
    return { data: null, error: { message: "Only female users can unhide photos" } };
  }
  
  // Update the match to unhide photos
  const { data, error } = await supabase
    .from('matches')
    .update({ photos_hidden: false })
    .eq('id', matchId)
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);
  
  return { data, error };
};

export const saveProfile = async (profileId: string) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  // Check if user is freemium (male without active subscription)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('gender, subscription_status')
    .eq('id', session.user.id)
    .single();

  const isFreemium = userProfile?.gender === 'male' && 
                    userProfile?.subscription_status !== 'active';

  // If freemium, check saved profiles limit
  if (isFreemium) {
    const { count } = await getSavedProfilesCount();
    if (count >= 3) {
      throw new Error('FREEMIUM_LIMIT_REACHED');
    }
  }

  const { data, error } = await supabase
    .from('saved_profiles')
    .insert([
      {
        user_id: session.user.id,
        profile_id: profileId
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving profile:', error);
    throw error;
  }

  return { data, error: null };
};

export const unsaveProfile = async (profileId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  return await supabase
    .from('saved_profiles')
    .delete()
    .eq('user_id', userId)
    .eq('profile_id', profileId);
};

export const isProfileSaved = async (profileId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  const { data, error } = await supabase
    .from('saved_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('profile_id', profileId);
  
  return { isSaved: data !== null && data.length > 0, error };
};

export const sendPhotoRevealRequest = async (requested_id: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const requester_id = sessionData.session?.user.id;
  
  // Check if the users are already matched
  const { data: matches } = await getUserMatches();
  if (matches) {
    const isMatchFound = matches.some((match: any) => 
      (match.user_one.id === requested_id || match.user_two.id === requested_id)
    );
    
    if (isMatchFound) {
      console.log("Users are already matched. No need for photo request.");
      return { 
        data: null, 
        error: { message: "You are already matched with this user and can view their photos." }, 
        alreadyMatched: true 
      };
    }
  }
  
  // Check if the requested user has already sent a request to this user
  const { data: existingIncomingRequests, error: incomingRequestsError } = await supabase
    .from('photo_reveal_requests')
    .select('*')
    .eq('requester_id', requested_id)
    .eq('requested_id', requester_id);
    
  if (incomingRequestsError) {
    console.error("Error checking incoming photo requests:", incomingRequestsError);
    return { data: null, error: incomingRequestsError };
  }
  
  if (existingIncomingRequests && existingIncomingRequests.length > 0) {
    console.log("User cannot request photos from someone who has already requested them.");
    return { data: null, error: { message: "This user has already requested to view your photos. Please check your incoming requests." } };
  }
  
  // Check if the user has enough requests remaining
  const { data: userProfile, error: profileError } = await supabase
    .from('profiles')
    .select('requests_remaining')
    .eq('id', requester_id)
    .single();
  
  if (profileError) {
    console.error("Error checking requests remaining:", profileError);
    return { data: null, error: profileError, alreadyRequested: false };
  }
  
  if (userProfile.requests_remaining === 0 || userProfile.requests_remaining === null) {
    return { 
      data: null, 
      error: { message: "You have no requests remaining. Please purchase more or wait for renewal." }, 
      alreadyRequested: false,
      noRequests: true 
    };
  }
  
  // Get requester profile details for the email
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('first_name, email')
    .eq('id', requester_id)
    .single();
  
  // Get requested user profile details for the email
  const { data: requestedProfile } = await supabase
    .from('profiles')
    .select('first_name, email, email_notifications')
    .eq('id', requested_id)
    .single();
  
  // Check if a request already exists
  const { data: existingRequests, error: existingRequestsError } = await supabase
    .from('photo_reveal_requests')
    .select('*')
    .eq('requester_id', requester_id)
    .eq('requested_id', requested_id);
  
  if (existingRequestsError) {
    console.error("Error checking existing photo reveal requests:", existingRequestsError);
    return { data: null, error: existingRequestsError, alreadyRequested: false };
  }
  
  if (existingRequests && existingRequests.length > 0) {
    console.log("Photo reveal request already sent to this user.");
    return { data: null, error: { message: "Photo reveal request already sent to this user." }, alreadyRequested: true };
  }
  
  // If no existing request, create a new one
  const { data, error } = await supabase
    .from("photo_reveal_requests")
    .insert([{ requester_id: requester_id, requested_id: requested_id }]);
  
  if (!error) {
    // Deduct one request from the user's remaining requests
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ requests_remaining: userProfile.requests_remaining - 1 })
      .eq('id', requester_id);
    
    if (updateError) {
      console.error("Error updating requests remaining:", updateError);
    }
    
    // Send email notification if email_notifications is enabled
    if (!error && requestedProfile?.email_notifications) {
      try {
        console.log("Sending photo request email notification");
        const emailResponse = await supabase.functions.invoke("send-notification-email", {
          body: {
            to: requestedProfile.email,
            type: "photo_request",
            senderName: requesterProfile?.first_name || "Someone",
            recipientName: requesterProfile?.first_name || "there"
          }
        });
        console.log("Email notification response:", emailResponse);
      } catch (emailError) {
        console.error("Failed to send photo request email notification:", emailError);
      }
    }
  }
  
  return { data, error, alreadyRequested: false };
};

export const shouldPhotosBeVisible = async (profileId: string) => {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      return { visible: false, status: 'none' };
    }

    const currentUserId = sessionData.session.user.id;

    // Get the genders to determine visibility rules
    const { data: viewerData } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', currentUserId)
      .single();

    const { data: profileData } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', profileId)
      .single();

    if (!viewerData || !profileData) {
      return { visible: false, status: 'none' };
    }

    // If the viewer is female and viewing a male profile, photos are always visible
    if (viewerData.gender === 'female' && profileData.gender === 'male') {
      return { visible: true, status: 'visible' };
    }

    // If the profile being viewed is not female, photos are visible
    if (profileData.gender !== 'female') {
      return { visible: true, status: 'visible' };
    }

    // 1. Check if a female has sent a match request to this male (female requested male)
    if (profileData.gender === 'female' && viewerData.gender === 'male') {
      const { data: femaleRequested } = await supabase
        .from('match_requests')
        .select('*')
        .eq('requester_id', profileId) // Female
        .eq('requested_id', currentUserId) // Male
        .eq('status', 'pending')
        .maybeSingle();

      if (femaleRequested) {
        return { visible: true, status: 'requested' };
      }
    }

    // 2. Check for active match between the two
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user_one_id.eq.${profileId},user_two_id.eq.${profileId}`)
      .eq('status', 'active');

    const matchInfo = matches?.find((match: any) =>
      (match.user_one_id === profileId || match.user_two_id === profileId) &&
      (match.user_one_id === currentUserId || match.user_two_id === currentUserId)
    );

    if (matchInfo) {
      return {
        visible: !matchInfo.photos_hidden,
        status: 'matched',
        matchId: matchInfo.id
      };
    }

    return { visible: false, status: 'none' };
  } catch (error) {
    console.error("Error checking photo visibility:", error);
    return { visible: false, status: 'error' };
  }
};


export const validateProfileData = (profileData: any) => {
  let errors: { [key: string]: string } = {};
  let isValid = true;
  
  if (!profileData.first_name) {
    errors.first_name = "First name is required";
    isValid = false;
  }
  
  if (!profileData.last_name) {
    errors.last_name = "Last name is required";
    isValid = false;
  }
  
  if (!profileData.date_of_birth) {
    errors.date_of_birth = "Date of birth is required";
    isValid = false;
  }
  
  if (!profileData.gender) {
    errors.gender = "Gender is required";
    isValid = false;
  }
  
  if (!profileData.country) {
    errors.country = "Country is required";
    isValid = false;
  }
  
  if (profileData.looking_for_age_min && profileData.looking_for_age_max) {
    if (profileData.looking_for_age_min > profileData.looking_for_age_max) {
      errors.looking_for_age_min = "Minimum age must be less than maximum age";
      isValid = false;
    }
  }
  
  return { isValid, errors };
};

export const getPendingMatchRequests = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: [], error: null };
  
  const userId = sessionData.session.user.id;
  return await supabase
    .from('match_requests')
    .select(`
      *,
      profiles!match_requests_requester_id_fkey (
        id,
        first_name,
        photos,
        country,
        date_of_birth
      )
    `)
    .eq('requested_id', userId)
    .eq('status', 'pending');
};


export const getSavedProfiles = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: [], error: null };
  
  const userId = sessionData.session.user.id;
  return await supabase
    .from('saved_profiles')
    .select(`
      *,
      profiles:profile_id (*)
    `)
    .eq('user_id', userId);
};

export const getPendingPhotoRequests = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: [], error: null };
  
  const userId = sessionData.session.user.id;
  
  // Use explicit column references rather than relying on foreign key relationships
  return await supabase
    .from('photo_reveal_requests')
    .select(`
      *,
      profiles(*)
    `)
    .eq('requested_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
};

export const getOutgoingPhotoRequests = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { data: [], error: null };
  
  const userId = sessionData.session.user.id;
  
  // Also fix the outgoing requests query with explicit joins
  return await supabase
    .from('photo_reveal_requests')
    .select(`
      *,
      profiles:requested_id(*)
    `)
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });
};

export const updatePhotoRequest = async (id: string, status: string) => {
  // Get the photo request details first
  const { data: requestData } = await supabase
    .from('photo_reveal_requests')
    .select('*')
    .eq('id', id)
    .single();
  
  const response = await supabase
    .from('photo_reveal_requests')
    .update({ status })
    .eq('id', id);
  
  // If request was accepted, send email notification
  if (status === 'accepted' && !response.error && requestData) {
    // Get requester profile details
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('first_name, email, email_notifications')
      .eq('id', requestData.requester_id)
      .single();
    
    // Get responder profile details
    const { data: responderProfile } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', requestData.requested_id)
      .single();
    
    // Send email notification if email_notifications is enabled
    if (requesterProfile?.email_notifications) {
      try {
        console.log("Sending photo accepted email notification");
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: requesterProfile.email,
            type: "photo_accepted",
            senderName: responderProfile?.first_name || "Someone",
            recipientName: requesterProfile?.first_name || "there"
          }
        });
      } catch (emailError) {
        console.error("Failed to send photo accepted email notification:", emailError);
      }
    }
  }
  
  return response;
};

export const getUnreadNotificationCount = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { count: 0, error: null };
  
  const userId = sessionData.session.user.id;
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  
  return { count: count || 0, error };
};

export const recordProfileView = async (profileId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { error: "Not authenticated" };
  
  const userId = sessionData.session.user.id;
  return { success: true };
};

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

export const renewMonthlyRequests = async () => {
  try {
    const { error } = await supabase.functions.invoke('allocate-monthly-requests', {});
    
    if (error) {
      console.error("Error renewing monthly requests:", error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error invoking monthly request renewal:", error);
    return { success: false, error };
  }
};

export const checkAndChangeSubscriptionPlan = async (
  currentSubscriptionId: string, 
  newPlanName: string, 
  userId: string
) => {
  try {
    const { data, error } = await supabase.functions.invoke('change-subscription-plan', {
      body: {
        current_subscription_id: currentSubscriptionId,
        new_plan_name: newPlanName,
        user_id: userId
      }
    });
    
    if (error) {
      console.error("Error changing subscription plan:", error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error("Error invoking plan change:", error);
    return { success: false, error };
  }
};

export const fixForeignKeyConstraints = async () => {
  try {
    console.log("Calling fix-foreign-keys function");
    const { data, error } = await supabase.functions.invoke('fix-foreign-keys');
    
    if (error) {
      console.error("Error fixing foreign key constraints:", error);
      return { success: false, error };
    }
    
    console.log("Foreign key response:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Exception fixing foreign key constraints:", error);
    return { success: false, error };
  }
};

export const deleteUserAccount = async (userId: string) => {
  try {
    // First clean up foreign key references by fixing constraints
    const { success: constraintSuccess, error: constraintError } = await fixForeignKeyConstraints();
    
    if (constraintError) {
      console.error("Error fixing constraints before account deletion:", constraintError);
      return { success: false, error: constraintError };
    }
    
    // Delete the user's profile (this should cascade to other related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
      
    if (profileError) {
      console.error("Error deleting profile:", profileError);
      return { success: false, error: profileError };
    }
    
    // Delete the user's auth record
    try {
      // This will fail with the anon key, but we'll handle that gracefully
      await supabase.auth.admin.deleteUser(userId);
      console.log("User auth record deleted successfully");
    } catch (authError: any) {
      console.log("Could not delete auth record - requires admin rights");
      if (authError.status === 403 && 
          (authError.code === "not_admin" || 
           authError.message?.includes("not allowed"))) {
        console.log("Proceeding without deleting auth record - user will need to sign out manually");
        return { success: true, adminDeleteFailed: true };
      } else {
        return { success: false, error: authError };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error("Exception during account deletion:", error);
    return { success: false, error };
  }
};

export const unmatchUser = async (matchId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  
  if (!userId) {
    return { data: null, error: { message: "Not authenticated" } };
  }
  
  // Get match details before updating
  const { data: matchDetails, error: matchDetailsError } = await supabase
    .from('matches')
    .select(`
      *,
      user_one:user_one_id (
        id,
        first_name,
        email,
        email_notifications
      ),
      user_two:user_two_id (
        id,
        first_name,
        email,
        email_notifications
      )
    `)
    .eq('id', matchId)
    .single();
  
  if (matchDetailsError) {
    console.error("Error fetching match details:", matchDetailsError);
    return { data: null, error: matchDetailsError };
  }
  
  // Update the match to inactive instead of deleting
  const { data, error } = await supabase
    .from('matches')
    .update({ 
      status: 'inactive',
      unmatched_by: userId 
    })
    .eq('id', matchId)
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);
  
  // If match was found and updated successfully, also update any match requests between these users
  if (!error && matchDetails) {
    const otherUserId = userId === matchDetails.user_one.id 
      ? matchDetails.user_two_id 
      : matchDetails.user_one_id;
    
    console.log("Updating match requests between", userId, "and", otherUserId);

    // Update any existing match requests between these users to "unmatched" status
    try {
      // First, log existing match requests to see what we're working with
      const { data: existingRequests } = await supabase
        .from('match_requests')
        .select('*')
        .or(`(requester_id.eq.${userId}.and.requested_id.eq.${otherUserId}),(requester_id.eq.${otherUserId}.and.requested_id.eq.${userId})`);
      
      console.log("Found these match requests to update:", existingRequests);
      
      if (existingRequests && existingRequests.length > 0) {
        // Update all found match requests to unmatched status
        const { data: updatedData, error: requestUpdateError } = await supabase
          .from('match_requests')
          .update({ status: 'unmatched' })
          .in('id', existingRequests.map(req => req.id));
        
        if (requestUpdateError) {
          console.error("Error updating match requests after unmatch:", requestUpdateError);
        } else {
          console.log("Successfully updated match requests to unmatched status:", updatedData);
        }
      } else {
        console.log("No match requests found to update");
      }
    } catch (error) {
      console.error("Exception when updating match requests after unmatch:", error);
    }
    
    const initiator = userId === matchDetails.user_one.id ? matchDetails.user_one : matchDetails.user_two;
    const recipient = userId === matchDetails.user_one.id ? matchDetails.user_two : matchDetails.user_one;
    
    // Send email notification if email_notifications is enabled
    if (recipient?.email_notifications) {
      try {
        console.log("Sending unmatch email notification");
        await supabase.functions.invoke("send-notification-email", {
          body: {
            to: recipient.email,
            type: "unmatch",
            senderName: initiator?.first_name || "Someone",
            recipientName: recipient?.first_name || "there"
          }
        });
      } catch (emailError) {
        console.error("Failed to send unmatch email notification:", emailError);
      }
    }
  }
  
  return { data, error };
};

export const getSignedPhotoUrl = async (photoPath: string) => {
  if (!photoPath) return null;

  if (photoPath.startsWith('https://')) {
    return photoPath;
  }

  const { data, error } = await supabase
    .storage
    .from('profile-pictures')
    .createSignedUrl(photoPath, 60 * 60);

  if (error) {
    console.error("Error creating signed URL:", error.message);
    return null;
  }

  return data?.signedUrl || null;
};

export const getSavedProfilesCount = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated');
  }

  const { count, error } = await supabase
    .from('saved_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  if (error) {
    console.error('Error getting saved profiles count:', error);
    throw error;
  }

  return { count: count || 0 };
};

export const checkFreemiumViewLimit = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { canView: false, viewsRemaining: 0 };
  
  const userId = sessionData.session.user.id;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, subscription_status, freemium_daily_views_used, freemium_last_view_reset')
    .eq('id', userId)
    .single();
  
  if (!profile) return { canView: false, viewsRemaining: 0 };
  
  // Check if user is freemium (male without active subscription)
  const isFreemium = profile.gender === 'male' && profile.subscription_status !== 'active';
  
  if (!isFreemium) {
    return { canView: true, viewsRemaining: 999 }; // Unlimited for non-freemium users
  }
  
  // Check if we need to reset daily views (new day)
  const today = new Date().toISOString().split('T')[0];
  const lastReset = profile.freemium_last_view_reset;
  
  if (lastReset !== today) {
    // Reset views for new day
    await supabase
      .from('profiles')
      .update({
        freemium_daily_views_used: 0,
        freemium_last_view_reset: today
      })
      .eq('id', userId);
    
    return { canView: true, viewsRemaining: 5 };
  }
  
  const viewsUsed = profile.freemium_daily_views_used || 0;
  const viewsRemaining = Math.max(0, 5 - viewsUsed);
  
  return {
    canView: viewsUsed < 5,
    viewsRemaining
  };
};

export const incrementFreemiumDailyViews = async (profileId: string) => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { success: false };
  
  const userId = sessionData.session.user.id;
  
  // Check if user has already viewed this profile today
  const { data: existingView } = await supabase
    .from('daily_profile_views')
    .select('*')
    .eq('user_id', userId)
    .eq('view_date', new Date().toISOString().split('T')[0])
    .like('viewed_profiles', `%${profileId}%`)
    .maybeSingle();
  
  if (existingView) {
    return { success: true, alreadyViewed: true }; // Don't increment if already viewed
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, subscription_status, freemium_daily_views_used, freemium_last_view_reset')
    .eq('id', userId)
    .single();
  
  if (!profile) return { success: false };
  
  // Only increment for freemium users
  const isFreemium = profile.gender === 'male' && profile.subscription_status !== 'active';
  if (!isFreemium) return { success: true };
  
  // Check if we need to reset for new day
  const today = new Date().toISOString().split('T')[0];
  const lastReset = profile.freemium_last_view_reset;
  
  let viewsUsed = profile.freemium_daily_views_used || 0;
  
  if (lastReset !== today) {
    viewsUsed = 0; // Reset for new day
  }
  
  // Record the unique view in daily_profile_views table
  await supabase
    .from('daily_profile_views')
    .upsert({
      user_id: userId,
      view_date: today,
      view_count: viewsUsed + 1,
      viewed_profiles: [profileId] // Store as array of viewed profile IDs
    }, {
      onConflict: 'user_id,view_date'
    });
  
  // Increment views in profile
  const { error } = await supabase
    .from('profiles')
    .update({
      freemium_daily_views_used: viewsUsed + 1,
      freemium_last_view_reset: today
    })
    .eq('id', userId);
  
  return { success: !error };
};

export const getFreemiumViewsRemaining = async () => {
  const { canView, viewsRemaining } = await checkFreemiumViewLimit();
  return viewsRemaining;
};
