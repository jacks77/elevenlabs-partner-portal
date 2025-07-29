-- Add partner manager and slack channel fields to companies table
ALTER TABLE public.companies 
ADD COLUMN partner_manager_id UUID REFERENCES public.user_profiles(user_id),
ADD COLUMN slack_channel_url TEXT;