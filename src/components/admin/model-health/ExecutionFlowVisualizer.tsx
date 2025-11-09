import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Circle, Loader2, XCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type FlowStage = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
};

export interface StageData {
  input?: {
    prompt?: string;
    model?: string;
    parameters?: Record<string, any>;
    images?: number;
  };
  validation?: {
    checks?: string[];
    passed?: boolean;
  };
  generation?: {
    requestPayload?: any;
    responseData?: any;
    latency?: number;
  };
  storage?: {
    storagePath?: string;
    fileSize?: number;
    uploadTime?: number;
  };
  output?: {
    url?: string;
    metadata?: Record<string, any>;
  };
}

interface ExecutionFlowVisualizerProps {
  currentStage: 'input' | 'validation' | 'generation' | 'storage' | 'output';
  error: string | null;
  stageData?: StageData;
}

export const ExecutionFlowVisualizer = ({ currentStage, error, stageData = {} }: ExecutionFlowVisualizerProps) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
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

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const renderStageData = (stageId: string) => {
    const data = stageData[stageId as keyof StageData];
    if (!data || Object.keys(data).length === 0) return null;

    return (
      <div className="mt-2 p-3 bg-muted/50 rounded-md space-y-2">
        <pre className="text-xs overflow-auto max-h-40">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stages.map((stage, index) => {
          const hasData = stageData[stage.id as keyof StageData] && 
                         Object.keys(stageData[stage.id as keyof StageData] || {}).length > 0;
          const isExpanded = expandedStages.has(stage.id);
          const canExpand = stage.status === 'completed' || stage.status === 'error';

          return (
            <div key={stage.id}>
              <Collapsible
                open={isExpanded}
                onOpenChange={() => canExpand && hasData && toggleStage(stage.id)}
              >
                <CollapsibleTrigger 
                  disabled={!canExpand || !hasData}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-md transition-colors",
                    canExpand && hasData && "hover:bg-muted/50 cursor-pointer",
                    !canExpand || !hasData && "cursor-default"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {getStageIcon(stage.status)}
                    <div className="text-left">
                      <div className={cn(
                        "text-sm font-medium",
                        stage.status === 'active' && "text-primary",
                        stage.status === 'completed' && "text-success",
                        stage.status === 'error' && "text-destructive",
                        stage.status === 'pending' && "text-muted-foreground"
                      )}>
                        {stage.label}
                      </div>
                      {hasData && (
                        <div className="text-xs text-muted-foreground">
                          Click to view details
                        </div>
                      )}
                    </div>
                  </div>
                  {canExpand && hasData && (
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform",
                      isExpanded && "rotate-180"
                    )} />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {renderStageData(stage.id)}
                </CollapsibleContent>
              </Collapsible>
              {index < stages.length - 1 && (
                <div className={cn(
                  "h-8 w-0.5 ml-5 my-1",
                  stage.status === 'completed' ? "bg-success" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
