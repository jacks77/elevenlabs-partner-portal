import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteEmailRequest {
  registrationId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registrationId }: InviteEmailRequest = await req.json();

    if (!registrationId) {
      return new Response(
        JSON.stringify({ error: 'Registration ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured in Supabase secrets');
    }

    const resend = new Resend(resendApiKey);

    // Get app URL from environment
    const appUrl = Deno.env.get('APP_URL') || 'https://lovable.app';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

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

    // Generate secure invite code and expiration
    const inviteCode = crypto.randomUUID();
    const inviteExpiresAt = new Date();
    inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 days from now

    // Update registration with invite code
    const { error: updateError } = await supabase
      .from('registrations')
      .update({
        invite_code: inviteCode,
        invite_expires_at: inviteExpiresAt.toISOString()
      })
      .eq('id', registrationId);

    if (updateError) {
      console.error('Error updating registration with invite code:', updateError);
      throw updateError;
    }

    // Get company name for email
    let companyName = 'Unknown Company';
    if (registration.approved_company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', registration.approved_company_id)
        .single();
      
      if (company) {
        companyName = company.name;
      }
    }

    // Create invite URL
    const inviteUrl = `${appUrl}/complete-account?invite=${inviteCode}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Partner Portal <onboarding@resend.dev>",
      to: [registration.email],
      subject: "Welcome to the Partner Portal - Complete Your Account",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h1 style="color: #333; text-align: center;">Welcome to the Partner Portal!</h1>
          
          <p>Hi ${registration.full_name || 'there'},</p>
          
          <p>Great news! Your registration request has been approved. You've been assigned to <strong>${companyName}</strong> as a ${registration.approved_role || 'member'}.</p>
          
          <p>To complete your account setup, please click the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Account Setup
            </a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
          
          <p><strong>Important:</strong> This invitation link will expire in 7 days.</p>
          
          <p>Once you complete the setup, you'll be able to:</p>
          <ul>
            <li>Access company documents and resources</li>
            <li>View important links and announcements</li>
            <li>${registration.approved_role === 'admin' ? 'Manage company members and content' : 'Collaborate with your team members'}</li>
          </ul>
          
          <p>If you have any questions, please contact your administrator.</p>
          
          <p>Welcome aboard!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This invitation was sent to ${registration.email}. If you didn't request access to the Partner Portal, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log('Invite email sent successfully:', { 
      registrationId, 
      email: registration.email,
      inviteCode,
      emailId: emailResponse.data?.id 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${registration.email}`,
        inviteCode,
        expiresAt: inviteExpiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error sending invite email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send invite email',
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