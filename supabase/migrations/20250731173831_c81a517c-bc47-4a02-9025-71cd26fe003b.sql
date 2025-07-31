-- Drop the policy that references the old column
DROP POLICY IF EXISTS "Users can view partner managers for their companies" ON public.partner_managers;

-- Drop the old partner_manager_id column
ALTER TABLE public.companies DROP COLUMN IF EXISTS partner_manager_id;

-- Rename the new column to the original name
ALTER TABLE public.companies RENAME COLUMN new_partner_manager_id TO partner_manager_id;

-- Recreate the policy with the correct column name
CREATE POLICY "Users can view partner managers for their companies" 
ON public.partner_managers 
FOR SELECT 
USING (
  id IN (
    SELECT c.partner_manager_id 
    FROM public.companies c 
    WHERE c.id IN (SELECT get_user_companies())
  )
);