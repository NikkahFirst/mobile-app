
-- Create table for tracking daily personality search limits
CREATE TABLE public.personality_search_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_date DATE NOT NULL DEFAULT CURRENT_DATE,
  search_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint to ensure one record per user per day
CREATE UNIQUE INDEX idx_personality_search_limits_user_date 
ON public.personality_search_limits(user_id, search_date);

-- Enable RLS
ALTER TABLE public.personality_search_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own search limits" 
  ON public.personality_search_limits 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search limits" 
  ON public.personality_search_limits 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search limits" 
  ON public.personality_search_limits 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at column
CREATE TRIGGER update_personality_search_limits_updated_at
  BEFORE UPDATE ON public.personality_search_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
