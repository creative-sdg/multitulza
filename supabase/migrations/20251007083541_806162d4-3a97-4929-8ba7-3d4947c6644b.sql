-- Add unique constraint on image_id to allow upsert operations
ALTER TABLE public.user_history 
ADD CONSTRAINT user_history_image_id_unique UNIQUE (image_id);