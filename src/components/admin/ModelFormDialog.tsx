import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const AVAILABLE_GROUPS = [
  { id: "image_editing", label: "Image Editing" },
  { id: "prompt_to_image", label: "Prompt to Image" },
  { id: "prompt_to_video", label: "Prompt to Video" },
  { id: "image_to_video", label: "Image to Video" },
  { id: "prompt_to_audio", label: "Prompt to Audio" },
];

interface AIModel {
  record_id: string;
  id: string;
  provider: string;
  model_name: string;
  content_type: string;
  base_token_cost: number;
  cost_multipliers: Record<string, number> | null;
  input_schema: Record<string, any>;
  api_endpoint: string | null;
  is_active: boolean;
  groups?: string[];
  estimated_time_minutes?: number | null;
  payload_structure?: string;
}

interface ModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  model: AIModel | null;
  onSuccess: () => void;
}

export function ModelFormDialog({
  open,
  onOpenChange,
  model,
  onSuccess,
}: ModelFormDialogProps) {
  const [formData, setFormData] = useState({
    id: "",
    provider: "",
    model_name: "",
    content_type: "",
    base_token_cost: "",
    payload_structure: "wrapper",
    cost_multipliers: "{}",
    input_schema: "{}",
    api_endpoint: "",
    estimated_time_minutes: "",
  });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (model) {
      setFormData({
        id: model.id,
        provider: model.provider,
        model_name: model.model_name,
        content_type: model.content_type,
        base_token_cost: model.base_token_cost.toString(),
        payload_structure: (model as any).payload_structure || "wrapper",
        cost_multipliers: JSON.stringify(model.cost_multipliers || {}, null, 2),
        input_schema: JSON.stringify(model.input_schema, null, 2),
        api_endpoint: model.api_endpoint || "",
        estimated_time_minutes: model.estimated_time_minutes?.toString() || "",
      });
      setSelectedGroups(model.groups || []);
    } else {
      setFormData({
        id: "",
        provider: "",
        model_name: "",
        content_type: "",
        base_token_cost: "",
        payload_structure: "wrapper",
        cost_multipliers: "{}",
        input_schema: "{}",
        api_endpoint: "",
        estimated_time_minutes: "",
      });
      setSelectedGroups([]);
    }
  }, [model, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate JSON fields
      let costMultipliers;
      let inputSchema;

      try {
        costMultipliers = JSON.parse(formData.cost_multipliers);
      } catch {
        toast.error("Invalid JSON in Cost Multipliers");
        setSaving(false);
        return;
      }

      try {
        inputSchema = JSON.parse(formData.input_schema);
      } catch {
        toast.error("Invalid JSON in Input Schema");
        setSaving(false);
        return;
      }

      const data = {
        id: formData.id,
        provider: formData.provider,
        model_name: formData.model_name,
        content_type: formData.content_type,
        base_token_cost: parseInt(formData.base_token_cost),
        payload_structure: formData.payload_structure,
        cost_multipliers: costMultipliers,
        input_schema: inputSchema,
        api_endpoint: formData.api_endpoint || null,
        groups: selectedGroups,
        is_active: true,
        estimated_time_minutes: formData.estimated_time_minutes ? parseInt(formData.estimated_time_minutes) : null,
      };

      if (model && model.record_id) {
        // Update existing model - use record_id
        const { error } = await supabase
          .from("ai_models")
          .update(data)
          .eq("record_id", model.record_id);

        if (error) throw error;
        toast.success("Model updated successfully");
      } else {
        // Create new model - record_id will be auto-generated
        const { error } = await supabase.from("ai_models").insert(data);

        if (error) throw error;
        toast.success("Model created successfully");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving model:", error);
      toast.error(error.message || "Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {model && model.record_id ? "Edit Model" : "Add New Model"}
          </DialogTitle>
          <DialogDescription>
            Configure AI model settings, token costs, and parameters
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Model ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                placeholder="veo3-fast"
                required
                disabled={!!(model && model.record_id)}
              />
              <p className="text-xs text-muted-foreground">
                Model identifier (can be duplicated for different endpoints)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) =>
                  setFormData({ ...formData, provider: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kie_ai">Kie.ai</SelectItem>
                  <SelectItem value="json2video">JSON2Video</SelectItem>
                  <SelectItem value="shotstack">Shotstack</SelectItem>
                  <SelectItem value="comfyui">ComfyUI</SelectItem>
                  <SelectItem value="lovable_ai">Lovable AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model_name">Model Name *</Label>
              <Input
                id="model_name"
                value={formData.model_name}
                onChange={(e) =>
                  setFormData({ ...formData, model_name: e.target.value })
                }
                placeholder="Flux Pro"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content_type">Content Type *</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, content_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payload_structure">Payload Structure *</Label>
              <Select
                value={formData.payload_structure}
                onValueChange={(value) =>
                  setFormData({ ...formData, payload_structure: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select structure" />
                </SelectTrigger>
          <SelectContent>
            <SelectItem value="wrapper">Wrapper (Standard)</SelectItem>
            <SelectItem value="flat">Flat</SelectItem>
          </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Wrapper: Uses <code className="bg-muted px-1 rounded">input</code> object. 
                Flat: Top-level parameters only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_token_cost">Base Token Cost *</Label>
              <Input
                id="base_token_cost"
                type="number"
                value={formData.base_token_cost}
                onChange={(e) =>
                  setFormData({ ...formData, base_token_cost: e.target.value })
                }
                placeholder="75"
                required
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_endpoint">API Endpoint</Label>
              <Input
                id="api_endpoint"
                value={formData.api_endpoint}
                onChange={(e) =>
                  setFormData({ ...formData, api_endpoint: e.target.value })
                }
                placeholder="/v1/generate"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_time_minutes">Estimated Time</Label>
              <div className="flex gap-2">
                <Input
                  id="estimated_time_minutes"
                  type="number"
                  value={formData.estimated_time_minutes}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_time_minutes: e.target.value })
                  }
                  placeholder="5"
                  min="0"
                  step="0.5"
                  className="flex-1"
                />
                <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                  minutes
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Approximate time for generation (supports decimals: 0.5 = 30 seconds)
              </p>
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <Label>Creation Types (Groups)</Label>
            <div className="grid grid-cols-2 gap-2 p-4 border-2 border-border rounded-md">
              {AVAILABLE_GROUPS.map(group => (
                <div key={group.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={group.id}
                    checked={selectedGroups.includes(group.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGroups([...selectedGroups, group.id]);
                      } else {
                        setSelectedGroups(selectedGroups.filter(g => g !== group.id));
                      }
                    }}
                  />
                  <label 
                    htmlFor={group.id} 
                    className="text-sm cursor-pointer select-none"
                  >
                    {group.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Select which creation types this model supports
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_multipliers">
              Cost Multipliers (JSON)
            </Label>
            <Textarea
              id="cost_multipliers"
              value={formData.cost_multipliers}
              onChange={(e) =>
                setFormData({ ...formData, cost_multipliers: e.target.value })
              }
              placeholder='{"hd": 1.5, "uploaded_image": 10, "brand": 25}'
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Define cost multipliers for different options (e.g., HD, uploaded
              images)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input_schema">Input Schema (JSON) *</Label>
            <Textarea
              id="input_schema"
              value={formData.input_schema}
              onChange={(e) =>
                setFormData({ ...formData, input_schema: e.target.value })
              }
              placeholder='{"type": "object", "required": ["prompt"], "properties": {"prompt": {"type": "string"}, "aspect_ratio": {"enum": ["Portrait", "Landscape"], "default": "Landscape"}}}'
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              <strong>Only fields defined here will be sent to the provider API.</strong> Use JSON Schema format to define parameters.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : (model && model.record_id) ? "Update Model" : "Create Model"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
