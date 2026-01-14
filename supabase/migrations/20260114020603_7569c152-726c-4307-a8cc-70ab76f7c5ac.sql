-- Fix stuck storyboard by setting status to failed and refunding credits
UPDATE blackboard_storyboards 
SET status = 'failed', updated_at = NOW()
WHERE id = '5de3518c-0f7a-4623-96b8-d14305d3c566' AND status = 'rendering';

-- Refund the 3 credits (separate statement for safety - will run even if above doesn't match)
SELECT increment_tokens('8d5d86b4-a0d2-4aad-8fc8-b348d72502c1', 3);

-- Add Shotstack render ID column (using IF NOT EXISTS for idempotency)
ALTER TABLE blackboard_storyboards 
ADD COLUMN IF NOT EXISTS shotstack_render_id TEXT;

-- Create index for efficient polling lookups
CREATE INDEX IF NOT EXISTS idx_blackboard_storyboards_shotstack_render_id 
ON blackboard_storyboards(shotstack_render_id) 
WHERE shotstack_render_id IS NOT NULL;