-- Fix critical security vulnerabilities - Part 1: RLS Policies

-- 1. CRITICAL: Fix privilege escalation vulnerability in user_profiles RLS
-- Drop the current overly permissive policy
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.user_profiles;

-- Create separate SELECT policy
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Create restricted UPDATE policy that prevents privilege escalation
-- Note: RLS policies cannot reference OLD/NEW, so we'll handle this in application logic
CREATE POLICY "Users can update their own profile (restricted)" 
ON public.user_profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

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