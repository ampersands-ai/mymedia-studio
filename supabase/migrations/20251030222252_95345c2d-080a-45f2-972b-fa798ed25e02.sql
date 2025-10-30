-- Remove fps column from storyboards table as it's no longer needed
ALTER TABLE storyboards 
DROP COLUMN IF EXISTS fps;