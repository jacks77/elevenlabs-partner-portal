-- Add enhanced tagging and content organization features

-- Add new fields to links table for enhanced content organization
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS persona text[];
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS job_category text;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS product_area text[];
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS region text[];
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS status text DEFAULT 'current';
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.links ADD COLUMN IF NOT EXISTS youtube_id text;

-- Add new fields to documents table for enhanced content organization
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS persona text[];
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS job_category text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS product_area text[];
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS region text[];
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS content_type text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status text DEFAULT 'current';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS version text;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS description text;

-- Create search analytics table to track empty searches
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  search_term text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on search analytics
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for search analytics
CREATE POLICY "Users can insert their own searches" 
ON public.search_analytics 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all searches" 
ON public.search_analytics 
FOR SELECT 
USING (is_super_admin());

-- Create pinned content table for personalization
CREATE TABLE IF NOT EXISTS public.pinned_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_type text NOT NULL CHECK (content_type IN ('link', 'document')),
  content_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_type, content_id)
);

-- Enable RLS on pinned content
ALTER TABLE public.pinned_content ENABLE ROW LEVEL SECURITY;

-- Create policies for pinned content
CREATE POLICY "Users can manage their own pinned content" 
ON public.pinned_content 
FOR ALL 
USING (user_id = auth.uid());

-- Add scheduling_link to user_profiles for partner manager booking
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS scheduling_link text;

-- Update user profiles RLS to allow viewing of scheduling_link for partner managers
CREATE OR REPLACE FUNCTION public.get_partner_manager_profile(manager_id uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  scheduling_link text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.scheduling_link
  FROM public.user_profiles up
  JOIN public.companies c ON c.partner_manager_id = up.user_id
  WHERE up.user_id = manager_id;
$$;