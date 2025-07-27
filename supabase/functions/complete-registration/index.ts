
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteRegistrationRequest {
  registrationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationId }: CompleteRegistrationRequest = await req.json();

    if (!registrationId) {
      return new Response(
        JSON.stringify({ error: 'Registration ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('=== COMPLETE REGISTRATION FUNCTION STARTED ===');
    console.log('Registration ID:', registrationId);

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('status', 'approved')
      .single();

    if (fetchError || !registration) {
      console.error('Registration fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Registration not found or not approved' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Registration found:', {
      email: registration.email,
      full_name: registration.full_name,
      approved_company_id: registration.approved_company_id,
      approved_role: registration.approved_role
    });

    // Create user account in auth.users
    console.log('Creating user in auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: registration.email,
      password: registration.password,
      email_confirm: true,
      user_metadata: {
        full_name: registration.full_name
      }
    });

    if (authError) {
      console.error('Auth user creation error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user account: ' + authError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const userId = authData.user.id;
    console.log('User created in auth.users with ID:', userId);

    // Create user profile
    console.log('Creating user profile...');
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        is_super_admin: false
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile: ' + profileError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('User profile created successfully');

    // Add user to approved company
    if (registration.approved_company_id) {
      console.log('Adding user to company...');
      const { error: membershipError } = await supabase
        .from('company_members')
        .insert({
          user_id: userId,
          company_id: registration.approved_company_id,
          is_admin: registration.approved_role === 'admin',
          is_approved: true
        });

      if (membershipError) {
        console.error('Company membership error:', membershipError);
        return new Response(
          JSON.stringify({ error: 'Failed to create company membership: ' + membershipError.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      console.log('User added to company successfully');
    }

    // Mark registration as accepted
    console.log('Updating registration status...');
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        status: 'accepted'
      })
      .eq('id', registration.id);

    if (updateError) {
      console.error('Registration update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update registration status: ' + updateError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('=== REGISTRATION COMPLETION SUCCESSFUL ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration completed successfully',
        user: {
          id: userId,
          email: registration.email,
          full_name: registration.full_name,
          role: registration.approved_role,
          companyId: registration.approved_company_id
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('=== COMPLETE REGISTRATION ERROR ===', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to complete registration',
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