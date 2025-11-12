import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
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
import { SchemaBuilder } from "./SchemaBuilder";
import { ImageUploader } from "./template-landing/ImageUploader";

const AVAILABLE_GROUPS = [
  { id: "image_editing", label: "Image Editing" },
  { id: "prompt_to_image", label: "Prompt to Image" },
  { id: "prompt_to_video", label: "Prompt to Video" },
  { id: "image_to_video", label: "Image to Video" },
  { id: "prompt_to_audio", label: "Prompt to Audio" },
];

/**
 * LOGO UPLOAD GUIDELINES:
 * 
 * 1. File Format: PNG or SVG (transparent background recommended)
 * 2. Dimensions: Square aspect ratio (64x64, 128x128, or 256x256 px)
 * 3. File Size: Keep under 100KB for fast loading
 * 4. Style: Use official brand logos when available
 * 5. Backup: System falls back to content-type icons if no logo
 * 
 * The logo will be displayed:
 * - In model selection dropdowns (20x20px)
 * - On Features page cards (48x48px)
 * - In admin model list
 */

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
  estimated_time_seconds?: number | null;
  payload_structure?: string;
  max_images?: number | null;
  logo_url?: string | null;
  default_outputs?: number | null;
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
    estimated_time_seconds: "",
    max_images: "",
    logo_url: "",
    default_outputs: "",
    model_family: "",
    variant_name: "",
    display_order_in_family: "0",
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
        estimated_time_seconds: model.estimated_time_seconds?.toString() || "",
        max_images: model.max_images?.toString() || "",
        logo_url: model.logo_url || "",
        default_outputs: model.default_outputs?.toString() || "1",
        model_family: (model as any).model_family || "",
        variant_name: (model as any).variant_name || "",
        display_order_in_family: (model as any).display_order_in_family?.toString() || "0",
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
        estimated_time_seconds: "",
        max_images: "",
        logo_url: "",
        default_outputs: "1",
        model_family: "",
        variant_name: "",
        display_order_in_family: "0",
      });
      setSelectedGroups([]);
    }
  }, [model]);

  const handleSchemaSave = async (newSchema: Record<string, any>) => {
    if (!model?.record_id) return;
    
    try {
      const { error } = await supabase
        .from("ai_models")
        .update({ input_schema: newSchema })
        .eq("record_id", model.record_id);

      if (error) throw error;
      toast.success("Parameter order saved");
    } catch (error: any) {
      logger.error('Model parameter order save failed', error, {
        component: 'ModelFormDialog',
        modelRecordId: model.record_id,
        operation: 'saveParameterOrder'
      });
      toast.error("Failed to save parameter order");
      throw error;
    }
  };

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
        base_token_cost: parseFloat(formData.base_token_cost),
        payload_structure: formData.payload_structure,
        cost_multipliers: costMultipliers,
        input_schema: inputSchema,
        api_endpoint: formData.api_endpoint || null,
        groups: selectedGroups,
        is_active: true,
        estimated_time_seconds: formData.estimated_time_seconds 
          ? parseInt(formData.estimated_time_seconds)
          : null,
        max_images: formData.max_images ? parseInt(formData.max_images) : 0,
        logo_url: formData.logo_url || null,
        default_outputs: formData.default_outputs ? parseInt(formData.default_outputs) : 1,
        model_family: formData.model_family || null,
        variant_name: formData.variant_name || null,
        display_order_in_family: formData.display_order_in_family ? parseInt(formData.display_order_in_family) : 0,
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
      logger.error('Model save operation failed', error, {
        component: 'ModelFormDialog',
        isNewModel: !model,
        modelId: model?.id,
        operation: 'saveModel'
      });
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
            {model ? "Edit Model" : "Add New Model"}
          </DialogTitle>
          <DialogDescription>
            Configure AI model settings, credit costs, and parameters
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
                  <SelectItem value="runware">Runware</SelectItem>
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
              <Label htmlFor="base_token_cost">Base Credit Cost *</Label>
              <Input
                id="base_token_cost"
                type="number"
                step="0.01"
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
              <Label htmlFor="estimated_time_seconds">Estimated Time (seconds)</Label>
              <Input
                id="estimated_time_seconds"
                type="number"
                value={formData.estimated_time_seconds}
                onChange={(e) => setFormData({ ...formData, estimated_time_seconds: e.target.value })}
                placeholder="90"
                min="0"
                step="1"
              />
              <p className="text-xs text-muted-foreground">
                {formData.estimated_time_seconds && parseInt(formData.estimated_time_seconds) >= 60
                  ? `${formData.estimated_time_seconds}s (≈ ${Math.floor(parseInt(formData.estimated_time_seconds) / 60)}m ${parseInt(formData.estimated_time_seconds) % 60}s)`
                  : formData.estimated_time_seconds ? `${formData.estimated_time_seconds}s` : 'Enter time in seconds'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_images">Max Images</Label>
              <Input
                id="max_images"
                type="number"
                value={formData.max_images}
                onChange={(e) =>
                  setFormData({ ...formData, max_images: e.target.value })
                }
                placeholder="0 (no images needed)"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of images users can upload (0 = no images needed, leave empty = 0)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_outputs">Default Number of Outputs</Label>
              <Input
                id="default_outputs"
                type="number"
                value={formData.default_outputs}
                onChange={(e) =>
                  setFormData({ ...formData, default_outputs: e.target.value })
                }
                placeholder="1"
                min="1"
              />
              <p className="text-xs text-muted-foreground">
                How many outputs this model generates per request (e.g., 1 for single image, 4 for batch generation)
              </p>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="logo_url">Model Logo</Label>
              <ImageUploader
                value={formData.logo_url}
                onChange={(url) => setFormData({ ...formData, logo_url: url })}
                label="Upload Brand Logo"
                bucket="generated-content"
              />
              <p className="text-xs text-muted-foreground">
                Upload a square logo (recommended: 64x64px or 128x128px) for this model. Displayed in dropdowns (20x20px) and Features page (48x48px).
              </p>
            </div>

            {/* Model Family */}
            <div className="space-y-2">
              <Label htmlFor="model_family">Model Family</Label>
              <Input
                id="model_family"
                value={formData.model_family}
                onChange={(e) =>
                  setFormData({ ...formData, model_family: e.target.value })
                }
                placeholder="e.g., Google, FLUX, OpenAI"
              />
              <p className="text-xs text-muted-foreground">
                Brand/family grouping for two-level selection (e.g., "Google" for all Google models)
              </p>
            </div>

            {/* Variant Name */}
            <div className="space-y-2">
              <Label htmlFor="variant_name">Variant Name</Label>
              <Input
                id="variant_name"
                value={formData.variant_name}
                onChange={(e) =>
                  setFormData({ ...formData, variant_name: e.target.value })
                }
                placeholder="e.g., Imagen 4, Imagen 4 Fast"
              />
              <p className="text-xs text-muted-foreground">
                Specific variant within the family (shown in variant selector)
              </p>
            </div>

            {/* Display Order in Family */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="display_order_in_family">Display Order in Family</Label>
              <Input
                id="display_order_in_family"
                type="number"
                value={formData.display_order_in_family}
                onChange={(e) =>
                  setFormData({ ...formData, display_order_in_family: e.target.value })
                }
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-muted-foreground">
                Sort order within family (0 = first, higher = later). Base models usually 1, Fast/Turbo 2, Ultra/Pro 3.
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
              Credit Cost Multipliers (JSON)
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
              Define credit cost multipliers for different options (e.g., HD, uploaded
              images)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Input Schema *</Label>
            <SchemaBuilder
              schema={typeof formData.input_schema === 'string' 
                ? JSON.parse(formData.input_schema || '{}')
                : formData.input_schema
              }
              onChange={(newSchema) => {
                setFormData({ 
                  ...formData, 
                  input_schema: JSON.stringify(newSchema, null, 2) 
                });
              }}
              modelRecordId={model?.record_id}
              onSave={handleSchemaSave}
            />
            <p className="text-xs text-muted-foreground">
              <strong>Only fields defined here will be sent to the provider API.</strong>
            </p>
            
            {/* CURL Sample */}
            <div className="mt-4 space-y-2">
              <Label className="text-sm font-semibold">Sample CURL Request</Label>
              <div className="relative">
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto font-mono">
{(() => {
  const schema = typeof formData.input_schema === 'string' 
    ? JSON.parse(formData.input_schema || '{}')
    : formData.input_schema;
  const properties = (schema as any).properties || {};
  const propertyKeys = Object.keys(properties);
  
  return `curl -X POST '${formData.api_endpoint || '/v1/generate'}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -d '{
  "model": "${formData.id || 'model-id'}"${formData.payload_structure === 'flat' ? `,
  ${propertyKeys.map(key => `"${key}": "value"`).join(',\n  ')}` : `,
  "input": {
    ${propertyKeys.map(key => `"${key}": "value"`).join(',\n    ')}
  }`}
}'`;
})()}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.payload_structure === 'flat' 
                  ? 'Flat structure: parameters at top level' 
                  : 'Wrapper structure: parameters inside "input" object'}
              </p>
            </div>
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
              {saving ? "Saving..." : model ? "Update Model" : "Create Model"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
