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
    details
  ) VALUES (
    COALESCE(target_user_id, auth.uid()),
    action_type,
    COALESCE(details, '{}'::jsonb)
  );
END;
$$;

-- 3. Add password security tracking columns
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

-- 5. Add rate limiting table for registrations
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

-- 6. Clean up old rate limit entries function
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limits 
  WHERE window_start < (now() - interval '1 hour');
$$;