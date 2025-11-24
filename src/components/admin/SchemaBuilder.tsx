import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ParameterDialog } from "./ParameterDialog";
import { parseSchema, generateSchema, type Parameter } from "@/lib/schema-utils";
import { logger } from "@/lib/logger";
import type { JsonSchema } from "@/types/schema";

interface SchemaBuilderProps {
  schema: JsonSchema;
  onChange: (schema: JsonSchema) => void;
  modelRecordId?: string;
  onSave?: (schema: JsonSchema) => Promise<void>;
  disabled?: boolean;
}

export function SchemaBuilder({ schema, onChange, modelRecordId, onSave, disabled = false }: SchemaBuilderProps) {
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [originalSchema, setOriginalSchema] = useState<JsonSchema>(schema);

  useEffect(() => {
    try {
      const parsed = parseSchema(schema);
      setParameters(parsed);
      setOriginalSchema(schema);
    } catch (error) {
      logger.error('Schema parsing failed', error as Error, {
        component: 'SchemaBuilder',
        modelRecordId,
        operation: 'parseSchema'
      });
      setParameters([]);
    }
  }, [schema, modelRecordId]);

  const handleAddParameter = () => {
    if (disabled) return;
    setEditingParameter(null);
    setDialogOpen(true);
  };

  const handleEditParameter = (param: Parameter) => {
    if (disabled) return;
    setEditingParameter(param);
    setDialogOpen(true);
  };

  const handleDeleteParameter = (paramName: string) => {
    if (disabled) return;
    const updated = parameters.filter(p => p.name !== paramName);
    setParameters(updated);
    onChange(generateSchema(updated, originalSchema));
  };

  const handleSaveParameter = (param: Parameter) => {
    if (disabled) return;
    let updated: Parameter[];
    
    if (editingParameter) {
      updated = parameters.map(p => 
        p.name === editingParameter.name ? param : p
      );
    } else {
      updated = [...parameters, param];
    }
    
    setParameters(updated);
    onChange(generateSchema(updated, originalSchema));
    setDialogOpen(false);
  };

  const handleMoveUp = async (index: number) => {
    if (disabled || index === 0) return;
    const updated = [...parameters];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setParameters(updated);
    const newSchema = generateSchema(updated, originalSchema);
    onChange(newSchema);
    
    // Auto-save if modelRecordId and onSave are provided
    if (modelRecordId && onSave) {
      setSavingOrder(true);
      try {
        await onSave(newSchema);
      } finally {
        setSavingOrder(false);
      }
    }
  };

  const handleMoveDown = async (index: number) => {
    if (disabled || index === parameters.length - 1) return;
    const updated = [...parameters];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setParameters(updated);
    const newSchema = generateSchema(updated, originalSchema);
    onChange(newSchema);
    
    // Auto-save if modelRecordId and onSave are provided
    if (modelRecordId && onSave) {
      setSavingOrder(true);
      try {
        await onSave(newSchema);
      } finally {
        setSavingOrder(false);
      }
    }
  };

  const generatedJson = JSON.stringify(generateSchema(parameters, originalSchema), null, 2);
  const currentImageField = schema.imageInputField || null;

  const handleImageFieldChange = (value: string) => {
    if (disabled) return;
    const updated = {
      ...generateSchema(parameters, originalSchema),
      imageInputField: value === "none" ? null : value
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {disabled && (
        <div className="bg-muted/50 border border-border rounded-md p-3 text-sm text-muted-foreground">
          🔒 This model is locked. Schema is read-only. Unlock the model to make changes.
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {parameters.length} parameter{parameters.length !== 1 ? 's' : ''} defined
        </p>
        {!disabled && (
          <Button type="button" onClick={handleAddParameter} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Parameter
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {parameters.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No parameters defined. Click "Add Parameter" to get started.
          </Card>
        ) : (
          parameters.map((param, index) => (
            <Card key={param.name} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <Button 
                    type="button"
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleMoveUp(index)}
                    disabled={disabled || index === 0 || savingOrder}
                    className="h-8 w-8 p-0"
                    title={disabled ? "Locked" : "Move up"}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleMoveDown(index)}
                    disabled={disabled || index === parameters.length - 1 || savingOrder}
                    className="h-8 w-8 p-0"
                    title={disabled ? "Locked" : "Move down"}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold">{param.name}</span>
                    <Badge variant="outline">{param.type}</Badge>
                    {param.required && (
                      <Badge variant="destructive" className="text-xs">Required</Badge>
                    )}
                    {param.showToUser === false && (
                      <Badge variant="secondary" className="text-xs">Hidden from Users</Badge>
                    )}
                    {param.isAdvanced === true && (
                      <Badge variant="default" className="text-xs">Advanced Options</Badge>
                    )}
                  </div>
                  
                  {param.description && (
                    <p className="text-sm text-muted-foreground">{param.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 text-xs">
                    {param.enum && (
                      <div>
                        <span className="text-muted-foreground">Options: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {param.enum.join(', ')}
                        </code>
                      </div>
                    )}
                    
                    {param.default !== undefined && param.default !== null && param.default !== '' && (
                      <div>
                        <span className="text-muted-foreground">Default: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {JSON.stringify(param.default)}
                        </code>
                      </div>
                    )}
                    
                    {param.type === 'array' && param.items && (
                      <div>
                        <span className="text-muted-foreground">Array of: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {param.items.type}
                        </code>
                      </div>
                    )}
                    
                    {(param.minimum !== undefined || param.maximum !== undefined) && (
                      <div>
                        <span className="text-muted-foreground">Range: </span>
                        <code className="bg-muted px-1.5 py-0.5 rounded">
                          {param.minimum ?? '∞'} to {param.maximum ?? '∞'}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
                
                {!disabled && (
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleEditParameter(param)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteParameter(param.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Image Input Field Selector */}
      <Card className="p-4 space-y-2 bg-primary/5 border-primary/20">
        <Label htmlFor="image-input-field" className="text-sm font-medium">
          Image Input Field (Optional)
        </Label>
        <Select
          value={currentImageField || "none"}
          onValueChange={handleImageFieldChange}
          disabled={disabled}
        >
          <SelectTrigger id="image-input-field">
            <SelectValue placeholder="No image input" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No image input (text-only model)</SelectItem>
            {parameters.map(param => (
              <SelectItem key={param.name} value={param.name}>
                {param.name} ({param.type}{param.required ? ', required' : ''})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select which parameter accepts image uploads. Leave as "No image input" for text-only models (e.g., Flux Schnell). 
          Choose a parameter for image-to-image or upscale models (e.g., inputImage, image_url).
        </p>
      </Card>

      <Collapsible open={showJson} onOpenChange={setShowJson}>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="w-full">
            {showJson ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
            {showJson ? 'Hide' : 'Show'} Generated JSON
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
            {generatedJson}
          </pre>
        </CollapsibleContent>
      </Collapsible>

      <ParameterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        parameter={editingParameter}
        existingNames={parameters.map(p => p.name).filter(n => n !== editingParameter?.name)}
        onSave={handleSaveParameter}
      />
    </div>
  );
}
