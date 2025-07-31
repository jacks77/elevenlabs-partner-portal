-- Create a dedicated partner_managers table
CREATE TABLE public.partner_managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  scheduling_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.partner_managers ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all partner managers
CREATE POLICY "Super admins can manage partner managers" 
ON public.partner_managers 
FOR ALL 
USING (is_super_admin());

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_partner_managers_updated_at
BEFORE UPDATE ON public.partner_managers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add a new column to companies table for the new partner manager reference
ALTER TABLE public.companies 
ADD COLUMN new_partner_manager_id UUID REFERENCES public.partner_managers(id);

-- Migrate existing partner manager data
INSERT INTO public.partner_managers (first_name, last_name, email, scheduling_link)
SELECT 
  COALESCE(up.first_name, 'Unknown') as first_name,
  COALESCE(up.last_name, 'Manager') as last_name,
  COALESCE(au.email, 'unknown@example.com') as email,
  up.scheduling_link
FROM public.companies c
JOIN public.user_profiles up ON up.user_id = c.partner_manager_id
LEFT JOIN auth.users au ON au.id = c.partner_manager_id
WHERE c.partner_manager_id IS NOT NULL;

-- Update companies to reference the new partner managers
UPDATE public.companies 
SET new_partner_manager_id = pm.id
FROM public.partner_managers pm
JOIN public.user_profiles up ON up.first_name = pm.first_name AND up.last_name = pm.last_name
WHERE companies.partner_manager_id = up.user_id;

-- Allow company members to view partner managers assigned to their companies
CREATE POLICY "Users can view partner managers for their companies" 
ON public.partner_managers 
FOR SELECT 
USING (
  id IN (
    SELECT c.new_partner_manager_id 
    FROM public.companies c 
    WHERE c.id IN (SELECT get_user_companies())
  )
);