
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyMatchesRequest {
  userId: string;
}

// Function to calculate age from date of birth
const calculateAge = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

// Handle the request
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { userId }: NotifyMatchesRequest = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing userId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Finding potential matches for user ${userId}`);

    // Get the profile of the new user
    const { data: newUserProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (profileError || !newUserProfile) {
      console.error("Error fetching new user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Make sure profile is complete enough to match
    if (
      !newUserProfile.gender || 
      !newUserProfile.date_of_birth || 
      !newUserProfile.country || 
      !newUserProfile.onboarding_completed
    ) {
      console.log("New user profile not complete enough for matching");
      return new Response(
        JSON.stringify({ message: "Profile not complete enough for matching" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const newUserAge = calculateAge(newUserProfile.date_of_birth);
    const oppositeGender = newUserProfile.gender === "male" ? "female" : "male";

    // Find potential matches (users of opposite gender whose preferences match this new user)
    const { data: potentialMatches, error: matchesError } = await supabase
      .from("profiles")
      .select("*")
      .eq("gender", oppositeGender)
      .eq("onboarding_completed", true)
      .eq("email_notifications", true) // Only notify users who have email notifications enabled
      .not("id", "eq", userId);
    
    if (matchesError) {
      console.error("Error fetching potential matches:", matchesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch potential matches" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Found ${potentialMatches.length} potential users of opposite gender`);
    
    // Filter the matches to those whose preferences match the new user
    const matchingProfiles = potentialMatches.filter(profile => {
      // Skip profiles without necessary preferences set
      if (!profile.looking_for_age_min || !profile.looking_for_age_max) {
        return false;
      }

      // Check if the new user's age is within the profile's preferred age range
      const ageMatch = newUserAge >= profile.looking_for_age_min && 
                       newUserAge <= profile.looking_for_age_max;

      // Check if the new user's country matches the profile's preferred country
      // If looking_for_country is null, they don't have a country preference
      const countryMatch = !profile.looking_for_country || 
                          profile.looking_for_country === newUserProfile.country;

      // Check if the new user's ethnicity is within the profile's preferred ethnicities
      // If looking_for_ethnicity is empty, they don't have ethnicity preferences
      let ethnicityMatch = true;
      if (profile.looking_for_ethnicity && 
          profile.looking_for_ethnicity.length > 0 && 
          newUserProfile.ethnicity && 
          newUserProfile.ethnicity.length > 0) {
        ethnicityMatch = profile.looking_for_ethnicity.some(
          eth => newUserProfile.ethnicity.includes(eth)
        );
      }

      return ageMatch && countryMatch && ethnicityMatch;
    });

    console.log(`Found ${matchingProfiles.length} matching profiles after filtering`);

    // For each matching profile, send an email notification
    const emailPromises = matchingProfiles.map(async profile => {
      // Prepare new user data for the email
      const matchData = {
        id: newUserProfile.id,
        firstName: newUserProfile.first_name || "Someone",
        age: newUserAge,
        country: newUserProfile.country || "Not specified",
        ethnicity: newUserProfile.ethnicity,
        height: newUserProfile.height_cm,
        profession: newUserProfile.profession
      };

      try {
        // Send notification email
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            to: profile.email,
            type: "potential_match",
            recipientName: profile.first_name || "there",
            matchData: matchData
          })
        });

        const emailResult = await emailResponse.json();
        return { 
          success: emailResponse.ok, 
          userId: profile.id, 
          result: emailResult 
        };
      } catch (error) {
        console.error(`Error sending notification email to ${profile.id}:`, error);
        return { 
          success: false, 
          userId: profile.id, 
          error: error.message 
        };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        message: `Sent ${successCount} notifications out of ${matchingProfiles.length} matching profiles`, 
        results: emailResults 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-potential-matches function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
