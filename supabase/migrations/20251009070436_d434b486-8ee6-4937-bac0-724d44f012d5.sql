-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Migrate user_history table to use UUID for user_id
ALTER TABLE public.user_history 
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_user_history_auth_user_id ON public.user_history(auth_user_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view their own history" ON public.user_history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.user_history;
DROP POLICY IF EXISTS "Users can update their own history" ON public.user_history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.user_history;

-- Create new strict RLS policies (no NULL bypass)
CREATE POLICY "Authenticated users can view their own history"
  ON public.user_history FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can insert their own history"
  ON public.user_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can update their own history"
  ON public.user_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Authenticated users can delete their own history"
  ON public.user_history FOR DELETE
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Make storage bucket private
UPDATE storage.buckets 
SET public = false 
WHERE name = 'videos';

-- Add storage RLS policies for authenticated users only
CREATE POLICY "Authenticated users can upload audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);