import { useState } from 'react';
import { WorkflowStep, UserInputField } from '@/hooks/useWorkflowTemplates';
import { AIModel } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface WorkflowStepFormProps {
  step: WorkflowStep;
  stepNumber: number;
  onChange: (step: WorkflowStep) => void;
  onDelete: () => void;
  availableModels: AIModel[];
  userInputFields: UserInputField[];
  previousSteps: WorkflowStep[];
}

export function WorkflowStepForm({
  step,
  stepNumber,
  onChange,
  onDelete,
  availableModels,
  userInputFields,
  previousSteps,
}: WorkflowStepFormProps) {
  const [localStep, setLocalStep] = useState(step);

  const handleChange = (updates: Partial<WorkflowStep>) => {
    const updatedStep = { ...localStep, ...updates };
    setLocalStep(updatedStep);
    onChange(updatedStep);
  };

  const insertVariable = (variable: string) => {
    const newPrompt = localStep.prompt_template + ` {{${variable}}}`;
    handleChange({ prompt_template: newPrompt });
  };

  return (
    <Card className="p-4 space-y-4 mb-4">
      <div className="flex justify-between items-center">
        <Badge variant="secondary">Step {stepNumber}</Badge>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Step Name</Label>
        <Input
          value={localStep.step_name}
          onChange={(e) => handleChange({ step_name: e.target.value })}
          placeholder="e.g., Analyze Image"
        />
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={localStep.model_id}
          onValueChange={(value) => {
            const model = availableModels.find(m => m.id === value);
            handleChange({
              model_id: value,
              model_record_id: model?.record_id || '',
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.record_id} value={model.id}>
                {model.model_name} ({model.content_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Prompt Template</Label>
        <Textarea
          value={localStep.prompt_template}
          onChange={(e) => handleChange({ prompt_template: e.target.value })}
          placeholder="Enter prompt with variables like {{user.field}} or {{step1.output}}"
          rows={4}
        />
        <div className="flex flex-wrap gap-2">
          <p className="text-xs text-muted-foreground w-full">Insert variables:</p>
          {userInputFields.map((field) => (
            <Button
              key={field.name}
              variant="outline"
              size="sm"
              onClick={() => insertVariable(`user.${field.name}`)}
            >
              user.{field.name}
            </Button>
          ))}
          {previousSteps.map((s) => (
            <Button
              key={s.step_number}
              variant="outline"
              size="sm"
              onClick={() => insertVariable(`step${s.step_number}.${s.output_key}`)}
            >
              step{s.step_number}.{s.output_key}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Output Key Name</Label>
        <Input
          value={localStep.output_key}
          onChange={(e) => handleChange({ output_key: e.target.value })}
          placeholder="e.g., analysis_result"
        />
        <p className="text-xs text-muted-foreground">
          This key will be used to reference this step's output in later steps
        </p>
      </div>
    </Card>
  );
}
