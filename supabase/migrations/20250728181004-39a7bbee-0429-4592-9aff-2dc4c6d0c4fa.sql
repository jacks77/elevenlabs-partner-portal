-- Enable super admins to delete user accounts and related data
-- Note: This affects auth.users which is managed by Supabase, but we can delete from our public tables

-- Function to delete a user and all their data
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only super admins can delete user accounts
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied. Only super admins can delete user accounts.';
  END IF;

  -- Delete from company_members
  DELETE FROM public.company_members WHERE user_id = target_user_id;
  
  -- Delete from user_profiles  
  DELETE FROM public.user_profiles WHERE user_id = target_user_id;
  
  -- Delete from registrations (if any)
  DELETE FROM public.registrations WHERE approved_by = target_user_id;
  
  -- Delete analytics data
  DELETE FROM public.analytics_page_views WHERE user_id = target_user_id;
  DELETE FROM public.analytics_link_clicks WHERE user_id = target_user_id;
  
  -- Note: Cannot directly delete from auth.users via SQL
  -- This would need to be done via Supabase Admin API in an edge function
END;
$$;