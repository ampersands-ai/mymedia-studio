import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { ChevronDown, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParameterConfigurator } from "./ParameterConfigurator";

interface ContentTemplate {
  id: string;
  category: string;
  name: string;
  description: string | null;
  model_id: string | null;
  preset_parameters: Record<string, any>;
  user_editable_fields?: string[];
  hidden_field_defaults?: Record<string, any>;
  is_custom_model?: boolean;
  enhancement_instruction: string | null;
  thumbnail_url: string | null;
  is_active: boolean;
  display_order: number;
  estimated_time_minutes?: number | null;
}

interface AIModel {
  id: string;
  model_name: string;
  input_schema: any;
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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    is_custom_model: false,
    custom_model_id: "",
    custom_input_schema: "{}",
  });
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [userEditableFields, setUserEditableFields] = useState<string[]>([]);
  const [hiddenFieldDefaults, setHiddenFieldDefaults] = useState<Record<string, any>>({});
  const [presetValues, setPresetValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [basicInfoOpen, setBasicInfoOpen] = useState(true);
  const [paramConfigOpen, setParamConfigOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open]);

  useEffect(() => {
    if (template) {
      const isCustom = template.is_custom_model || false;
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
        is_custom_model: isCustom,
        custom_model_id: isCustom ? template.model_id || "" : "",
        custom_input_schema: "{}",
      });
      setUserEditableFields(template.user_editable_fields || []);
      setHiddenFieldDefaults(template.hidden_field_defaults || {});
      setUploadedImage(null);
      setImagePreview(template.thumbnail_url || "");
      setPresetValues(template.preset_parameters || {});
      
      if (template.model_id && !isCustom) {
        fetchModelDetails(template.model_id);
      }
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
        is_custom_model: false,
        custom_model_id: "",
        custom_input_schema: "{}",
      });
      setUserEditableFields([]);
      setHiddenFieldDefaults({});
      setUploadedImage(null);
      setImagePreview("");
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
      setModels(data || []);
    } catch (error) {
      console.error("Error fetching models:", error);
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
      setSelectedModel(data);
    } catch (error) {
      console.error("Error fetching model details:", error);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and WebP images are allowed");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploadedImage(file);
    setImagePreview(URL.createObjectURL(file));
    toast.success("Image selected");
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Upload thumbnail image if a new one was selected
      let thumbnailUrl = formData.thumbnail_url;
      if (uploadedImage && user?.id) {
        const timestamp = Date.now();
        const fileExt = uploadedImage.name.split('.').pop();
        const filePath = `templates/thumbnails/${timestamp}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('generated-content')
          .upload(filePath, uploadedImage, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          toast.error("Failed to upload thumbnail image");
          console.error('Upload error:', uploadError);
          setSaving(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('generated-content')
          .getPublicUrl(filePath);

        thumbnailUrl = publicUrl;
      }
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
        thumbnail_url: thumbnailUrl || null,
        display_order: parseInt(formData.display_order),
        is_active: true,
        estimated_time_minutes: formData.estimated_time_minutes ? parseInt(formData.estimated_time_minutes) : null,
      };

      if (template) {
        const { error } = await supabase
          .from("content_templates")
          .update(data)
          .eq("id", template.id);

        if (error) throw error;
        toast.success("Template updated successfully");
      } else {
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
                    disabled={!!template}
                  />
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
                  <Label htmlFor="estimated_time_minutes">Estimated Time</Label>
                  <div className="flex gap-2">
                    <Input
                      id="estimated_time_minutes"
                      type="number"
                      value={formData.estimated_time_minutes}
                      onChange={(e) => setFormData({ ...formData, estimated_time_minutes: e.target.value })}
                      placeholder="5"
                      min="0"
                      step="0.5"
                      className="flex-1"
                    />
                    <span className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
                      minutes
                    </span>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Thumbnail Image</Label>
                  
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Thumbnail preview" 
                        className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? "Change Image" : "Upload Image"}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground">
                    Recommended: Square image, max 5MB (JPEG, PNG, WebP)
                  </p>
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
