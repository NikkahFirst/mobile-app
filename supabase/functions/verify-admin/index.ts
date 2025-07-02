
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.log("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header", isAdmin: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase URL or service role key");
      return new Response(
        JSON.stringify({ error: "Server configuration error", isAdmin: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Error getting user from token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token", isAdmin: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Retrieved user:", user.id, user.email);
    
    // Check if the user is an admin
    // Use the service role client to bypass RLS
    const { data: adminData, error: adminError } = await supabase
      .from("admin_access")
      .select("id")
      .eq("user_id", user.id);
    
    if (adminError) {
      console.error("Error checking admin status:", adminError);
      return new Response(
        JSON.stringify({ error: "Error checking admin status", isAdmin: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!adminData || adminData.length === 0) {
      console.log("User not found in admin_access table:", user.id, user.email);
      return new Response(
        JSON.stringify({ error: "Not an admin user", isAdmin: false }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("User confirmed as admin:", user.id, user.email);
    
    // Update the last login time (optional but useful)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: { last_admin_login: new Date().toISOString() } }
    );
    
    if (updateError) {
      console.error("Error updating last login time:", updateError);
      // Non-critical, continue anyway
    }
    
    // If we got here, the user is an admin
    return new Response(
      JSON.stringify({ 
        message: "User is an admin", 
        isAdmin: true, 
        user: {
          id: user.id,
          email: user.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in verify-admin function:", error);
    
    return new Response(
      JSON.stringify({ error: "Server error", isAdmin: false, details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
