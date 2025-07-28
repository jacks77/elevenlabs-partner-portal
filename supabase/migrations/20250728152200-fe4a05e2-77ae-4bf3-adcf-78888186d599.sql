-- Add onboarding fields to companies table
ALTER TABLE public.companies 
ADD COLUMN is_in_onboarding boolean DEFAULT false,
ADD COLUMN track text,
ADD COLUMN kickoff_call_date date,
ADD COLUMN technical_enablement_date date,
ADD COLUMN first_lead_registered boolean DEFAULT false,
ADD COLUMN first_closed_won boolean DEFAULT false;

-- Add constraint for track values
ALTER TABLE public.companies 
ADD CONSTRAINT valid_track CHECK (track IN ('Track 1', 'Track 2', 'Track 3') OR track IS NULL);