import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  companyId: string;
  isAdmin: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Create user admin function called');

    // Parse request body
    const { email, password, fullName, companyId, isAdmin }: CreateUserRequest = await req.json();
    console.log('Request data:', { email, fullName, companyId, isAdmin });

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Input validation
    if (!email || !password || !fullName || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName, companyId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate password complexity
    if (password.length < 8 || 
        !/[A-Z]/.test(password) || 
        !/[a-z]/.test(password) || 
        !/[0-9]/.test(password) || 
        !/[^A-Za-z0-9]/.test(password)) {
      return new Response(
        JSON.stringify({ 
          error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the requesting user is a super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is super admin using the secure function
    const { data: isSuperAdmin, error: checkError } = await supabase
      .rpc('is_super_admin');

    if (checkError || !isSuperAdmin) {
      console.error('Profile error or not super admin:', { checkError, isSuperAdmin });
      
      // Log security event
      await supabase
        .from('security_audit_log')
        .insert({
          user_id: user.id,
          action: 'unauthorized_user_creation_attempt',
          details: { 
            attempted_email: email,
            attempted_company_id: companyId,
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

    console.log('Super admin verified, creating user');

    // Create user in Supabase Auth using admin API
    const { data: authData, error: authError2 } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        full_name: fullName
      },
      email_confirm: true // Auto-confirm email
    });

    if (authError2) {
      console.error('User creation error:', authError2);
      return new Response(
        JSON.stringify({ error: `Failed to create user: ${authError2.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!authData.user) {
      console.error('No user returned from auth creation');
      return new Response(
        JSON.stringify({ error: 'User creation failed - no user returned' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User created in auth:', authData.user.id);

    // Create user profile
    const { error: profileError2 } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        is_super_admin: false
      });

    if (profileError2) {
      console.error('Profile creation error:', profileError2);
      // Try to clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create user profile: ${profileError2.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User profile created');

    // Add user to company
    const { error: memberError } = await supabase
      .from('company_members')
      .insert({
        user_id: authData.user.id,
        company_id: companyId,
        is_admin: isAdmin,
        is_approved: true
      });

    if (memberError) {
      console.error('Company member creation error:', memberError);
      // Try to clean up if member creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to add user to company: ${memberError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('User added to company');

    // Log successful user creation
    await supabase
      .from('security_audit_log')
      .insert({
        user_id: user.id,
        action: 'user_created_by_admin',
        details: { 
          created_user_id: authData.user.id,
          created_user_email: email,
          company_id: companyId,
          is_admin: isAdmin,
          user_agent: req.headers.get('User-Agent')
        },
        ip_address: req.headers.get('X-Forwarded-For') || req.headers.get('CF-Connecting-IP')
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});