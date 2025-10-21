import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Power, PowerOff, Trash2, ArrowUpDown, Copy, Play, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TemplateFormDialog } from "@/components/admin/TemplateFormDialog";
import { WorkflowTestDialog } from "@/components/admin/WorkflowTestDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { MergedTemplate } from "@/hooks/useTemplates";
import { WorkflowStepForm } from "@/components/admin/WorkflowStepForm";
import { WorkflowVisualPreview } from "@/components/admin/WorkflowVisualPreview";
import { WorkflowStep, UserInputField, WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useModels } from "@/hooks/useModels";

export default function TemplatesManager() {
  const queryClient = useQueryClient();
  const { data: models = [] } = useModels();
  
  // Fetch ALL templates for admin (not just active ones)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["all-templates-admin"],
    queryFn: async () => {
      // Fetch content templates
      const { data: contentTemplates, error: templatesError } = await supabase
        .from("content_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (templatesError) throw templatesError;

      // Fetch workflow templates
      const { data: workflowTemplates, error: workflowsError } = await supabase
        .from("workflow_templates")
        .select("*")
        .order("display_order", { ascending: true });

      if (workflowsError) throw workflowsError;

      // Merge and mark type
      const mergedTemplates = [
        ...(contentTemplates || []).map(t => ({ 
          ...t, 
          template_type: 'template' as const,
        })),
        ...(workflowTemplates || []).map(w => ({ 
          ...w, 
          template_type: 'workflow' as const,
        })),
      ] as MergedTemplate[];

      // Sort by display_order
      mergedTemplates.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      return mergedTemplates;
    },
  });
  
  const [contentTemplateDialog, setContentTemplateDialog] = useState<{
    open: boolean;
    template: any | null;
  }>({ open: false, template: null });
  
  const [workflowDialog, setWorkflowDialog] = useState<{
    open: boolean;
    workflow: Partial<WorkflowTemplate> | null;
    isNew: boolean;
  }>({ open: false, workflow: null, isNew: false });
  
  const [testingWorkflow, setTestingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("display_order");

  const handleToggleActive = async (item: MergedTemplate) => {
    const table = item.template_type === 'template' 
      ? 'content_templates' 
      : 'workflow_templates';
    
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      
      toast.success(`Template ${!item.is_active ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      console.error("Error toggling template status:", error);
      toast.error("Failed to update template status");
    }
  };

  const handleDelete = async (item: MergedTemplate) => {
    if (!confirm("Are you sure you want to delete this template? This cannot be undone.")) {
      return;
    }

    const table = item.template_type === 'template' 
      ? 'content_templates' 
      : 'workflow_templates';

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleDuplicate = async (item: MergedTemplate) => {
    const timestamp = Date.now();
    
    if (item.template_type === 'template') {
      const { workflow_steps, user_input_fields, template_type, ai_models, ...templateData } = item;
      
      // Ensure required fields are present
      if (!item.category || !item.name) {
        toast.error("Cannot duplicate: missing required fields");
        return;
      }
      
      const newTemplate = {
        id: `${item.id}-copy-${timestamp}`,
        name: `${item.name} (Copy)`,
        category: item.category!,
        description: item.description || null,
        model_id: item.model_id || null,
        preset_parameters: item.preset_parameters || {},
        enhancement_instruction: item.enhancement_instruction || null,
        thumbnail_url: item.thumbnail_url || null,
        is_active: false,
        display_order: item.display_order || 0,
        estimated_time_seconds: item.estimated_time_seconds || null,
        user_editable_fields: item.user_editable_fields as any || [],
        hidden_field_defaults: item.hidden_field_defaults as any || {},
        is_custom_model: item.is_custom_model || false,
      };
      
      const { error } = await supabase
        .from('content_templates')
        .insert([newTemplate]);
        
      if (error) {
        toast.error("Failed to duplicate template: " + error.message);
        return;
      }
      
      toast.success("Template duplicated successfully");
    } else {
      // Ensure required fields are present
      if (!item.category || !item.name) {
        toast.error("Cannot duplicate: missing required fields");
        return;
      }
      
      const newWorkflow = {
        id: `${item.id}-copy-${timestamp}`,
        name: `${item.name} (Copy)`,
        category: item.category!,
        description: item.description || null,
        thumbnail_url: item.thumbnail_url || null,
        is_active: false,
        display_order: item.display_order || 0,
        estimated_time_seconds: item.estimated_time_seconds || null,
        workflow_steps: item.workflow_steps as any || [],
        user_input_fields: item.user_input_fields as any || [],
      };
      
      const { error } = await supabase
        .from('workflow_templates')
        .insert([newWorkflow]);
        
      if (error) {
        toast.error("Failed to duplicate workflow: " + error.message);
        return;
      }
      
      toast.success("Workflow duplicated successfully");
    }
    
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
  };

  const handleEdit = (item: MergedTemplate) => {
    if (item.template_type === 'template') {
      setContentTemplateDialog({ open: true, template: item });
    } else {
      setWorkflowDialog({ 
        open: true, 
        workflow: item as WorkflowTemplate, 
        isNew: false 
      });
    }
  };

  const handleCreateContent = () => {
    setContentTemplateDialog({ open: true, template: null });
  };

  const handleCreateWorkflow = () => {
    setWorkflowDialog({ 
      open: true, 
      workflow: {
        id: '',
        name: '',
        description: '',
        category: '',
        is_active: false,
        display_order: templates.length,
        workflow_steps: [],
        user_input_fields: [],
      }, 
      isNew: true 
    });
  };

  const handleContentSuccess = () => {
    setContentTemplateDialog({ open: false, template: null });
    queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
  };

  const handleEnableAll = async () => {
    try {
      await Promise.all([
        supabase.from('content_templates').update({ is_active: true }).neq('is_active', true),
        supabase.from('workflow_templates').update({ is_active: true }).neq('is_active', true),
      ]);
      
      toast.success("All templates enabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      console.error("Error enabling all templates:", error);
      toast.error("Failed to enable all templates");
    }
  };

  const handleDisableAll = async () => {
    if (!confirm("Are you sure you want to disable all templates?")) return;

    try {
      await Promise.all([
        supabase.from('content_templates').update({ is_active: false }).eq('is_active', true),
        supabase.from('workflow_templates').update({ is_active: false }).eq('is_active', true),
      ]);
      
      toast.success("All templates disabled");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error) {
      console.error("Error disabling all templates:", error);
      toast.error("Failed to disable all templates");
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "category":
        return a.category.localeCompare(b.category);
      case "display_order":
        return a.display_order - b.display_order;
      case "status":
        return (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
      case "type":
        return a.template_type.localeCompare(b.template_type);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black mb-2">TEMPLATES</h1>
          <p className="text-muted-foreground">
            Manage all content templates and workflows
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleCreateContent}>
              Content Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateWorkflow}>
              Workflow Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="border-3 border-black brutal-shadow">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Templates ({templates.length})</CardTitle>
            <div className="flex gap-2 items-center">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display_order">Display Order</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableAll}
                className="border-2"
              >
                <Power className="h-4 w-4 mr-2" />
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableAll}
                className="border-2"
              >
                <PowerOff className="h-4 w-4 mr-2" />
                Disable All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No templates configured yet
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold border-3 border-black brutal-shadow">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Template
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleCreateContent}>
                    Content Template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateWorkflow}>
                    Workflow Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">ID</TableHead>
                  <TableHead className="font-bold">Name</TableHead>
                  <TableHead className="font-bold">Category</TableHead>
                  <TableHead className="font-bold">Order</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTemplates.map((template) => (
                  <TableRow key={`${template.template_type}-${template.id}`}>
                    <TableCell>
                      {template.template_type === 'template' ? (
                        <Badge variant="secondary">Content</Badge>
                      ) : (
                        <Badge className="bg-purple-500">Workflow</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {template.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>{template.category}</TableCell>
                    <TableCell>{template.display_order}</TableCell>
                    <TableCell>
                      {template.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {template.template_type === 'workflow' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTestingWorkflow(template as WorkflowTemplate);
                              setTestDialogOpen(true);
                            }}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(template)}
                        >
                          {template.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TemplateFormDialog
        open={contentTemplateDialog.open}
        onOpenChange={(open) => setContentTemplateDialog({ ...contentTemplateDialog, open })}
        template={contentTemplateDialog.template}
        onSuccess={handleContentSuccess}
      />

      <WorkflowEditorDialog
        open={workflowDialog.open}
        onOpenChange={(open) => setWorkflowDialog({ ...workflowDialog, open })}
        workflow={workflowDialog.workflow}
        isNew={workflowDialog.isNew}
        models={models}
      onSuccess={() => {
        setWorkflowDialog({ open: false, workflow: null, isNew: false });
        queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
      }}
      />

      {testingWorkflow && (
        <WorkflowTestDialog
          open={testDialogOpen}
          onOpenChange={setTestDialogOpen}
          workflow={testingWorkflow}
        />
      )}
    </div>
  );
}

// Workflow Editor Dialog Component
function WorkflowEditorDialog({ 
  open, 
  onOpenChange, 
  workflow, 
  isNew,
  models,
  onSuccess 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Partial<WorkflowTemplate> | null;
  isNew: boolean;
  models: any[];
  onSuccess: () => void;
}) {
  const [localWorkflow, setLocalWorkflow] = useState<Partial<WorkflowTemplate>>(workflow || {});
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null);
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const [workflowRes, contentRes] = await Promise.all([
        supabase.from('workflow_templates').select('category'),
        supabase.from('content_templates').select('category')
      ]);
      
      const allCategories = new Set<string>();
      workflowRes.data?.forEach(t => allCategories.add(t.category));
      contentRes.data?.forEach(t => allCategories.add(t.category));
      
      setExistingCategories(Array.from(allCategories).sort());
    };
    
    if (open) {
      fetchCategories();
      setLocalWorkflow(workflow || {});
      setShowCustomCategory(false);
      // Reset image upload states
      setBeforeImageFile(null);
      setAfterImageFile(null);
      setBeforeImagePreview(null);
      setAfterImagePreview(null);
    }
  }, [open, workflow]);

  const handleImageUpload = async (file: File, type: 'before' | 'after') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'before') {
        setBeforeImagePreview(reader.result as string);
      } else {
        setAfterImagePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Store file for later upload
    if (type === 'before') {
      setBeforeImageFile(file);
    } else {
      setAfterImageFile(file);
    }
  };

  const uploadImageToStorage = async (file: File, type: 'before' | 'after'): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `templates/${type}/${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload ${type} image`);
        return null;
      }

      // Get public URL
      const { data: urlData } = await supabase.storage
        .from('generated-content')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${type} image`);
      return null;
    }
  };

  const createMutation = useMutation({
    mutationFn: async (wf: Partial<WorkflowTemplate>) => {
      setUploadingImages(true);
      
      // Upload images if files are selected
      let beforeUrl = wf.before_image_url;
      let afterUrl = wf.after_image_url;
      
      if (beforeImageFile) {
        beforeUrl = await uploadImageToStorage(beforeImageFile, 'before');
      }
      if (afterImageFile) {
        afterUrl = await uploadImageToStorage(afterImageFile, 'after');
      }
      
      setUploadingImages(false);

      const { error } = await supabase
        .from('workflow_templates')
        .insert([{
          id: wf.id,
          name: wf.name,
          description: wf.description,
          category: wf.category,
          thumbnail_url: wf.thumbnail_url,
          before_image_url: beforeUrl,
          after_image_url: afterUrl,
          is_active: wf.is_active,
          display_order: wf.display_order,
          estimated_time_seconds: wf.estimated_time_seconds,
          workflow_steps: wf.workflow_steps as any || [],
          user_input_fields: wf.user_input_fields as any || [],
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workflow created successfully");
      // Reset image states
      setBeforeImageFile(null);
      setAfterImageFile(null);
      setBeforeImagePreview(null);
      setAfterImagePreview(null);
      onSuccess();
    },
    onError: (error: any) => {
      setUploadingImages(false);
      toast.error("Failed to create workflow: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkflowTemplate> }) => {
      setUploadingImages(true);
      
      // Upload new images if files are selected
      let beforeUrl = updates.before_image_url;
      let afterUrl = updates.after_image_url;
      
      if (beforeImageFile) {
        beforeUrl = await uploadImageToStorage(beforeImageFile, 'before');
      }
      if (afterImageFile) {
        afterUrl = await uploadImageToStorage(afterImageFile, 'after');
      }
      
      setUploadingImages(false);

      const { error } = await supabase
        .from('workflow_templates')
        .update({
          name: updates.name,
          description: updates.description,
          category: updates.category,
          thumbnail_url: updates.thumbnail_url,
          before_image_url: beforeUrl,
          after_image_url: afterUrl,
          is_active: updates.is_active,
          display_order: updates.display_order,
          estimated_time_seconds: updates.estimated_time_seconds,
          workflow_steps: updates.workflow_steps as any || [],
          user_input_fields: updates.user_input_fields as any || [],
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Workflow updated successfully");
      // Reset image states
      setBeforeImageFile(null);
      setAfterImageFile(null);
      setBeforeImagePreview(null);
      setAfterImagePreview(null);
      onSuccess();
    },
    onError: (error: any) => {
      setUploadingImages(false);
      toast.error("Failed to update workflow: " + error.message);
    },
  });

  const handleSave = () => {
    if (isNew) {
      createMutation.mutate(localWorkflow);
    } else {
      updateMutation.mutate({ id: workflow?.id!, updates: localWorkflow });
    }
  };

  const handleStepUpdate = (index: number, updatedStep: WorkflowStep) => {
    const steps = [...(localWorkflow.workflow_steps || [])];
    steps[index] = updatedStep;
    setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
  };

  const handleStepDelete = (index: number) => {
    const steps = [...(localWorkflow.workflow_steps || [])];
    steps.splice(index, 1);
    steps.forEach((step, idx) => {
      step.step_number = idx + 1;
    });
    setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
  };

  const addNewStep = () => {
    const steps = [...(localWorkflow.workflow_steps || [])];
    const newStep: WorkflowStep = {
      step_number: steps.length + 1,
      step_name: `Step ${steps.length + 1}`,
      model_id: models[0]?.id || '',
      model_record_id: models[0]?.record_id || '',
      prompt_template: '',
      parameters: {},
      input_mappings: {},
      output_key: `output_${steps.length + 1}`,
    };
    steps.push(newStep);
    setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
  };

  const addUserField = () => {
    const fields = [...(localWorkflow.user_input_fields || [])];
    fields.push({
      name: `field_${fields.length + 1}`,
      type: 'text',
      label: 'New Field',
      required: false,
    });
    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
  };

  const updateUserField = (idx: number, updates: Partial<UserInputField>) => {
    const fields = [...(localWorkflow.user_input_fields || [])];
    fields[idx] = { ...fields[idx], ...updates };
    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
  };

  const deleteUserField = (idx: number) => {
    const fields = [...(localWorkflow.user_input_fields || [])];
    fields.splice(idx, 1);
    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Create' : 'Edit'} Workflow Template</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workflow ID</Label>
                <Input
                  value={localWorkflow.id || ''}
                  onChange={(e) => setLocalWorkflow({ ...localWorkflow, id: e.target.value })}
                  placeholder="unique-workflow-id"
                  disabled={!isNew}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={localWorkflow.name || ''}
                  onChange={(e) => setLocalWorkflow({ ...localWorkflow, name: e.target.value })}
                  placeholder="Workflow Name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={localWorkflow.description || ''}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, description: e.target.value })}
                placeholder="Describe this workflow..."
              />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={localWorkflow.thumbnail_url || ''}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, thumbnail_url: e.target.value })}
                placeholder="/placeholder.svg"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default placeholder image
              </p>
            </div>

            <div className="space-y-4">
              <Label>Before/After Images (for comparison slider)</Label>
              
              {/* Before Image */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Before Image</Label>
                </div>
                
                {beforeImagePreview || localWorkflow.before_image_url ? (
                  <div className="relative">
                    <img
                      src={beforeImagePreview || localWorkflow.before_image_url || ''}
                      alt="Before preview"
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setBeforeImageFile(null);
                        setBeforeImagePreview(null);
                        setLocalWorkflow({ ...localWorkflow, before_image_url: '' });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'before');
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground self-center">or</span>
                    <Input
                      value={localWorkflow.before_image_url || ''}
                      onChange={(e) => setLocalWorkflow({ ...localWorkflow, before_image_url: e.target.value })}
                      placeholder="Enter URL"
                      className="flex-1"
                    />
                  </div>
                )}
              </div>

              {/* After Image */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">After Image</Label>
                </div>
                
                {afterImagePreview || localWorkflow.after_image_url ? (
                  <div className="relative">
                    <img
                      src={afterImagePreview || localWorkflow.after_image_url || ''}
                      alt="After preview"
                      className="w-full h-32 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setAfterImageFile(null);
                        setAfterImagePreview(null);
                        setLocalWorkflow({ ...localWorkflow, after_image_url: '' });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, 'after');
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground self-center">or</span>
                    <Input
                      value={localWorkflow.after_image_url || ''}
                      onChange={(e) => setLocalWorkflow({ ...localWorkflow, after_image_url: e.target.value })}
                      placeholder="Enter URL"
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                {!showCustomCategory ? (
                  <Select
                    value={localWorkflow.category || ''}
                    onValueChange={(value) => {
                      if (value === '__custom__') {
                        setShowCustomCategory(true);
                        setLocalWorkflow({ ...localWorkflow, category: '' });
                      } else {
                        setLocalWorkflow({ ...localWorkflow, category: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        <span className="flex items-center gap-2">
                          <Plus className="h-3 w-3" />
                          Create new category
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={localWorkflow.category || ''}
                      onChange={(e) => setLocalWorkflow({ ...localWorkflow, category: e.target.value })}
                      placeholder="Enter new category name"
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomCategory(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {showCustomCategory 
                    ? 'Enter a new category name or click Cancel to select existing'
                    : 'Select existing category or create new'}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={localWorkflow.display_order || 0}
                  onChange={(e) => setLocalWorkflow({ ...localWorkflow, display_order: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 pb-2">
                  <Checkbox
                    checked={localWorkflow.is_active || false}
                    onCheckedChange={(checked) => setLocalWorkflow({ ...localWorkflow, is_active: checked as boolean })}
                  />
                  <span className="text-sm">Active</span>
                </label>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">User Input Fields</h3>
                  <Button onClick={addUserField} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
                <div className="space-y-3">
                  {(localWorkflow.user_input_fields || []).map((field, idx) => (
                    <Card key={idx} className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Field Name</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateUserField(idx, { name: e.target.value })}
                            placeholder="field_name"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => updateUserField(idx, { label: e.target.value })}
                            placeholder="Field Label"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => updateUserField(idx, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="upload-image">Upload Image</SelectItem>
                              <SelectItem value="upload-file">Upload File</SelectItem>
                              <SelectItem value="select">Select Dropdown</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                              <SelectItem value="radio">Radio Buttons</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 flex items-end">
                          <label className="flex items-center gap-2 pb-2">
                            <Checkbox
                              checked={field.required || false}
                              onCheckedChange={(checked) => updateUserField(idx, { required: checked as boolean })}
                            />
                            <span className="text-xs">Required</span>
                          </label>
                        </div>
                      </div>

                      {(field.type === 'select' || field.type === 'radio') && (
                        <div className="space-y-1">
                          <Label className="text-xs">Options (comma-separated)</Label>
                          <Input
                            value={(field.options || []).join(', ')}
                            onChange={(e) => {
                              const options = e.target.value.split(',').map(opt => opt.trim()).filter(Boolean);
                              updateUserField(idx, { options });
                            }}
                            placeholder="Option 1, Option 2, Option 3"
                          />
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUserField(idx)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Field
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Workflow Steps</h3>
                  <Button onClick={addNewStep} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
                {(localWorkflow.workflow_steps || []).map((step, idx) => (
                  <WorkflowStepForm
                    key={idx}
                    step={step}
                    stepNumber={idx + 1}
                    onChange={(updated) => handleStepUpdate(idx, updated)}
                    onDelete={() => handleStepDelete(idx)}
                    availableModels={models}
                    userInputFields={localWorkflow.user_input_fields || []}
                    previousSteps={(localWorkflow.workflow_steps || []).slice(0, idx)}
                  />
                ))}
                {(localWorkflow.workflow_steps || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No steps defined. Click "Add Step" to begin.
                  </p>
                )}
              </Card>
            </div>

            <div className="lg:col-span-2">
              <div className="sticky top-6">
                <WorkflowVisualPreview
                  userInputFields={localWorkflow.user_input_fields || []}
                  steps={localWorkflow.workflow_steps || []}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !localWorkflow.name ||
                !localWorkflow.category ||
                (localWorkflow.workflow_steps || []).length === 0 ||
                uploadingImages
              }
            >
              {uploadingImages ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Images...
                </>
              ) : (
                <>{isNew ? 'Create' : 'Update'} Workflow</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
