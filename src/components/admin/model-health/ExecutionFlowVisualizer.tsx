import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowStage = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
};

interface ExecutionFlowVisualizerProps {
  currentStage: 'input' | 'validation' | 'generation' | 'storage' | 'output';
  error: string | null;
}

export const ExecutionFlowVisualizer = ({ currentStage, error }: ExecutionFlowVisualizerProps) => {
  const stages: FlowStage[] = [
    { id: 'input', label: 'Input', status: 'completed' },
    { id: 'validation', label: 'Validation', status: 'completed' },
    { id: 'generation', label: 'Generation', status: currentStage === 'generation' ? 'active' : currentStage === 'storage' || currentStage === 'output' ? 'completed' : 'pending' },
    { id: 'storage', label: 'Storage', status: currentStage === 'storage' ? 'active' : currentStage === 'output' ? 'completed' : 'pending' },
    { id: 'output', label: 'Output', status: currentStage === 'output' ? 'completed' : 'pending' },
  ];

  // Mark error stage if there's an error
  if (error) {
    const errorIndex = stages.findIndex(s => s.id === currentStage);
    if (errorIndex !== -1) {
      stages[errorIndex].status = 'error';
    }
  }

  const getStageIcon = (status: FlowStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'active':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-2">
                {getStageIcon(stage.status)}
                <span className={cn(
                  "text-xs font-medium",
                  stage.status === 'active' && "text-primary",
                  stage.status === 'completed' && "text-success",
                  stage.status === 'error' && "text-destructive",
                  stage.status === 'pending' && "text-muted-foreground"
                )}>
                  {stage.label}
                </span>
              </div>
              {index < stages.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  stage.status === 'completed' ? "bg-success" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
