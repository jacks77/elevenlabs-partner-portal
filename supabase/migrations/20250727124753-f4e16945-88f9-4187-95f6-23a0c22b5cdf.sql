-- Drop functions with CASCADE to remove dependent policies, then recreate with secure search_path
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_company_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_companies() CASCADE;

-- Recreate helper functions with secure search_path
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.company_members 
     WHERE user_id = auth.uid() AND company_id = target_company_id AND is_approved = true),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND is_approved = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate all RLS policies after function cascade drop
-- RLS Policies for companies
CREATE POLICY "Users can view companies they belong to" ON public.companies
  FOR SELECT USING (
    public.is_super_admin() OR 
    id IN (SELECT public.get_user_companies())
  );

CREATE POLICY "Super admins can manage companies" ON public.companies
  FOR ALL USING (public.is_super_admin());

-- RLS Policies for user_profiles
CREATE POLICY "Super admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.is_super_admin());

-- RLS Policies for company_members
CREATE POLICY "Company admins can view members in their company" ON public.company_members
  FOR SELECT USING (
    public.is_super_admin() OR 
    public.is_company_admin(company_id)
  );

CREATE POLICY "Super admins can manage all memberships" ON public.company_members
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "Company admins can manage members in their company" ON public.company_members
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR 
    public.is_company_admin(company_id)
  );

CREATE POLICY "Company admins can update members in their company" ON public.company_members
  FOR UPDATE USING (
    public.is_super_admin() OR 
    public.is_company_admin(company_id)
  );

CREATE POLICY "Company admins can delete members in their company" ON public.company_members
  FOR DELETE USING (
    public.is_super_admin() OR 
    public.is_company_admin(company_id)
  );

-- RLS Policies for registrations
CREATE POLICY "Users can view registrations by invite code" ON public.registrations
  FOR SELECT USING (
    public.is_super_admin() OR
    (approved_company_id IS NOT NULL AND public.is_company_admin(approved_company_id))
  );

CREATE POLICY "Admins can update registrations for their company" ON public.registrations
  FOR UPDATE USING (
    public.is_super_admin() OR
    (approved_company_id IS NOT NULL AND public.is_company_admin(approved_company_id))
  );

-- RLS Policies for documents
CREATE POLICY "Users can view global and company documents" ON public.documents
  FOR SELECT USING (
    company_id IS NULL OR 
    company_id IN (SELECT public.get_user_companies()) OR
    public.is_super_admin()
  );

CREATE POLICY "Admins can manage global documents" ON public.documents
  FOR ALL USING (
    public.is_super_admin() AND company_id IS NULL
  );

CREATE POLICY "Company admins can manage company documents" ON public.documents
  FOR ALL USING (
    public.is_super_admin() OR
    (company_id IS NOT NULL AND public.is_company_admin(company_id))
  );

-- RLS Policies for links
CREATE POLICY "Users can view global and company links" ON public.links
  FOR SELECT USING (
    company_id IS NULL OR 
    company_id IN (SELECT public.get_user_companies()) OR
    public.is_super_admin()
  );

CREATE POLICY "Admins can manage global links" ON public.links
  FOR ALL USING (
    public.is_super_admin() AND company_id IS NULL
  );

CREATE POLICY "Company admins can manage company links" ON public.links
  FOR ALL USING (
    public.is_super_admin() OR
    (company_id IS NOT NULL AND public.is_company_admin(company_id))
  );

-- RLS Policies for analytics_page_views
CREATE POLICY "Super admins can view all page views" ON public.analytics_page_views
  FOR SELECT USING (public.is_super_admin());

-- RLS Policies for analytics_link_clicks
CREATE POLICY "Super admins can view all link clicks" ON public.analytics_link_clicks
  FOR SELECT USING (public.is_super_admin());