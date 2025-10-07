-- Create table for storing user generation history
CREATE TABLE IF NOT EXISTS public.user_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  character_profile JSONB NOT NULL,
  image_prompts JSONB NOT NULL,
  generation_mode TEXT NOT NULL,
  generation_style TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX idx_user_history_user_id ON public.user_history(user_id);
CREATE INDEX idx_user_history_timestamp ON public.user_history(timestamp DESC);

-- Enable RLS
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own history
CREATE POLICY "Users can read their own history"
ON public.user_history
FOR SELECT
USING (true);

-- Policy: Users can insert their own history
CREATE POLICY "Users can insert their own history"
ON public.user_history
FOR INSERT
WITH CHECK (true);

-- Policy: Users can delete their own history
CREATE POLICY "Users can delete their own history"
ON public.user_history
FOR DELETE
USING (true);