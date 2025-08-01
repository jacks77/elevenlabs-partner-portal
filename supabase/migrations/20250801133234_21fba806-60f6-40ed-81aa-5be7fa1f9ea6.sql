-- Fix duplicate foreign key relationships between companies and partner_managers

-- First, let's check what foreign keys exist
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' 
AND (conrelid = 'companies'::regclass OR confrelid = 'companies'::regclass)
AND (conrelid = 'partner_managers'::regclass OR confrelid = 'partner_managers'::regclass);

-- Drop the duplicate/incorrect foreign key constraint
-- We'll keep the standard one and remove any with "new" prefix
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_new_partner_manager_id_fkey;

-- Ensure we have the correct foreign key constraint
DO $$
BEGIN
    -- Check if the main foreign key exists, if not create it
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'companies_partner_manager_id_fkey' 
        AND conrelid = 'companies'::regclass
    ) THEN
        ALTER TABLE public.companies 
        ADD CONSTRAINT companies_partner_manager_id_fkey 
        FOREIGN KEY (partner_manager_id) 
        REFERENCES public.partner_managers(id);
    END IF;
END $$;