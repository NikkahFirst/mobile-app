
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting allocation of monthly requests...");

    // First check if allocation_history table exists
    const { error: tableCheckError } = await supabase.from('allocation_history').select('id').limit(1);
    
    // If table doesn't exist, create it
    if (tableCheckError && tableCheckError.message.includes('relation "allocation_history" does not exist')) {
      console.log("Creating allocation_history table...");
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS allocation_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          amount INTEGER NOT NULL,
          allocation_type TEXT NOT NULL,
          previous_amount INTEGER,
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (createError) {
        console.error(`Error creating allocation_history table: ${createError.message}`);
      } else {
        console.log("allocation_history table created successfully");
      }
    }

    // Get all eligible users
    // 1. Active subscription users past their renewal date
    // 2. Female users (who get free requests) past their renewal date
    // 3. Only those marked with has_received_initial_allocation = true
    const { data: eligibleUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('id, gender, subscription_plan, subscription_status, renewal_date, requests_remaining, created_at, has_received_initial_allocation')
      .or('subscription_status.eq.active,gender.eq.female')
      .lt('renewal_date', new Date().toISOString())
      .eq('has_received_initial_allocation', true);

    if (fetchError) {
      console.error(`Error fetching eligible users: ${fetchError.message}`);
      throw new Error(`Failed to fetch eligible users: ${fetchError.message}`);
    }

    console.log(`Found ${eligibleUsers?.length || 0} eligible users for monthly request allocation`);

    // Current timestamp for tracking allocations
    const currentTimestamp = new Date().toISOString();
    
    // Process each eligible user
    const updates = [];
    for (const user of eligibleUsers || []) {
      let requestsToAdd = 0;
      let resetRequests = false;
      
      // Female users get a fresh 3 requests (no rollover)
      if (user.gender === 'female') {
        resetRequests = true;
        requestsToAdd = 3;
      }
      // For male users, allocate based on subscription plan with rollover
      else if (user.subscription_status === 'active') {
        if (user.subscription_plan === 'Monthly Plan') {
          // Monthly plans get exactly 10 requests per renewal
          resetRequests = true;
          requestsToAdd = 10;
        } else if (user.subscription_plan === 'Annual Plan') {
          // Annual plans get exactly 15 requests per renewal
          resetRequests = true;
          requestsToAdd = 15;
        } else if (user.subscription_plan === 'Unlimited Plan') {
          requestsToAdd = 0; // Unlimited already has unlimited requests
        }
      }

      // Check if we actually need to update - either add requests or female user reset
      if (requestsToAdd > 0 || user.gender === 'female') {
        // Calculate next renewal date
        const nextRenewalDate = new Date();
        nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
        
        // Check for recent allocations to prevent double allocations
        // Get recent allocations in the last 24 hours
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
        
        let recentAllocations = [];
        let allocationsError = null;
        
        try {
          const { data, error } = await supabase
            .from('allocation_history')
            .select('*')
            .eq('user_id', user.id)
            .gt('created_at', twentyFourHoursAgo.toISOString())
            .order('created_at', { ascending: false });
            
          recentAllocations = data || [];
          allocationsError = error;
        } catch (error) {
          console.error(`Error checking allocation history: ${error.message}`);
          if (!error.message?.includes('relation "allocation_history" does not exist')) {
            allocationsError = error;
          }
        }
        
        let shouldAllocate = true;
        
        // If there are recent allocations, don't allocate again to prevent double allocation
        if (recentAllocations && recentAllocations.length > 0) {
          console.log(`Skipping user ${user.id}: recent allocation found`);
          shouldAllocate = false;
          
          // Still update the renewal date if needed
          if (new Date(user.renewal_date) < new Date()) {
            const { error: updateDateError } = await supabase
              .from('profiles')
              .update({
                renewal_date: nextRenewalDate.toISOString()
              })
              .eq('id', user.id);
              
            if (updateDateError) {
              console.error(`Error updating renewal date for user ${user.id}: ${updateDateError.message}`);
            } else {
              console.log(`Updated renewal date for user ${user.id} to ${nextRenewalDate.toISOString()}`);
            }
          }
        }
        
        // Only allocate requests if we haven't recently allocated
        if (shouldAllocate) {
          console.log(`Allocating ${requestsToAdd} requests to user ${user.id} (${user.gender}, ${user.subscription_plan || 'no plan'})`);
          
          // Log the current requests_remaining for debugging
          console.log(`Current requests_remaining for user ${user.id}: ${user.requests_remaining || 0}`);
          
          // Begin transaction
          const { error: beginError } = await supabase.rpc('begin_transaction');
          if (beginError) {
            console.error(`Error starting transaction for user ${user.id}: ${beginError.message}`);
            continue; // Skip this user if transaction start fails
          }
          
          try {
            // Try to record allocation in the history table
            try {
              const { error: allocationRecordError } = await supabase
                .from('allocation_history')
                .insert({
                  user_id: user.id,
                  amount: requestsToAdd,
                  allocation_type: 'monthly',
                  previous_amount: user.requests_remaining || 0
                });
                
              if (allocationRecordError && !allocationRecordError.message?.includes('relation "allocation_history" does not exist')) {
                console.error(`Error recording allocation for user ${user.id}: ${allocationRecordError.message}`);
              }
            } catch (recordError) {
              console.error(`Caught error when recording allocation: ${recordError.message}`);
            }
            
            // Update the user's profile with FIXED request amount (not additive)
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                requests_remaining: resetRequests ? requestsToAdd : (user.requests_remaining || 0) + requestsToAdd,
                renewal_date: nextRenewalDate.toISOString()
              })
              .eq('id', user.id);

            if (updateError) {
              console.error(`Error updating user ${user.id}: ${updateError.message}`);
              throw new Error(updateError.message);
            }
            
            // Log the new requests_remaining value
            console.log(`New requests_remaining for user ${user.id}: ${resetRequests ? requestsToAdd : (user.requests_remaining || 0) + requestsToAdd}`);
            
            // Commit transaction
            const { error: commitError } = await supabase.rpc('commit_transaction');
            if (commitError) {
              console.error(`Error committing transaction for user ${user.id}: ${commitError.message}`);
              throw new Error(commitError.message);
            }
            
            console.log(`Successfully allocated ${requestsToAdd} requests to user ${user.id}`);
            updates.push({
              user_id: user.id,
              success: true,
              requests_added: requestsToAdd,
              requests_before: user.requests_remaining || 0,
              requests_after: resetRequests ? requestsToAdd : (user.requests_remaining || 0) + requestsToAdd,
              new_renewal_date: nextRenewalDate.toISOString()
            });
          } catch (error) {
            // Rollback transaction on error
            const { error: rollbackError } = await supabase.rpc('rollback_transaction');
            if (rollbackError) {
              console.error(`Error rolling back transaction for user ${user.id}: ${rollbackError.message}`);
            } else {
              console.log(`Transaction rolled back for user ${user.id}`);
            }
            
            updates.push({
              user_id: user.id,
              success: false,
              error: error.message
            });
          }
        } else {
          updates.push({
            user_id: user.id,
            success: true,
            skipped: true,
            reason: "Recent allocation detected",
            allocation_date: recentAllocations && recentAllocations.length > 0 ? recentAllocations[0].created_at : null
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${updates.length} users for monthly request allocation`,
        updates
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error(`Error allocating monthly requests: ${error.message}`);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
