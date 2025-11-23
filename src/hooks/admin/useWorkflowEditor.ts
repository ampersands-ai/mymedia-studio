import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WorkflowTemplate, WorkflowStep, UserInputField } from '@/hooks/useWorkflowTemplates';

interface UseWorkflowEditorProps {
  workflow: Partial<WorkflowTemplate> | null;
  open: boolean;
  isNew: boolean;
  models: Array<{ id: string; model_name: string; record_id: string }>;
}

/**
 * Custom hook to manage workflow editor state and operations
 * @param props - Configuration object with workflow, open state, isNew flag, and models
 * @returns Object with local workflow state, category state, and step/field operations
 */
export function useWorkflowEditor({
  workflow,
  open,
  models,
}: UseWorkflowEditorProps) {
  const [localWorkflow, setLocalWorkflow] = useState<Partial<WorkflowTemplate>>(workflow || {});
  const [originalWorkflowId, setOriginalWorkflowId] = useState<string | null>(null);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Initialize workflow data when dialog opens
  useEffect(() => {
    const initializeDialog = async () => {
      if (!open) return;

      // Fetch existing categories from both tables
      const [workflowRes, contentRes] = await Promise.all([
        supabase.from('workflow_templates').select('category'),
        supabase.from('content_templates').select('category')
      ]);

      const allCategories = new Set<string>();
      workflowRes.data?.forEach(t => allCategories.add(t.category));
      contentRes.data?.forEach(t => allCategories.add(t.category));

      setExistingCategories(Array.from(allCategories).sort());
      
      // Set workflow data
      setLocalWorkflow(workflow || {});
      setOriginalWorkflowId(workflow?.id || null);
      setShowCustomCategory(false);
    };
    
    initializeDialog();
  }, [open, workflow]);

  // Workflow step operations
  const addStep = () => {
    const steps = [...(localWorkflow.workflow_steps || [])];
    const newStep: WorkflowStep = {
      step_number: steps.length + 1,
      step_name: `Step ${steps.length + 1}`,
      model_id: models[0]?.id || '',
      model_record_id: models[0]?.record_id || '',
      prompt_template: '',
      parameters: {},
      input_mappings: {},
      output_key: `output_${steps.length + 1}`,
    };
    steps.push(newStep);
    setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
  };

  const updateStep = (index: number, updatedStep: WorkflowStep) => {
    const steps = [...(localWorkflow.workflow_steps || [])];
    steps[index] = updatedStep;
    setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
  };

  const deleteStep = (index: number) => {
    const steps = [...(localWorkflow.workflow_steps || [])];
    steps.splice(index, 1);
    // Renumber remaining steps
    steps.forEach((step, idx) => {
      step.step_number = idx + 1;
    });
    setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
  };

  // User input field operations
  const addUserField = () => {
    const fields = [...(localWorkflow.user_input_fields || [])];
    fields.push({
      name: `field_${fields.length + 1}`,
      type: 'text',
      label: 'New Field',
      required: false,
    });
    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
  };

  const updateUserField = (idx: number, updates: Partial<UserInputField>) => {
    const fields = [...(localWorkflow.user_input_fields || [])];
    fields[idx] = { ...fields[idx], ...updates };
    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
  };

  const deleteUserField = (idx: number) => {
    const fields = [...(localWorkflow.user_input_fields || [])];
    fields.splice(idx, 1);
    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
  };

  return {
    localWorkflow,
    setLocalWorkflow,
    originalWorkflowId,
    categoryState: {
      existingCategories,
      showCustomCategory,
      setShowCustomCategory,
    },
    stepOperations: {
      addStep,
      updateStep,
      deleteStep,
    },
    fieldOperations: {
      addUserField,
      updateUserField,
      deleteUserField,
    },
  };
}
