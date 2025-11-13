import { useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Settings } from 'lucide-react';
import { WorkflowStep, UserInputField } from '@/hooks/useWorkflowTemplates';
import { AIModel } from '@/hooks/useTemplates';

interface WorkflowBuilderProps {
  steps: WorkflowStep[];
  onStepsChange: (steps: WorkflowStep[]) => void;
  userInputFields: UserInputField[];
  availableModels: AIModel[];
  onEditStep: (step: WorkflowStep) => void;
}

// Custom node component for workflow steps
const StepNode = ({ data }: { data: { step: WorkflowStep; onEdit: (step: WorkflowStep) => void } }) => (
  <Card className="p-4 min-w-[200px] border-2 border-primary/20 hover:border-primary/40 transition-colors">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-sm">Step {data.step.step_number}</h4>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => data.onEdit(data.step)}
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
    <p className="text-xs text-muted-foreground mb-2">{data.step.step_name}</p>
    <div className="space-y-1">
      <p className="text-xs font-medium">Model: {data.step.model_id}</p>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {data.step.prompt_template}
      </p>
      <p className="text-xs text-primary">Output: {data.step.output_key}</p>
    </div>
  </Card>
);

const UserInputNode = ({ data }: { data: { fields: UserInputField[] } }) => (
  <Card className="p-4 min-w-[200px] border-2 border-blue-500/40 bg-blue-500/5">
    <h4 className="font-semibold text-sm mb-2">User Inputs</h4>
    <div className="space-y-1">
      {data.fields.map((field: UserInputField) => (
        <p key={field.name} className="text-xs">
          • {field.label} ({field.type})
        </p>
      ))}
    </div>
  </Card>
);

const OutputNode = ({ data }: { data: { outputKey?: string } }) => (
  <Card className="p-4 min-w-[200px] border-2 border-green-500/40 bg-green-500/5">
    <h4 className="font-semibold text-sm mb-2">Final Output</h4>
    <p className="text-xs text-muted-foreground">
      {data.outputKey || 'Result'}
    </p>
  </Card>
);

const nodeTypes: NodeTypes = {
  step: StepNode,
  userInput: UserInputNode,
  output: OutputNode,
};

export function WorkflowBuilder({
  steps,
  onStepsChange,
  userInputFields,
  availableModels,
  onEditStep,
}: WorkflowBuilderProps) {
  // Convert steps to React Flow nodes and edges
  const createNodesAndEdges = useCallback(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // User input node
    nodes.push({
      id: 'user-input',
      type: 'userInput',
      position: { x: 250, y: 50 },
      data: { fields: userInputFields },
    });

    // Step nodes
    steps.forEach((step, index) => {
      nodes.push({
        id: `step-${step.step_number}`,
        type: 'step',
        position: { x: 250, y: 200 + index * 180 },
        data: { step, onEdit: onEditStep },
      });

      // Edge from previous node
      const sourceId = index === 0 ? 'user-input' : `step-${steps[index - 1].step_number}`;
      edges.push({
        id: `e-${sourceId}-step-${step.step_number}`,
        source: sourceId,
        target: `step-${step.step_number}`,
        animated: true,
      });
    });

    // Output node
    if (steps.length > 0) {
      nodes.push({
        id: 'output',
        type: 'output',
        position: { x: 250, y: 200 + steps.length * 180 },
        data: { outputKey: steps[steps.length - 1].output_key },
      });

      edges.push({
        id: `e-step-${steps[steps.length - 1].step_number}-output`,
        source: `step-${steps[steps.length - 1].step_number}`,
        target: 'output',
        animated: true,
      });
    }

    return { nodes, edges };
  }, [steps, userInputFields, onEditStep]);

  const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      step_number: steps.length + 1,
      step_name: `Step ${steps.length + 1}`,
      model_id: availableModels[0]?.id || '',
      model_record_id: availableModels[0]?.record_id || '',
      prompt_template: '',
      parameters: {},
      input_mappings: {},
      output_key: `output_${steps.length + 1}`,
    };

    onStepsChange([...steps, newStep]);
  };

  // Update nodes and edges when steps change
  const { nodes: updatedNodes, edges: updatedEdges } = createNodesAndEdges();
  if (JSON.stringify(nodes) !== JSON.stringify(updatedNodes)) {
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }

  return (
    <div className="h-[600px] border rounded-lg bg-background">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Workflow Visual Editor</h3>
        <Button onClick={handleAddStep} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>
      <div className="h-[calc(100%-60px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
