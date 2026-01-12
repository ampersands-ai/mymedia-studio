-- Add render_mode column to storyboards table
ALTER TABLE storyboards 
ADD COLUMN render_mode TEXT DEFAULT 'customize' 
CHECK (render_mode IN ('quick', 'customize'));