-- Add commission_tier and certification_tier to companies table
ALTER TABLE public.companies 
ADD COLUMN commission_tier TEXT DEFAULT 'Registered',
ADD COLUMN certification_tier TEXT DEFAULT 'Registered';

-- Add check constraints for valid tier values
ALTER TABLE public.companies 
ADD CONSTRAINT commission_tier_check 
CHECK (commission_tier IN ('Registered', 'Bronze', 'Silver', 'Gold', 'Platinum'));

ALTER TABLE public.companies 
ADD CONSTRAINT certification_tier_check 
CHECK (certification_tier IN ('Registered', 'Bronze', 'Silver', 'Gold', 'Platinum'));

-- Create sitewide_settings table for commission percentages
CREATE TABLE public.sitewide_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sitewide_settings
ALTER TABLE public.sitewide_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for sitewide_settings
CREATE POLICY "Super admins can manage sitewide settings" 
ON public.sitewide_settings 
FOR ALL 
USING (is_super_admin());

CREATE POLICY "Authenticated users can view sitewide settings" 
ON public.sitewide_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Insert default commission percentages
INSERT INTO public.sitewide_settings (setting_key, setting_value, description) VALUES
('commission_registered', '5', 'Commission percentage for Registered tier'),
('commission_bronze', '7', 'Commission percentage for Bronze tier'),
('commission_silver', '10', 'Commission percentage for Silver tier'),
('commission_gold', '12', 'Commission percentage for Gold tier'),
('commission_platinum', '15', 'Commission percentage for Platinum tier');

-- Add trigger for updated_at
CREATE TRIGGER update_sitewide_settings_updated_at
BEFORE UPDATE ON public.sitewide_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();