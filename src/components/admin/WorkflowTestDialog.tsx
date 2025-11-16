import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import type { WorkflowTemplate } from "@/hooks/useWorkflowTemplates";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GenerationPreview } from "@/components/generation/GenerationPreview";
import { useAuth } from "@/contexts/AuthContext";
import { logger, generateRequestId } from "@/lib/logger";
import type {
  WorkflowTestInputs,
  WorkflowStepModels,
  FieldSchemaInfo
} from "@/types/workflow-parameters";
import { jsonToSchema } from "@/types/schema";
import type { ContentType } from "@/types/workflow-execution-display";
import { SchemaInput } from "@/components/generation/SchemaInput";
import type { ModelParameterValue } from "@/types/model-schema";

const testLogger = logger.child({ component: 'WorkflowTestDialog' });

interface WorkflowTestDialogProps {
  workflow: Partial<WorkflowTemplate> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkflowTestDialog = ({ workflow, open, onOpenChange }: WorkflowTestDialogProps) => {
  const { user } = useAuth();
  const [inputs, setInputs] = useState<WorkflowTestInputs>({});
  const [result, setResult] = useState<{ url: string; credits: number } | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [stepModels, setStepModels] = useState<WorkflowStepModels>({});
  const { executeWorkflow, isExecuting, progress } = useWorkflowExecution();

  // Fetch model schemas for all workflow steps (mirrors Custom Creation)
  useEffect(() => {
    if (!workflow?.workflow_steps || !open) return;
    
    const fetchModels = async () => {
      const models: WorkflowStepModels = {};
      for (const step of workflow.workflow_steps) {
        const { data } = await supabase
          .from('ai_models')
          .select('input_schema, max_images, content_type, provider')
          .eq('record_id', step.model_record_id)
          .single();
        
        if (data) {
          models[step.step_number] = {
            input_schema: jsonToSchema(data.input_schema),
            max_images: data.max_images,
            content_type: data.content_type,
            provider: data.provider
          };
        }
      }
      setStepModels(models);
      
      // Initialize defaults from model schemas
      initializeDefaults(models);
    };
    
    fetchModels();
  }, [workflow, open]);

  // Initialize default values from model schemas (mirrors Custom Creation lines 465-481)
  const initializeDefaults = (models: WorkflowStepModels) => {
    if (!workflow?.user_input_fields) return;
    
    const defaults: WorkflowTestInputs = {};
    
    // For each user input field, find its corresponding model parameter
    for (const field of workflow.user_input_fields) {
      const fieldInfo = getFieldSchemaInfo(field.name, models);
      if (!fieldInfo) continue;
      
      const modelData = models[fieldInfo.stepNumber];
      const paramSchema = modelData?.input_schema?.properties?.[fieldInfo.modelParam];
      
      // Set default value if defined and not already set
      if (paramSchema?.default !== undefined && inputs[field.name] === undefined) {
        defaults[field.name] = paramSchema.default;
      }
    }
    
    if (Object.keys(defaults).length > 0) {
      setInputs(prev => ({ ...defaults, ...prev }));
    }
  };

  const getFieldSchemaInfo = (userInputFieldName: string, models: WorkflowStepModels = stepModels): FieldSchemaInfo | null => {
    if (!workflow?.workflow_steps) return null;
    
    // Find which step maps this user input to a model parameter
    for (const step of workflow.workflow_steps) {
      const modelData = models[step.step_number];
      if (!modelData) continue;
      
      // Check input mappings to find which model parameter this maps to
      for (const [modelParam, mapping] of Object.entries(step.input_mappings || {})) {
        if (mapping === `user.${userInputFieldName}`) {
          const paramSchema = modelData.input_schema?.properties?.[modelParam];
          if (!paramSchema) continue;
          
          return {
            expectsArray: paramSchema.type === 'array',
            isRequired: modelData.input_schema?.required?.includes(modelParam) || false,
            modelParam,
            stepNumber: step.step_number,
            paramSchema,
            contentType: modelData.content_type,
            maxImages: modelData.max_images
          };
        }
      }
    }
    return null;
  };

  const handleInputChange = (fieldName: string, value: any) => {
    setInputs(prev => ({ ...prev, [fieldName]: value }));
  };

  // Handle file upload - mirrors Custom Creation lines 654-698
  const handleFileUpload = async (fieldName: string, file: File | undefined) => {
    if (!file) {
      setInputs(prev => ({ ...prev, [fieldName]: null }));
      setPreviewUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[fieldName];
        return newUrls;
      });
      return;
    }

    if (!user?.id) {
      toast.error("Please sign in to upload files");
      return;
    }

    setUploadingFiles(prev => new Set(prev).add(fieldName));

