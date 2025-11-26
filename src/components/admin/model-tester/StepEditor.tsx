import { useState } from "react";
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
import type { ExecutionStep } from "@/lib/admin/executionTracker";
import { Save, X } from "lucide-react";

interface StepEditorProps {
  step: ExecutionStep;
  onSave: (newInputs: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function StepEditor({ step, onSave, onCancel }: StepEditorProps) {
  const [editedInputs, setEditedInputs] = useState<Record<string, unknown>>(
    JSON.parse(JSON.stringify(step.inputs))
  );

  const handleInputChange = (key: string, value: unknown) => {
    setEditedInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave(editedInputs);
  };

  const renderInputField = (key: string, value: unknown) => {
    const type = typeof value;

    if (type === 'boolean') {
      return (
        <Select
          value={String(value)}
          onValueChange={(val) => handleInputChange(key, val === 'true')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (type === 'number') {
      return (
        <Input
          type="number"
          value={typeof value === 'number' ? value : 0}
          onChange={(e) => handleInputChange(key, parseFloat(e.target.value))}
        />
      );
    }

    if (type === 'string') {
      const strValue = String(value);
      // Use textarea for long strings
      if (strValue.length > 100) {
        return (
          <Textarea
            value={strValue}
            onChange={(e) => handleInputChange(key, e.target.value)}
            rows={4}
            className="font-mono text-xs"
          />
        );
      }
      return (
        <Input
          type="text"
          value={strValue}
          onChange={(e) => handleInputChange(key, e.target.value)}
        />
      );
    }

    if (type === 'object' || Array.isArray(value)) {
      return (
        <Textarea
          value={JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              handleInputChange(key, parsed);
            } catch {
              // Invalid JSON, don't update
            }
          }}
          rows={6}
          className="font-mono text-xs"
        />
      );
    }

    return (
      <Input
        type="text"
        value={String(value)}
        onChange={(e) => handleInputChange(key, e.target.value)}
      />
    );
  };

  return (
    <div className="space-y-4 p-4 bg-white border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold">Edit Step Inputs</h5>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="h-8"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(editedInputs).map(([key, value]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key} className="text-xs font-medium">
              {key}
              <span className="ml-2 text-xs text-muted-foreground font-mono">
                ({typeof value})
              </span>
            </Label>
            {renderInputField(key, value)}
          </div>
        ))}
      </div>
    </div>
  );
}
