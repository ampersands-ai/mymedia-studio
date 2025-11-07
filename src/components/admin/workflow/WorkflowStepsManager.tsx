import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { WorkflowStepForm } from "@/components/admin/WorkflowStepForm";
import type { WorkflowStep, UserInputField } from "@/hooks/useWorkflowTemplates";
import type { AIModel } from "@/hooks/useModels";

interface WorkflowStepsManagerProps {
  workflowSteps: WorkflowStep[];
  userInputFields: UserInputField[];
  models: AIModel[];
  onAddStep: () => void;
  onUpdateStep: (index: number, step: WorkflowStep) => void;
  onDeleteStep: (index: number) => void;
}

/**
 * Component for managing workflow steps collection
 * Orchestrates WorkflowStepForm components and handles step operations
 */
export function WorkflowStepsManager({
  workflowSteps,
  userInputFields,
  models,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
}: WorkflowStepsManagerProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Workflow Steps</CardTitle>
          <Button onClick={onAddStep} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {workflowSteps.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No workflow steps defined. Click "Add Step" to create one.
          </div>
        )}

        {workflowSteps.map((step, index) => (
          <WorkflowStepForm
            key={index}
            step={step}
            stepNumber={index + 1}
            availableModels={models}
            userInputFields={userInputFields}
            previousSteps={workflowSteps.slice(0, index)}
            onChange={(updatedStep) => onUpdateStep(index, updatedStep)}
            onDelete={() => onDeleteStep(index)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
