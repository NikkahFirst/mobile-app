
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  console.log('send-deletion-feedback function called with method:', req.method)
  
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

    // Parse the request body more robustly
    let requestData;
    let reason = '';
    let feedback = '';

    try {
      const contentType = req.headers.get('content-type') || '';
      console.log('Request content-type:', contentType);
      
      // Handle different content types
      if (contentType.includes('application/json') || !contentType) {
        const requestText = await req.text();
        console.log('Raw request body:', requestText);
        
        if (!requestText || requestText.trim() === '') {
          console.error('Empty request body received');
          return new Response(
            JSON.stringify({ error: 'Empty request body' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        
        try {
          requestData = JSON.parse(requestText);
          console.log('Parsed request data:', requestData);
          
          // Handle both direct parameters and nested body structure
          if (requestData.body) {
            // If body is nested (from supabase.functions.invoke with body wrapper)
            reason = requestData.body.reason || '';
            feedback = requestData.body.feedback || '';
          } else {
            // If parameters are at root level
            reason = requestData.reason || '';
            feedback = requestData.feedback || '';
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          return new Response(
            JSON.stringify({ 
              error: 'Invalid JSON format', 
              details: jsonError.message 
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        // Handle form data
        const formData = await req.formData();
        reason = formData.get('reason')?.toString() || '';
        feedback = formData.get('feedback')?.toString() || '';
      } else {
        console.error('Unsupported content type:', contentType);
        return new Response(
          JSON.stringify({ error: 'Unsupported content type' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } catch (parseError) {
      console.error('Error parsing request:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse request', 
          details: parseError.message 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Extracted feedback data - Reason:', reason, 'Feedback length:', feedback.length);

    // Validate required fields
    if (!reason || !feedback) {
      console.error('Missing required fields. Reason:', !!reason, 'Feedback:', !!feedback);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields', 
          details: 'Both reason and feedback are required',
          received: { hasReason: !!reason, hasFeedback: !!feedback }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (feedback.trim().length < 10) {
      console.error('Feedback too short:', feedback.length);
      return new Response(
        JSON.stringify({ 
          error: 'Feedback too short', 
          details: 'Feedback must be at least 10 characters long' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Sending deletion feedback for user ${user.id} with email ${user.email}`);

    // Send email to info@nikkahfirst.com
    const emailResponse = await resend.emails.send({
      from: 'NikkahFirst <noreply@nikkahfirst.com>',
      to: ['info@nikkahfirst.com'],
      subject: `${user.email} Left`,
      html: `
        <h2>User Account Deletion Feedback</h2>
        <p><strong>User Email:</strong> ${user.email}</p>
        <p><strong>User ID:</strong> ${user.id}</p>
        <p><strong>Deletion Date:</strong> ${new Date().toISOString()}</p>
        
        <h3>Reason for Leaving:</h3>
        <p>${reason}</p>
        
        <h3>Additional Feedback:</h3>
        <p>${feedback}</p>
        
        <hr>
        <p><em>This email was automatically generated when the user deleted their account.</em></p>
      `,
    })

    if (emailResponse.error) {
      console.error('Error sending email:', emailResponse.error)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send feedback email', 
          details: emailResponse.error 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Feedback email sent successfully:', emailResponse);

    // Success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Feedback email sent successfully',
        emailId: emailResponse.data?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in send-deletion-feedback function:', error)
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
