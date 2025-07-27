-- Fix security warnings by setting search_path for functions
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_company_admin(UUID);
DROP FUNCTION IF EXISTS public.get_user_companies();

-- Helper function: Check if user is super admin (with secure search_path)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Helper function: Check if user is company admin (with secure search_path)
CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.company_members 
     WHERE user_id = auth.uid() AND company_id = target_company_id AND is_approved = true),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Helper function: Get user's companies (with secure search_path)
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND is_approved = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;