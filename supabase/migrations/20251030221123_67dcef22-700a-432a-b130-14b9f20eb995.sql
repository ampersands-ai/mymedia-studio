-- Add custom dimension columns to storyboards table
ALTER TABLE storyboards 
ADD COLUMN IF NOT EXISTS custom_width integer,
ADD COLUMN IF NOT EXISTS custom_height integer;