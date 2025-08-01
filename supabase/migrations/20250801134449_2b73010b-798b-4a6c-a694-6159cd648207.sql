-- Security hardening: Add database constraints and triggers for super admin protection

-- Create a function to validate super admin changes
CREATE OR REPLACE FUNCTION public.validate_super_admin_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from making themselves super admin unless they already are one
  IF OLD.is_super_admin = false AND NEW.is_super_admin = true THEN
    -- Only allow if the current user is already a super admin
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only existing super admins can promote other users to super admin';
    END IF;
    
    -- Additional security: Log all super admin promotions
    PERFORM public.log_security_event(
      'super_admin_promotion_attempt',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'promoted_by', auth.uid(),
        'success', true
      )
    );
  END IF;
  
  -- Prevent users from removing super admin from themselves (must be done by another super admin)
  IF OLD.is_super_admin = true AND NEW.is_super_admin = false AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot remove super admin privileges from themselves';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for super admin validation
DROP TRIGGER IF EXISTS validate_super_admin_trigger ON public.user_profiles;
CREATE TRIGGER validate_super_admin_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  WHEN (OLD.is_super_admin IS DISTINCT FROM NEW.is_super_admin)
  EXECUTE FUNCTION public.validate_super_admin_change();

-- Add NOT NULL constraint to is_super_admin (with default false)
ALTER TABLE public.user_profiles 
ALTER COLUMN is_super_admin SET NOT NULL,
ALTER COLUMN is_super_admin SET DEFAULT false;

-- Create index for better performance on super admin checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_super_admin ON public.user_profiles(is_super_admin) WHERE is_super_admin = true;

-- Log this security hardening
INSERT INTO public.security_audit_log (user_id, action, details)
VALUES (
  auth.uid(),
  'security_hardening_applied',
  '{"changes": ["super_admin_validation_trigger", "is_super_admin_constraints", "privilege_escalation_prevention"]}'::jsonb
);