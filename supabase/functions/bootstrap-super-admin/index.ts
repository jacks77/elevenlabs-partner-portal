import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    
    if (!adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ 
          error: 'ADMIN_EMAIL and ADMIN_PASSWORD must be configured in Supabase secrets' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create admin client with service role
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured');
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting super admin bootstrap process...');

    // Check if admin user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(adminEmail);
    
    let userId: string;
    let message = '';
    
    if (existingUser.user) {
      userId = existingUser.user.id;
      message = `Super admin already exists with email: ${adminEmail}`;
      console.log(message);
    } else {
      // Create super admin user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating admin user:', createError);
        throw createError;
      }

      userId = newUser.user!.id;
      message = `Super admin created successfully with email: ${adminEmail}. Please change the password on first login.`;
      console.log(message);
    }

    // Ensure user_profiles entry exists with super admin privileges
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({ 
        user_id: userId, 
        is_super_admin: true 
      }, { 
        onConflict: 'user_id' 
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw profileError;
    }

    // Create or find "Global Admins" company
    let globalAdminCompanyId: string;
    const { data: existingCompany, error: companySelectError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', 'Global Admins')
      .maybeSingle();

    if (companySelectError) {
      console.error('Error checking for Global Admins company:', companySelectError);
      throw companySelectError;
    }

    if (existingCompany) {
      globalAdminCompanyId = existingCompany.id;
      console.log('Global Admins company already exists');
    } else {
      const { data: newCompany, error: companyCreateError } = await supabase
        .from('companies')
        .insert({ name: 'Global Admins' })
        .select('id')
        .single();

      if (companyCreateError) {
        console.error('Error creating Global Admins company:', companyCreateError);
        throw companyCreateError;
      }

      globalAdminCompanyId = newCompany.id;
      console.log('Global Admins company created');
    }

    // Add user to Global Admins company as admin
    const { error: membershipError } = await supabase
      .from('company_members')
      .upsert({
        user_id: userId,
        company_id: globalAdminCompanyId,
        is_admin: true,
        is_approved: true
      }, {
        onConflict: 'user_id,company_id'
      });

    if (membershipError) {
      console.error('Error creating company membership:', membershipError);
      throw membershipError;
    }

    console.log('Super admin bootstrap completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message,
        adminEmail,
        globalAdminCompanyId,
        reminder: 'Please change the admin password immediately after first login'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in bootstrap super admin:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to bootstrap super admin',
        details: error 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);