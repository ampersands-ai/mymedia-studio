import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowUpCircle, ArrowDownCircle, X } from "lucide-react";
import type { JsonSchemaProperty } from "@/types/schema";
import { useState } from "react";
import { toast } from "sonner";

interface ParameterMetadataCardProps {
  name: string;
  schema: JsonSchemaProperty;
  value: any;
  defaultValue: any;
  isRequired: boolean;
  isModified: boolean;
  onValueChange: (name: string, value: any) => void;
  onPushToSchema: (name: string, value: any) => void;
  onToggleAdvanced: (name: string, currentState: boolean) => void;
  onToggleHidden?: (name: string, currentState: boolean) => void;
  onToggleRequired?: (name: string, currentState: boolean) => void;
  onToggleImageField: (name: string) => void;
  isImageField: boolean;
}

export const ParameterMetadataCard = ({
  name,
  schema,
  value,
  defaultValue,
  isRequired,
  isModified,
  onValueChange,
  onPushToSchema,
  onToggleAdvanced,
  onToggleHidden = () => {},
  onToggleRequired = () => {},
  onToggleImageField,
  isImageField,
}: ParameterMetadataCardProps) => {
  const isAdvanced = schema.isAdvanced === true;
  const isHidden = schema.showToUser === false;
  
  // State for editing title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(schema.title || '');
  
  // State for editing enums
  const [isEditingEnums, setIsEditingEnums] = useState(false);
  const [editedEnums, setEditedEnums] = useState<string[]>(
    schema.enum ? schema.enum.map(String) : []
  );

  const handleSaveTitle = () => {
    if (editedTitle !== schema.title) {
      const updatedSchema = { ...schema, title: editedTitle };
      onPushToSchema(name, updatedSchema);
    }
    setIsEditingTitle(false);
  };

  const handleAddEnumValue = () => {
    setEditedEnums([...editedEnums, '']);
  };

  const handleRemoveEnumValue = (index: number) => {
    setEditedEnums(editedEnums.filter((_, i) => i !== index));
  };

  const handleEnumValueChange = (index: number, value: string) => {
    const updated = [...editedEnums];
    updated[index] = value;
    setEditedEnums(updated);
  };

  const handleSaveEnums = () => {
    const cleanedEnums = editedEnums.filter(e => e.trim() !== '');
    if (cleanedEnums.length === 0) {
      toast.error("Must have at least one enum value");
      return;
    }
    const updatedSchema = { ...schema, enum: cleanedEnums };
    onPushToSchema(name, updatedSchema);
    setIsEditingEnums(false);
    toast.success(`Updated enum values for ${name}`);
  };

  const renderInput = () => {
    if (schema.type === 'boolean') {
      return (
        <Switch
          checked={value || false}
          onCheckedChange={(checked) => onValueChange(name, checked)}
        />
      );
    }

    if (schema.enum) {
      return (
        <Select value={String(value || '')} onValueChange={(val) => onValueChange(name, val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((opt) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (schema.type === 'number' || schema.type === 'integer') {
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onValueChange(name, Number(e.target.value))}
          min={schema.minimum}
          max={schema.maximum}
        />
      );
    }

    return (
      <Input
        type="text"
        value={value ?? ''}
        onChange={(e) => onValueChange(name, e.target.value)}
        maxLength={schema.maxLength}
      />
    );
  };

  return (
    <Card className={isModified ? 'border-warning border-2' : ''}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1">
                <code className="text-sm font-mono font-semibold">{name}</code>
                {schema.title && schema.title !== name && (
                  <span className="text-xs text-muted-foreground">→ "{schema.title}"</span>
                )}
              </div>
              {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
              {!isRequired && <Badge variant="outline" className="text-xs">Optional</Badge>}
              {isHidden && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
              {isAdvanced && <Badge className="text-xs bg-yellow-500">Advanced</Badge>}
              {isImageField && <Badge variant="outline" className="text-xs">Image Field</Badge>}
            </div>
            
            {/* Editable Title */}
            {isEditingTitle ? (
              <div className="flex gap-2 items-center mt-1">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-sm h-8"
                  placeholder="Display name for users"
                />
                <Button size="sm" onClick={handleSaveTitle} className="h-8">Save</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setEditedTitle(schema.title || '');
                  setIsEditingTitle(false);
                }} className="h-8">Cancel</Button>
              </div>
            ) : (
              <p 
                className="text-sm font-medium text-muted-foreground cursor-pointer hover:underline mt-1"
                onClick={() => setIsEditingTitle(true)}
                title="Click to edit display name"
              >
                Display: {schema.title || 'Click to add display name'}
              </p>
            )}
            
            {schema.description && <p className="text-xs text-muted-foreground mt-1">{schema.description}</p>}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <code className="ml-1 bg-muted px-1 rounded">{schema.type}</code>
          </div>
          {schema.format && (
            <div>
              <span className="text-muted-foreground">Format:</span>
              <code className="ml-1 bg-muted px-1 rounded">{schema.format}</code>
            </div>
          )}
          {schema.minimum !== undefined && (
            <div>
              <span className="text-muted-foreground">Min:</span>
              <span className="ml-1">{schema.minimum}</span>
            </div>
          )}
          {schema.maximum !== undefined && (
            <div>
              <span className="text-muted-foreground">Max:</span>
              <span className="ml-1">{schema.maximum}</span>
            </div>
          )}
        </div>

        {/* Enum Editor */}
        {schema.enum && (
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground font-semibold">Allowed Values (Enum)</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (isEditingEnums) {
                    setEditedEnums(schema.enum ? schema.enum.map(String) : []);
                  }
                  setIsEditingEnums(!isEditingEnums);
                }}
              >
                {isEditingEnums ? 'Cancel' : 'Edit'}
              </Button>
            </div>
            
            {isEditingEnums ? (
              <div className="space-y-2">
                {editedEnums.map((enumVal, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={enumVal}
                      onChange={(e) => handleEnumValueChange(idx, e.target.value)}
                      placeholder="Enum value"
                      className="text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveEnumValue(idx)}
                      disabled={editedEnums.length === 1}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddEnumValue}>+ Add Value</Button>
                  <Button size="sm" variant="default" onClick={handleSaveEnums}>Save All</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {schema.enum.map((opt, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {String(opt)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default Value */}
        <div>
          <Label className="text-xs text-muted-foreground">Schema Default</Label>
          <pre className="mt-1 bg-muted p-2 rounded text-xs">
            {JSON.stringify(defaultValue, null, 2)}
          </pre>
        </div>

        {/* Current Value Input */}
        <div>
          <Label className="text-xs">Current Value</Label>
          <div className="mt-1">
            {renderInput()}
          </div>
        </div>

         {/* Parameter Flags Section */}
        <div className="space-y-3 pt-3 border-t">
          <Label className="text-xs text-muted-foreground font-semibold">Parameter Flags</Label>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Advanced Toggle */}
            <div className="flex items-center justify-between p-2 rounded border border-border">
              <div className="flex flex-col">
                <Label className="text-xs font-medium">Advanced</Label>
                <span className="text-[10px] text-muted-foreground">
                  {isAdvanced ? 'In advanced panel' : 'In basic form'}
                </span>
              </div>
              <Switch
                checked={isAdvanced}
                onCheckedChange={() => onToggleAdvanced(name, isAdvanced)}
              />
            </div>

            {/* Hidden Toggle */}
            <div className="flex items-center justify-between p-2 rounded border border-border">
              <div className="flex flex-col">
                <Label className="text-xs font-medium">Hidden</Label>
                <span className="text-[10px] text-muted-foreground">
                  {isHidden ? 'Backend only' : 'User visible'}
                </span>
              </div>
              <Switch
                checked={isHidden}
                onCheckedChange={() => onToggleHidden(name, isHidden)}
              />
            </div>

            {/* Required Toggle */}
            <div className="flex items-center justify-between p-2 rounded border border-border">
              <div className="flex flex-col">
                <Label className="text-xs font-medium">Required</Label>
                <span className="text-[10px] text-muted-foreground">
                  {isRequired ? 'Must provide' : 'Optional'}
                </span>
              </div>
              <Switch
                checked={isRequired}
                onCheckedChange={() => onToggleRequired(name, isRequired)}
              />
            </div>

            {/* Image Field Toggle */}
            <div className="flex items-center justify-between p-2 rounded border border-border">
              <div className="flex flex-col">
                <Label className="text-xs font-medium">Image Input</Label>
                <span className="text-[10px] text-muted-foreground">
                  {isImageField ? 'Upload enabled' : 'Text only'}
                </span>
              </div>
              <Switch
                checked={isImageField}
                onCheckedChange={() => onToggleImageField(name)}
              />
            </div>
          </div>
        </div>

        {/* Push to Schema button below flags */}
        {isModified && (
          <div className="pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPushToSchema(name, value)}
              className="w-full"
            >
              <ArrowUpCircle className="h-3 w-3 mr-2" />
              Push Current Value to Schema Default
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
