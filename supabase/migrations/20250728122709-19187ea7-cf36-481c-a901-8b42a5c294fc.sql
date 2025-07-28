-- Add field to track if user has changed their default password
ALTER TABLE public.user_profiles 
ADD COLUMN has_changed_default_password BOOLEAN NOT NULL DEFAULT false;

-- Update existing users to not show the prompt (assuming they've already set their passwords)
UPDATE public.user_profiles 
SET has_changed_default_password = true 
WHERE created_at < NOW() - INTERVAL '1 hour';