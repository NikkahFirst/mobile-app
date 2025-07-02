
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";
import { format, subDays, subMonths, parseISO } from "https://esm.sh/date-fns@3.6.0";

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

    console.log("Fetching financial metrics for admin:", adminUser.email);

    // Get request body for pagination and filtering
    const requestData = await req.json();
    const {
      page = 1,
      limit = 10,
      filterStatus = "all",
      filterTimeframe = "all",
      filterAmount = null,
      sortField = "created_at",
      sortDirection = "desc",
    } = requestData;

    // Calculate dates for different timeframes
    const today = new Date();
    const startOfToday = format(today, "yyyy-MM-dd");
    const startOfThisWeek = format(subDays(today, 7), "yyyy-MM-dd");
    const startOfThisMonth = format(subMonths(today, 1), "yyyy-MM-dd");
    const startOfThisYear = format(subMonths(today, 12), "yyyy-MM-dd");

    // Get total revenue from payment_history
    const { data: allPayments, error: allPaymentsError } = await supabaseAdmin
      .from('payment_history')
      .select('amount, created_at, payment_status')
      .eq('payment_status', 'succeeded');
    
    if (allPaymentsError) {
      console.error("Error fetching all payments:", allPaymentsError);
    }
    
    // Calculate total revenue
    const totalRevenue = allPayments?.reduce((sum, payment) => sum + payment.amount, 0) / 100 || 0;
    
    // Get today's revenue
    const todayPayments = allPayments?.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      return format(paymentDate, "yyyy-MM-dd") === startOfToday && payment.payment_status === 'succeeded';
    }) || [];
    const revenueToday = todayPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
    
    // Get this week's revenue
    const thisWeekPayments = allPayments?.filter(payment => {
      const paymentDate = new Date(payment.created_at);
      return new Date(payment.created_at) >= new Date(startOfThisWeek) && payment.payment_status === 'succeeded';
    }) || [];
    const revenueThisWeek = thisWeekPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
    
    // Get this month's revenue
    const thisMonthPayments = allPayments?.filter(payment => {
      return new Date(payment.created_at) >= new Date(startOfThisMonth) && payment.payment_status === 'succeeded';
    }) || [];
    const revenueThisMonth = thisMonthPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
    
    // Get previous month's revenue for growth calculation
    const twoMonthsAgo = format(subMonths(today, 2), "yyyy-MM-dd");
    const previousMonthPayments = allPayments?.filter(payment => {
      return new Date(payment.created_at) >= new Date(twoMonthsAgo) && 
             new Date(payment.created_at) < new Date(startOfThisMonth) && 
             payment.payment_status === 'succeeded';
    }) || [];
    const revenuePreviousMonth = previousMonthPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
    
    // Calculate month over month growth percentage
    let monthOverMonthGrowth = 0;
    if (revenuePreviousMonth > 0) {
      monthOverMonthGrowth = ((revenueThisMonth - revenuePreviousMonth) / revenuePreviousMonth) * 100;
    } else if (revenueThisMonth > 0) {
      monthOverMonthGrowth = 100; // If previous month was 0 and this month has revenue, that's a 100% increase
    }
    
    // Calculate average order value
    const successfulPayments = allPayments?.filter(payment => payment.payment_status === 'succeeded') || [];
    const averageOrderValue = successfulPayments.length > 0 
      ? (successfulPayments.reduce((sum, payment) => sum + payment.amount, 0) / successfulPayments.length) / 100
      : 0;
    
    // Get active subscriptions count
    const { count: subscriptionCount, error: subscriptionCountError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active');
    
    if (subscriptionCountError) {
      console.error("Error fetching subscription count:", subscriptionCountError);
    }
    
    // Get male subscribers count
    const { count: maleSubscribers, error: maleSubscribersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gender', 'male')
      .eq('subscription_status', 'active');
    
    if (maleSubscribersError) {
      console.error("Error fetching male subscribers:", maleSubscribersError);
    }
    
    // Get female subscribers count
    const { count: femaleSubscribers, error: femaleSubscribersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('gender', 'female')
      .eq('subscription_status', 'active');
    
    if (femaleSubscribersError) {
      console.error("Error fetching female subscribers:", femaleSubscribersError);
    }
    
    // Get total users count for conversion rate calculation
    const { count: totalUsers, error: totalUsersError } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (totalUsersError) {
      console.error("Error fetching total users:", totalUsersError);
    }
    
    // Calculate conversion rate
    const conversionRate = totalUsers && totalUsers > 0 
      ? (subscriptionCount || 0) / totalUsers * 100 
      : 0;
    
    // Calculate monthly revenue data for the chart (last 6 months)
    const monthlyRevenueData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = format(subMonths(today, i), "yyyy-MM-dd");
      const monthEnd = i === 0 
        ? format(today, "yyyy-MM-dd") 
        : format(subMonths(today, i - 1), "yyyy-MM-dd");
      
      const monthPayments = allPayments?.filter(payment => {
        const paymentDate = new Date(payment.created_at);
        return paymentDate >= new Date(monthStart) && 
               paymentDate < new Date(monthEnd) && 
               payment.payment_status === 'succeeded';
      }) || [];
      
      const monthRevenue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0) / 100;
      
      monthlyRevenueData.push({
        date: monthStart,
        revenue: monthRevenue
      });
    }

    // Fetch payment data with user information for the payments table
    let paymentQuery = supabaseAdmin
      .from('payment_history')
      .select(`
        id,
        user_id,
        amount,
        currency,
        payment_method,
        payment_status,
        created_at,
        description
      `);
    
    // Apply filters
    if (filterStatus !== "all") {
      paymentQuery = paymentQuery.eq('payment_status', filterStatus);
    }
    
    if (filterTimeframe === "today") {
      paymentQuery = paymentQuery.gte('created_at', startOfToday);
    } else if (filterTimeframe === "week") {
      paymentQuery = paymentQuery.gte('created_at', startOfThisWeek);
    } else if (filterTimeframe === "month") {
      paymentQuery = paymentQuery.gte('created_at', startOfThisMonth);
    } else if (filterTimeframe === "year") {
      paymentQuery = paymentQuery.gte('created_at', startOfThisYear);
    }
    
    if (filterAmount !== null) {
      paymentQuery = paymentQuery.gte('amount', filterAmount * 100); // Convert to cents
    }
    
    // Apply sorting
    paymentQuery = paymentQuery.order(sortField, { ascending: sortDirection === 'asc' });
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    paymentQuery = paymentQuery.range(from, to);
    
    // Execute the query
    const { data: payments, error: paymentsError } = await paymentQuery;
    
    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
    }

    // Enrich payment data with user information
    const enrichedPayments = [];
    if (payments && payments.length > 0) {
      for (const payment of payments) {
        // Fetch user information
        const { data: userData, error: userDataError } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', payment.user_id)
          .single();
        
        if (userDataError) {
          console.error(`Error fetching user data for user ${payment.user_id}:`, userDataError);
        }
        
        enrichedPayments.push({
          ...payment,
          user_name: userData ? `${userData.first_name} ${userData.last_name}` : 'Unknown User',
          user_email: userData ? userData.email : 'Unknown Email'
        });
      }
    }

    // Return the metrics and financial data
    return new Response(
      JSON.stringify({
        metrics: {
          totalRevenue: totalRevenue || 0,
          revenueToday: revenueToday || 0,
          revenueThisWeek: revenueThisWeek || 0,
          revenueThisMonth: revenueThisMonth || 0,
          monthOverMonthGrowth: monthOverMonthGrowth || 0,
          averageOrderValue: averageOrderValue || 0,
          subscriptionCount: subscriptionCount || 0,
          maleSubscribers: maleSubscribers || 0,
          femaleSubscribers: femaleSubscribers || 0,
          conversionRate: conversionRate || 0,
          monthlyRevenueData: monthlyRevenueData || []
        },
        payments: enrichedPayments || []
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-financial-metrics function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
