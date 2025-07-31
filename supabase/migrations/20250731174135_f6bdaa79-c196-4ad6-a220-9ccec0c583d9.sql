-- Remove the old foreign key constraint that's causing conflicts
DROP CONSTRAINT IF EXISTS companies_new_partner_manager_id_fkey ON public.companies;