
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";
import { format, subDays, subMonths } from "https://esm.sh/date-fns@3.6.0";

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a client with the user's JWT
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Verify the admin user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Invalid session:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is an admin
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from("admin_access")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      console.error("Not an admin user:", adminError);
      return new Response(
        JSON.stringify({ error: "Not an admin user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching user metrics for admin:", adminUser.email);

    // Get request body for pagination and filtering
    const requestData = await req.json();
    const {
      page = 1,
      limit = 10,
      search = "",
      filterGender = "all",
      filterStatus = "all",
      sortField = "created_at",
      sortDirection = "desc",
    } = requestData;

    // Calculate dates for "today", "this week", and "this month"
    const today = new Date();
    const startOfToday = format(today, "yyyy-MM-dd");
    const startOfThisWeek = format(subDays(today, 7), "yyyy-MM-dd");
    const startOfThisMonth = format(subDays(today, 30), "yyyy-MM-dd");

    // Get total users count
    const { count: totalUsers, error: totalUsersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (totalUsersError) {
      console.error("Error fetching total users:", totalUsersError);
    }
    
    // Get male users count
    const { count: maleUsers, error: maleUsersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gender', 'male');
    
    if (maleUsersError) {
      console.error("Error fetching male users:", maleUsersError);
    }
    
    // Get female users count
    const { count: femaleUsers, error: femaleUsersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gender', 'female');
    
    if (femaleUsersError) {
      console.error("Error fetching female users:", femaleUsersError);
    }
    
    // Get users online count (users active in the last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers, error: activeUsersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_online', twentyFourHoursAgo);
    
    if (activeUsersError) {
      console.error("Error fetching active users:", activeUsersError);
    }
    
    // Get new users today count
    const { count: newUsersToday, error: newUsersTodayError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);
    
    if (newUsersTodayError) {
      console.error("Error fetching new users today:", newUsersTodayError);
    }
    
    // Get new users this week count
    const { count: newUsersThisWeek, error: newUsersThisWeekError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfThisWeek);
    
    if (newUsersThisWeekError) {
      console.error("Error fetching new users this week:", newUsersThisWeekError);
    }
    
    // Get new users this month count
    const { count: newUsersThisMonth, error: newUsersThisMonthError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfThisMonth);
    
    if (newUsersThisMonthError) {
      console.error("Error fetching new users this month:", newUsersThisMonthError);
    }
    
    // Get completed profiles count (profiles with onboarding_completed = true)
    const { count: completedProfiles, error: completedProfilesError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('onboarding_completed', true);
    
    if (completedProfilesError) {
      console.error("Error fetching completed profiles:", completedProfilesError);
    }

    // Build the query for users data with pagination and filtering
    let query = supabaseAdmin.from('profiles').select('*');
    
    // Apply filters
    if (filterGender !== "all") {
      query = query.eq('gender', filterGender);
    }
    
    if (filterStatus === "active") {
      query = query.eq('subscription_status', 'active');
    } else if (filterStatus === "inactive") {
      query = query.eq('subscription_status', 'inactive');
    } else if (filterStatus === "completed") {
      query = query.eq('onboarding_completed', true);
    } else if (filterStatus === "incomplete") {
      query = query.eq('onboarding_completed', false);
    }
    
    // Apply search
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    
    // Apply sorting
    query = query.order(sortField, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);
    
    // Execute the query
    const { data: users, error: usersError } = await query;
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Error fetching users data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the metrics and users data
    return new Response(
      JSON.stringify({
        metrics: {
          totalUsers: totalUsers || 0,
          maleUsers: maleUsers || 0,
          femaleUsers: femaleUsers || 0,
          activeUsers: activeUsers || 0,
          newUsersToday: newUsersToday || 0,
          newUsersThisWeek: newUsersThisWeek || 0,
          newUsersThisMonth: newUsersThisMonth || 0,
          completedProfiles: completedProfiles || 0,
          verifiedProfiles: completedProfiles || 0 // For now, we're using completed profiles as verified
        },
        users: users || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-users-metrics function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
