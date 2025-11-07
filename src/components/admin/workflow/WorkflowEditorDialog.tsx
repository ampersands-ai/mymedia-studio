import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkflowEditorForm } from "./WorkflowEditorForm";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import type { AIModel } from "@/hooks/useModels";

interface WorkflowEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Partial<WorkflowTemplate> | null;
  isNew: boolean;
  models: AIModel[];
  onSuccess: () => void;
}

/**
 * Dialog wrapper component for workflow template creation and editing
 * Delegates all form logic to WorkflowEditorForm component
 */
export function WorkflowEditorDialog({
  open,
  onOpenChange,
  workflow,
  isNew,
  models,
  onSuccess,
}: WorkflowEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNew ? 'Create' : 'Edit'} Workflow Template
          </DialogTitle>
        </DialogHeader>
        
        <WorkflowEditorForm
          workflow={workflow}
          isNew={isNew}
          models={models}
          onSuccess={onSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
