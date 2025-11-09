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
  input_validation?: {
    prompt?: string;
    prompt_length?: number;
    custom_parameters?: Record<string, any>;
    model_record_id?: string;
    has_images?: boolean;
    image_count?: number;
  };
  credit_check?: {
    credits_required?: number;
    credits_available?: number;
    will_deduct?: boolean;
    user_id?: string;
    sufficient_balance?: boolean;
  };
  credit_deduction?: {
    deducted?: boolean;
    amount?: number;
    new_balance?: number;
    test_mode?: boolean;
    note?: string;
  };
  api_request_prepared?: {
    payload?: any;
    endpoint?: string;
    provider?: string;
    content_type?: string;
  };
  api_request_sent?: {
    timestamp?: number;
    provider_endpoint?: string;
    http_method?: string;
    auth_type?: string;
  };
  first_api_response?: {
    status_code?: number;
    provider_task_id?: string;
    estimated_time?: number;
    latency_ms?: number;
    initial_status?: string;
  };
  generation_polling?: {
    poll_count?: number;
    time_elapsed_ms?: number;
    current_status?: string;
    polling_intervals_ms?: number;
  };
  final_api_response?: {
    completion_status?: string;
    output_url?: string;
    storage_path?: string;
    provider_metadata?: any;
    total_generation_time_ms?: number;
  };
  media_storage?: {
    storage_bucket?: string;
    file_path?: string;
    file_size_bytes?: number;
    mime_type?: string;
  };
  media_validation?: {
    accessibility_check?: boolean;
    status_code?: number;
    content_type?: string;
    content_length?: string;
    validation_time_ms?: number;
  };
  media_delivered?: {
    final_url?: string;
    delivery_time_ms?: number;
    validation_success?: boolean;
    generation_id?: string;
  };
  credit_refund?: {
    refund_amount?: number;
    reason?: string;
    timestamp?: number;
  };
}

interface ExecutionFlowVisualizerProps {
  currentStage: string;
  error: string | null;
  stageData?: StageData;
}

export const ExecutionFlowVisualizer = ({ currentStage, error, stageData = {} }: ExecutionFlowVisualizerProps) => {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const stages: FlowStage[] = [
    { id: 'input_validation', label: 'Input Validation', status: 'pending' },
    { id: 'credit_check', label: 'Credit Check', status: 'pending' },
    { id: 'credit_deduction', label: 'Credit Deduction', status: 'pending' },
    { id: 'api_request_prepared', label: 'API Request Prepared', status: 'pending' },
    { id: 'api_request_sent', label: 'API Request Sent', status: 'pending' },
    { id: 'first_api_response', label: 'First API Response', status: 'pending' },
    { id: 'generation_polling', label: 'Generation Polling', status: 'pending' },
    { id: 'final_api_response', label: 'Final API Response', status: 'pending' },
    { id: 'media_storage', label: 'Media Storage', status: 'pending' },
    { id: 'media_validation', label: 'Media Validation', status: 'pending' },
    { id: 'media_delivered', label: 'Media Delivered', status: 'pending' },
  ];

  // Update stage statuses based on current stage and data
  let foundCurrent = false;
  stages.forEach(stage => {
    if (stageData[stage.id as keyof StageData]) {
      stage.status = 'completed';
    }
    if (stage.id === currentStage) {
      stage.status = 'active';
      foundCurrent = true;
    }
    if (!foundCurrent && !stageData[stage.id as keyof StageData]) {
      stage.status = 'pending';
    }
  });

  // Mark error stage if there's an error
  if (error) {
    const errorStage = stages.find(s => s.id === currentStage);
    if (errorStage) {
      errorStage.status = 'error';
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
        <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-words font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Execution Flow</CardTitle>
        <p className="text-sm text-muted-foreground">
          Click on completed stages to view detailed data
        </p>
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
