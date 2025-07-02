
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      console.error('No Authorization header found')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Authorization header present:', authHeader.substring(0, 20) + '...')

    // Extract the JWT token from the Authorization header
    const token = authHeader.replace('Bearer ', '')
    
    if (!token) {
      console.error('No JWT token found in Authorization header')
      return new Response(
        JSON.stringify({ error: 'Invalid authorization header format' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify the JWT token using the service role client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError) {
      console.error('JWT verification error:', authError)
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          details: authError.message 
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!user) {
      console.error('No user found from JWT token')
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`User ${user.id} requesting account deletion`)

    // Call the secure database function to delete the user
    const { data: result, error: deleteError } = await supabaseAdmin
      .rpc('delete_user_account', { target_user_id: user.id })

    if (deleteError) {
      console.error('Error calling delete_user_account function:', deleteError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete account', 
          details: deleteError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Delete result:', result)

    // Check if the deletion was successful
    if (result && result.status !== 'success') {
      return new Response(
        JSON.stringify({ 
          error: result.message || 'Failed to delete account'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account successfully deleted'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in delete-user-account function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
