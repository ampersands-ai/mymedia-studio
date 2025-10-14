-- Drop the existing type constraint
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_type_check;

-- Recreate the constraint with 'audio' included
ALTER TABLE public.generations 
ADD CONSTRAINT generations_type_check 
CHECK (type IN ('image', 'video', 'text', 'audio'));