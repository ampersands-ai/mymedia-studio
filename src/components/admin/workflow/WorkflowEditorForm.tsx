import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useWorkflowImageUpload } from "@/hooks/admin/useWorkflowImageUpload";
import { WorkflowBasicInfo } from "./WorkflowBasicInfo";
import { WorkflowBeforeAfterImages } from "./WorkflowBeforeAfterImages";
import { WorkflowUserFields } from "./WorkflowUserFields";
import { WorkflowStepsManager } from "./WorkflowStepsManager";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import type { AIModel } from "@/hooks/useModels";
import { logger } from "@/lib/logger";

interface WorkflowEditorFormProps {
  workflow: Partial<WorkflowTemplate> | null;
  isNew: boolean;
  models: AIModel[];
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Main form container for workflow editor
 * Integrates all workflow form components and handles save logic
 */
export function WorkflowEditorForm({
  workflow,
  isNew,
  models,
  onSuccess,
  onCancel,
}: WorkflowEditorFormProps) {
  const queryClient = useQueryClient();

  // State management
  const [localWorkflow, setLocalWorkflow] = useState<Partial<WorkflowTemplate>>(
    workflow || {
      id: '',
      name: '',
      description: '',
      category: '',
      workflow_steps: [],
      user_input_fields: [],
      is_active: true,
    }
  );
  const [originalWorkflowId] = useState(workflow?.id || null);

  const {
    beforeImage,
    afterImage,
    uploadImages,
    uploadingImages,
  } = useWorkflowImageUpload({ workflow, open: true });

  // Database mutations
  const createWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Partial<WorkflowTemplate>) => {
      const { error } = await supabase
        .from("workflow_templates")
        .insert(workflowData as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      toast.success("Workflow created successfully!");
      onSuccess();
    },
    onError: (error) => {
      logger.error('Workflow creation failed', error as Error, {
        component: 'WorkflowEditorForm',
        operation: 'createWorkflow'
      });
      toast.error("Failed to create workflow");
    },
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async (workflowData: Partial<WorkflowTemplate>) => {
      const { error } = await supabase
        .from("workflow_templates")
        .update(workflowData as any)
        .eq("id", workflowData.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      toast.success("Workflow updated successfully!");
      onSuccess();
    },
    onError: (error) => {
      logger.error('Workflow update failed', error as Error, {
        component: 'WorkflowEditorForm',
        workflowId: workflow?.id,
        operation: 'updateWorkflow'
      });
      toast.error("Failed to update workflow");
    },
  });

  const deleteOldWorkflowMutation = useMutation({
    mutationFn: async (oldId: string) => {
      const { error } = await supabase
        .from("workflow_templates")
        .delete()
        .eq("id", oldId);
      
      if (error) throw error;
    },
  });

  // Save handler
  const handleSave = async () => {
    // Validation
    if (!localWorkflow.name) {
      toast.error("Workflow name is required");
      return;
    }
    if (!localWorkflow.category) {
      toast.error("Category is required");
      return;
    }
    if (!localWorkflow.workflow_steps || localWorkflow.workflow_steps.length === 0) {
      toast.error("At least one workflow step is required");
      return;
    }

    try {
      // Upload images first
      const { beforeUrl, afterUrl } = await uploadImages(
        localWorkflow.before_image_url,
        localWorkflow.after_image_url
      );

      const workflowData = {
        ...localWorkflow,
        before_image_url: beforeUrl,
        after_image_url: afterUrl,
      };

      // Handle ID change in edit mode (delete old + insert new)
      if (!isNew && originalWorkflowId && originalWorkflowId !== localWorkflow.id) {
        await deleteOldWorkflowMutation.mutateAsync(originalWorkflowId);
        await createWorkflowMutation.mutateAsync(workflowData);
      } else if (isNew) {
        // Create new workflow
        await createWorkflowMutation.mutateAsync(workflowData);
      } else {
        // Update existing workflow
        await updateWorkflowMutation.mutateAsync(workflowData);
      }
    } catch (error) {
      logger.error('Workflow save operation failed', error as Error, {
        component: 'WorkflowEditorForm',
        isNew,
        workflowId: localWorkflow.id,
        hasOriginalId: !!originalWorkflowId,
        operation: 'saveWorkflow'
      });
      toast.error("Failed to save workflow");
    }
  };

  const isSaving =
    createWorkflowMutation.isPending ||
    updateWorkflowMutation.isPending ||
    deleteOldWorkflowMutation.isPending ||
    uploadingImages;

  const isSaveDisabled =
    !localWorkflow.name ||
    !localWorkflow.category ||
    !localWorkflow.workflow_steps ||
    localWorkflow.workflow_steps.length === 0 ||
    isSaving;

  return (
    <div className="space-y-6">
      <WorkflowBasicInfo
        workflow={localWorkflow}
        onWorkflowChange={(updates) => setLocalWorkflow({ ...localWorkflow, ...updates })}
        isNew={isNew}
        originalWorkflowId={originalWorkflowId}
        existingCategories={[]}
        showCustomCategory={false}
        onToggleCustomCategory={() => {}}
      />

      <WorkflowBeforeAfterImages
        beforeImage={beforeImage}
        afterImage={afterImage}
        workflow={localWorkflow}
        onWorkflowChange={(updates) => setLocalWorkflow({ ...localWorkflow, ...updates })}
      />

      <WorkflowUserFields
        userInputFields={localWorkflow.user_input_fields || []}
        onAddField={() => {
          const newField = {
            name: '',
            label: '',
            type: 'text',
            required: false,
            placeholder: ''
          };
          setLocalWorkflow({
            ...localWorkflow,
            user_input_fields: [...(localWorkflow.user_input_fields || []), newField]
          });
        }}
        onUpdateField={(index, updates) => {
          const fields = [...(localWorkflow.user_input_fields || [])];
          fields[index] = { ...fields[index], ...updates };
          setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
        }}
        onDeleteField={(index) => {
          const fields = [...(localWorkflow.user_input_fields || [])];
          fields.splice(index, 1);
          setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
        }}
      />

      <WorkflowStepsManager
        workflowSteps={localWorkflow.workflow_steps || []}
        userInputFields={localWorkflow.user_input_fields || []}
        models={models}
        onAddStep={() => {
          const newStep = {
            step_number: (localWorkflow.workflow_steps || []).length + 1,
            step_name: '',
            model_id: '',
            model_record_id: '',
            prompt_template: '',
            parameters: {},
            input_mappings: {},
            output_key: ''
          };
          setLocalWorkflow({
            ...localWorkflow,
            workflow_steps: [...(localWorkflow.workflow_steps || []), newStep]
          });
        }}
        onUpdateStep={(index, updates) => {
          const steps = [...(localWorkflow.workflow_steps || [])];
          steps[index] = { ...steps[index], ...updates };
          setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
        }}
        onDeleteStep={(index) => {
          const steps = [...(localWorkflow.workflow_steps || [])];
          steps.splice(index, 1);
          // Renumber subsequent steps
          steps.slice(index).forEach((step, i) => {
            step.step_number = index + i + 1;
          });
          setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
        }}
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaveDisabled}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {uploadingImages ? "Uploading Images..." : isNew ? "Create Workflow" : "Update Workflow"}
        </Button>
      </div>
    </div>
  );
}
