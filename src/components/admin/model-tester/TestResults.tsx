import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExecutionFlowVisualizer } from "./ExecutionFlowVisualizer";
import { LogStreamViewer } from "./LogStreamViewer";
import { CodeViewer } from "./CodeViewer";
import { PerformanceMetricsDashboard } from "./PerformanceMetricsDashboard";
import { Layers, Terminal, FileCode2, Download } from "lucide-react";
import { getModelFilePath } from "@/lib/admin/codeAnalysis";
import type { ExecutionFlow, EnhancedExecutionTracker } from "@/lib/admin/enhancedExecutionTracker";

interface TestResultsProps {
  executionFlow: ExecutionFlow | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tracker: EnhancedExecutionTracker | null;
  selectedModel: any;
  onUpdateStepInputs: (stepId: string, newInputs: any) => void;
  onRerunFromStep: (stepId: string) => void;
}

export function TestResults({
  executionFlow,
  activeTab,
  onTabChange,
  tracker,
  selectedModel,
  onUpdateStepInputs,
  onRerunFromStep
}: TestResultsProps) {
  if (!executionFlow) {
    return (
      <Card className="p-6 min-h-[800px]">
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <Layers className="h-24 w-24 text-muted-foreground/20 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Execution Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Select a model, configure inputs, and click "Execute with Full Tracking"
            to see the complete execution flow with database persistence, real-time
            logs, and source code visualization.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <div>
                <div className="font-medium">Database Persistence</div>
                <div className="text-muted-foreground text-xs">
                  Auto-saved every 2 seconds
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              <div>
                <div className="font-medium">Real-Time Logs</div>
                <div className="text-muted-foreground text-xs">
                  Stream from edge functions
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
              <div>
                <div className="font-medium">Code Inspection</div>
                <div className="text-muted-foreground text-xs">
                  View actual TypeScript source
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
              <div>
                <div className="font-medium">Test Mode</div>
                <div className="text-muted-foreground text-xs">
                  No billing, safe testing
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 min-h-[800px]">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="flow">
            <Layers className="h-4 w-4 mr-2" />
            Execution Flow
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Terminal className="h-4 w-4 mr-2" />
            Live Logs
          </TabsTrigger>
          <TabsTrigger value="code">
            <FileCode2 className="h-4 w-4 mr-2" />
            Source Code
          </TabsTrigger>
          <TabsTrigger value="performance">
            <Download className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="mt-4">
          <ExecutionFlowVisualizer
            flow={executionFlow}
            onEditStep={(stepId, newInputs) => {
              onUpdateStepInputs(stepId, newInputs);
            }}
            onRerunFromStep={onRerunFromStep}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <LogStreamViewer
            logs={executionFlow.logs}
            autoScroll={true}
            maxHeight="700px"
            showFilters={true}
          />
        </TabsContent>

        <TabsContent value="code" className="mt-4">
          {selectedModel && (
            <CodeViewer
              code={executionFlow.steps[0]?.sourceCode || '// Loading source code...'}
              language="typescript"
              title={`${selectedModel.model_name} Source`}
              filePath={getModelFilePath(
                selectedModel.content_type || '',
                selectedModel.model_name,
                selectedModel.is_locked || false
              )}
              readOnly={true}
            />
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <PerformanceMetricsDashboard flow={executionFlow} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
