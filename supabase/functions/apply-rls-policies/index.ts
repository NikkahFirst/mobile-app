
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Create a Supabase client with the service role key
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Apply the RLS policy for matches table
    const { error: matchesError } = await supabase.rpc('apply_matches_rls_policy');
    
    if (matchesError) {
      console.error("Error applying matches RLS policy:", matchesError);
      return new Response(
        JSON.stringify({ success: false, error: matchesError.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Apply the RLS policy for email_reminders table
    const { error: remindersError } = await supabase.rpc('apply_email_reminders_rls_policy');
    
    if (remindersError) {
      console.error("Error applying email_reminders RLS policy:", remindersError);
      return new Response(
        JSON.stringify({ success: false, error: remindersError.message }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Exception applying RLS policies:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});
