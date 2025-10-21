import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { WorkflowInputPanel } from "@/components/generation/WorkflowInputPanel";
import { createSignedUrl } from "@/lib/storage-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ArrowLeft } from "lucide-react";

const CreateWorkflow = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("workflow");
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const { data: workflow, isLoading } = useWorkflowTemplate(workflowId || "");
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  
  const [result, setResult] = useState<{ url: string; tokens: number } | null>(null);

  useEffect(() => {
    if (!workflowId) {
      navigate("/dashboard/custom-creation");
    }
  }, [workflowId, navigate]);

  const handleExecute = async (formattedInputs: Record<string, any>) => {
    if (!workflow) return;

    setResult(null);
    
    const result = await executeWorkflow({
      workflow_template_id: workflow.id,
      user_inputs: formattedInputs,
    });

    if (result?.final_output_url) {
      setResult({ url: result.final_output_url, tokens: result.tokens_used });
      toast.success('Workflow completed!');
    } else {
      toast.error('Workflow failed');
    }
  };

  const handleDownload = async () => {
    if (!result?.url) return;
    
    try {
      const signedUrl = await createSignedUrl('generated-content', result.url);
      if (!signedUrl) {
        toast.error('Failed to create download link');
        return;
      }

      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = `workflow-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Workflow not found</p>
      </div>
    );
  }

  const showInputPanel = !isMobile || (!isExecuting && !result);
  const showOutputPanel = !isMobile || isExecuting || result;

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-2 gap-0">
      {/* Left Panel - Inputs */}
      {showInputPanel && (
        <div className="border-r border-border p-6 overflow-y-auto">
          <WorkflowInputPanel
            workflow={workflow}
            onExecute={handleExecute}
            onBack={() => navigate("/dashboard/templates")}
            isExecuting={isExecuting}
          />
        </div>
      )}

      {/* Right Panel - Output */}
      {showOutputPanel && (
        <div className="p-6 overflow-y-auto">
          {isMobile && (isExecuting || result) && (
            <button
              onClick={() => setResult(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Inputs</span>
            </button>
          )}
          <h2 className="text-2xl font-semibold mb-6">Output</h2>
        
        {!isExecuting && !result && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center">
            <div className="w-16 h-16 mb-4 text-muted-foreground/30">
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 20L60 40L80 45L65 60L68 80L50 70L32 80L35 60L20 45L40 40L50 20Z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-muted-foreground">
              Fill in the inputs and execute the workflow to see results
            </p>
          </div>
        )}

        {isExecuting && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Step {progress.currentStep} of {progress.totalSteps}
                </span>
                <span className="text-sm font-medium">
                  {Math.round((progress.currentStep / progress.totalSteps) * 100)}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.currentStep / progress.totalSteps) * 100}%` }}
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Processing workflow...
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border overflow-hidden">
              <img 
                src={result.url} 
                alt="Generated output" 
                className="w-full h-auto"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Tokens used: {result.tokens}
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default CreateWorkflow;
