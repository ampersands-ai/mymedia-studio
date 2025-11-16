import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Settings2, ArrowUpToLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ParameterMetadataCardProps {
  name: string;
  schema: any;
  value: any;
  onChange: (name: string, value: any) => void;
  isRequired: boolean;
  showToUser: boolean;
  isAdvanced: boolean;
  isModified?: boolean;
  onPushToSchema?: () => void;
}

export const ParameterMetadataCard = ({
  name,
  schema,
  value,
  onChange,
  isRequired,
  showToUser,
  isAdvanced,
  isModified = false,
  onPushToSchema,
}: ParameterMetadataCardProps) => {
  const type = schema.type || 'string';
  const format = schema.format;
  const description = schema.description || schema.title || '';
  const enumOptions = schema.enum;
  const minimum = schema.minimum;
  const maximum = schema.maximum;
  const defaultValue = schema.default;

  const renderInput = () => {
    if (type === 'boolean') {
      return (
        <Switch
          checked={value ?? defaultValue ?? false}
          onCheckedChange={(checked) => onChange(name, checked)}
        />
      );
    }

    if (enumOptions && enumOptions.length > 0) {
      return (
        <Select value={value ?? defaultValue ?? ''} onValueChange={(val) => onChange(name, val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option..." />
          </SelectTrigger>
          <SelectContent>
            {enumOptions.map((opt: any) => (
              <SelectItem key={String(opt)} value={String(opt)}>
                {String(opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (type === 'number' || type === 'integer') {
      return (
        <Input
          type="number"
          value={value ?? defaultValue ?? ''}
          onChange={(e) => onChange(name, type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
          min={minimum}
          max={maximum}
          step={type === 'integer' ? 1 : 0.1}
        />
      );
    }

    if (format === 'textarea' || name.toLowerCase().includes('prompt')) {
      return (
        <Textarea
          value={value ?? defaultValue ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          rows={3}
          className="font-mono text-xs"
        />
      );
    }

    return (
      <Input
        type="text"
        value={value ?? defaultValue ?? ''}
        onChange={(e) => onChange(name, e.target.value)}
      />
    );
  };

  return (
    <Card className={`p-4 space-y-3 ${isModified ? 'border-orange-500 border-2' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="font-mono text-sm font-semibold">{name}</Label>
            {schema.title && schema.title !== name && (
              <span className="text-xs text-muted-foreground">({schema.title})</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          {isRequired && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="destructive" className="text-[10px]">Required</Badge>
                </TooltipTrigger>
                <TooltipContent>This parameter is required by the model</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {!showToUser && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <EyeOff className="h-3 w-3" />
                    Hidden
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Hidden from users in the UI</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {showToUser && !isAdvanced && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Eye className="h-3 w-3" />
                    Visible
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Visible to users in the UI</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {isAdvanced && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[10px] gap-1 border-yellow-500 text-yellow-700">
                    <Settings2 className="h-3 w-3" />
                    Advanced
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Advanced parameter, shown in advanced settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {isModified && (
            <Badge variant="default" className="text-[10px] bg-orange-500 hover:bg-orange-600">
              Modified
            </Badge>
          )}

          {isModified && onPushToSchema && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onPushToSchema}
                    className="h-7 px-2"
                  >
                    <ArrowUpToLine className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Push this parameter default to schema</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Type:</span>{" "}
          <code className="px-1 py-0.5 bg-muted rounded">{type}</code>
        </div>
        {format && (
          <div>
            <span className="text-muted-foreground">Format:</span>{" "}
            <code className="px-1 py-0.5 bg-muted rounded">{format}</code>
          </div>
        )}
        {minimum !== undefined && (
          <div>
            <span className="text-muted-foreground">Min:</span>{" "}
            <code className="px-1 py-0.5 bg-muted rounded">{minimum}</code>
          </div>
        )}
        {maximum !== undefined && (
          <div>
            <span className="text-muted-foreground">Max:</span>{" "}
            <code className="px-1 py-0.5 bg-muted rounded">{maximum}</code>
          </div>
        )}
        {defaultValue !== undefined && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Default:</span>{" "}
            <code className="px-1 py-0.5 bg-muted rounded">
              {JSON.stringify(defaultValue)}
            </code>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Current Value</Label>
        {renderInput()}
      </div>
    </Card>
  );
};
