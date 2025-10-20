import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GenerationPreview } from "@/components/generation/GenerationPreview";

interface WorkflowTestDialogProps {
  workflow: Partial<WorkflowTemplate> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkflowTestDialog = ({ workflow, open, onOpenChange }: WorkflowTestDialogProps) => {
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<{ url: string; tokens: number } | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();

  const handleInputChange = (fieldName: string, value: any) => {
    setInputs(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleFileUpload = async (fieldName: string, file: File | undefined) => {
    if (!file) return;

    setUploadingFiles(prev => new Set(prev).add(fieldName));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `workflow-inputs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setInputs(prev => ({ ...prev, [fieldName]: filePath }));
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    }
  };

  const validateWorkflow = (): string | null => {
    // Check user input fields
    const requiredFields = workflow?.user_input_fields?.filter(f => f.required) || [];
    for (const field of requiredFields) {
      if (!inputs[field.name]) {
        return `${field.label} is required`;
      }
    }
    
    // Check if any files are still uploading
    if (uploadingFiles.size > 0) {
      return 'Please wait for file uploads to complete';
    }
    
    // Check if workflow has steps
    if (!workflow?.workflow_steps?.length) {
      return 'Workflow has no steps configured';
    }
    
    return null; // No errors
  };

  const handleTest = async () => {
    if (!workflow?.id) return;

    const validationError = validateWorkflow();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setResult(null);
    setStatusMessage('Starting workflow execution...');
    
    const result = await executeWorkflow({
      workflow_template_id: workflow.id,
      user_inputs: inputs,
    });

    if (result?.final_output_url) {
      setStatusMessage('');
      setResult({ url: result.final_output_url, tokens: result.tokens_used });
      toast.success('Workflow test completed!');
    } else {
      setStatusMessage('Workflow failed. Check console for details.');
    }
  };

  // Determine content type from storage path
  const getContentType = (path: string): string => {
    const ext = path.toLowerCase().split('.').pop();
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'm4a'].includes(ext || '')) return 'audio';
    return 'image';
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
      
      case 'upload-image':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(field.name, e.target.files?.[0])}
            />
            {inputs[field.name] && (
              <div className="border rounded p-2">
                <img 
                  src={inputs[field.name]} 
                  alt="Preview" 
                  className="max-h-40 mx-auto"
                />
              </div>
            )}
          </div>
        );

      case 'upload-file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={(e) => handleFileUpload(field.name, e.target.files?.[0])}
            />
            {inputs[field.name] && (
              <p className="text-sm text-muted-foreground">
                File uploaded: {inputs[field.name].split('/').pop()}
              </p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((opt: string) => (
              <div key={opt} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`${field.name}-${opt}`}
                  name={field.name}
                  value={opt}
                  checked={inputs[field.name] === opt}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="h-4 w-4"
                />
                <Label htmlFor={`${field.name}-${opt}`}>{opt}</Label>
              </div>
            ))}
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

          {/* Upload Status */}
          {uploadingFiles.size > 0 && (
            <div className="flex items-center gap-2 text-blue-600 text-sm p-3 border rounded-lg bg-blue-50 border-blue-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Uploading {uploadingFiles.size} file(s)...</span>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && !result && (
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusMessage}</span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                This may take 10-60 seconds depending on the AI model...
              </p>
            </div>
          )}

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
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Test Completed Successfully</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Tokens used: {result.tokens}</p>
              
              {/* Output Preview */}
              <div className="border rounded-lg overflow-hidden bg-background">
                <GenerationPreview
                  storagePath={result.url}
                  contentType={getContentType(result.url)}
                  className="w-full max-h-[400px] object-contain"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleTest}
              disabled={isExecuting || !workflow?.workflow_steps?.length || uploadingFiles.size > 0}
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
