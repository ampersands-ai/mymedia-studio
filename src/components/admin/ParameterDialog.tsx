import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { validateParameterName, type Parameter } from "@/lib/schema-utils";

interface ParameterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parameter: Parameter | null;
  existingNames: string[];
  onSave: (parameter: Parameter) => void;
}

export function ParameterDialog({
  open,
  onOpenChange,
  parameter,
  existingNames,
  onSave,
}: ParameterDialogProps) {
  const [formData, setFormData] = useState<Parameter>({
    name: '',
    label: '',
    description: '',
    type: 'string',
    required: false,
  });
  const [enumInput, setEnumInput] = useState('');
  const [enumList, setEnumList] = useState<any[]>([]);

  useEffect(() => {
    if (parameter) {
      setFormData(parameter);
      setEnumList(parameter.enum || []);
    } else {
      setFormData({
        name: '',
        label: '',
        description: '',
        type: 'string',
        required: false,
      });
      setEnumList([]);
    }
    setEnumInput('');
  }, [parameter, open]);

  const handleSave = () => {
    const nameError = validateParameterName(formData.name, existingNames);
    if (nameError) {
      toast.error(nameError);
      return;
    }

    if (enumList.length > 0) {
      const hasDefault = formData.default !== undefined && formData.default !== null && formData.default !== '';
      if (hasDefault && !enumList.includes(formData.default)) {
        toast.error("Default value must be one of the enum options");
        return;
      }
    }

    if (formData.minimum !== undefined && formData.maximum !== undefined) {
      if (formData.minimum > formData.maximum) {
        toast.error("Minimum must be less than maximum");
        return;
      }
    }

    const paramToSave: Parameter = {
      ...formData,
      label: formData.label || formatLabel(formData.name),
      enum: enumList.length > 0 ? enumList : undefined,
    };

    onSave(paramToSave);
  };

  const formatLabel = (name: string) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleAddEnum = () => {
    if (!enumInput.trim()) return;
    
    let value: any = enumInput.trim();
    
    if (formData.type === 'number' || formData.type === 'integer') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        toast.error(`Invalid number: ${value}`);
        return;
      }
      value = formData.type === 'integer' ? parseInt(value) : num;
    } else if (formData.type === 'boolean') {
      if (value === 'true') value = true;
      else if (value === 'false') value = false;
      else {
        toast.error("Boolean values must be 'true' or 'false'");
        return;
      }
    }
    
    if (enumList.includes(value)) {
      toast.error("Duplicate enum value");
      return;
    }
    
    setEnumList([...enumList, value]);
    setEnumInput('');
  };

  const handleRemoveEnum = (index: number) => {
    setEnumList(enumList.filter((_, i) => i !== index));
  };

  const handleTypeChange = (newType: string) => {
    setFormData({ 
      ...formData, 
      type: newType as any,
      minimum: undefined,
      maximum: undefined,
      minLength: undefined,
      maxLength: undefined,
      items: newType === 'array' ? { type: 'string' } : undefined,
    });
    setEnumList([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parameter ? 'Edit Parameter' : 'Add Parameter'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Parameter Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
              placeholder="e.g., image_size, prompt, aspect_ratio"
              disabled={!!parameter}
            />
            <p className="text-xs text-muted-foreground">
              Lowercase, alphanumeric, underscores only. This is the JSON key.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Display Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder={`Auto: ${formatLabel(formData.name || 'parameter name')}`}
            />
            <p className="text-xs text-muted-foreground">
              Human-readable name shown in the UI. Leave blank to auto-generate.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this parameter control?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="array">Array</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="block">Required</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox
                  id="required"
                  checked={formData.required}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, required: checked as boolean })
                  }
                />
                <label htmlFor="required" className="text-sm cursor-pointer">
                  This parameter is required
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default">Default Value</Label>
            {formData.type === 'boolean' ? (
              <Select 
                value={formData.default?.toString()} 
                onValueChange={(val) => setFormData({ ...formData, default: val === 'true' })}
              >
                <SelectTrigger id="default">
                  <SelectValue placeholder="No default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">true</SelectItem>
                  <SelectItem value="false">false</SelectItem>
                </SelectContent>
              </Select>
            ) : formData.type === 'array' ? (
              <Input
                id="default"
                placeholder="Enter JSON array, e.g., []"
                value={formData.default ? JSON.stringify(formData.default) : ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setFormData({ ...formData, default: parsed });
                  } catch {
                    // Invalid JSON
                  }
                }}
              />
            ) : (
              <Input
                id="default"
                type={formData.type === 'number' || formData.type === 'integer' ? 'number' : 'text'}
                value={formData.default || ''}
                onChange={(e) => {
                  let value: any = e.target.value;
                  if (formData.type === 'number') value = parseFloat(value);
                  if (formData.type === 'integer') value = parseInt(value);
                  setFormData({ ...formData, default: value });
                }}
                placeholder="Leave blank for no default"
              />
            )}
          </div>

          {formData.type !== 'array' && (
            <div className="space-y-2">
              <Label>Enum Options (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={enumInput}
                  onChange={(e) => setEnumInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEnum())}
                  placeholder={`Add ${formData.type} option...`}
                />
                <Button type="button" onClick={handleAddEnum} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {enumList.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {enumList.map((value, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {JSON.stringify(value)}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveEnum(index)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Enum creates a dropdown in the UI. Leave empty for free text input.
              </p>
            </div>
          )}

          {(formData.type === 'number' || formData.type === 'integer') && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minimum">Minimum</Label>
                <Input
                  id="minimum"
                  type="number"
                  value={formData.minimum || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    minimum: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="No minimum"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maximum">Maximum</Label>
                <Input
                  id="maximum"
                  type="number"
                  value={formData.maximum || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maximum: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="No maximum"
                />
              </div>
            </div>
          )}

          {formData.type === 'string' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minLength">Min Length</Label>
                  <Input
                    id="minLength"
                    type="number"
                    value={formData.minLength || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      minLength: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLength">Max Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    value={formData.maxLength || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="No maximum"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="format">Format (Optional)</Label>
                <Select 
                  value={formData.format || 'none'} 
                  onValueChange={(val) => setFormData({ ...formData, format: val === 'none' ? undefined : val })}
                >
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="uri">URI (URL)</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {formData.type === 'array' && (
            <div className="space-y-2">
              <Label htmlFor="itemType">Array Item Type *</Label>
              <Select 
                value={formData.items?.type || 'string'}
                onValueChange={(val) => setFormData({ 
                  ...formData, 
                  items: { type: val, format: val === 'string' ? formData.items?.format : undefined } 
                })}
              >
                <SelectTrigger id="itemType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                </SelectContent>
              </Select>
              
              {formData.items?.type === 'string' && (
                <div className="mt-2">
                  <Label htmlFor="itemFormat">Item Format (Optional)</Label>
                  <Select 
                    value={formData.items.format || 'none'}
                    onValueChange={(val) => setFormData({ 
                      ...formData, 
                      items: { ...formData.items!, format: val === 'none' ? undefined : val } 
                    })}
                  >
                    <SelectTrigger id="itemFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="uri">URI (URL)</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {parameter ? 'Update' : 'Add'} Parameter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
