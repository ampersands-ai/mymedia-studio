import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ALL_CATEGORIES } from "@/lib/admin/template-filtering";
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
import type { MergedTemplate } from "@/hooks/useTemplates";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useModels } from "@/hooks/useModels";
import { WorkflowEditorDialog } from "@/components/admin/workflow/WorkflowEditorDialog";
import { useWorkflowMutations } from "@/hooks/admin/workflow/useWorkflowMutations";
import type { TemplateSortBy } from "@/types/admin/workflow-editor";

export default function TemplatesManager() {
  const queryClient = useQueryClient();
  const { data: models = [] } = useModels();
  
  // Fetch ALL templates for admin (not just active ones)
  const { data: templates = [] } = useQuery({
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
  
  // State management
  const [contentTemplateDialog, setContentTemplateDialog] = useState({ 
    open: false, 
    template: null 
  });
  
  const [workflowDialog, setWorkflowDialog] = useState({ 
    open: false, 
    workflow: null, 
    isNew: false 
  });
  
  const [testingWorkflow, setTestingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<TemplateSortBy>("display_order");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['All']);
  
  // Mutations hook
  const {
    handleToggleActive,
    handleDelete,
    handleDuplicate,
    handleEdit,
    handleEnableAll,
    handleDisableAll,
  } = useWorkflowMutations({
    onEditContentTemplate: (state) => setContentTemplateDialog(state as any),
    onEditWorkflow: (state) => setWorkflowDialog(state as any),
  });
  
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

  // Event handlers

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

  // Filter by category
  const showAllCategories = selectedCategories.includes(ALL_CATEGORIES);
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

