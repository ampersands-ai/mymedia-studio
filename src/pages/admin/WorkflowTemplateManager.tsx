import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { WorkflowBuilder } from '@/components/admin/WorkflowBuilder';
import { StepConfigPanel } from '@/components/admin/StepConfigPanel';
import { WorkflowStep, UserInputField, WorkflowTemplate } from '@/hooks/useWorkflowTemplates';
import { useModels } from '@/hooks/useModels';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function WorkflowTemplateManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: models = [] } = useModels();
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);

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

    const handleStepChange = (updatedStep: WorkflowStep) => {
      const steps = [...(localWorkflow.workflow_steps || [])];
      const index = steps.findIndex(s => s.step_number === updatedStep.step_number);
      if (index >= 0) {
        steps[index] = updatedStep;
        setLocalWorkflow({ ...localWorkflow, workflow_steps: steps });
      }
      setEditingStep(null);
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

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">User Input Fields</h3>
            <Button onClick={addUserField} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
          <div className="space-y-2">
            {(localWorkflow.user_input_fields || []).map((field, idx) => (
              <div key={idx} className="flex gap-2 items-center p-2 border rounded">
                <Input
                  value={field.name}
                  onChange={(e) => {
                    const fields = [...(localWorkflow.user_input_fields || [])];
                    fields[idx] = { ...field, name: e.target.value };
                    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
                  }}
                  placeholder="field_name"
                  className="flex-1"
                />
                <Input
                  value={field.label}
                  onChange={(e) => {
                    const fields = [...(localWorkflow.user_input_fields || [])];
                    fields[idx] = { ...field, label: e.target.value };
                    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
                  }}
                  placeholder="Field Label"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const fields = [...(localWorkflow.user_input_fields || [])];
                    fields.splice(idx, 1);
                    setLocalWorkflow({ ...localWorkflow, user_input_fields: fields });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <WorkflowBuilder
          steps={localWorkflow.workflow_steps || []}
          onStepsChange={(steps) => setLocalWorkflow({ ...localWorkflow, workflow_steps: steps })}
          userInputFields={localWorkflow.user_input_fields || []}
          availableModels={models}
          onEditStep={setEditingStep}
        />

        {editingStep && (
          <StepConfigPanel
            step={editingStep}
            onStepChange={handleStepChange}
            onClose={() => setEditingStep(null)}
            availableModels={models}
            userInputFields={localWorkflow.user_input_fields || []}
            allSteps={localWorkflow.workflow_steps || []}
          />
        )}

        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Workflow
        </Button>
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Workflow</DialogTitle>
          </DialogHeader>
          {editingWorkflow && <WorkflowEditor workflow={editingWorkflow} isNew={false} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
