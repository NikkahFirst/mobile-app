
// This Edge Function fixes the foreign key constraints for profile deletion

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    // Initialize the Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    console.log("Starting foreign key fix process...")
    
    // First, need to drop existing foreign keys
    const dropForeignKeysQueries = [
      // Drop match_requests foreign keys
      `ALTER TABLE IF EXISTS public.match_requests DROP CONSTRAINT IF EXISTS match_requests_requester_id_fkey`,
      `ALTER TABLE IF EXISTS public.match_requests DROP CONSTRAINT IF EXISTS match_requests_requested_id_fkey`,
      
      // Drop photo_reveal_requests foreign keys
      `ALTER TABLE IF EXISTS public.photo_reveal_requests DROP CONSTRAINT IF EXISTS photo_reveal_requests_requester_id_fkey`,
      `ALTER TABLE IF EXISTS public.photo_reveal_requests DROP CONSTRAINT IF EXISTS photo_reveal_requests_requested_id_fkey`,
      
      // Drop saved_profiles foreign keys
      `ALTER TABLE IF EXISTS public.saved_profiles DROP CONSTRAINT IF EXISTS saved_profiles_profile_id_fkey`,
      `ALTER TABLE IF EXISTS public.saved_profiles DROP CONSTRAINT IF EXISTS saved_profiles_user_id_fkey`,
      
      // Drop matches foreign keys
      `ALTER TABLE IF EXISTS public.matches DROP CONSTRAINT IF EXISTS matches_user_one_id_fkey`,
      `ALTER TABLE IF EXISTS public.matches DROP CONSTRAINT IF EXISTS matches_user_two_id_fkey`,
      
      // Drop notifications foreign keys if they exist
      `ALTER TABLE IF EXISTS public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey`,
      `ALTER TABLE IF EXISTS public.notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey`,
      
      // Drop payment_history foreign keys if they exist
      `ALTER TABLE IF EXISTS public.payment_history DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey`,
      
      // Drop affiliates foreign keys if they exist
      `ALTER TABLE IF EXISTS public.affiliates DROP CONSTRAINT IF EXISTS affiliates_user_id_fkey`,
      
      // Drop affiliate_referrals foreign keys if they exist
      `ALTER TABLE IF EXISTS public.affiliate_referrals DROP CONSTRAINT IF EXISTS affiliate_referrals_affiliate_id_fkey`,
      `ALTER TABLE IF EXISTS public.affiliate_referrals DROP CONSTRAINT IF EXISTS affiliate_referrals_referred_user_id_fkey`,
      
      // Drop affiliate_conversions foreign keys if they exist
      `ALTER TABLE IF EXISTS public.affiliate_conversions DROP CONSTRAINT IF EXISTS affiliate_conversions_affiliate_id_fkey`,
      `ALTER TABLE IF EXISTS public.affiliate_conversions DROP CONSTRAINT IF EXISTS affiliate_conversions_referred_user_id_fkey`,
      
      // Drop affiliate_payouts foreign keys if they exist
      `ALTER TABLE IF EXISTS public.affiliate_payouts DROP CONSTRAINT IF EXISTS affiliate_payouts_affiliate_id_fkey`,
    ]
    
    // Execute drop queries
    console.log("Dropping existing foreign keys...")
    for (const query of dropForeignKeysQueries) {
      const { error } = await supabaseClient.rpc('exec_sql', { query })
      if (error) {
        console.error(`Error executing: ${query}`)
        console.error(error)
      }
    }
    
    // Recreate foreign keys with ON DELETE CASCADE
    const addForeignKeysQueries = [
      // Recreate match_requests foreign keys
      `ALTER TABLE IF EXISTS public.match_requests ADD CONSTRAINT match_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.match_requests ADD CONSTRAINT match_requests_requested_id_fkey FOREIGN KEY (requested_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Recreate photo_reveal_requests foreign keys
      `ALTER TABLE IF EXISTS public.photo_reveal_requests ADD CONSTRAINT photo_reveal_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.photo_reveal_requests ADD CONSTRAINT photo_reveal_requests_requested_id_fkey FOREIGN KEY (requested_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Recreate saved_profiles foreign keys
      `ALTER TABLE IF EXISTS public.saved_profiles ADD CONSTRAINT saved_profiles_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.saved_profiles ADD CONSTRAINT saved_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Recreate matches foreign keys
      `ALTER TABLE IF EXISTS public.matches ADD CONSTRAINT matches_user_one_id_fkey FOREIGN KEY (user_one_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.matches ADD CONSTRAINT matches_user_two_id_fkey FOREIGN KEY (user_two_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Add notifications foreign keys with ON DELETE CASCADE
      `ALTER TABLE IF EXISTS public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.notifications ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Add payment_history foreign keys with ON DELETE CASCADE
      `ALTER TABLE IF EXISTS public.payment_history ADD CONSTRAINT payment_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Add affiliates foreign key with ON DELETE CASCADE
      `ALTER TABLE IF EXISTS public.affiliates ADD CONSTRAINT affiliates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Add affiliate_referrals foreign keys with ON DELETE CASCADE
      `ALTER TABLE IF EXISTS public.affiliate_referrals ADD CONSTRAINT affiliate_referrals_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.affiliate_referrals ADD CONSTRAINT affiliate_referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Add affiliate_conversions foreign keys with ON DELETE CASCADE
      `ALTER TABLE IF EXISTS public.affiliate_conversions ADD CONSTRAINT affiliate_conversions_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE`,
      `ALTER TABLE IF EXISTS public.affiliate_conversions ADD CONSTRAINT affiliate_conversions_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE`,
      
      // Add affiliate_payouts foreign key with ON DELETE CASCADE
      `ALTER TABLE IF EXISTS public.affiliate_payouts ADD CONSTRAINT affiliate_payouts_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE`,
    ]
    
    // Execute add queries
    console.log("Adding new foreign keys with ON DELETE CASCADE...")
    for (const query of addForeignKeysQueries) {
      const { error } = await supabaseClient.rpc('exec_sql', { query })
      if (error) {
        console.error(`Error executing: ${query}`)
        console.error(error)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Foreign key constraints updated successfully with ON DELETE CASCADE"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Error fixing foreign keys:', error)
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
