-- Enable the citext extension for case-insensitive text
CREATE EXTENSION IF NOT EXISTS citext;

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE public.user_profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_members table
CREATE TABLE public.company_members (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- Create registrations table
CREATE TABLE public.registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email CITEXT NOT NULL,
  full_name TEXT,
  requested_company_name TEXT,
  requested_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT CHECK (status IN ('pending','approved','rejected','accepted')) DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_company_id UUID REFERENCES public.companies(id),
  approved_role TEXT CHECK (approved_role IN ('admin','member')) DEFAULT 'member',
  invite_code TEXT UNIQUE,
  invite_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  drive_url TEXT,
  drive_file_id TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create links table
CREATE TABLE public.links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  url TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_page_views table
CREATE TABLE public.analytics_page_views (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  page TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_link_clicks table
CREATE TABLE public.analytics_link_clicks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  link_id UUID REFERENCES public.links(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_link_clicks ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.user_profiles WHERE user_id = auth.uid()),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: Check if user is company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.company_members 
     WHERE user_id = auth.uid() AND company_id = target_company_id AND is_approved = true),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: Get user's companies
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM public.company_members 
  WHERE user_id = auth.uid() AND is_approved = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for companies
CREATE POLICY "Users can view companies they belong to" ON public.companies
  FOR SELECT USING (
    public.is_super_admin() OR 
    id IN (SELECT public.get_user_companies())
  );

CREATE POLICY "Super admins can manage companies" ON public.companies
  FOR ALL USING (public.is_super_admin());

-- RLS Policies for user_profiles
CREATE POLICY "Users can view and update their own profile" ON public.user_profiles
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (public.is_super_admin());

-- RLS Policies for company_members
CREATE POLICY "Users can view their own memberships" ON public.company_members
  FOR SELECT USING (user_id = auth.uid());

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
CREATE POLICY "Anyone can insert registration requests" ON public.registrations
  FOR INSERT WITH CHECK (true);

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
CREATE POLICY "Users can insert their own page views" ON public.analytics_page_views
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all page views" ON public.analytics_page_views
  FOR SELECT USING (public.is_super_admin());

-- RLS Policies for analytics_link_clicks
CREATE POLICY "Users can insert their own link clicks" ON public.analytics_link_clicks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all link clicks" ON public.analytics_link_clicks
  FOR SELECT USING (public.is_super_admin());

-- Create indexes for performance
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);
CREATE INDEX idx_registrations_status ON public.registrations(status);
CREATE INDEX idx_registrations_invite_code ON public.registrations(invite_code);
CREATE INDEX idx_documents_company_id ON public.documents(company_id);
CREATE INDEX idx_links_company_id ON public.links(company_id);
CREATE INDEX idx_analytics_page_views_user_id ON public.analytics_page_views(user_id);
CREATE INDEX idx_analytics_link_clicks_user_id ON public.analytics_link_clicks(user_id);
CREATE INDEX idx_analytics_link_clicks_link_id ON public.analytics_link_clicks(link_id);