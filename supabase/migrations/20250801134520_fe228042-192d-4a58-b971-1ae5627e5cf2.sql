-- Fix security linter warning: Set search_path for validation function
CREATE OR REPLACE FUNCTION public.validate_super_admin_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;