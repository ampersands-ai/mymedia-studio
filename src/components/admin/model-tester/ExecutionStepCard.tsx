import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PayloadViewer } from "./PayloadViewer";
import { StepEditor } from "./StepEditor";
import type { ExecutionStep } from "@/lib/admin/executionTracker";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  Edit,
  Play,
  FileCode,
  ArrowRight
} from "lucide-react";

interface ExecutionStepCardProps {
  step: ExecutionStep;
  onEdit?: (stepId: string, newInputs: Record<string, any>) => void;
  onRerun?: (stepId: string) => void;
}

export function ExecutionStepCard({ step, onEdit, onRerun }: ExecutionStepCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Extract inputs check to help TypeScript inference
  const inputs: Record<string, unknown> = step.inputs;
  const hasInputs = !isEditing && Object.keys(inputs).length > 0;

  const getStatusIcon = () => {
    switch (step.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'edited':
        return <Edit className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (step.status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'edited':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleSaveEdit = (newInputs: Record<string, any>) => {
    if (onEdit) {
      onEdit(step.id, newInputs);
      setIsEditing(false);
    }
  };

  const renderInputs = (): JSX.Element | null => {
    if (!hasInputs) return null;
    return (
      <div>
        <h5 className="text-xs font-semibold mb-2 flex items-center gap-2">
          <span>Input Parameters</span>
          <Badge variant="secondary" className="text-xs">
            {String(Object.keys(inputs).length)}
          </Badge>
        </h5>
        <PayloadViewer
          data={inputs}
          title="Inputs"
          className="max-h-[300px]"
        />
      </div>
    );
  };

  return (
    <Card className="relative">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4">
          {/* Step Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {/* Step Number Badge */}
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {step.stepNumber}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{step.stepName}</h4>
                  <Badge variant="outline" className={`text-xs ${getStatusColor()}`}>
                    <div className="flex items-center gap-1">
                      {getStatusIcon()}
                      <span className="capitalize">{step.status}</span>
                    </div>
                  </Badge>
                  {step.duration && (
                    <span className="text-xs text-muted-foreground">
                      {step.duration}ms
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {step.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <FileCode className="h-3 w-3" />
                  <span>{step.functionPath}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-primary">{step.functionName}()</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {step.canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {step.canRerun && onRerun && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRerun(step.id)}
                  className="h-8"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Rerun
                </Button>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Error Display */}
          {step.error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-xs text-red-700 mt-1 font-mono">{step.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Content */}
        <CollapsibleContent>
          <div className="border-t px-4 py-4 space-y-4 bg-muted/30">
            {/* Edit Mode */}
            {isEditing && (
              <StepEditor
                step={step}
                onSave={handleSaveEdit}
                onCancel={() => setIsEditing(false)}
              />
            )}

            {renderInputs() as JSX.Element | null}

            {/* Outputs */}
            {step.outputs && step.status === 'completed' && (
              <div>
                <h5 className="text-xs font-semibold mb-2">Output</h5>
                <PayloadViewer
                  data={step.outputs}
                  title="Outputs"
                  className="max-h-[300px]"
                />
              </div>
            )}

            {/* Metadata */}
            {step.metadata && Object.keys(step.metadata).length > 0 && (
              <div>
                <h5 className="text-xs font-semibold mb-2">Metadata</h5>
                <PayloadViewer
                  data={step.metadata}
                  title="Metadata"
                  className="max-h-[200px]"
                />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
