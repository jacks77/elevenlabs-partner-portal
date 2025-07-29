-- Fix critical security issues

-- 1. Fix the is_super_admin() function to handle authorization properly
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()),
    false
  );
$function$;

-- 2. Create a more secure function to check ElevenLabs special permissions
CREATE OR REPLACE FUNCTION public.is_elevenlabs_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.company_members cm
    JOIN public.companies c ON c.id = cm.company_id
    WHERE cm.user_id = auth.uid() 
    AND cm.is_approved = true
    AND LOWER(c.name) LIKE '%elevenlabs%'
  );
$function$;

-- 3. Update companies RLS policy to be more secure
DROP POLICY IF EXISTS "Users can view companies they belong to" ON public.companies;
CREATE POLICY "Users can view companies they belong to" 
ON public.companies 
FOR SELECT 
USING (
  is_super_admin() OR 
  (id IN (SELECT get_user_companies()))
);

-- 4. Add password complexity validation trigger
CREATE OR REPLACE FUNCTION public.validate_password_complexity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check minimum length
  IF LENGTH(NEW.password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters long';
  END IF;
  
  -- Check for at least one uppercase letter
  IF NEW.password !~ '[A-Z]' THEN
    RAISE EXCEPTION 'Password must contain at least one uppercase letter';
  END IF;
  
  -- Check for at least one lowercase letter
  IF NEW.password !~ '[a-z]' THEN
    RAISE EXCEPTION 'Password must contain at least one lowercase letter';
  END IF;
  
  -- Check for at least one number
  IF NEW.password !~ '[0-9]' THEN
    RAISE EXCEPTION 'Password must contain at least one number';
  END IF;
  
  -- Check for at least one special character
  IF NEW.password !~ '[^A-Za-z0-9]' THEN
    RAISE EXCEPTION 'Password must contain at least one special character';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Apply password validation to registrations table
DROP TRIGGER IF EXISTS validate_registration_password ON public.registrations;
CREATE TRIGGER validate_registration_password
  BEFORE INSERT OR UPDATE ON public.registrations
  FOR EACH ROW
  WHEN (NEW.password IS NOT NULL AND NEW.password != '')
  EXECUTE FUNCTION public.validate_password_complexity();

-- 5. Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (is_super_admin());

-- Allow system to insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log
FOR INSERT
WITH CHECK (true);