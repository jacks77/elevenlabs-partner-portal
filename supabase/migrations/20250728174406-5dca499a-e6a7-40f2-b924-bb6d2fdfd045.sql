-- Add tags column to links table
ALTER TABLE public.links ADD COLUMN tags text[] DEFAULT '{}';

-- Add lead_submission_url to companies table
ALTER TABLE public.companies ADD COLUMN lead_submission_url text;