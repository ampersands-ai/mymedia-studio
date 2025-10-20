import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, Download, CheckCircle2, XCircle } from "lucide-react";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { toast } from "sonner";
import { createSignedUrl } from "@/lib/storage-utils";

interface WorkflowTestDialogProps {
  workflow: Partial<WorkflowTemplate> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkflowTestDialog = ({ workflow, open, onOpenChange }: WorkflowTestDialogProps) => {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<{ url: string; tokens: number } | null>(null);
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();

  const handleInputChange = (fieldName: string, value: any) => {
    setInputs(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleTest = async () => {
    if (!workflow?.id) return;

    // Validate required fields
    const requiredFields = workflow.user_input_fields?.filter(f => f.required) || [];
    for (const field of requiredFields) {
      if (!inputs[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setResult(null);
    const result = await executeWorkflow({
      workflow_template_id: workflow.id,
      user_inputs: inputs,
    });

    if (result?.final_output_url) {
      setResult({ url: result.final_output_url, tokens: result.tokens_used });
      toast.success('Workflow test completed!');
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
      a.download = `workflow-test-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const renderInputField = (field: any) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={inputs[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.label}
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={inputs[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.label}
          />
        );
      
      case 'select':
        return (
          <Select
            value={inputs[field.name] || ''}
            onValueChange={(value) => handleInputChange(field.name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={inputs[field.name] || false}
              onCheckedChange={(checked) => handleInputChange(field.name, checked)}
            />
            <Label>{field.label}</Label>
          </div>
        );
      
      default:
        return (
          <Input
            value={inputs[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.label}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Workflow: {workflow?.name}</DialogTitle>
          <DialogDescription>
            Fill in the inputs and run a test execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Fields */}
          {workflow?.user_input_fields?.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderInputField(field)}
            </div>
          ))}

          {/* Progress */}
          {isExecuting && progress && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span>Executing Step {progress.currentStep} of {progress.totalSteps}</span>
                <span>{Math.round((progress.currentStep / progress.totalSteps) * 100)}%</span>
              </div>
              <Progress value={(progress.currentStep / progress.totalSteps) * 100} />
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Test Completed Successfully</span>
              </div>
              <p className="text-sm text-muted-foreground">Tokens used: {result.tokens}</p>
              <Button onClick={handleDownload} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Result
              </Button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={isExecuting || !workflow?.workflow_steps?.length}
              className="flex-1"
            >
              {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Run Test
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
