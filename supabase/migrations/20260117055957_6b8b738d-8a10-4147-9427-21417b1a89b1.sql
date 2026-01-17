-- Fix foreign key constraint to allow generation cleanup
-- Drop the existing constraint that blocks deletion
ALTER TABLE user_onboarding_progress 
DROP CONSTRAINT IF EXISTS user_onboarding_progress_first_generation_id_fkey;

-- Re-add with ON DELETE SET NULL to allow generation deletion
ALTER TABLE user_onboarding_progress 
ADD CONSTRAINT user_onboarding_progress_first_generation_id_fkey 
FOREIGN KEY (first_generation_id) 
REFERENCES generations(id) 
ON DELETE SET NULL;