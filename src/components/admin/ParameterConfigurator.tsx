import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

interface ParameterConfig {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  enum?: string[];
  default?: any;
  userEditable: boolean;
  defaultValue: any;
}

interface ParameterConfiguratorProps {
  inputSchema: any;
  userEditableFields: string[];
  hiddenFieldDefaults: Record<string, any>;
  presetValues: Record<string, any>;
  onConfigChange: (config: {
    userEditableFields: string[];
    hiddenFieldDefaults: Record<string, any>;
    presetValues: Record<string, any>;
  }) => void;
}

export function ParameterConfigurator({
  inputSchema,
  userEditableFields,
  hiddenFieldDefaults,
  presetValues,
  onConfigChange,
}: ParameterConfiguratorProps) {
  const [parameters, setParameters] = useState<ParameterConfig[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!inputSchema?.properties) {
      setParameters([]);
      return;
    }

    const props = inputSchema.properties;
    const required = inputSchema.required || [];

    const params: ParameterConfig[] = Object.entries(props).map(([name, schema]: [string, any]) => ({
      name,
      type: schema.type || "string",
      description: schema.description,
      required: required.includes(name),
      enum: schema.enum,
      default: schema.default,
      userEditable: userEditableFields.includes(name),
      defaultValue: userEditableFields.includes(name) 
        ? presetValues[name] || ""
        : hiddenFieldDefaults[name] || schema.default || "",
    }));

    setParameters(params);
  }, [inputSchema, userEditableFields, hiddenFieldDefaults, presetValues]);

  useEffect(() => {
    validateConfiguration();
  }, [parameters]);

  const validateConfiguration = () => {
    const errors: string[] = [];
    const requiredParams = parameters.filter(p => p.required);

    requiredParams.forEach(param => {
      const hasValue = param.userEditable || (param.defaultValue !== "" && param.defaultValue !== null && param.defaultValue !== undefined);
      if (!hasValue) {
        errors.push(`Required field "${param.name}" must either be user-editable or have a default value`);
      }
    });

    setValidationErrors(errors);
  };

  const handleToggleVisibility = (paramName: string, visible: boolean) => {
    const updatedParams = parameters.map(p =>
      p.name === paramName ? { ...p, userEditable: visible } : p
    );
    setParameters(updatedParams);
    emitChanges(updatedParams);
  };

  const handleDefaultValueChange = (paramName: string, value: any) => {
    const updatedParams = parameters.map(p =>
      p.name === paramName ? { ...p, defaultValue: value } : p
    );
    setParameters(updatedParams);
    emitChanges(updatedParams);
  };

  const handleBulkAction = (action: "show-all" | "hide-all") => {
    const updatedParams = parameters.map(p => ({
      ...p,
      userEditable: action === "show-all",
    }));
    setParameters(updatedParams);
    emitChanges(updatedParams);
  };

  const emitChanges = (params: ParameterConfig[]) => {
    const newUserEditable = params.filter(p => p.userEditable).map(p => p.name);
    const newHiddenDefaults: Record<string, any> = {};
    const newPresetValues: Record<string, any> = {};

    params.forEach(p => {
      if (p.userEditable && p.defaultValue !== "" && p.defaultValue !== null && p.defaultValue !== undefined) {
        newPresetValues[p.name] = p.defaultValue;
      } else if (!p.userEditable && (p.defaultValue !== "" && p.defaultValue !== null && p.defaultValue !== undefined)) {
        newHiddenDefaults[p.name] = p.defaultValue;
      }
    });

    onConfigChange({
      userEditableFields: newUserEditable,
      hiddenFieldDefaults: newHiddenDefaults,
      presetValues: newPresetValues,
    });
  };

  const renderValueInput = (param: ParameterConfig) => {
    if (param.enum) {
      return (
        <Select
          value={String(param.defaultValue || "")}
          onValueChange={(value) => handleDefaultValueChange(param.name, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {param.enum.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "boolean") {
      return (
        <Select
          value={String(param.defaultValue || "false")}
          onValueChange={(value) => handleDefaultValueChange(param.name, value === "true")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (param.type === "number" || param.type === "integer") {
      return (
        <Input
          type="number"
          value={param.defaultValue || ""}
          onChange={(e) => handleDefaultValueChange(param.name, e.target.value ? Number(e.target.value) : "")}
          placeholder={param.userEditable ? "Preset value (optional)" : "Default value (required)"}
        />
      );
    }

    if (param.type === "array" || param.type === "object") {
      return (
        <Textarea
          value={typeof param.defaultValue === "string" ? param.defaultValue : JSON.stringify(param.defaultValue, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleDefaultValueChange(param.name, parsed);
            } catch {
              handleDefaultValueChange(param.name, e.target.value);
            }
          }}
          placeholder={param.userEditable ? "Preset value (optional, JSON)" : "Default value (required, JSON)"}
          rows={3}
          className="font-mono text-xs"
        />
      );
    }

    return (
      <Input
        type="text"
        value={param.defaultValue || ""}
        onChange={(e) => handleDefaultValueChange(param.name, e.target.value)}
        placeholder={param.userEditable ? "Preset value (optional)" : "Default value (required)"}
      />
    );
  };

  if (parameters.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No parameters available. Select a model with a valid input schema to configure parameters.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Parameter Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure which parameters users can edit and set defaults for hidden fields
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("show-all")}
          >
            Show All to Users
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("hide-all")}
          >
            Hide All
          </Button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, i) => (
                <li key={i} className="text-sm">{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3 border rounded-lg p-4 max-h-96 overflow-y-auto">
        {parameters.map((param, index) => (
          <div key={param.name}>
            {index > 0 && <Separator className="my-3" />}
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="font-mono text-sm font-semibold">
                      {param.name}
                    </Label>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">{param.type}</Badge>
                  </div>
                  {param.description && (
                    <p className="text-xs text-muted-foreground break-words">{param.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Checkbox
                    id={`visible-${param.name}`}
                    checked={param.userEditable}
                    onCheckedChange={(checked) => handleToggleVisibility(param.name, !!checked)}
                  />
                  <Label
                    htmlFor={`visible-${param.name}`}
                    className="text-sm font-normal cursor-pointer flex items-center gap-1"
                  >
                    {param.userEditable ? (
                      <>
                        <Eye className="h-3 w-3" />
                        Show to Users
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3" />
                        Hidden
                      </>
                    )}
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {param.userEditable ? "Preset Value (Optional)" : "Default Value (Required for hidden fields)"}
                </Label>
                {renderValueInput(param)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-lg">
        <p><strong>User-editable fields:</strong> Users will see and can modify these parameters</p>
        <p><strong>Preset values:</strong> Pre-fill user-editable fields with default values</p>
        <p><strong>Hidden fields:</strong> Automatically set, users won't see these</p>
        <p><strong>Required fields:</strong> Must either be user-editable OR have a default value</p>
      </div>
    </div>
  );
}
