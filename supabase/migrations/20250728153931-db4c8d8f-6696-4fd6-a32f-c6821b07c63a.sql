-- Create notification banners table
CREATE TABLE public.notification_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_banners ENABLE ROW LEVEL SECURITY;

-- Create policies for notification banners
CREATE POLICY "Anyone can view active notifications" 
ON public.notification_banners 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Super admins can manage notifications" 
ON public.notification_banners 
FOR ALL 
USING (is_super_admin());

-- Create news stories table
CREATE TABLE public.news_stories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  headline text NOT NULL,
  subheading text,
  content text,
  image_url text,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news_stories ENABLE ROW LEVEL SECURITY;

-- Create policies for news stories
CREATE POLICY "Anyone can view published stories" 
ON public.news_stories 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Super admins can manage stories" 
ON public.news_stories 
FOR ALL 
USING (is_super_admin());

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_notification_banners_updated_at
  BEFORE UPDATE ON public.notification_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_stories_updated_at
  BEFORE UPDATE ON public.news_stories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();