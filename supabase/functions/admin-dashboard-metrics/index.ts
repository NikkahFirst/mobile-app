
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

    // Get the user's session
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

    console.log("Fetching dashboard metrics for admin:", adminUser.email);

    // Get total users count (accurate count from profiles)
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
    
    // Get users online count (users active in the last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: usersOnline, error: usersOnlineError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_online', fifteenMinutesAgo);
    
    if (usersOnlineError) {
      console.error("Error fetching online users:", usersOnlineError);
    }
    
    // Get active matches count
    const { count: activeMatches, error: activeMatchesError } = await supabaseAdmin
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    if (activeMatchesError) {
      console.error("Error fetching active matches:", activeMatchesError);
    }
    
    // Get total revenue from payment_history
    const { data: revenueData, error: revenueError } = await supabaseAdmin
      .from('payment_history')
      .select('amount')
      .eq('payment_status', 'succeeded');
    
    if (revenueError) {
      console.error("Error fetching revenue data:", revenueError);
    }
    
    const totalRevenue = revenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

    // Fetch recent user registrations
    const { data: recentUsers, error: recentUsersError } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, gender, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recentUsersError) {
      console.error("Error fetching recent users:", recentUsersError);
    }
    
    // Fetch recent payments
    const { data: recentPayments, error: recentPaymentsError } = await supabaseAdmin
      .from('payment_history')
      .select('id, user_id, amount, currency, payment_method, payment_status, created_at, description')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentPaymentsError) {
      console.error("Error fetching recent payments:", recentPaymentsError);
    }

    console.log("Dashboard metrics calculated successfully");
    console.log(`Total users: ${totalUsers}, Male users: ${maleUsers}, Female users: ${femaleUsers}, Users online: ${usersOnline}, Active matches: ${activeMatches}, Total revenue: ${totalRevenue / 100}`);

    // Return the metrics
    return new Response(
      JSON.stringify({
        metrics: {
          totalUsers: totalUsers || 0,
          maleUsers: maleUsers || 0,
          femaleUsers: femaleUsers || 0,
          usersOnline: usersOnline || 0,
          activeMatches: activeMatches || 0,
          totalRevenue: totalRevenue / 100, // Convert from cents to currency units
        },
        recentUsers,
        recentPayments
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-dashboard-metrics function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
