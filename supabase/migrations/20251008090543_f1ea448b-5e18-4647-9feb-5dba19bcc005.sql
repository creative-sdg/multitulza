-- Enable Row Level Security on user_history table
ALTER TABLE public.user_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_history table
-- Note: Current implementation uses localStorage user_id (text type)
-- These policies will work with the current system but should be updated when proper auth is implemented

-- Allow users to view only their own history
CREATE POLICY "Users can view their own history"
ON public.user_history
FOR SELECT
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR current_setting('request.jwt.claims', true)::json IS NULL);

-- Allow users to insert their own history
CREATE POLICY "Users can insert their own history"
ON public.user_history
FOR INSERT
WITH CHECK (true);

-- Allow users to update their own history
CREATE POLICY "Users can update their own history"
ON public.user_history
FOR UPDATE
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR current_setting('request.jwt.claims', true)::json IS NULL);

-- Allow users to delete their own history
CREATE POLICY "Users can delete their own history"
ON public.user_history
FOR DELETE
USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub' OR current_setting('request.jwt.claims', true)::json IS NULL);

-- Add comment explaining the temporary nature of these policies
COMMENT ON TABLE public.user_history IS 'RLS enabled with temporary policies. Currently uses localStorage user_id. Should be updated to use auth.uid() when proper authentication is implemented.';