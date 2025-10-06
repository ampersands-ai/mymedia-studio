-- Step 1: Drop existing foreign key constraints
ALTER TABLE public.content_templates DROP CONSTRAINT IF EXISTS content_templates_model_id_fkey;
ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_model_id_fkey;

-- Step 2: Add a new UUID primary key column to ai_models
ALTER TABLE public.ai_models ADD COLUMN record_id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Step 3: Drop the existing primary key constraint on id
ALTER TABLE public.ai_models DROP CONSTRAINT ai_models_pkey;

-- Step 4: Make record_id the new primary key
ALTER TABLE public.ai_models ADD PRIMARY KEY (record_id);

-- Step 5: Create an index on id for performance
CREATE INDEX idx_ai_models_id ON public.ai_models(id);

-- Step 6: Update content_templates to use UUID references
ALTER TABLE public.content_templates ADD COLUMN model_record_id UUID;

UPDATE public.content_templates ct
SET model_record_id = (
  SELECT am.record_id 
  FROM public.ai_models am 
  WHERE am.id = ct.model_id 
  LIMIT 1
);

ALTER TABLE public.content_templates 
ADD CONSTRAINT fk_content_templates_model_record 
FOREIGN KEY (model_record_id) 
REFERENCES public.ai_models(record_id) 
ON DELETE SET NULL;

-- Step 7: Update generations to use UUID references
ALTER TABLE public.generations ADD COLUMN model_record_id UUID;

UPDATE public.generations g
SET model_record_id = (
  SELECT am.record_id 
  FROM public.ai_models am 
  WHERE am.id = g.model_id 
  LIMIT 1
);

ALTER TABLE public.generations 
ADD CONSTRAINT fk_generations_model_record 
FOREIGN KEY (model_record_id) 
REFERENCES public.ai_models(record_id) 
ON DELETE SET NULL;

-- Step 8: Add helpful comments
COMMENT ON COLUMN public.ai_models.id IS 'Model identifier (e.g., veo3-fast) - can have duplicates for different endpoints';
COMMENT ON COLUMN public.ai_models.record_id IS 'Unique database record identifier';
COMMENT ON COLUMN public.ai_models.api_endpoint IS 'Optional custom API endpoint for this model instance';