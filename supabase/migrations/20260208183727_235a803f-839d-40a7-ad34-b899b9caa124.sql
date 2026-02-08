-- Drop the existing style check constraint
ALTER TABLE public.storyboards DROP CONSTRAINT IF EXISTS storyboards_style_check;

-- Add the updated constraint with new styles (political and poetic)
ALTER TABLE public.storyboards ADD CONSTRAINT storyboards_style_check 
CHECK (style IN (
  'hyper-realistic', 
  'cinematic', 
  'animated', 
  'cartoon', 
  'natural', 
  'sketch', 
  'horror', 
  'vintage', 
  'cyberpunk', 
  'fantasy', 
  'noir', 
  'anime', 
  'watercolor', 
  'pop-art', 
  'minimalist', 
  'surreal',
  'political',
  'poetic',
  'custom',
  'blackboard'
));