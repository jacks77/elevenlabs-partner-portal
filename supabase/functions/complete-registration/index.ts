
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

    console.log('Completing registration for:', registrationId);

    // Get registration details
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .eq('status', 'approved')
      .single();

    if (fetchError || !registration) {
      console.error('Registration not found or not approved:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Registration not found or not approved' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: registration.email,
      password: registration.password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user account: ' + authError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const userId = authData.user.id;

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        is_super_admin: false
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Don't throw here, just log - user can still sign in
    }

    // Add user to approved company
    if (registration.approved_company_id) {
      const { error: membershipError } = await supabase
        .from('company_members')
        .insert({
          user_id: userId,
          company_id: registration.approved_company_id,
          is_admin: registration.approved_role === 'admin',
          is_approved: true
        });

      if (membershipError) {
        console.error('Error creating company membership:', membershipError);
        // Don't throw here, just log - user can still sign in
      }
    }

    // Mark registration as accepted
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        status: 'accepted'
      })
      .eq('id', registration.id);

    if (updateError) {
      console.error('Error updating registration status:', updateError);
      // Don't throw here, just log - user account is created
    }

    console.log('Registration completion successful for:', registration.email);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration completed successfully',
        user: {
          email: registration.email,
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
    console.error('Error completing registration:', error);
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
