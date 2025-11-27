import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ALL_CATEGORIES } from "@/lib/admin/template-filtering";
import type { MergedTemplate } from "@/hooks/useTemplates";
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
import { Plus, Edit, Power, PowerOff, Trash2, ArrowUpDown, Copy, Play } from "lucide-react";
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
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useModels } from "@/hooks/useModels";
import { WorkflowEditorDialog } from "@/components/admin/workflow/WorkflowEditorDialog";
import type { TemplateSortBy } from "@/types/admin/workflow-editor";
import { useAllTemplatesAdmin } from "@/hooks/useTemplates";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";

export default function TemplatesManager() {
  const queryClient = useQueryClient();
  const { data: models = [] } = useModels();

  // Fetch ALL templates for admin (workflow templates only - content_templates deleted)
  const { data: templates = [] } = useAllTemplatesAdmin();

  // State management
  const [workflowDialog, setWorkflowDialog] = useState<{
    open: boolean;
    workflow: WorkflowTemplate | null;
    isNew: boolean;
  }>({
    open: false,
    workflow: null,
    isNew: false
  });
  
  const [testingWorkflow, setTestingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<TemplateSortBy>("display_order");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  
  // Workflow mutations (inline since useWorkflowMutations hook was removed)
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string, isActive: boolean }) => {
      const { error } = await supabase
        .from("workflow_templates")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      toast.success("Template updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update template", {
        description: error.message
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      toast.success("Template deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete template", {
        description: error.message
      });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: WorkflowTemplate) => {
      const newTemplate = {
        ...template,
        id: `${template.id}-copy-${Date.now()}`,
        name: `${template.name} (Copy)`,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      // Remove the created_at field since it's auto-generated
      delete (newTemplate as any).created_at;
      
      const { error } = await supabase
        .from("workflow_templates")
        .insert(newTemplate as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-templates-admin"] });
      toast.success("Template duplicated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to duplicate template", {
        description: error.message
      });
    }
  });

  const handleToggleActive = (template: WorkflowTemplate) => {
    toggleActiveMutation.mutate({
      id: template.id,
      isActive: !template.is_active
    });
  };

  const handleDelete = (template: WorkflowTemplate) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleDuplicate = (template: WorkflowTemplate) => {
    duplicateMutation.mutate(template as WorkflowTemplate);
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setWorkflowDialog({
      open: true,
      workflow: template as WorkflowTemplate | null,
      isNew: false
    });
  };

  const handleEnableAll = async () => {
    const updates = templates.map((t: MergedTemplate) => ({
      id: t.id,
      isActive: true
    }));
    for (const update of updates) {
      await toggleActiveMutation.mutateAsync(update);
    }
  };

  const handleDisableAll = async () => {
    const updates = templates.map((t: MergedTemplate) => ({
      id: t.id,
      isActive: false
    }));
    for (const update of updates) {
      await toggleActiveMutation.mutateAsync(update);
    }
  };
  
  // Extract unique categories with counts
  const uniqueCategories = Array.from(new Set(templates.map((t: MergedTemplate) => t.category))).sort() as string[];
  const categoryCounts = uniqueCategories.reduce((acc: Record<string, number>, cat: string) => {
    acc[cat] = templates.filter((t: MergedTemplate) => t.category === cat).length;
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

  // Event handlers

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
      } as unknown as WorkflowTemplate | null,
      isNew: true
    });
  };

  // Filter by category
  const showAllCategories = selectedCategories.includes(ALL_CATEGORIES);
  const filteredTemplates = showAllCategories
    ? templates
    : templates.filter((t: MergedTemplate) => t.category && selectedCategories.includes(t.category));
  
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
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as TemplateSortBy)}>
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
              variant={selectedCategories.includes(ALL_CATEGORIES) ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryToggle(ALL_CATEGORIES)}
              className={selectedCategories.includes(ALL_CATEGORIES) ? 'border-2 border-black' : 'border-2'}
            >
              {ALL_CATEGORIES} ({templates.length})
            </Button>
            {uniqueCategories.map((category: string) => (
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
                      <Badge className="bg-purple-500">Workflow</Badge>
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTestingWorkflow(template as any);
                            setTestDialogOpen(true);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
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

      <WorkflowEditorDialog
        open={workflowDialog.open}
        onOpenChange={(open) => setWorkflowDialog({ ...workflowDialog, open })}
        workflow={workflowDialog.workflow}
        isNew={workflowDialog.isNew}
        models={models || []}
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

