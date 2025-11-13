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
import { SchemaInput } from '@/components/generation/SchemaInput';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import type { 
  ModelSchema, 
  ParameterModes, 
  MappingSource, 
  WorkflowParameterValue
} from '@/types/workflow-parameters';
import { toModelSchema, toWorkflowParameterValue } from '@/types/workflow-parameters';
import type { JsonSchemaProperty } from '@/types/schema';

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
  const [parameterModes, setParameterModes] = useState<ParameterModes>({});

  const selectedModel = availableModels.find(m => m.id === localStep.model_id);
  const modelSchema = toModelSchema(selectedModel?.input_schema);
  const hasPromptInSchema = modelSchema?.properties?.prompt !== undefined;

  const handleChange = (updates: Partial<WorkflowStep>) => {
    const updatedStep = { ...localStep, ...updates };
    setLocalStep(updatedStep);
    onChange(updatedStep);
  };

  const insertVariable = (variable: string, intoPromptParam = false) => {
    if (intoPromptParam) {
      const currentPrompt = (localStep.parameters?.prompt || '') as string;
      handleParameterChange('prompt', `${currentPrompt} {{${variable}}}`);
    } else {
      const newPrompt = localStep.prompt_template + ` {{${variable}}}`;
      handleChange({ prompt_template: newPrompt });
    }
  };

  const handleParameterChange = (paramName: string, value: WorkflowParameterValue) => {
    const newParameters = { ...localStep.parameters, [paramName]: value };
    handleChange({ parameters: newParameters });
  };

  const handleMappingChange = (paramName: string, mapping: string) => {
    const newMappings = { ...localStep.input_mappings, [paramName]: mapping };
    handleChange({ input_mappings: newMappings });
  };

  const toggleParameterMode = (paramName: string, mode: 'static' | 'mapped') => {
    setParameterModes(prev => ({ ...prev, [paramName]: mode }));
    
    if (mode === 'static') {
      // Remove from input_mappings, add to parameters with default value
      const newMappings = { ...localStep.input_mappings };
      delete newMappings[paramName];
      handleChange({ input_mappings: newMappings });
    } else {
      // Remove from parameters, will be set via mapping
      const newParameters = { ...localStep.parameters };
      delete newParameters[paramName];
      handleChange({ parameters: newParameters });
    }
  };

  const getAvailableMappingSources = (): MappingSource[] => {
    const sources: MappingSource[] = [];
    
    // Add user input fields
    userInputFields.forEach(field => {
      sources.push({
        value: `user.${field.name}`,
        label: `User Input: ${field.label}`
      });
    });
    
    // Add previous step outputs
    previousSteps.forEach(s => {
      sources.push({
        value: `step${s.step_number}.${s.output_key}`,
        label: `Step ${s.step_number}: ${s.step_name} (${s.output_key})`
      });
    });
    
    return sources;
  };

  const renderModelParameter = (paramName: string, paramSchema: JsonSchemaProperty, isRequired: boolean) => {
    const mode = parameterModes[paramName] || 
      (localStep.input_mappings?.[paramName] ? 'mapped' : 'static');
    const displayName = paramSchema.title || paramName.split('_').map((word: string) => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    const isPromptParam = paramName === 'prompt';

    return (
      <div key={paramName} className="space-y-3 p-3 border rounded-lg bg-muted/30">
        {isRequired && (
          <RadioGroup
            value={mode}
            onValueChange={(value) => toggleParameterMode(paramName, value as 'static' | 'mapped')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="static" id={`${paramName}-static`} />
              <Label htmlFor={`${paramName}-static`} className="font-normal cursor-pointer">
                Static value
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mapped" id={`${paramName}-mapped`} />
              <Label htmlFor={`${paramName}-mapped`} className="font-normal cursor-pointer">
                Map from input
              </Label>
            </div>
          </RadioGroup>
        )}

        {mode === 'static' ? (
          <>
            <SchemaInput
              name={paramName}
              schema={paramSchema}
              value={localStep.parameters?.[paramName]}
              onChange={(value) => handleParameterChange(paramName, value)}
              required={isRequired}
              rows={isPromptParam ? 4 : undefined}
            />
            {isPromptParam && (
              <div className="flex flex-wrap gap-2">
                <p className="text-xs text-muted-foreground w-full">Insert variables:</p>
                {userInputFields.map((field) => (
                  <Button
                    key={field.name}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(`user.${field.name}`, true)}
                  >
                    user.{field.name}
                  </Button>
                ))}
                {previousSteps.map((s) => (
                  <Button
                    key={s.step_number}
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(`step${s.step_number}.${s.output_key}`, true)}
                  >
                    step{s.step_number}.{s.output_key}
                  </Button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Label className="font-medium">
              {displayName}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            {paramSchema.description && (
              <p className="text-xs text-muted-foreground">{paramSchema.description}</p>
            )}
            <Select
              value={localStep.input_mappings?.[paramName] || ''}
              onValueChange={(value) => handleMappingChange(paramName, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a source..." />
              </SelectTrigger>
              <SelectContent>
                {getAvailableMappingSources().map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
    );
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

      {!hasPromptInSchema && (
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
      )}

      {modelSchema?.properties && Object.keys(modelSchema.properties).length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-base font-semibold">Model Parameters</Label>
            <p className="text-sm text-muted-foreground">
              Configure model-specific parameters. Required fields can use static values or map to user inputs.
            </p>
            <div className="space-y-3">
              {Object.entries(modelSchema?.properties || {}).map(([paramName, paramSchema]: [string, any]) => {
                const isRequired = modelSchema?.required?.includes(paramName);
                return renderModelParameter(paramName, paramSchema, isRequired);
              })}
            </div>
          </div>
        </>
      )}

      <Separator />

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
