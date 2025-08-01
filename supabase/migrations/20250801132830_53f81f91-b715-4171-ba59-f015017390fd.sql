-- Fix critical security vulnerabilities

-- 1. CRITICAL: Fix privilege escalation vulnerability in user_profiles RLS
-- Drop the current overly permissive policy and create secure ones
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.user_profiles;

-- Create separate policies for SELECT and UPDATE with proper restrictions
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Critical fix: Prevent users from updating is_super_admin field
CREATE POLICY "Users can update their own profile (restricted)" 
ON public.user_profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() 
  AND (
    -- Only super admins can modify is_super_admin field
    OLD.is_super_admin = NEW.is_super_admin 
    OR is_super_admin()
  )
);

-- 2. Add security audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  action_type text,
  details jsonb DEFAULT NULL,
  target_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    details,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(target_user_id, auth.uid()),
    action_type,
    COALESCE(details, '{}'::jsonb),
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for')::inet,
    current_setting('request.headers', true)::jsonb ->> 'user-agent'
  );
END;
$$;

-- 3. Add password security tracking
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login timestamp with time zone,
ADD COLUMN IF NOT EXISTS account_locked_until timestamp with time zone;

-- 4. Create function to check if password change is required
CREATE OR REPLACE FUNCTION public.requires_password_change(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT has_changed_default_password 
  OR password_changed_at < (now() - interval '90 days')
  FROM user_profiles 
  WHERE user_id = target_user_id;
$$;

-- 5. Add trigger to log profile updates
CREATE OR REPLACE FUNCTION public.audit_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log privilege escalation attempts
  IF OLD.is_super_admin != NEW.is_super_admin THEN
    PERFORM log_security_event(
      'privilege_escalation_attempt',
      jsonb_build_object(
        'old_value', OLD.is_super_admin,
        'new_value', NEW.is_super_admin,
        'target_user', NEW.user_id
      ),
      NEW.user_id
    );
  END IF;
  
  -- Update password_changed_at when password changes
  IF OLD.has_changed_default_password != NEW.has_changed_default_password AND NEW.has_changed_default_password THEN
    NEW.password_changed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_user_profile_changes
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_profile_changes();

-- 6. Add rate limiting table for registrations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or email
  action_type text NOT NULL,
  attempts integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true);

-- Clean up old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limits 
  WHERE window_start < (now() - interval '1 hour');
$$;