
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const resendApiKey = Deno.env.get("RESEND_API_KEY") as string;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderTimeframe {
  hours: number;
  name: string;
}

// Define reminder timeframes
const reminderTimeframes: ReminderTimeframe[] = [
  { hours: 24, name: "first" },
  { hours: 48, name: "second" },
  { hours: 168, name: "final" }, // 7 days (168 hours)
];

const sendReminderEmail = async (
  email: string,
  firstName: string,
  requesterName: string,
  reminderType: string
) => {
  const subject = `${reminderType === "final" ? "🔔 FINAL REMINDER" : "🔔 Reminder"}: You have pending match requests on NikkahFirst`;
  
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "NikkahFirst <info@nikkahfirst.com>",
        to: [email],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h1 style="color: #e91e63; margin-bottom: 20px;">Reminder: Pending Match Request</h1>
            <p>Assalamu alaikum ${firstName},</p>
            <p><strong>${requesterName}</strong> sent you a match request on NikkahFirst that is still pending.</p>
            ${reminderType === "final" ? 
              "<p><strong>This is your final reminder</strong> about this request. If you don't respond soon, the request may expire.</p>" : 
              "<p>Please take a moment to review this request and decide whether to accept or decline.</p>"
            }
            <div style="margin: 30px 0;">
              <a href="https://app.nikkahfirst.com/dashboard" style="background-color: #e91e63; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">View Request</a>
            </div>
            <p>May Allah guide you in your search for a spouse.</p>
            <p>Best regards,<br>The NikkahFirst Team</p>
          </div>
        `,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(JSON.stringify(error));
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error sending reminder email:", error);
    throw error;
  }
};

const processReminderTimeframe = async (timeframe: ReminderTimeframe) => {
  const { hours, name } = timeframe;
  
  // Calculate the time threshold
  const now = new Date();
  const thresholdTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
  
  // Format the date in ISO format for Postgres
  const thresholdTimeStr = thresholdTime.toISOString();
  
  // Get requests that need reminders (created before threshold and still pending)
  const { data: requests, error } = await supabase
    .from('match_requests')
    .select(`
      id,
      requester_id,
      requested_id,
      created_at,
      reminder_${name}_sent,
      profiles!match_requests_requester_id_fkey (
        first_name
      ),
      requested:profiles!match_requests_requested_id_fkey (
        id,
        first_name,
        email,
        email_notifications
      )
    `)
    .eq('status', 'pending')
    .eq(`reminder_${name}_sent`, false)
    .lt('created_at', thresholdTimeStr);
  
  if (error) {
    console.error(`Error fetching ${name} reminders:`, error);
    return { processed: 0, errors: [error] };
  }
  
  if (!requests || requests.length === 0) {
    console.log(`No ${name} reminders to send`);
    return { processed: 0, errors: [] };
  }
  
  console.log(`Found ${requests.length} pending requests for ${name} reminder`);
  
  const errors: any[] = [];
  let processed = 0;
  
  // Process each request
  for (const request of requests) {
    // Skip if email notifications are disabled
    if (!request.requested.email_notifications) {
      console.log(`Skipping reminder for user ${request.requested.id} - notifications disabled`);
      
      // Mark as sent anyway so we don't process it again
      await supabase
        .from('match_requests')
        .update({ [`reminder_${name}_sent`]: true })
        .eq('id', request.id);
        
      continue;
    }
    
    try {
      // Send reminder email
      await sendReminderEmail(
        request.requested.email,
        request.requested.first_name || "there",
        request.profiles.first_name || "Someone",
        name
      );
      
      console.log(`Sent ${name} reminder for request ${request.id}`);
      
      // Update the record to mark reminder as sent
      const { error: updateError } = await supabase
        .from('match_requests')
        .update({ [`reminder_${name}_sent`]: true })
        .eq('id', request.id);
      
      if (updateError) {
        console.error(`Error updating ${name} reminder status:`, updateError);
        errors.push(updateError);
      } else {
        processed++;
      }
    } catch (error) {
      console.error(`Error sending ${name} reminder for request ${request.id}:`, error);
      errors.push(error);
    }
  }
  
  return { processed, errors };
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting request reminder check");
    
    const results = [];
    
    // Process each timeframe
    for (const timeframe of reminderTimeframes) {
      const result = await processReminderTimeframe(timeframe);
      results.push({
        timeframe: timeframe.name,
        ...result
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      results
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error processing reminders:", error);
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