    try {
      // Validate file
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error(`Invalid file type. Only JPEG, PNG, and WebP allowed.`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File is too large (max 10MB)`);
        return;
      }

      // Upload to storage using same pattern as Custom Creation
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${user.id}/uploads/${timestamp}/${fieldName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Generate signed URL immediately (mirrors Custom Creation)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('generated-content')
        .createSignedUrl(filePath, 3600);

      if (signedError || !signedData?.signedUrl) {
        throw new Error('Failed to create signed URL');
      }

      // Determine the expected format from model schema
      const fieldInfo = getFieldSchemaInfo(fieldName);
      
      // Store signed URL in correct format based on schema (mirrors Custom Creation lines 692-696)
      if (fieldInfo?.expectsArray) {
        // Model expects array of URLs
        setInputs(prev => ({ ...prev, [fieldName]: [signedData.signedUrl] }));
        testLogger.debug('File stored as array', { fieldName, format: 'array' });
      } else {
        // Model expects single URL string
        setInputs(prev => ({ ...prev, [fieldName]: signedData.signedUrl }));
        testLogger.debug('File stored as string', { fieldName, format: 'string' });
      }
      
      // Store preview URL separately for UI display
      setPreviewUrls(prev => ({ ...prev, [fieldName]: signedData.signedUrl }));

      testLogger.info('File uploaded successfully', { fieldName, fileName: file.name });
      toast.success('File uploaded successfully');
    } catch (error) {
      testLogger.error('File upload failed', error as Error, { fieldName, fileName: file?.name });
      toast.error('Failed to upload file');
    } finally {
      setUploadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    }
  };

  // Validate workflow - mirrors Custom Creation validation (lines 549-590)
  const validateWorkflow = (): string | null => {
    if (!workflow?.user_input_fields) return null;

    // Check if any files are still uploading
    if (uploadingFiles.size > 0) {
      return 'Please wait for all files to finish uploading';
    }

    // Validate each user input field
    for (const field of workflow.user_input_fields) {
      // Get the model schema info for this field
      const fieldInfo = getFieldSchemaInfo(field.name);
      
      // Check if field is required by model schema
      const isRequired = field.required || fieldInfo?.isRequired;
      
      if (isRequired) {
        const value = inputs[field.name];
        
        // Check for empty values
        if (value === undefined || value === null || value === '') {
          return `${field.label || field.name} is required`;
        }
        
        // For image fields, check if upload was successful
        if (field.type === 'file' && typeof value === 'string' && value.startsWith('workflow-inputs/')) {
          return `${field.label || field.name} upload failed. Please try again.`;
        }
      }
    }

    return null; // No errors
  };

  const handleReset = () => {
    setResult(null);
    setStatusMessage('');
    setInputs({});
    setPreviewUrls({});
    toast.info('Test reset');
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
    
    // Update status message after a few seconds
    setTimeout(() => {
      if (isExecuting) {
        setStatusMessage('Processing AI generation (this may take 10-60 seconds)...');
      }
    }, 3000);

    const requestId = generateRequestId();
    
    try {
      // Note: inputs already contain properly formatted signed URLs
      // No conversion needed - they're in the exact format Custom Creation uses
      testLogger.info('Starting workflow test execution', { 
        requestId,
        workflow_id: workflow.id,
        workflow_name: workflow.name,
        input_count: Object.keys(inputs).length 
      });
      
      const result = await executeWorkflow({
        workflow_template_id: workflow.id,
        user_inputs: inputs,
      });

      if (result?.final_output_url) {
        testLogger.info('Workflow test completed successfully', { 
          requestId,
          workflow_id: workflow.id,
          tokens_used: result.tokens_used 
        });
        setStatusMessage('');
        setResult({ url: result.final_output_url, credits: result.tokens_used });
        toast.success('Workflow test completed!');
      } else {
        testLogger.warn('Workflow test failed or timed out', { requestId, workflow_id: workflow.id });
        setStatusMessage('');
        toast.error('Workflow execution failed or timed out');
      }
    } catch (error) {
      testLogger.error('Workflow test execution error', error as Error, { 
        requestId,
        workflow_id: workflow.id 
      });
      toast.error('Failed to execute workflow');
    }
  };

  // Determine content type from storage path
  const getContentType = (path: string): ContentType => {
    const ext = path.toLowerCase().split('.').pop();
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'm4a'].includes(ext || '')) return 'audio';
    return 'image';
  };

  // Render input field using SchemaInput for consistency with Custom Creation
  const renderInputField = (field: any) => {
    const fieldInfo = getFieldSchemaInfo(field.name);
    if (!fieldInfo) {
      // Fallback for fields without schema info
      const value = inputs[field.name];
      const stringValue = typeof value === 'string' ? value : (value !== null && value !== undefined ? String(value) : '');
      return (
        <Input
          value={stringValue}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          placeholder={field.label}
        />
      );
    }

    const modelData = stepModels[fieldInfo.stepNumber];
    const value = inputs[field.name] as ModelParameterValue;

    return (
      <SchemaInput
        name={field.name}
        schema={fieldInfo.paramSchema}
        value={value}
        onChange={(newValue) => handleInputChange(field.name, newValue)}
        required={fieldInfo.isRequired}
        modelId={modelData?.content_type}
        provider={modelData?.provider}
      />
    );
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
              <p className="text-sm text-muted-foreground mb-3">Credits used: {result.credits}</p>
              
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
            {(isExecuting || result) && (
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={isExecuting}
              >
                {isExecuting ? 'Cancel' : 'Reset'}
              </Button>
            )}
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