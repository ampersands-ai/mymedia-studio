-- Add provider_task_id column to track Kie.ai task IDs for webhook callbacks
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS provider_task_id TEXT;