-- Fix foreign key constraints for workflow template deletion

-- First, drop the existing foreign key constraint on generations.workflow_execution_id
ALTER TABLE public.generations 
DROP CONSTRAINT IF EXISTS generations_workflow_execution_id_fkey;

-- Recreate it with ON DELETE SET NULL (preserves generations but removes workflow link)
ALTER TABLE public.generations
ADD CONSTRAINT generations_workflow_execution_id_fkey 
FOREIGN KEY (workflow_execution_id) 
REFERENCES public.workflow_executions(id) 
ON DELETE SET NULL;

-- Now handle workflow_executions -> workflow_templates relationship
-- First check if there's a foreign key, and if so, drop and recreate with CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'workflow_executions_workflow_template_id_fkey'
  ) THEN
    ALTER TABLE public.workflow_executions 
    DROP CONSTRAINT workflow_executions_workflow_template_id_fkey;
  END IF;
END $$;

-- Add the constraint with ON DELETE CASCADE so deleting a template deletes its executions
ALTER TABLE public.workflow_executions
ADD CONSTRAINT workflow_executions_workflow_template_id_fkey 
FOREIGN KEY (workflow_template_id) 
REFERENCES public.workflow_templates(id) 
ON DELETE CASCADE;