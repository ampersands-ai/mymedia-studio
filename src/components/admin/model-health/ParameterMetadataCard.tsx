import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import type { JsonSchemaProperty } from "@/types/schema";

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
  onToggleImageField,
  isImageField,
}: ParameterMetadataCardProps) => {
  const isAdvanced = schema.isAdvanced === true;
  const isHidden = schema.showToUser === false;

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
              <code className="text-sm font-mono font-semibold">{name}</code>
              {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
              {!isRequired && <Badge variant="outline" className="text-xs">Optional</Badge>}
              {isHidden && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
              {isAdvanced && <Badge className="text-xs bg-yellow-500">Advanced</Badge>}
              {isImageField && <Badge variant="outline" className="text-xs">Image Field</Badge>}
            </div>
            {schema.title && <p className="text-sm font-medium text-muted-foreground">{schema.title}</p>}
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

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {isModified && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPushToSchema(name, value)}
              className="flex-1"
            >
              <ArrowUpCircle className="h-3 w-3 mr-2" />
              Push to Schema
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleAdvanced(name, isAdvanced)}
          >
            {isAdvanced ? <ArrowDownCircle className="h-3 w-3 mr-2" /> : <ArrowUpCircle className="h-3 w-3 mr-2" />}
            {isAdvanced ? 'Move to Basic' : 'Move to Advanced'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onToggleImageField(name)}
          >
            <Upload className="h-3 w-3 mr-2" />
            {isImageField ? 'Remove Image' : 'Add Image'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
