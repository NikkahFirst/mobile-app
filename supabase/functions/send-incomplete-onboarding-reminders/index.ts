
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

interface ReminderResult {
  type: string;
  sentCount: number;
  errors: string[];
}

// Calculate date for specific days ago
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

// Handle the request
const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting incomplete onboarding reminder process");
    
    const results: ReminderResult[] = [];
    
    // Process 2-day incomplete onboarding reminders
    const twoDayResult = await processIncompleteOnboardingReminders(2, 'incomplete_onboarding_2day');
    results.push(twoDayResult);
    
    // Process 7-day incomplete onboarding reminders
    const sevenDayResult = await processIncompleteOnboardingReminders(7, 'incomplete_onboarding_7day');
    results.push(sevenDayResult);

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-incomplete-onboarding-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Process incomplete onboarding reminders for the specified number of days
async function processIncompleteOnboardingReminders(days: number, reminderType: string): Promise<ReminderResult> {
  console.log(`Processing ${days}-day incomplete onboarding reminders`);
  
  const targetDate = daysAgo(days);
  const errors: string[] = [];
  let sentCount = 0;
  
  try {
    // Find users who signed up exactly the specified number of days ago
    // and who haven't completed onboarding yet
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, created_at')
      .eq('onboarding_completed', false)
      .eq('email_notifications', true)
      .filter('created_at', 'gte', `${targetDate}T00:00:00`)
      .filter('created_at', 'lte', `${targetDate}T23:59:59`);
    
    if (error) {
      console.error(`Error fetching ${days}-day incomplete onboarding users:`, error);
      errors.push(error.message);
      return { type: reminderType, sentCount, errors };
    }
    
    console.log(`Found ${users?.length || 0} users with incomplete onboarding for ${days} days`);
    
    // Process each user
    for (const user of users || []) {
      // Check if user has already received this reminder
      const { data: existingReminders, error: reminderError } = await supabase
        .from('email_reminders')
        .select('id')
        .eq('user_id', user.id)
        .eq('reminder_type', reminderType)
        .limit(1);
      
      if (reminderError) {
        console.error(`Error checking existing reminders for user ${user.id}:`, reminderError);
        errors.push(`Failed to check reminders for user ${user.id}: ${reminderError.message}`);
        continue;
      }
      
      // Skip if reminder already sent
      if (existingReminders && existingReminders.length > 0) {
        console.log(`User ${user.id} already received ${reminderType}`);
        continue;
      }
      
      // Send reminder email
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            to: user.email,
            type: reminderType,
            recipientName: user.first_name || "there"
          })
        });
        
        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error(`Failed to send ${reminderType} to ${user.id}:`, errorText);
          errors.push(`Failed to send email to ${user.id}: ${errorText}`);
          continue;
        }
        
        // Record the reminder in the database
        const { error: insertError } = await supabase
          .from('email_reminders')
          .insert({
            user_id: user.id,
            reminder_type: reminderType
          });
        
        if (insertError) {
          console.error(`Error recording reminder for ${user.id}:`, insertError);
          errors.push(`Failed to record reminder for ${user.id}: ${insertError.message}`);
          continue;
        }
        
        sentCount++;
        console.log(`Successfully sent ${reminderType} to ${user.id}`);
        
      } catch (error: any) {
        console.error(`Exception sending ${reminderType} to ${user.id}:`, error);
        errors.push(`Exception for ${user.id}: ${error.message}`);
      }
    }
    
  } catch (error: any) {
    console.error(`Exception processing ${days}-day reminders:`, error);
    errors.push(`General exception: ${error.message}`);
  }
  
  return { type: reminderType, sentCount, errors };
}

serve(handler);
