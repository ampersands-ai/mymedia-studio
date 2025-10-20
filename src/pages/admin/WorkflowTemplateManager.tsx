import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { WorkflowStepForm } from '@/components/admin/WorkflowStepForm';
import { WorkflowVisualPreview } from '@/components/admin/WorkflowVisualPreview';
import { WorkflowTestDialog } from '@/components/admin/WorkflowTestDialog';
import { WorkflowStep, UserInputField, WorkflowTemplate } from '@/hooks/useWorkflowTemplates';
import { useModels } from '@/hooks/useModels';
import { Plus, Pencil, Trash2, Save, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function WorkflowTemplateManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: models = [] } = useModels();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [testingWorkflow, setTestingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflow-templates-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        workflow_steps: item.workflow_steps as unknown as WorkflowStep[],
        user_input_fields: item.user_input_fields as unknown as UserInputField[],
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (workflow: Partial<WorkflowTemplate>) => {
      const insertData: any = {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        category: workflow.category,
        thumbnail_url: workflow.thumbnail_url,
        is_active: workflow.is_active,
        display_order: workflow.display_order,
        estimated_time_seconds: workflow.estimated_time_seconds,
        workflow_steps: workflow.workflow_steps || [],
        user_input_fields: workflow.user_input_fields || [],
      };
      
      const { error } = await supabase
        .from('workflow_templates')
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates-admin'] });
      toast({ title: 'Workflow created successfully' });
      setIsCreating(false);
    },
    onError: (error) => {
      toast({ title: 'Failed to create workflow', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WorkflowTemplate> }) => {
      const updateData: any = {
        name: updates.name,
        description: updates.description,
        category: updates.category,
        thumbnail_url: updates.thumbnail_url,
        is_active: updates.is_active,
        display_order: updates.display_order,
        estimated_time_seconds: updates.estimated_time_seconds,
        workflow_steps: updates.workflow_steps || [],
        user_input_fields: updates.user_input_fields || [],
      };
      
      const { error } = await supabase
        .from('workflow_templates')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates-admin'] });
      toast({ title: 'Workflow updated successfully' });
      setEditingWorkflow(null);
    },
    onError: (error) => {
      toast({ title: 'Failed to update workflow', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates-admin'] });
      toast({ title: 'Workflow deleted successfully' });
    },
  });

  const WorkflowEditor = ({ workflow, isNew }: { workflow: Partial<WorkflowTemplate>; isNew: boolean }) => {
    const [localWorkflow, setLocalWorkflow] = useState<Partial<WorkflowTemplate>>(workflow);

    const handleSave = () => {
      if (isNew) {
        createMutation.mutate(localWorkflow);
      } else {
        updateMutation.mutate({ id: workflow.id!, updates: localWorkflow });
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
      // Renumber remaining steps
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
      <div className="space-y-6">
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Workflow ID</Label>
              <Input
                value={localWorkflow.id || ''}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, id: e.target.value })}
                placeholder="unique-workflow-id"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={localWorkflow.category || ''}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, category: e.target.value })}
                placeholder="e.g., Image Processing"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={localWorkflow.display_order || 0}
                onChange={(e) => setLocalWorkflow({ ...localWorkflow, display_order: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Form Section (60%) */}
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

            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Workflow
            </Button>
          </div>

          {/* Right: Visual Preview (40%) */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <WorkflowVisualPreview
                userInputFields={localWorkflow.user_input_fields || []}
                steps={localWorkflow.workflow_steps || []}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Workflow Templates</h1>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{workflow.name}</h3>
                <p className="text-sm text-muted-foreground">{workflow.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {workflow.workflow_steps.length} steps • {workflow.category}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTestingWorkflow(workflow);
                    setTestDialogOpen(true);
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingWorkflow(workflow)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(workflow.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent className="w-[90vw] h-[90vh] !max-w-[90vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <WorkflowEditor
            workflow={{
              workflow_steps: [],
              user_input_fields: [],
              is_active: true,
              display_order: 0,
            }}
            isNew
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingWorkflow} onOpenChange={(open) => !open && setEditingWorkflow(null)}>
        <DialogContent className="w-[90vw] h-[90vh] !max-w-[90vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          {editingWorkflow && <WorkflowEditor workflow={editingWorkflow} isNew={false} />}
        </DialogContent>
      </Dialog>

      <WorkflowTestDialog
        workflow={testingWorkflow}
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
      />
    </div>
  );
}
