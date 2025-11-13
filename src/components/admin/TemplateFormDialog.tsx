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
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParameterConfigurator } from "./ParameterConfigurator";
import type { TemplateConfiguration, JsonSchema } from "@/types/schema";
import { jsonToSchema } from "@/types/schema";

type ContentTemplate = TemplateConfiguration;

interface AIModel {
  id: string;
  model_name: string;
  input_schema: JsonSchema;
  record_id: string;
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
  const [originalId, setOriginalId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: "",
    category: "",
    name: "",
    description: "",
    model_id: "",
    preset_parameters: "{}",
    enhancement_instruction: "",
    thumbnail_url: "",
    before_image_url: "",
    after_image_url: "",
    display_order: "0",
    estimated_time_seconds: "",
    is_custom_model: false,
    custom_model_id: "",
    custom_input_schema: "{}",
  });
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [userEditableFields, setUserEditableFields] = useState<string[]>([]);
  const [hiddenFieldDefaults, setHiddenFieldDefaults] = useState<Record<string, string | number | boolean | null>>({});
  const [presetValues, setPresetValues] = useState<Record<string, string | number | boolean | null>>({});
  const [saving, setSaving] = useState(false);
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [paramConfigOpen, setParamConfigOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open]);

  useEffect(() => {
    if (template) {
      const isCustom = template.is_custom_model || false;
      setOriginalId(template.id);
      setFormData({
        id: template.id,
        category: template.category,
        name: template.name,
        description: template.description || "",
        model_id: template.model_id || "",
        preset_parameters: JSON.stringify(template.preset_parameters, null, 2),
        enhancement_instruction: template.enhancement_instruction || "",
        thumbnail_url: template.thumbnail_url || "",
        before_image_url: template.before_image_url || "",
        after_image_url: template.after_image_url || "",
        display_order: template.display_order.toString(),
        estimated_time_seconds: template.estimated_time_seconds?.toString() || "",
        is_custom_model: isCustom,
        custom_model_id: isCustom ? template.model_id || "" : "",
        custom_input_schema: "{}",
      });
      setUserEditableFields(template.user_editable_fields || []);
      setHiddenFieldDefaults(template.hidden_field_defaults || {});
      setPresetValues(template.preset_parameters || {});
      
      if (template.model_id && !isCustom) {
        fetchModelDetails(template.model_id);
      }
    } else {
      setOriginalId(null);
      setFormData({
        id: "",
        category: "",
        name: "",
        description: "",
        model_id: "",
        preset_parameters: "{}",
        enhancement_instruction: "",
        thumbnail_url: "",
        before_image_url: "",
        after_image_url: "",
        display_order: "0",
        estimated_time_seconds: "",
        is_custom_model: false,
        custom_model_id: "",
        custom_input_schema: "{}",
      });
      setUserEditableFields([]);
      setHiddenFieldDefaults({});
      setPresetValues({});
      setSelectedModel(null);
    }
  }, [template, open]);

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("id, model_name, input_schema, record_id")
        .eq("is_active", true)
        .order("model_name");

      if (error) throw error;
      setModels((data || []).map(m => ({
        ...m,
        input_schema: jsonToSchema(m.input_schema)
      })));
    } catch (error) {
      logger.error('Template models fetch failed', error as Error, {
        component: 'TemplateFormDialog',
        operation: 'fetchModels'
      });
      toast.error("Failed to load models");
    }
  };

  const fetchModelDetails = async (modelId: string) => {
    try {
      const { data, error } = await supabase
        .from("ai_models")
        .select("*")
        .eq("id", modelId)
        .single();

      if (error) throw error;
      setSelectedModel(data ? { ...data, input_schema: jsonToSchema(data.input_schema) } : null);
    } catch (error) {
      logger.error('Model details fetch failed', error as Error, {
        component: 'TemplateFormDialog',
        modelId,
        operation: 'fetchModelDetails'
      });
    }
  };

  const handleModelChange = (modelId: string) => {
    setFormData({ ...formData, model_id: modelId });
    const model = models.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      setParamConfigOpen(true);
    }
  };

  const handleCustomModelToggle = (enabled: boolean) => {
    setFormData({ 
      ...formData, 
      is_custom_model: enabled,
      model_id: enabled ? formData.custom_model_id : "",
    });
    if (!enabled) {
      setSelectedModel(null);
      setUserEditableFields([]);
      setHiddenFieldDefaults({});
      setPresetValues({});
    }
  };

  const handleParameterConfigChange = (config: {
    userEditableFields: string[];
    hiddenFieldDefaults: Record<string, any>;
    presetValues: Record<string, any>;
  }) => {
    setUserEditableFields(config.userEditableFields);
    setHiddenFieldDefaults(config.hiddenFieldDefaults);
    setPresetValues(config.presetValues);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let customSchema = null;
      if (formData.is_custom_model) {
        try {
          customSchema = JSON.parse(formData.custom_input_schema);
        } catch {
          toast.error("Invalid JSON in Custom Input Schema");
          setSaving(false);
          return;
        }
      }

      const data = {
        id: formData.id,
        category: formData.category,
        name: formData.name,
        description: formData.description || null,
        model_id: formData.is_custom_model ? formData.custom_model_id : formData.model_id || null,
        preset_parameters: presetValues,
        user_editable_fields: userEditableFields,
        hidden_field_defaults: hiddenFieldDefaults,
        is_custom_model: formData.is_custom_model,
        enhancement_instruction: formData.enhancement_instruction || null,
        thumbnail_url: formData.thumbnail_url || null,
        before_image_url: formData.before_image_url || null,
        after_image_url: formData.after_image_url || null,
        display_order: parseInt(formData.display_order),
        is_active: true,
        estimated_time_seconds: formData.estimated_time_seconds ? parseInt(formData.estimated_time_seconds) : null,
      };

      if (template) {
        // Check if ID has changed
        const idChanged = originalId !== formData.id;
        
        if (idChanged) {
          // ID changed: delete old, insert new
          const { error: deleteError } = await supabase
            .from("content_templates")
            .delete()
            .eq("id", originalId!);

          if (deleteError) throw deleteError;

          const { error: insertError } = await supabase
            .from("content_templates")
            .insert(data);

          if (insertError) throw insertError;
          toast.success("Template ID updated successfully");
        } else {
          // ID unchanged: normal update
          const { error } = await supabase
            .from("content_templates")
            .update(data)
            .eq("id", template.id);

          if (error) throw error;
          toast.success("Template updated successfully");
        }
      } else {
        const { error } = await supabase.from("content_templates").insert(data);

        if (error) throw error;
        toast.success("Template created successfully");
      }

      onSuccess();
    } catch (error: any) {
      logger.error('Template save operation failed', error, {
        component: 'TemplateFormDialog',
        isNewTemplate: !template,
        templateId: template?.id,
        operation: 'saveTemplate'
      });
      toast.error(error.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const getInputSchema = () => {
    if (formData.is_custom_model) {
      try {
        return JSON.parse(formData.custom_input_schema);
      } catch {
        return null;
      }
    }
    return selectedModel?.input_schema || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {template ? "Edit Template" : "Add New Template"}
          </DialogTitle>
          <DialogDescription>
            Configure content template and control which parameters users can edit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Collapsible open={basicInfoOpen} onOpenChange={setBasicInfoOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <ChevronDown className={cn("h-5 w-5 transition-transform", basicInfoOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="id">Template ID *</Label>
                  <Input
                    id="id"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="IMG-001"
                    required
                  />
                  {template && originalId !== formData.id && (
                    <p className="text-xs text-amber-600">
                      ⚠️ Changing ID will create a new template and remove the old one
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Fantasy">Fantasy</SelectItem>
                      <SelectItem value="Portraits">Portraits</SelectItem>
                      <SelectItem value="Abstract">Abstract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Portrait Headshots"
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Professional headshot generation with studio lighting"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_order">Display Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    placeholder="0"
                    min="0"
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
                    className="flex-1"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.estimated_time_seconds
                      ? `${formData.estimated_time_seconds}s`
                      : 'Enter time in seconds'}
                  </p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
                  <Input
                    id="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="before_image_url">Before Image URL (for comparison slider)</Label>
                  <Input
                    id="before_image_url"
                    value={formData.before_image_url}
                    onChange={(e) => setFormData({ ...formData, before_image_url: e.target.value })}
                    placeholder="https://example.com/before.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="after_image_url">After Image URL (for comparison slider)</Label>
                  <Input
                    id="after_image_url"
                    value={formData.after_image_url}
                    onChange={(e) => setFormData({ ...formData, after_image_url: e.target.value })}
                    placeholder="https://example.com/after.jpg"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="enhancement_instruction">Prompt Enhancement Instruction</Label>
                  <Textarea
                    id="enhancement_instruction"
                    value={formData.enhancement_instruction}
                    onChange={(e) => setFormData({ ...formData, enhancement_instruction: e.target.value })}
                    placeholder="Transform this into a professional portrait headshot prompt..."
                    rows={3}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={paramConfigOpen} onOpenChange={setParamConfigOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/50 rounded-lg hover:bg-muted">
              <h3 className="text-lg font-semibold">Model & Parameter Configuration</h3>
              <ChevronDown className={cn("h-5 w-5 transition-transform", paramConfigOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="custom_model_toggle" className="text-sm font-semibold">
                    Use Custom Model
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Enable to use a model not in the predefined list
                  </p>
                </div>
                <Switch
                  id="custom_model_toggle"
                  checked={formData.is_custom_model}
                  onCheckedChange={handleCustomModelToggle}
                />
              </div>

              {formData.is_custom_model ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom_model_id">Custom Model ID *</Label>
                    <Input
                      id="custom_model_id"
                      value={formData.custom_model_id}
                      onChange={(e) => setFormData({ ...formData, custom_model_id: e.target.value, model_id: e.target.value })}
                      placeholder="custom-model-id"
                      required={formData.is_custom_model}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom_input_schema">Custom Input Schema (JSON) *</Label>
                    <Textarea
                      id="custom_input_schema"
                      value={formData.custom_input_schema}
                      onChange={(e) => setFormData({ ...formData, custom_input_schema: e.target.value })}
                      placeholder='{"type": "object", "properties": {...}, "required": [...]}'
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Define the input schema in JSON Schema format
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="model_id">AI Model *</Label>
                  <Select value={formData.model_id} onValueChange={handleModelChange}>
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
              )}

              {getInputSchema() && (
                <ParameterConfigurator
                  inputSchema={getInputSchema()}
                  userEditableFields={userEditableFields}
                  hiddenFieldDefaults={hiddenFieldDefaults}
                  presetValues={presetValues}
                  onConfigChange={handleParameterConfigChange}
                />
              )}
            </CollapsibleContent>
          </Collapsible>

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
