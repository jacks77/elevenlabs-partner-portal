-- Remove the old foreign key constraint that's causing conflicts
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_new_partner_manager_id_fkey;