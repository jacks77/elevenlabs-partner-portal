import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the user from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user is authenticated and is a super admin
    const { data: user, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the target user ID from request body
    const { targetUserId } = await req.json()
    
    // Input validation
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Target user ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(targetUserId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is super admin by querying user_profiles directly
    const { data: profileData, error: checkError } = await supabaseAdmin
      .from('user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.user.id)
      .single();

    // Security: Strict super admin check - only explicit database value, no fallbacks
    const isSuperAdmin = profileData?.is_super_admin === true;

    if (checkError || !isSuperAdmin) {
      console.error('Profile error or not super admin:', { checkError, isSuperAdmin });
      
      // Log unauthorized attempt
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          user_id: user.user.id,
          action: 'unauthorized_user_deletion_attempt',
          details: { 
            attempted_target_user_id: targetUserId,
            user_agent: req.headers.get('User-Agent')
          },
          ip_address: req.headers.get('X-Forwarded-For') || req.headers.get('CF-Connecting-IP')
        });

      return new Response(
        JSON.stringify({ error: 'Access denied. Super admin privileges required.' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // First, manually clean up related data since we're using service role
    // Delete from company_members
    await supabaseAdmin
      .from('company_members')
      .delete()
      .eq('user_id', targetUserId)

    // Delete from user_profiles  
    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('user_id', targetUserId)
    
    // Delete from registrations (if any)
    await supabaseAdmin
      .from('registrations')
      .delete()
      .eq('approved_by', targetUserId)
    
    // Delete analytics data
    await supabaseAdmin
      .from('analytics_page_views')
      .delete()
      .eq('user_id', targetUserId)
      
    await supabaseAdmin
      .from('analytics_link_clicks')
      .delete()
      .eq('user_id', targetUserId)


    // Then delete the user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user: ' + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful deletion
    await supabaseAdmin
      .from('security_audit_log')
      .insert({
        user_id: user.user.id,
        action: 'user_deleted_by_admin',
        details: { 
          deleted_user_id: targetUserId,
          user_agent: req.headers.get('User-Agent')
        },
        ip_address: req.headers.get('X-Forwarded-For') || req.headers.get('CF-Connecting-IP')
      });

    return new Response(
      JSON.stringify({ message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})