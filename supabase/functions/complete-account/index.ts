import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteAccountRequest {
  inviteCode: string;
  userEmail: string;
  userId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteCode, userEmail, userId }: CompleteAccountRequest = await req.json();

    if (!inviteCode || !userEmail || !userId) {
      return new Response(
        JSON.stringify({ error: 'Invite code, user email, and user ID are required' }),
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

    console.log('Completing account for:', { userEmail, userId, inviteCode });

    // Get registration by invite code
    const { data: registration, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('invite_code', inviteCode)
      .eq('status', 'approved')
      .single();

    if (fetchError || !registration) {
      console.error('Invalid or expired invite code:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired invite code' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Check if invite has expired
    const now = new Date();
    const expiresAt = new Date(registration.invite_expires_at);
    if (now > expiresAt) {
      console.error('Invite code has expired');
      return new Response(
        JSON.stringify({ error: 'Invite code has expired' }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Verify email matches (case insensitive)
    if (userEmail.toLowerCase() !== registration.email.toLowerCase()) {
      console.error('Email mismatch:', { userEmail, registrationEmail: registration.email });
      return new Response(
        JSON.stringify({ 
          error: 'Email mismatch',
          message: 'The email address used to sign in does not match the approved registration email. Please use the correct email or contact your administrator.',
          approvedEmail: registration.email
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: userId,
        is_super_admin: false
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      throw profileError;
    }

    // Add user to approved company
    if (registration.approved_company_id) {
      const { error: membershipError } = await supabase
        .from('company_members')
        .upsert({
          user_id: userId,
          company_id: registration.approved_company_id,
          is_admin: registration.approved_role === 'admin',
          is_approved: true
        }, {
          onConflict: 'user_id,company_id'
        });

      if (membershipError) {
        console.error('Error creating company membership:', membershipError);
        throw membershipError;
      }
    }

    // Mark registration as accepted and invalidate invite
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        status: 'accepted',
        invite_code: null,
        invite_expires_at: null
      })
      .eq('id', registration.id);

    if (updateError) {
      console.error('Error updating registration status:', updateError);
      throw updateError;
    }

    console.log('Account completion successful for:', userEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account setup completed successfully',
        user: {
          email: userEmail,
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
    console.error('Error completing account:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to complete account setup',
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