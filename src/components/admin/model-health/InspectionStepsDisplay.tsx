import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";

interface InspectionStepsDisplayProps {
  inspectionData: Record<string, any>;
  currentPhase: 'idle' | 'executing' | 'complete' | 'error';
}

const STEPS = [
  { key: 'step1_inputs', title: 'Input Parameters Collected', phase: 'preparing' },
  { key: 'step2_backend_merge', title: 'Backend Parameters Merged', phase: 'preparing' },
  { key: 'step3_final_payload', title: 'Final API Payload Prepared', phase: 'preparing' },
  { key: 'step4_api_sent', title: 'API Request Sent', phase: 'executing' },
  { key: 'step5_initial_response', title: 'Initial Response Received', phase: 'executing' },
  { key: 'step6_polling_started', title: 'Polling Started', phase: 'executing' },
  { key: 'step7_polling_response', title: 'Polling Response', phase: 'executing' },
  { key: 'step8_final_response', title: 'Final Provider Response', phase: 'executing' },
  { key: 'step9_storage', title: 'Storage Operations', phase: 'complete' },
  { key: 'step10_urls', title: 'URLs Generated', phase: 'complete' },
  { key: 'step11_outputs_displayed', title: 'Outputs Displayed', phase: 'complete' },
];

export const InspectionStepsDisplay = ({ inspectionData, currentPhase }: InspectionStepsDisplayProps) => {
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set());

  const toggleStep = (key: string) => {
    const newOpen = new Set(openSteps);
    if (newOpen.has(key)) {
      newOpen.delete(key);
    } else {
      newOpen.add(key);
    }
    setOpenSteps(newOpen);
  };

  const getStepStatus = (key: string) => {
    if (inspectionData[key]) return 'complete';
    if (currentPhase === 'executing' && key.startsWith('step')) return 'pending';
    return 'idle';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Execution Flow
          <Badge variant={currentPhase === 'executing' ? 'default' : 'secondary'}>
            {currentPhase === 'idle' && 'Ready'}
            {currentPhase === 'executing' && 'In Progress'}
            {currentPhase === 'complete' && 'Complete'}
            {currentPhase === 'error' && 'Error'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {STEPS.map((step) => {
          const status = getStepStatus(step.key);
          const hasData = !!inspectionData[step.key];
          const isOpen = openSteps.has(step.key);

          return (
            <Collapsible key={step.key} open={isOpen} onOpenChange={() => toggleStep(step.key)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                  {getStatusIcon(status)}
                  <span className="flex-1 text-left text-sm font-medium">
                    {step.title}
                  </span>
                  {hasData && (
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  )}
                </div>
              </CollapsibleTrigger>
              {hasData && (
                <CollapsibleContent>
                  <pre className="ml-7 mt-2 bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(inspectionData[step.key], null, 2)}
                  </pre>
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
};
