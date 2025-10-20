import { useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { WorkflowStep, UserInputField } from '@/hooks/useWorkflowTemplates';

interface WorkflowVisualPreviewProps {
  userInputFields: UserInputField[];
  steps: WorkflowStep[];
}

// Simplified node components without edit functionality
const StepNode = ({ data }: { data: any }) => (
  <Card className="p-3 min-w-[180px] border-2 border-primary/20 bg-background">
    <div className="space-y-1">
      <h4 className="font-semibold text-xs">Step {data.step.step_number}</h4>
      <p className="text-xs text-muted-foreground">{data.step.step_name || 'Unnamed Step'}</p>
      <p className="text-xs font-medium">Model: {data.step.model_id || 'Not set'}</p>
      <p className="text-xs text-primary">Output: {data.step.output_key || 'Not set'}</p>
    </div>
  </Card>
);

const UserInputNode = ({ data }: { data: any }) => (
  <Card className="p-3 min-w-[180px] border-2 border-blue-500/40 bg-blue-500/5">
    <h4 className="font-semibold text-xs mb-2">User Inputs</h4>
    <div className="space-y-1">
      {data.fields.length > 0 ? (
        data.fields.map((field: UserInputField) => (
          <p key={field.name} className="text-xs">
            • {field.label} ({field.type})
          </p>
        ))
      ) : (
        <p className="text-xs text-muted-foreground">No inputs defined</p>
      )}
    </div>
  </Card>
);

const OutputNode = () => (
  <Card className="p-3 min-w-[180px] border-2 border-green-500/40 bg-green-500/5">
    <h4 className="font-semibold text-xs mb-2">Final Output</h4>
    <p className="text-xs text-muted-foreground">Result will be shown to user</p>
  </Card>
);

const nodeTypes: NodeTypes = {
  step: StepNode,
  userInput: UserInputNode,
  output: OutputNode,
};

export function WorkflowVisualPreview({ userInputFields, steps }: WorkflowVisualPreviewProps) {
  const createNodesAndEdges = () => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // User input node
    nodes.push({
      id: 'user-input',
      type: 'userInput',
      position: { x: 50, y: 50 },
      data: { fields: userInputFields },
      draggable: false,
    });

    // Step nodes
    steps.forEach((step, index) => {
      nodes.push({
        id: `step-${step.step_number}`,
        type: 'step',
        position: { x: 50, y: 180 + index * 160 },
        data: { step },
        draggable: false,
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
        position: { x: 50, y: 180 + steps.length * 160 },
        data: {},
        draggable: false,
      });

      edges.push({
        id: `e-step-${steps[steps.length - 1].step_number}-output`,
        source: `step-${steps[steps.length - 1].step_number}`,
        target: 'output',
        animated: true,
      });
    }

    return { nodes, edges };
  };

  const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges when steps change
  useEffect(() => {
    const { nodes: updatedNodes, edges: updatedEdges } = createNodesAndEdges();
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [steps, userInputFields]);

  return (
    <Card className="h-[600px] border bg-muted/20">
      <div className="p-3 border-b bg-background">
        <h3 className="font-semibold text-sm">Workflow Preview</h3>
      </div>
      <div className="h-[calc(100%-50px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background />
        </ReactFlow>
      </div>
    </Card>
  );
}
