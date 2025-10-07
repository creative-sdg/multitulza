-- Drop RLS policies since RLS is now disabled for user_history table
DROP POLICY IF EXISTS "Users can read their own history" ON public.user_history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.user_history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.user_history;