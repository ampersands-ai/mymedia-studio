import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useWorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { WorkflowExecutionDialog } from "@/components/generation/WorkflowExecutionDialog";
import { createSignedUrl } from "@/lib/storage-utils";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft } from "lucide-react";

const CreateWorkflow = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("workflow");
  const navigate = useNavigate();
  
  const { data: workflow, isLoading } = useWorkflowTemplate(workflowId || "");
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();
  
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<{ url: string; tokens: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!workflowId) {
      navigate("/dashboard/create");
    }
  }, [workflowId, navigate]);

  const handleInputChange = (fieldName: string, value: any) => {
    setInputs(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleFileUpload = async (fieldName: string, file: File | undefined) => {
    if (!file) return;

    try {
      // Get user from auth context  
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to upload files');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${user.id}/uploads/${timestamp}/0.${fileExt}`;

      // Upload to storage (exactly like CustomCreation)
      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`);
        console.error('Upload error:', uploadError);
        return;
      }

      // Generate signed URL for secure access (exactly like CustomCreation - 1 hour validity)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, 3600);

      if (signedError || !signedData) {
        toast.error(`Failed to create secure URL for ${file.name}`);
        console.error('Signed URL error:', signedError);
        return;
      }

      // Store the signed URL (not storage path) in inputs
      setInputs(prev => ({ ...prev, [fieldName]: signedData.signedUrl }));
      toast.success(`Uploaded ${file.name}`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    }
  };

  const handleExecute = async () => {
    if (!workflow) return;

    // Validate required fields
    const requiredFields = workflow.user_input_fields?.filter(f => f.required) || [];
    for (const field of requiredFields) {
      if (!inputs[field.name]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setResult(null);
    setDialogOpen(true);
    
    const result = await executeWorkflow({
      workflow_template_id: workflow.id,
      user_inputs: inputs,
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

  const renderInputField = (field: any) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={inputs[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.label}
            className="min-h-[100px]"
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
              <div className="border rounded p-2 bg-muted">
                <img 
                  src={inputs[field.name]} 
                  alt="Preview" 
                  className="max-h-40 mx-auto object-contain"
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
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/templates")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-black">{workflow.name}</h1>
            {workflow.description && (
              <p className="text-lg text-muted-foreground">{workflow.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {workflow.workflow_steps?.length || 0} steps • {workflow.category}
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Input Fields</h3>
              {workflow.user_input_fields?.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {renderInputField(field)}
                </div>
              ))}
            </CardContent>
          </Card>

          <Button
            onClick={handleExecute}
            disabled={isExecuting}
            className="w-full"
            size="lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Execute Workflow
          </Button>
        </div>

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
    </div>
  );
};

export default CreateWorkflow;
