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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase URL or service role key");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the email is allowed to be an admin (for now, only info@nikkahfirst.com)
    if (email !== "info@nikkahfirst.com") {
      return new Response(
        JSON.stringify({ error: "Email not authorized for admin access" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user already exists in auth.users
    const { data: existingAuthUsers, error: authQueryError } = await supabase.auth.admin.listUsers({
      filter: {
        email: email
      }
    });

    if (authQueryError) {
      console.error("Error checking for existing auth user:", authQueryError);
      return new Response(
        JSON.stringify({ error: "Failed to check for existing auth user", details: authQueryError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If auth user already exists, check if they're in admin_access table
    let authUser = null;
    if (existingAuthUsers && existingAuthUsers.users && existingAuthUsers.users.length > 0) {
      authUser = existingAuthUsers.users[0];
      console.log("Found existing auth user:", authUser.id);
      
      // Check if they're already registered as admin
      const { data: existingAdmins, error: adminQueryError } = await supabase
        .from("admin_access")
        .select("id")
        .eq("user_id", authUser.id);

      if (adminQueryError) {
        console.error("Error checking for existing admin:", adminQueryError);
        return new Response(
          JSON.stringify({ error: "Failed to check for existing admin", details: adminQueryError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If already an admin, return success
      if (existingAdmins && existingAdmins.length > 0) {
        console.log("User is already registered as admin");
        return new Response(
          JSON.stringify({ message: "Admin user already exists", existing: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate a strong random password
    const generateStrongPassword = () => {
      const length = 12;
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
      let password = "";
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
      }
      return password;
    };

    const password = generateStrongPassword();

    // If auth user doesn't exist, create one
    if (!authUser) {
      console.log("Creating new auth user with email:", email);
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (error) {
          console.error("Error creating auth user:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create admin user", details: error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (!data || !data.user) {
          console.error("Auth user creation succeeded but returned no user");
          return new Response(
            JSON.stringify({ error: "User creation succeeded but no user was returned" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        authUser = data.user;
      } catch (error) {
        console.error("Exception during auth user creation:", error);
        return new Response(
          JSON.stringify({ error: "Exception during user creation", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Existing auth user but not admin, update their password
      console.log("Updating password for existing auth user");
      try {
        const { error } = await supabase.auth.admin.updateUserById(
          authUser.id, 
          { password }
        );

        if (error) {
          console.error("Error updating user password:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update user password", details: error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Exception during password update:", error);
        return new Response(
          JSON.stringify({ error: "Exception during password update", details: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Insert into admin_access table
    console.log("Adding user to admin_access table");
    try {
      const { error: adminError } = await supabase
        .from("admin_access")
        .insert({
          user_id: authUser.id,
          email: email
        });

      if (adminError) {
        console.error("Error creating admin record:", adminError);
        
        // Don't attempt to clean up the auth user if it already existed
        if (!existingAuthUsers || existingAuthUsers.users.length === 0) {
          console.log("Attempting to clean up the auth user");
          await supabase.auth.admin.deleteUser(authUser.id);
        }
        
        return new Response(
          JSON.stringify({ error: "Failed to create admin record", details: adminError }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      console.error("Exception during admin record creation:", error);
      return new Response(
        JSON.stringify({ error: "Exception during admin record creation", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin user created/updated successfully with generated password");
    
    return new Response(
      JSON.stringify({ 
        message: "Admin user created successfully",
        password: password
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unhandled error in create-admin-user function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
