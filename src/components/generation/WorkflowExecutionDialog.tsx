import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Download, CheckCircle2 } from "lucide-react";
import { GenerationPreview } from "./GenerationPreview";

interface WorkflowExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  isExecuting: boolean;
  progress?: {
    currentStep: number;
    totalSteps: number;
  } | null;
  result?: {
    url: string;
    credits: number;
  } | null;
  onDownload: () => void;
}

export const WorkflowExecutionDialog = ({
  open,
  onOpenChange,
  workflowName,
  isExecuting,
  progress,
  result,
  onDownload,
}: WorkflowExecutionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-black">{workflowName}</DialogTitle>
          <DialogDescription>
            Multi-step workflow execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress */}
          {isExecuting && progress && (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Step {progress.currentStep} of {progress.totalSteps}</span>
                  <span>{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</span>
                </div>
                <Progress value={(progress.currentStep / progress.totalSteps) * 100} className="h-2" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Processing workflow steps...
              </p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Workflow Completed!</span>
              </div>
              
              {result.url && (
                <GenerationPreview 
                  storagePath={result.url}
                  contentType="image"
                />
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Credits used: {result.credits}</span>
              </div>

              <Button onClick={onDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Result
              </Button>
            </div>
          )}

          {!isExecuting && !result && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-muted-foreground">Preparing workflow execution...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
