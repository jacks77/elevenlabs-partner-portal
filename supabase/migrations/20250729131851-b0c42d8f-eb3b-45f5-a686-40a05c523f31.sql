-- Create ElevenLabs company record
INSERT INTO public.companies (name) 
VALUES ('ElevenLabs')
ON CONFLICT (name) DO NOTHING;