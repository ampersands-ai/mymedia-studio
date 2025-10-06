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

interface ContentTemplate {
  id: string;
  category: string;
  name: string;
  description: string | null;
  model_id: string | null;
  preset_parameters: Record<string, any>;
  enhancement_instruction: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_minutes?: number | null;
}

interface TemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ContentTemplate | null;
  onSuccess: () => void;
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: TemplateFormDialogProps) {
  const [formData, setFormData] = useState({
    id: "",
    category: "",
    name: "",
    description: "",
    model_id: "",
    preset_parameters: "{}",
    enhancement_instruction: "",
    thumbnail_url: "",
    display_order: "0",
    estimated_time_minutes: "",
  });
  const [models, setModels] = useState<Array<{ id: string; model_name: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open]);

  useEffect(() => {
    if (template) {
      setFormData({
        id: template.id,
        category: template.category,
        name: template.name,
        description: template.description || "",
        model_id: template.model_id || "",
        preset_parameters: JSON.stringify(template.preset_parameters, null, 2),
        enhancement_instruction: template.enhancement_instruction || "",
        thumbnail_url: template.thumbnail_url || "",
        display_order: template.display_order.toString(),
        estimated_time_minutes: template.estimated_time_minutes?.toString() || "",
      });
    } else {
      setFormData({
        id: "",
        category: "",
        name: "",
        description: "",
        model_id: "",
        preset_parameters: "{}",
        enhancement_instruction: "",
        thumbnail_url: "",
        display_order: "0",
        estimated_time_minutes: "",
      });
    }
  }, [template, open]);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("id, model_name")
        .eq("is_active", true)
        .order("model_name");

      if (error) throw error;
      setModels(data || []);
    } catch (error) {
      console.error("Error fetching models:", error);
      toast.error("Failed to load models");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate JSON field
      let presetParameters;
      try {
        presetParameters = JSON.parse(formData.preset_parameters);
      } catch {
        toast.error("Invalid JSON in Preset Parameters");
        setSaving(false);
        return;
      }

      const data = {
        id: formData.id,
        category: formData.category,
        name: formData.name,
        description: formData.description || null,
        model_id: formData.model_id || null,
        preset_parameters: presetParameters,
        enhancement_instruction: formData.enhancement_instruction || null,
        thumbnail_url: formData.thumbnail_url || null,
        display_order: parseInt(formData.display_order),
        is_active: true,
        estimated_time_minutes: formData.estimated_time_minutes ? parseInt(formData.estimated_time_minutes) : null,
      };

      if (template) {
        // Update existing template
        const { error } = await supabase
          .from("content_templates")
          .update(data)
          .eq("id", template.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
        // Create new template
        const { error } = await supabase.from("content_templates").insert(data);

        if (error) throw error;
        toast.success("Template created successfully");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {template ? "Edit Template" : "Add New Template"}
          </DialogTitle>
          <DialogDescription>
            Configure content template with preset parameters
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Template ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                placeholder="IMG-001"
                required
                disabled={!!template}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Image Creation">Image Creation</SelectItem>
                  <SelectItem value="Photo Editing">Photo Editing</SelectItem>
                  <SelectItem value="Video Creation">Video Creation</SelectItem>
                  <SelectItem value="Audio Processing">Audio Processing</SelectItem>
                  <SelectItem value="Text Generation">Text Generation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Portrait Headshots"
                required
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Professional headshot generation with studio lighting"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model_id">AI Model *</Label>
              <Select
                value={formData.model_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, model_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: e.target.value })
                }
                placeholder="0"
                min="0"
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

            <div className="space-y-2 col-span-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) =>
                  setFormData({ ...formData, thumbnail_url: e.target.value })
                }
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preset_parameters">
              Preset Parameters (JSON) *
            </Label>
            <Textarea
              id="preset_parameters"
              value={formData.preset_parameters}
              onChange={(e) =>
                setFormData({ ...formData, preset_parameters: e.target.value })
              }
              placeholder='{"aspect_ratio": "3:4", "style_preset": "photographic"}'
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Pre-configured parameters that will be sent to the AI model
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="enhancement_instruction">
              Prompt Enhancement Instruction
            </Label>
            <Textarea
              id="enhancement_instruction"
              value={formData.enhancement_instruction}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  enhancement_instruction: e.target.value,
                })
              }
              placeholder="Transform this into a professional portrait headshot prompt..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Instructions for enhancing user prompts for this template
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
              {saving
                ? "Saving..."
                : template
                ? "Update Template"
                : "Create Template"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
