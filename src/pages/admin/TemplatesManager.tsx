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
import { WorkflowBuilder } from "@/components/admin/WorkflowBuilder";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useModels } from "@/hooks/useModels";
import { WorkflowEditorDialog } from "@/components/admin/workflow/WorkflowEditorDialog";

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  
  // Extract unique categories with counts
  const uniqueCategories = Array.from(new Set(templates.map(t => t.category))).sort();
  const categoryCounts = uniqueCategories.reduce((acc, cat) => {
    acc[cat] = templates.filter(t => t.category === cat).length;
    return acc;
  }, {} as Record<string, number>);
  
  // Toggle category filter
  const handleCategoryToggle = (category: string) => {
    if (category === 'All') {
      setSelectedCategories(['All']);
    } else {
      setSelectedCategories(prev => {
        const withoutAll = prev.filter(c => c !== 'All');
        if (withoutAll.includes(category)) {
          const filtered = withoutAll.filter(c => c !== category);
          return filtered.length === 0 ? ['All'] : filtered;
        } else {
          return [...withoutAll, category];
        }
      });
    }
  };

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

    console.log(`Attempting to delete ${item.template_type} with ID: ${item.id} from table: ${table}`);

    try {
      const { error, data } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id)
        .select();

      console.log('Delete response:', { error, data });

      if (error) {
        console.error("Delete error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      toast.success("Template deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error(`Failed to delete template: ${error.message || 'Unknown error'}`);
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
        model_record_id: ('model_record_id' in item ? item.model_record_id as string : null) || null,
        before_image_url: item.before_image_url || null,
        after_image_url: item.after_image_url || null,
      };
      
      const { error } = await supabase
        .from('content_templates')
        .insert([newTemplate]);
        
      if (error) {
        toast.error("Failed to duplicate template: " + error.message);
        return;
      }
      
      toast.success("Template duplicated - now editing copy");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
      
      // Auto-open edit dialog with the duplicated template
      setContentTemplateDialog({ open: true, template: newTemplate });
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
        before_image_url: item.before_image_url || null,
        after_image_url: item.after_image_url || null,
        is_active: false,
        display_order: item.display_order || 0,
        estimated_time_seconds: item.estimated_time_seconds || null,
        workflow_steps: item.workflow_steps as any || [],
        user_input_fields: item.user_input_fields as any || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('workflow_templates')
        .insert([newWorkflow]);
        
      if (error) {
        toast.error("Failed to duplicate workflow: " + error.message);
        return;
      }
      
      toast.success("Workflow duplicated - now editing copy");
      queryClient.invalidateQueries({ queryKey: ['all-templates-admin'] });
      
      // Auto-open edit dialog with the duplicated workflow
      setWorkflowDialog({ 
        open: true, 
        workflow: newWorkflow as WorkflowTemplate, 
        isNew: false 
      });
    }
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

  // Filter by category
  const showAllCategories = selectedCategories.includes('All');
  const filteredTemplates = showAllCategories 
    ? templates 
    : templates.filter(t => selectedCategories.includes(t.category));
  
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
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
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <CardTitle>All Templates ({filteredTemplates.length})</CardTitle>
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
          
          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategories.includes('All') ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryToggle('All')}
              className={selectedCategories.includes('All') ? 'border-2 border-black' : 'border-2'}
            >
              All ({templates.length})
            </Button>
            {uniqueCategories.map(category => (
              <Button
                key={category}
                variant={selectedCategories.includes(category) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryToggle(category)}
                className={selectedCategories.includes(category) ? 'border-2 border-black' : 'border-2'}
              >
                {category} ({categoryCounts[category]})
              </Button>
            ))}
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

