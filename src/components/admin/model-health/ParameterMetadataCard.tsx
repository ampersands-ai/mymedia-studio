import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Info, Eye, EyeOff, Lock, Settings2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ParameterMetadataCardProps {
  name: string;
  schema: any;
  value: any;
  onChange: (name: string, value: any) => void;
  isRequired: boolean;
  showToUser: boolean;
  isAdvanced: boolean;
}

export const ParameterMetadataCard = ({
  name,
  schema,
  value,
  onChange,
  isRequired,
  showToUser,
  isAdvanced,
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
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="font-mono text-sm font-semibold">{name}</Label>
            {schema.title && schema.title !== name && (
              <span className="text-xs text-muted-foreground">({schema.title})</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
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
                <TooltipContent>Hidden from users - backend only</TooltipContent>
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
                <TooltipContent>Shown to users</TooltipContent>
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
                <TooltipContent>Advanced parameter - shown in advanced options</TooltipContent>
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
          <span className="text-muted-foreground">Type:</span>{' '}
          <code className="bg-muted px-1 py-0.5 rounded">{type}</code>
        </div>
        {format && (
          <div>
            <span className="text-muted-foreground">Format:</span>{' '}
            <code className="bg-muted px-1 py-0.5 rounded">{format}</code>
          </div>
        )}
        {minimum !== undefined && (
          <div>
            <span className="text-muted-foreground">Min:</span>{' '}
            <code className="bg-muted px-1 py-0.5 rounded">{minimum}</code>
          </div>
        )}
        {maximum !== undefined && (
          <div>
            <span className="text-muted-foreground">Max:</span>{' '}
            <code className="bg-muted px-1 py-0.5 rounded">{maximum}</code>
          </div>
        )}
        {defaultValue !== undefined && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Default:</span>{' '}
            <code className="bg-muted px-1 py-0.5 rounded">{String(defaultValue)}</code>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Current Value</Label>
        {renderInput()}
      </div>
    </Card>
  );
};
