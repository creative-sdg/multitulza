-- Disable RLS for user_history table since we're using browser-based user identification
-- This is acceptable for this use case as we're not storing sensitive personal data
ALTER TABLE public.user_history DISABLE ROW LEVEL SECURITY;