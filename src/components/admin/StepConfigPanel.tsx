import { useState } from 'react';
import { WorkflowStep, UserInputField } from '@/hooks/useWorkflowTemplates';
import { AIModel } from '@/hooks/useTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';

interface StepConfigPanelProps {
  step: WorkflowStep;
  onStepChange: (step: WorkflowStep) => void;
  onClose: () => void;
  availableModels: AIModel[];
  userInputFields: UserInputField[];
  allSteps: WorkflowStep[];
}

export function StepConfigPanel({
  step,
  onStepChange,
  onClose,
  availableModels,
  userInputFields,
  allSteps,
}: StepConfigPanelProps) {
  const [localStep, setLocalStep] = useState(step);

  const handleSave = () => {
    onStepChange(localStep);
    onClose();
  };

  const insertVariable = (variable: string) => {
    setLocalStep({
      ...localStep,
      prompt_template: localStep.prompt_template + ` {{${variable}}}`,
    });
  };

  const addInputMapping = () => {
    const newMappings = { ...localStep.input_mappings, [`param_${Object.keys(localStep.input_mappings).length + 1}`]: '' };
    setLocalStep({ ...localStep, input_mappings: newMappings });
  };

  const updateInputMapping = (key: string, value: string) => {
    setLocalStep({
      ...localStep,
      input_mappings: { ...localStep.input_mappings, [key]: value },
    });
  };

  const removeInputMapping = (key: string) => {
    const newMappings = { ...localStep.input_mappings };
    delete newMappings[key];
    setLocalStep({ ...localStep, input_mappings: newMappings });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background border-l shadow-lg z-50 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Configure Step {step.step_number}</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step Name */}
        <div className="space-y-2">
          <Label>Step Name</Label>
          <Input
            value={localStep.step_name}
            onChange={(e) => setLocalStep({ ...localStep, step_name: e.target.value })}
            placeholder="e.g., Analyze Image"
          />
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={localStep.model_id}
            onValueChange={(value) => {
              const model = availableModels.find(m => m.id === value);
              setLocalStep({
                ...localStep,
                model_id: value,
                model_record_id: model?.record_id || '',
              });
            }}
          >
            <SelectTrigger>
              <SelectValue />
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

        {/* Prompt Template */}
        <div className="space-y-2">
          <Label>Prompt Template</Label>
          <Textarea
            value={localStep.prompt_template}
            onChange={(e) => setLocalStep({ ...localStep, prompt_template: e.target.value })}
            placeholder="Enter prompt with variables: {{user.field}} or {{step1.output}}"
            rows={5}
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
            {allSteps
              .filter((s) => s.step_number < step.step_number)
              .map((s) => (
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

        {/* Output Key */}
        <div className="space-y-2">
          <Label>Output Key Name</Label>
          <Input
            value={localStep.output_key}
            onChange={(e) => setLocalStep({ ...localStep, output_key: e.target.value })}
            placeholder="e.g., analysis_result"
          />
          <p className="text-xs text-muted-foreground">
            This key will be used to reference this step's output in later steps
          </p>
        </div>

        {/* Input Mappings */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Input Mappings</Label>
            <Button variant="outline" size="sm" onClick={addInputMapping}>
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>
          <Card className="p-3 space-y-2">
            {Object.entries(localStep.input_mappings).map(([key, value]) => (
              <div key={key} className="flex gap-2 items-center">
                <Input
                  value={key}
                  onChange={(e) => {
                    const newMappings = { ...localStep.input_mappings };
                    delete newMappings[key];
                    newMappings[e.target.value] = value;
                    setLocalStep({ ...localStep, input_mappings: newMappings });
                  }}
                  placeholder="parameter_name"
                  className="flex-1"
                />
                <Input
                  value={value}
                  onChange={(e) => updateInputMapping(key, e.target.value)}
                  placeholder="{{user.field}} or value"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInputMapping(key)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {Object.keys(localStep.input_mappings).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No input mappings defined
              </p>
            )}
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1">
            Save Step
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
