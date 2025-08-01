-- Allow super admins to promote ElevenLabs employees to super admin status

-- Create a function to check if a user is an ElevenLabs employee
CREATE OR REPLACE FUNCTION public.is_elevenlabs_employee(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.company_members cm
    JOIN public.companies c ON c.id = cm.company_id
    WHERE cm.user_id = target_user_id 
    AND cm.is_approved = true
    AND LOWER(c.name) LIKE '%elevenlabs%'
  );
$$;

-- Add a new RLS policy to allow super admins to update is_super_admin for ElevenLabs employees
CREATE POLICY "Super admins can promote ElevenLabs employees to super admin"
ON public.user_profiles
FOR UPDATE
USING (
  is_super_admin() 
  AND is_elevenlabs_employee(user_id)
  AND user_id != auth.uid() -- Prevent self-modification
)
WITH CHECK (
  is_super_admin() 
  AND is_elevenlabs_employee(user_id)
  AND user_id != auth.uid() -- Prevent self-modification
);

-- Log security events for super admin promotions
CREATE OR REPLACE FUNCTION public.log_super_admin_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when is_super_admin field changes
  IF OLD.is_super_admin != NEW.is_super_admin THEN
    PERFORM log_security_event(
      CASE 
        WHEN NEW.is_super_admin THEN 'super_admin_promoted'
        ELSE 'super_admin_demoted'
      END,
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'target_user_name', NEW.first_name || ' ' || NEW.last_name,
        'promoted_by', auth.uid(),
        'previous_status', OLD.is_super_admin,
        'new_status', NEW.is_super_admin
      ),
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging super admin changes
DROP TRIGGER IF EXISTS log_super_admin_changes ON public.user_profiles;
CREATE TRIGGER log_super_admin_changes
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_super_admin_promotion();