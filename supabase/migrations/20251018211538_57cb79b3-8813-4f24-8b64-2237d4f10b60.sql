-- Create workflow_templates table
CREATE TABLE workflow_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  estimated_time_seconds INTEGER,
  
  -- Workflow configuration (array of step definitions)
  workflow_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- User-facing input field definitions
  user_input_fields JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_templates
CREATE POLICY "Authenticated users can view active workflows"
ON workflow_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage workflows"
ON workflow_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create workflow_executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id TEXT NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Overall status
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Step tracking
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER NOT NULL,
  
  -- Data flow
  user_inputs JSONB NOT NULL,
  step_outputs JSONB DEFAULT '{}'::jsonb,
  final_output_url TEXT,
  
  -- Metadata
  tokens_used INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Link to individual generations
  generation_ids UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Enable RLS
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_executions
CREATE POLICY "Users can view own workflow executions"
ON workflow_executions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own workflow executions"
ON workflow_executions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow executions"
ON workflow_executions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all workflow executions"
ON workflow_executions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add workflow context to generations table
ALTER TABLE generations 
ADD COLUMN workflow_execution_id UUID REFERENCES workflow_executions(id),
ADD COLUMN workflow_step_number INTEGER;

-- Create index for workflow queries
CREATE INDEX idx_generations_workflow ON generations(workflow_execution_id, workflow_step_number);
CREATE INDEX idx_workflow_executions_user ON workflow_executions(user_id, created_at DESC);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status, created_at DESC);

-- Add updated_at trigger for workflow_templates
CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON workflow_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();