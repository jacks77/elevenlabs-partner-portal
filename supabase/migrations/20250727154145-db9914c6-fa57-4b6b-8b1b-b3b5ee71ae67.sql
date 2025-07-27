-- Add tags column to documents table
ALTER TABLE public.documents ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create an index for better performance when filtering by tags
CREATE INDEX idx_documents_tags ON public.documents USING GIN(tags);

-- Create an index for better text search performance
CREATE INDEX idx_documents_title_search ON public.documents USING GIN(to_tsvector('english', title));