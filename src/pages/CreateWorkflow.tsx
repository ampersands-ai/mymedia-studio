import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { WorkflowExecutionDialog } from "@/components/generation/WorkflowExecutionDialog";
import { WorkflowInputPanel } from "@/components/generation/WorkflowInputPanel";
import { createSignedUrl } from "@/lib/storage-utils";
import { supabase } from "@/integrations/supabase/client";

const CreateWorkflow = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("workflow");
  const navigate = useNavigate();
  
  const { data: workflow, isLoading } = useWorkflowTemplate(workflowId || "");
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  
  const [result, setResult] = useState<{ url: string; tokens: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!workflowId) {
      navigate("/dashboard/custom-creation");
    }
  }, [workflowId, navigate]);

  const handleExecute = async (formattedInputs: Record<string, any>) => {
    if (!workflow) return;

    setResult(null);
    setDialogOpen(true);
    
    const result = await executeWorkflow({
      workflow_template_id: workflow.id,
      user_inputs: formattedInputs,
    });

    if (result?.final_output_url) {
      setResult({ url: result.final_output_url, tokens: result.tokens_used });
      toast.success('Workflow completed!');
    } else {
      toast.error('Workflow failed');
      setDialogOpen(false);
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

  return (
    <div className="min-h-screen bg-background">
      <WorkflowInputPanel
        workflow={workflow}
        onExecute={handleExecute}
        onBack={() => navigate("/dashboard/templates")}
        isExecuting={isExecuting}
      />

      <WorkflowExecutionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workflowName={workflow.name || ""}
        isExecuting={isExecuting}
        progress={progress}
        result={result}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default CreateWorkflow;
