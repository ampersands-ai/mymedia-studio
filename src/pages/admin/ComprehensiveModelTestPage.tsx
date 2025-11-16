import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useModelByRecordId } from "@/hooks/useModels";
import { useAllModels } from "@/hooks/useAllModels";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomCreationState } from "@/hooks/useCustomCreationState";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ParametersInspector } from "@/components/admin/model-health/ParametersInspector";
import { TestStatusHeader } from "@/components/admin/model-health/TestStatusHeader";
import { TestResultsCard } from "@/components/admin/model-health/TestResultsCard";
import { ExecutionFlowVisualizer } from "@/components/admin/model-health/ExecutionFlowVisualizer";
import { PayloadReviewCard } from "@/components/admin/model-health/PayloadReviewCard";
import { ExecutionControlPanel } from "@/components/admin/model-health/ExecutionControlPanel";
import { ArrowLeft, Download, FileJson, Eye, BookOpen, ArrowUpToLine, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl } from "@/lib/storage-utils";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AIModel = Database['public']['Tables']['ai_models']['Row'];

export default function ComprehensiveModelTestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data fetching
  const { data: allModels, isLoading: modelsLoading } = useAllModels();
  const [selectedModelRecordId, setSelectedModelRecordId] = useState<string | null>(null);
  const { data: fullModel, isLoading: fullModelLoading } = useModelByRecordId(selectedModelRecordId);

  // Original defaults tracking (customParameters removed - now using state.modelParameters)
  const [originalDefaults, setOriginalDefaults] = useState<Record<string, any>>({});
  const [originalAdvancedFlags, setOriginalAdvancedFlags] = useState<Record<string, boolean>>({});

  // Documentation state
  const [documentationStatus, setDocumentationStatus] = useState<'unknown' | 'exists' | 'missing'>('unknown');
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [documentationData, setDocumentationData] = useState<any>(null);

  // Schema push confirmation dialog
  const [confirmPushDialog, setConfirmPushDialog] = useState<{
    open: boolean;
    paramKey: string | null;
    newValue: any;
  }>({ open: false, paramKey: null, newValue: null });

  // Test execution state
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [testPhase, setTestPhase] = useState<'idle' | 'preparing' | 'review' | 'executing' | 'complete' | 'error'>('idle');
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testEndTime, setTestEndTime] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('input_validation');
  const [stageData, setStageData] = useState<any>({});
  const [preparedPayload, setPreparedPayload] = useState<any>(null);
  const [payloadEditable, setPayloadEditable] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const outputSectionRef = useRef<HTMLDivElement>(null);

  // Custom Creation state
  const { 
    state, 
    updateState, 
    resetState,
    setPrompt: setStatePrompt,
  } = useCustomCreationState();

  const model = fullModel;

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();

  // Image upload - simplified for test page
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);

  // Generation polling
  const { startPolling, stopPolling, isPolling } = useGenerationPolling({
    onComplete: async (outputs, parentId) => {
      setCurrentStage('media_delivered');
      updateState({
        generatedOutputs: outputs,
        generatedOutput: outputs[0]?.storage_path || null,
        selectedOutputIndex: 0,
        generationCompleteTime: Date.now(),
        localGenerating: false,
        pollingGenerationId: null,
        parentGenerationId: parentId || null,
      });

      if (outputs[0]?.storage_path) {
        const signedUrl = await createSignedUrl('generated-content', outputs[0].storage_path);
        setOutputUrl(signedUrl);
        
        setCurrentStage('media_storage');
        setStageData(prev => ({
          ...prev,
          media_storage: {
            bucket: 'generated-content',
            path: outputs[0].storage_path,
            outputs_count: outputs.length,
          },
        }));
      }

      setTestStatus('completed');
      setTestPhase('complete');
      setTestEndTime(Date.now());
      toast.success('Test completed successfully');
      
      outputSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    },
    onError: (error) => {
      setTestError(error);
      setTestStatus('error');
      setTestPhase('error');
      setTestEndTime(Date.now());
      updateState({ localGenerating: false });
      toast.error('Test failed: ' + error);
    },
    onTimeout: () => {
      setTestError('Test timed out');
      setTestStatus('error');
      setTestPhase('error');
      setTestEndTime(Date.now());
      updateState({ localGenerating: false });
      toast.error('Test timed out');
    },
  });

  // Simplified generation for test page
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize parameters when model changes
  useEffect(() => {
    if (fullModel?.input_schema) {
      const schema = fullModel.input_schema as any;
      const properties = schema.properties || {};
      
      const defaults: Record<string, any> = {};
      const advancedFlags: Record<string, boolean> = {};
      
      Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        if (prop.default !== undefined) {
          defaults[key] = prop.default;
        }
        advancedFlags[key] = prop.isAdvanced || false;
      });
      
      updateState({ modelParameters: defaults });
      setOriginalDefaults(defaults);
      setOriginalAdvancedFlags(advancedFlags);
    }
  }, [fullModel]);

  // Check documentation status
  useEffect(() => {
    if (!fullModel?.record_id) return;
    
    const checkDocStatus = async () => {
      const { data, error } = await supabase
        .from('model_documentation')
        .select('id')
        .eq('model_record_id', fullModel.record_id)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking documentation:', error);
        return;
      }
      
      setDocumentationStatus(data ? 'exists' : 'missing');
    };
    
    checkDocStatus();
  }, [fullModel?.record_id]);

  const handleParameterChange = (key: string, value: any) => {
    updateState({ 
      modelParameters: { 
        ...state.modelParameters, 
        [key]: value 
      } 
    });
  };

  const handleResetToDefaults = () => {
    updateState({ modelParameters: { ...originalDefaults } });
    toast.success('Parameters reset to defaults');
  };

  const handleExportConfiguration = () => {
    const config = {
      model_id: fullModel?.id,
      model_name: fullModel?.model_name,
      parameters: state.modelParameters,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullModel?.model_name}-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Configuration exported');
  };

  const handleGenerateDocumentation = async () => {
    if (!fullModel?.record_id) return;
    
    setIsGeneratingDocs(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-model-docs', {
        body: { modelRecordId: fullModel.record_id }
      });
      
      if (error) throw error;
      
      toast.success('Documentation generated successfully');
      setDocumentationStatus('exists');
      setDocumentationData(data);
    } catch (error) {
      console.error('Error generating documentation:', error);
      toast.error('Failed to generate documentation');
    } finally {
      setIsGeneratingDocs(false);
    }
  };

  const getModifiedParameters = (): string[] => {
    const modified: string[] = [];
    
    Object.keys(state.modelParameters).forEach(key => {
      if (state.modelParameters[key] !== originalDefaults[key]) {
        modified.push(key);
      }
    });
    
    const schema = fullModel?.input_schema as any;
    const properties = schema?.properties || {};
    Object.keys(properties).forEach(key => {
      const currentAdvanced = properties[key].isAdvanced || false;
      if (currentAdvanced !== originalAdvancedFlags[key]) {
        if (!modified.includes(key)) {
          modified.push(key);
        }
      }
    });
    
    return modified;
  };

  const handlePushParameterToSchema = (paramKey: string) => {
    setConfirmPushDialog({
      open: true,
      paramKey,
      newValue: state.modelParameters[paramKey],
    });
  };

  const handleConfirmPushToSchema = async () => {
    const { paramKey, newValue } = confirmPushDialog;
    if (!paramKey || !fullModel) return;
    
    try {
      const schema = { ...(fullModel.input_schema as any) };
      schema.properties[paramKey].default = newValue;
      
      const { error } = await supabase
        .from('ai_models')
        .update({ input_schema: schema })
        .eq('record_id', fullModel.record_id);
      
      if (error) throw error;
      
      const { data: updatedModel } = await supabase
        .from('ai_models')
        .select()
        .eq('record_id', fullModel.record_id)
        .single();
      
      if (updatedModel) {
        setOriginalDefaults(prev => ({
          ...prev,
          [paramKey]: newValue,
        }));
      }
      
      toast.success(`Updated default for ${paramKey}`);
    } catch (error) {
      console.error('Error updating schema:', error);
      toast.error('Failed to update schema');
    } finally {
      setConfirmPushDialog({ open: false, paramKey: null, newValue: null });
    }
  };

  const handleToggleAdvanced = async (paramKey: string) => {
    if (!fullModel) return;
    
    try {
      const schema = { ...(fullModel.input_schema as any) };
      const currentAdvanced = schema.properties[paramKey].isAdvanced || false;
      schema.properties[paramKey].isAdvanced = !currentAdvanced;
      
      const { error } = await supabase
        .from('ai_models')
        .update({ input_schema: schema })
        .eq('record_id', fullModel.record_id);
      
      if (error) throw error;
      
      const { data: updatedModel } = await supabase
        .from('ai_models')
        .select()
        .eq('record_id', fullModel.record_id)
        .single();
      
      if (updatedModel) {
        setOriginalAdvancedFlags(prev => ({
          ...prev,
          [paramKey]: !currentAdvanced,
        }));
      }
      
      toast.success(`Moved ${paramKey} to ${!currentAdvanced ? 'advanced' : 'user-visible'} options`);
    } catch (error) {
      console.error('Error toggling advanced:', error);
      toast.error('Failed to update parameter visibility');
    }
  };

  const handlePushAllToSchema = async () => {
    if (!fullModel) return;
    
    const modified = getModifiedParameters();
    if (modified.length === 0) {
      toast.info('No modified parameters to push');
      return;
    }
    
    try {
      const schema = { ...(fullModel.input_schema as any) };
      
      modified.forEach(key => {
        if (state.modelParameters[key] !== originalDefaults[key]) {
          schema.properties[key].default = state.modelParameters[key];
        }
      });
      
      const { error } = await supabase
        .from('ai_models')
        .update({ input_schema: schema })
        .eq('record_id', fullModel.record_id);
      
      if (error) throw error;
      
      setOriginalDefaults({ ...state.modelParameters });
      setOriginalAdvancedFlags(prev => {
        const updated = { ...prev };
        Object.keys(schema.properties).forEach(key => {
          updated[key] = schema.properties[key].isAdvanced || false;
        });
        return updated;
      });
      
      toast.success(`Updated ${modified.length} parameter defaults`);
    } catch (error) {
      console.error('Error pushing to schema:', error);
      toast.error('Failed to update schema');
    }
  };

  const prepareApiPayload = useCallback(async () => {
    setCurrentStage('input_validation');
    setStageData(prev => ({
      ...prev,
      input_validation: {
        prompt: state.prompt,
        model: fullModel?.model_name,
        modelParameters: state.modelParameters,
        uploadedImages: uploadedImages.length,
      },
    }));

    setCurrentStage('parameter_merge');
    const mergedParams = {
      ...state.modelParameters,
      prompt: state.prompt,
    };
    setStageData(prev => ({
      ...prev,
      parameter_merge: {
        userParams: state.modelParameters,
        backendParams: fullModel?.input_schema,
        merged: mergedParams,
      },
    }));

    setCurrentStage('payload_preparation');
    const payload = {
      provider: fullModel?.provider,
      modelId: fullModel?.id,
      modelRecordId: fullModel?.record_id,
      endpoint: fullModel?.api_endpoint,
      method: 'POST',
      parameters: mergedParams,
      uploadedImages: uploadedImages.map(img => img.name),
    };
    
    setStageData(prev => ({
      ...prev,
      payload_preparation: payload,
    }));

    return payload;
  }, [state.prompt, state.modelParameters, uploadedImages, fullModel]);

  const handleStartTest = async () => {
    if (!state.prompt?.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setTestStatus('running');
    setTestPhase('preparing');
    setTestStartTime(Date.now());
    setTestError(null);
    
    try {
      const payload = await prepareApiPayload();
      setPreparedPayload(payload);
      setTestPhase('review');
    } catch (error) {
      console.error('Error preparing test:', error);
      setTestError(error instanceof Error ? error.message : 'Failed to prepare test');
      setTestStatus('error');
      setTestPhase('error');
    }
  };

  const handleContinueTest = async () => {
    setTestPhase('executing');
    setCurrentStage('api_request');
    setIsGenerating(true);
    
    try {
      setStageData(prev => ({
        ...prev,
        api_request: {
          endpoint: preparedPayload.endpoint,
          method: preparedPayload.method,
          timestamp: new Date().toISOString(),
        },
      }));

      // Call the generate-content edge function
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          modelId: fullModel?.id,
          modelRecordId: fullModel?.record_id,
          prompt: state.prompt,
          parameters: state.modelParameters,
        }
      });

      if (error) throw error;

      setCurrentStage('api_response');
      setStageData(prev => ({
        ...prev,
        api_response: data,
      }));

      // Start polling for results
      if (data.generationId) {
        updateState({ pollingGenerationId: data.generationId });
        startPolling(data.generationId);
      }
      
    } catch (error) {
      console.error('Error executing test:', error);
      setTestError(error instanceof Error ? error.message : 'Test execution failed');
      setTestStatus('error');
      setTestPhase('error');
      setTestEndTime(Date.now());
      setIsGenerating(false);
    }
  };

  const handleCancelTest = () => {
    setTestStatus('idle');
    setTestPhase('idle');
    setPreparedPayload(null);
    setPayloadEditable(false);
    setTestError(null);
    stopPolling();
    updateState({ localGenerating: false });
    toast.info('Test cancelled');
  };

  const handleRunNewTest = () => {
    resetState();
    setTestStatus('idle');
    setTestPhase('idle');
    setTestStartTime(null);
    setTestEndTime(null);
    setTestError(null);
    setPreparedPayload(null);
    setPayloadEditable(false);
    setCurrentStage('input_validation');
    setStageData({});
    setOutputUrl(null);
  };

  const handleDownloadReport = () => {
    const report = {
      model: fullModel?.model_name,
      status: testStatus,
      startTime: testStartTime,
      endTime: testEndTime,
      duration: testEndTime && testStartTime ? testEndTime - testStartTime : null,
      parameters: state.modelParameters,
      stages: stageData,
      outputs: state.generatedOutputs,
      error: testError,
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const modifiedParameters = getModifiedParameters();

  if (modelsLoading || fullModelLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/model-health')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Model Testing</h1>
          <p className="text-muted-foreground">Inspect, configure, and test AI models with full transparency</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Model</CardTitle>
          <CardDescription>Choose a model to inspect and test</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedModelRecordId || ''} onValueChange={setSelectedModelRecordId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model..." />
            </SelectTrigger>
            <SelectContent>
              {allModels?.map(model => (
                <SelectItem key={model.record_id} value={model.record_id}>
                  {model.model_name} - {model.provider}
                  {!model.is_active && <Badge variant="outline" className="ml-2">Inactive</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {fullModel && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{fullModel.model_name}</CardTitle>
                  <CardDescription className="space-y-1 mt-2">
                    <div className="flex gap-2">
                      <Badge>{fullModel.provider}</Badge>
                      <Badge variant="outline">{fullModel.content_type}</Badge>
                      {!fullModel.is_active && <Badge variant="destructive">Inactive</Badge>}
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportConfiguration}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Config
                  </Button>
                  {documentationStatus === 'exists' && (
                    <Button variant="outline" size="sm" onClick={() => setShowDocumentation(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Docs
                    </Button>
                  )}
                  {documentationStatus === 'missing' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleGenerateDocumentation}
                      disabled={isGeneratingDocs}
                    >
                      {isGeneratingDocs ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <BookOpen className="h-4 w-4 mr-2" />
                      )}
                      Generate Docs
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Base Cost</p>
                  <p className="font-medium">{fullModel.base_token_cost} credits</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Est. Time</p>
                  <p className="font-medium">{fullModel.estimated_time_seconds}s</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Images</p>
                  <p className="font-medium">{fullModel.max_images || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Default Outputs</p>
                  <p className="font-medium">{fullModel.default_outputs || 1}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <ParametersInspector
            schema={fullModel.input_schema as any}
            parameters={state.modelParameters}
            onParameterChange={handleParameterChange}
            modifiedParameters={modifiedParameters}
            onPushParameterToSchema={handlePushParameterToSchema}
            onPushAllToSchema={modifiedParameters.length > 0 ? handlePushAllToSchema : undefined}
            onToggleAdvanced={handleToggleAdvanced}
          />

          <Separator />

          {testStatus === 'idle' && (
            <div className="flex justify-center pt-4">
              <Button 
                onClick={handleStartTest} 
                disabled={isGenerating}
                size="lg"
                className="min-w-[200px]"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Start Test
              </Button>
            </div>
          )}

          {testStatus !== 'idle' && (
            <>
              <TestStatusHeader
                modelName={fullModel.model_name}
                status={testStatus}
                startTime={testStartTime}
                endTime={testEndTime}
              />

              <ExecutionControlPanel
                phase={testPhase}
                onContinue={handleContinueTest}
                onCancel={handleCancelTest}
                onToggleEdit={() => setPayloadEditable(!payloadEditable)}
                isEditing={payloadEditable}
                disabled={isGenerating}
              />

              {testPhase === 'review' && preparedPayload && (
                <PayloadReviewCard
                  payload={preparedPayload}
                  onPayloadChange={setPreparedPayload}
                  editable={payloadEditable}
                  onToggleEdit={() => setPayloadEditable(!payloadEditable)}
                />
              )}

              {(testPhase === 'executing' || testPhase === 'complete' || testPhase === 'error') && (
                <ExecutionFlowVisualizer
                  currentStage={currentStage}
                  error={testError}
                  stageData={stageData}
                />
              )}

              {(testStatus === 'completed' || testStatus === 'error') && (
                <TestResultsCard
                  status={testStatus}
                  error={testError}
                  outputs={state.generatedOutputs}
                  contentType={fullModel.content_type}
                  onRunNewTest={handleRunNewTest}
                  onDownloadReport={handleDownloadReport}
                  generationId={state.pollingGenerationId}
                />
              )}

              {state.generatedOutputs.length > 0 && (
                <div ref={outputSectionRef}>
                  <Card>
                    <CardHeader>
                      <CardTitle>Generated Outputs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {state.generatedOutputs.map((output, index) => (
                          <div key={output.id} className="border rounded p-2">
                            <p className="text-sm text-muted-foreground">Output {index + 1}</p>
                            <p className="text-xs font-mono break-all">{output.storage_path}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </>
      )}

      <AlertDialog open={confirmPushDialog.open} onOpenChange={(open) => !open && setConfirmPushDialog({ open: false, paramKey: null, newValue: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Parameter Default</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update the default value for "{confirmPushDialog.paramKey}" to:
              <pre className="mt-2 p-2 bg-muted rounded text-xs">
                {JSON.stringify(confirmPushDialog.newValue, null, 2)}
              </pre>
              This will modify the model's schema in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPushToSchema}>
              <ArrowUpToLine className="h-4 w-4 mr-2" />
              Update Schema
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDocumentation} onOpenChange={setShowDocumentation}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Model Documentation</DialogTitle>
            <DialogDescription>Generated documentation for {fullModel?.model_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {documentationData ? (
              <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                {JSON.stringify(documentationData, null, 2)}
              </pre>
            ) : (
              <p className="text-muted-foreground">Loading documentation...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
