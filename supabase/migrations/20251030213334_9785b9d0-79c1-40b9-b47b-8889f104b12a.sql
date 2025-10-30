-- Add column to track JSON2Video API quota remaining
ALTER TABLE storyboards 
ADD COLUMN api_quota_remaining integer;