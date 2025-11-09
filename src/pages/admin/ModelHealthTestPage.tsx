import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useModelHealth } from "@/hooks/admin/model-health/useModelHealth";
import { useModelByRecordId } from "@/hooks/useModels";
import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useGeneration } from "@/hooks/useGeneration";
import { useCustomGenerationPolling } from "@/hooks/useCustomGenerationPolling";
import { useAuth } from "@/contexts/AuthContext";
import { getSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { buildCustomParameters } from "@/lib/custom-creation-utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ModelParameterForm } from "@/components/generation/ModelParameterForm";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, Download } from "lucide-react";
import type { GenerationOutput } from "@/types/custom-creation";

export default function ModelHealthTestPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: models, isLoading: modelsLoading } = useModelHealth();
  const { data: fullModel, isLoading: fullModelLoading } = useModelByRecordId(recordId);
  const { findPrimaryTextKey } = useSchemaHelpers();
  
  const [testResultId, setTestResultId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  
  const model = models?.find((m) => m.record_id === recordId);
  const imageUploadHooks = useImageUpload(fullModel);
  const { generate, isGenerating } = useGeneration();

  // Setup generation polling
  const { startPolling, stopPolling } = useCustomGenerationPolling({
    onComplete: async (outputs: GenerationOutput[], parentId: string) => {
      if (outputs.length > 0 && outputs[0].storage_path) {
        // Get signed URL for the first output
        const { data: urlData } = await supabase.storage
          .from('generated-content')
          .createSignedUrl(outputs[0].storage_path, 3600);
        
        if (urlData?.signedUrl) {
          setOutputUrl(urlData.signedUrl);
          setTestStatus('completed');
          
          // Update test result
          if (testResultId) {
            await supabase
              .from('model_test_results')
              .update({
                status: 'success',
                generation_id: parentId,
                output_url: urlData.signedUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('id', testResultId);
          }
          
          toast.success('Test completed successfully!');
        }
      }
    },
    onError: async (error: string) => {
      setTestStatus('error');
      setTestError(error);
      
      if (testResultId) {
        await supabase
          .from('model_test_results')
          .update({
            status: 'error',
            error_message: error,
            completed_at: new Date().toISOString(),
          })
          .eq('id', testResultId);
      }
      
      toast.error('Test failed');
    },
    onTimeout: async () => {
      setTestStatus('error');
      setTestError('Test timeout');
      
      if (testResultId) {
        await supabase
          .from('model_test_results')
          .update({
            status: 'error',
            error_message: 'Test timeout',
            completed_at: new Date().toISOString(),
          })
          .eq('id', testResultId);
      }
      
      toast.error('Test timeout');
    }
  });

  // Generate default parameters on mount
  useEffect(() => {
    if (!fullModel?.input_schema) return;

    const schema = fullModel.input_schema;
    const properties = schema.properties || {};
    const defaults: Record<string, any> = {};

    Object.entries(properties).forEach(([fieldName, fieldSchema]: [string, any]) => {
      const fieldType = fieldSchema.type;
      const primaryTextKey = findPrimaryTextKey(properties);

      if (fieldName === primaryTextKey || fieldName.includes('prompt') || fieldName.includes('text')) {
        const modelGroupsRaw = fullModel?.groups ?? model?.groups;
        const groupStr = Array.isArray(modelGroupsRaw)
          ? modelGroupsRaw.join(",")
          : typeof modelGroupsRaw === "string"
            ? modelGroupsRaw
            : JSON.stringify(modelGroupsRaw ?? "");
        
        if (groupStr.includes('image_to_video') || groupStr.includes('image_editing')) {
          defaults[fieldName] = "Change the attire of this person to black-colored";
        } else {
          if (fullModel?.content_type === 'image') {
            defaults[fieldName] = getSurpriseMePrompt('prompt_to_image');
          } else if (fullModel?.content_type === 'video') {
            defaults[fieldName] = getSurpriseMePrompt('prompt_to_video');
          } else if (fullModel?.content_type === 'audio') {
            defaults[fieldName] = getSurpriseMePrompt('prompt_to_audio');
          } else {
            defaults[fieldName] = "Test prompt for model validation";
          }
        }
      } else if (fieldType === 'string' && fieldSchema.enum) {
        defaults[fieldName] = fieldSchema.enum[0];
      } else if (fieldType === 'boolean') {
        defaults[fieldName] = fieldSchema.default ?? false;
      } else if (fieldType === 'number' || fieldType === 'integer') {
        defaults[fieldName] = fieldSchema.default ?? (fieldSchema.minimum || 0);
      } else if (fieldType === 'string') {
        defaults[fieldName] = fieldSchema.default || "";
      }
    });

    setParameters(defaults);
  }, [fullModel, model, findPrimaryTextKey]);

  // Validate required fields
  const validateRequiredFields = (): boolean => {
    if (!fullModel?.input_schema) return true;
    
    const schema = fullModel.input_schema;
    const required = schema.required || [];
    const errors: string[] = [];

    required.forEach((field: string) => {
      const value = parameters[field];
      if (value === undefined || value === null || value === '') {
        errors.push(`${field} is required`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle test execution
  const handleStartTest = async () => {
    if (!fullModel || !user) {
      toast.error("Model or user not found");
      return;
    }

    if (!validateRequiredFields()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setTestStatus('running');
    setTestError(null);
    setOutputUrl(null);

    try {
      // Note: Test result tracking is simplified - using generation_id for tracking

      // Upload images if needed
      let uploadedUrls: string[] = [];
      if (imageUploadHooks.uploadedImages.length > 0) {
        uploadedUrls = await imageUploadHooks.uploadImagesToStorage(user.id);
      }

      // Build custom parameters using the same logic as Custom Creation
      const customParams = buildCustomParameters(parameters, fullModel.input_schema);

      // Prepare generation params
      const primaryTextKey = findPrimaryTextKey(fullModel.input_schema?.properties);
      const prompt = parameters[primaryTextKey || 'prompt'] || '';

      // Use the exact same generate function as Custom Creation
      const result = await generate({
        template_id: fullModel.id,
        model_id: fullModel.id,
        prompt,
        custom_parameters: {
          ...customParams,
          ...(uploadedUrls.length > 0 && { imageUrls: uploadedUrls })
        }
      });

      if (!result || !result.id) {
        throw new Error('Generation failed');
      }

      setGenerationId(result.id);

      // Start polling for completion using the same hook as Custom Creation
      startPolling(result.id);

    } catch (error: any) {
      console.error('Test error:', error);
      setTestStatus('error');
      setTestError(error.message);
      toast.error(`Test failed: ${error.message}`);
      
      if (testResultId) {
        await supabase
          .from('model_test_results')
          .update({
            status: 'error',
            error_message: error.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', testResultId);
      }
    }
  };

  const handleResetTest = () => {
    stopPolling();
    setTestResultId(null);
    setGenerationId(null);
    setTestStatus('idle');
    setTestError(null);
    setOutputUrl(null);
    setValidationErrors([]);
  };

  const getStatusIcon = () => {
    switch (testStatus) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusVariant = (): "default" | "destructive" | "outline" | "secondary" => {
    switch (testStatus) {
      case 'running':
        return 'secondary';
      case 'completed':
        return 'default';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (modelsLoading || fullModelLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/model-health')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!model || !fullModel) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/model-health')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Model not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/model-health')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{model.model_name}</h1>
            <p className="text-muted-foreground">{model.provider} • {model.content_type}</p>
          </div>
        </div>
        <Badge variant={getStatusVariant()} className="flex items-center gap-2">
          {getStatusIcon()}
          {testStatus === 'idle' ? 'Ready' : testStatus}
        </Badge>
      </div>

      {/* Test Configuration or Results */}
      {testStatus === 'idle' ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Configuration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Test Configuration</CardTitle>
              <CardDescription>Configure test parameters for this model</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fullModel.input_schema && (
                <ModelParameterForm
                  modelSchema={fullModel.input_schema}
                  onChange={setParameters}
                  currentValues={parameters}
                  modelId={fullModel.id}
                  provider={fullModel.provider}
                />
              )}
              
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleStartTest} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  'Run Test'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Model Details */}
          <Card>
            <CardHeader>
              <CardTitle>Model Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Provider</p>
                <p className="text-sm text-muted-foreground">{model.provider}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Content Type</p>
                <p className="text-sm text-muted-foreground">{model.content_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Groups</p>
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(model.groups) ? model.groups.join(', ') : model.groups}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getStatusIcon()}
                Test Results
              </CardTitle>
              <CardDescription>
                {testStatus === 'running' && 'Test is currently running...'}
                {testStatus === 'completed' && 'Test completed successfully'}
                {testStatus === 'error' && 'Test failed'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {testStatus === 'running' && (
                <div className="space-y-2">
                  <Progress value={undefined} className="w-full" />
                  <p className="text-sm text-muted-foreground">Processing generation...</p>
                </div>
              )}

              {testError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testError}</AlertDescription>
                </Alert>
              )}

              {outputUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Generated Output:</p>
                  {fullModel?.content_type === 'image' && (
                    <img src={outputUrl} alt="Generated" className="rounded-lg max-w-full" />
                  )}
                  {fullModel?.content_type === 'video' && (
                    <video src={outputUrl} controls className="rounded-lg max-w-full" />
                  )}
                  {fullModel?.content_type === 'audio' && (
                    <audio src={outputUrl} controls className="w-full" />
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleResetTest} variant="outline">
                  Run New Test
                </Button>
                {testResultId && (
                  <Button variant="outline" onClick={() => {
                    const report = {
                      testResultId,
                      generationId,
                      status: testStatus,
                      error: testError,
                      outputUrl,
                      model: model.model_name,
                      timestamp: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `test-report-${testResultId}.json`;
                    a.click();
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
