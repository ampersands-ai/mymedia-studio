import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileCode2, Play } from "lucide-react";

interface TestConfigurationProps {
  filteredModels: any[] | undefined;
  selectedModelId: string;
  selectedModel: any;
  onModelChange: (modelId: string) => void;
  modelParameters: Record<string, any>;
  onParameterChange: (key: string, value: any) => void;
  modelSchema: any;
  schemaLoading: boolean;
  modelsLoading: boolean;
  showInactiveModels: boolean;
  onToggleInactive: (checked: boolean) => void;
  onExecute: () => void;
  isExecuting: boolean;
}

export function TestConfiguration({
  filteredModels,
  selectedModelId,
  selectedModel,
  onModelChange,
  modelParameters,
  onParameterChange,
  modelSchema,
  schemaLoading,
  modelsLoading,
  showInactiveModels,
  onToggleInactive,
  onExecute,
  isExecuting
}: TestConfigurationProps) {
  const renderParameterInputs = () => {
    if (!modelSchema || !modelSchema.properties) return null;

    const properties = modelSchema.properties;

    return (
      <div className="space-y-3">
        {Object.entries(properties).map(([key, prop]: [string, any]) => {
          if (prop.showToUser === false) return null;

          const value = modelParameters[key];

          return (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key} className="text-sm">
                {prop.title || key}
                {prop.description && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {prop.description}
                  </span>
                )}
              </Label>

              {prop.enum ? (
                <Select
                  value={value || prop.default || prop.enum[0] || undefined}
                  onValueChange={(val) => onParameterChange(key, val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${prop.title || key}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {prop.enum.filter((option: string) => option !== '').map((option: string) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : prop.type === 'number' || prop.type === 'integer' ? (
                <Input
                  id={key}
                  type="number"
                  value={value ?? prop.default ?? ''}
                  onChange={(e) => onParameterChange(key, parseFloat(e.target.value))}
                  min={prop.minimum}
                  max={prop.maximum}
                />
              ) : prop.type === 'boolean' ? (
                <Select
                  value={String(value ?? prop.default ?? false)}
                  onValueChange={(val) => onParameterChange(key, val === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              ) : (prop.type === 'string' && ((prop.maxLength && prop.maxLength > 200) || prop.renderer === 'textarea')) ? (
                <Textarea
                  id={key}
                  value={value ?? prop.default ?? ''}
                  onChange={(e) => onParameterChange(key, e.target.value)}
                  placeholder={`Enter ${prop.title || key}...`}
                  rows={4}
                  disabled={isExecuting}
                />
              ) : prop.type === 'string' ? (
                <Input
                  id={key}
                  type="text"
                  value={value ?? prop.default ?? ''}
                  onChange={(e) => onParameterChange(key, e.target.value)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Model Selection</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInactiveModels}
                  onChange={(e) => onToggleInactive(e.target.checked)}
                  className="rounded"
                />
                Show inactive
              </label>
              <Badge variant="secondary">
                {filteredModels?.length || 0} models
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-select">Select Model</Label>
            <Select
              value={selectedModelId}
              onValueChange={onModelChange}
              disabled={modelsLoading}
            >
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Choose a model to test..." />
              </SelectTrigger>
              <SelectContent>
                {filteredModels?.map(model => (
                  <SelectItem key={model.record_id} value={model.record_id}>
                    <div className="flex items-center gap-2">
                      <span>{model.model_name}</span>
                      {!model.is_active && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedModel && (
            <div className="pt-3 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <span className="font-medium">{selectedModel.provider}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{selectedModel.content_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost:</span>
                <span className="font-medium">
                  {selectedModel.base_token_cost} credits
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {selectedModel && (
        <Card className="p-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileCode2 className="h-5 w-5" />
              Input Parameters
            </h2>

            <div className="space-y-4">
              {!schemaLoading && renderParameterInputs()}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={onExecute}
              disabled={isExecuting || !selectedModel}
            >
              <Play className="mr-2 h-5 w-5" />
              {isExecuting ? "Executing..." : "Execute with Full Tracking"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
