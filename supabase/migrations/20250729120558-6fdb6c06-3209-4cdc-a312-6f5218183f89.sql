-- Add name and title columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN title TEXT;