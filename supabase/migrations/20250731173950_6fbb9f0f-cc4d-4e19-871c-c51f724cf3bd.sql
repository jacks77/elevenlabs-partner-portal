-- Add the missing foreign key constraint between companies and partner_managers
ALTER TABLE public.companies 
ADD CONSTRAINT companies_partner_manager_id_fkey 
FOREIGN KEY (partner_manager_id) 
REFERENCES public.partner_managers(id);