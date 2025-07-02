
-- Add viewed_profiles column to track which profiles have been viewed
ALTER TABLE public.daily_profile_views 
ADD COLUMN viewed_profiles TEXT[] DEFAULT '{}';

-- Create index for better performance when querying viewed profiles
CREATE INDEX IF NOT EXISTS idx_daily_profile_views_viewed_profiles 
ON public.daily_profile_views USING GIN (viewed_profiles);
