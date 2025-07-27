-- Add password column to registrations table
ALTER TABLE public.registrations 
ADD COLUMN password TEXT NOT NULL DEFAULT '';