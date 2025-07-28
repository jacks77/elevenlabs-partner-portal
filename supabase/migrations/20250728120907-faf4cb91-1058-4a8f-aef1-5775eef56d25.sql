-- Add partner_salesforce_record column to companies table
ALTER TABLE public.companies 
ADD COLUMN partner_salesforce_record TEXT;