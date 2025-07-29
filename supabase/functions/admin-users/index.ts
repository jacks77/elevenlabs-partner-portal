import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

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
    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create regular client to verify user is super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is super admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single();

    if (!profile?.is_super_admin) {
      throw new Error('Access denied. Super admin required.');
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === 'GET') {
      // List all users
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      return new Response(JSON.stringify({ users: users.users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (method === 'POST') {
      const requestBody = await req.json();
      const { action, userId, updates } = requestBody;
      if (action === 'get') {
        if (!userId) throw new Error('User ID required');
        
        // Get specific user
        const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (getUserError) throw getUserError;

        return new Response(JSON.stringify({ user: userData.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (action === 'update') {
        if (!userId) throw new Error('User ID required');

        // Update user in auth
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          updates
        );
        if (updateError) throw updateError;

        return new Response(JSON.stringify({ user: updatedUser.user }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        throw new Error('Invalid action parameter');
      }
    } else {
      throw new Error('Method not allowed');
    }

  } catch (error) {
    console.error('Error in admin-users function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});