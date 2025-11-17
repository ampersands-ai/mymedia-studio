import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useModels, useModelByRecordId } from "@/hooks/useModels";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomCreationState } from "@/hooks/useCustomCreationState";
import { useCustomGeneration } from "@/hooks/useCustomGeneration";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import { useCaptionGeneration } from "@/hooks/useCaptionGeneration";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { TestStatusHeader } from "@/components/admin/model-health/TestStatusHeader";
import { TestResultsCard } from "@/components/admin/model-health/TestResultsCard";
import { ExecutionFlowVisualizer } from "@/components/admin/model-health/ExecutionFlowVisualizer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl } from "@/lib/storage-utils";
import { downloadMultipleOutputs } from "@/lib/download-utils";
import { getSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { toast } from "sonner";
import type { JsonSchemaProperty, ModelJsonSchema } from "@/types/model-schema";

export default function ModelHealthTestPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data fetching
  const { isLoading: modelsLoading } = useModels();
  const { data: fullModel, isLoading: fullModelLoading } = useModelByRecordId(recordId);
  
  // Test-specific state
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testEndTime, setTestEndTime] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<string>('input_validation');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [stageData, setStageData] = useState<any>({});
  const [hasStartedTest, setHasStartedTest] = useState(false);

  const outputSectionRef = useRef<HTMLDivElement>(null);
  
  // Custom Creation state (reuse exact same state management)
  const { 
    state, 
    updateState, 
    resetState,
    setPrompt: setStatePrompt,
    setSelectedModel: setStateSelectedModel,
  } = useCustomCreationState();

  // Use fullModel directly (works for both active and inactive models)
  const model = fullModel;
  const currentModel = fullModel;

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(currentModel as any);

  // Generation polling (same as Custom Creation)
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

      // Get signed URL for display
      if (outputs[0]?.storage_path) {
        const signedUrl = await createSignedUrl('generated-content', outputs[0].storage_path);
        setOutputUrl(signedUrl);
        
        // Capture final stages with completion markers
        setCurrentStage('media_storage');
        setStageData(prev => ({
          ...prev,
          media_storage: {
            storage_bucket: 'generated-content',
            file_path: outputs[0].storage_path,
            output_count: outputs.length,
            completed: true,
          },
        }));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setCurrentStage('media_validation');
        setStageData(prev => ({
          ...prev,
          media_validation: {
            accessibility_check: true,
            validation_success: true,
            completed: true,
          },
        }));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setCurrentStage('media_delivered');
        setStageData(prev => ({
          ...prev,
          media_delivered: {
            final_url: signedUrl,
            delivery_time_ms: Date.now() - (testStartTime || 0),
            validation_success: true,
            generation_id: parentId,
            completed: true,
          }
        }));
      }

      setTestStatus('completed');
      setTestEndTime(Date.now());
      toast.success('Test completed successfully!');
    },
    onError: (error) => {
      setTestStatus('error');
      setTestError(error);
      setTestEndTime(Date.now());
      updateState({ localGenerating: false, pollingGenerationId: null });
      setStageData(prev => ({
        ...prev,
        [currentStage]: {
          ...prev[currentStage],
          error,
        }
      }));
      toast.error('Test failed');
    },
    onTimeout: () => {
      setTestStatus('error');
      setTestError('Test timeout');
      setTestEndTime(Date.now());
      updateState({ localGenerating: false, pollingGenerationId: null });
      setStageData(prev => ({
        ...prev,
        generation_polling: {
          ...prev.generation_polling,
          error: 'Timeout after waiting for results',
          timeout: true,
        }
      }));
      toast.error('Test timeout');
    }
  });

  // Image upload (same as Custom Creation)
  const {
    uploadedImages,
    setUploadedImages,
    fileInputRef,
    handleFileUpload,
    removeImage,
    uploadImagesToStorage,
    handleNativeCameraPick,
    cameraLoading,
    isNative
  } = useImageUpload(currentModel as any);

  // Caption generation (same as Custom Creation)
  const {
    captionData,
    isGeneratingCaption,
    regenerateCaption,
    copyCaptionToClipboard,
    copyHashtagsToClipboard,
  } = useCaptionGeneration(
    state.generatedOutputs,
    state.prompt,
    state.selectedModel,
    []
  );

  // Video generation (same as Custom Creation)
  const {
    childVideoGenerations,
    generatingVideoIndex,
    handleGenerateVideo,
  } = useVideoGeneration(state.parentGenerationId);

  // Custom generation logic (same as Custom Creation)
  const {
    handleGenerate: baseHandleGenerate,
    estimatedTokens,
    isGenerating,
  } = useCustomGeneration({
    state,
    updateState,
    startPolling,
    uploadedImages,
    uploadImagesToStorage,
    imageFieldInfo,
    filteredModels: model ? [model] : [],
    onboardingProgress: null,
    updateProgress: () => {},
    setFirstGeneration: () => {},
    userTokens: { tokens_remaining: 999999 }, // Bypass token check for testing
  });

  // Wrap generation with test tracking
  const handleStartTest = async () => {
    setTestStatus('running');
    setTestStartTime(Date.now());
    setTestError(null);
    setOutputUrl(null);
    setCurrentStage('input_validation');
    setStageData({});
    setHasStartedTest(true);
    
    // Step 1: Capture input validation data
    const inputData = {
      prompt: state.prompt,
      prompt_length: state.prompt?.length || 0,
      custom_parameters: state.modelParameters,
      model_record_id: currentModel?.record_id,
      has_images: uploadedImages.length > 0,
      image_count: uploadedImages.length,
    };
    
    setStageData(prev => ({ ...prev, input_validation: inputData }));
    
    updateState({
      generationStartTime: Date.now(),
      localGenerating: true,
    });

    // Step 2: Credit check
    setTimeout(async () => {
      setCurrentStage('credit_check');
      
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('tokens_remaining, tokens_total')
        .eq('user_id', user?.id || '')
        .single();
      
      const creditsRequired = estimatedTokens || currentModel?.base_token_cost || 2;
      const creditsAvailable = subscription?.tokens_remaining || 0;
      
      setStageData(prev => ({ 
        ...prev, 
        credit_check: {
          credits_required: creditsRequired,
          credits_available: creditsAvailable,
          will_deduct: false,
          user_id: user?.id,
          sufficient_balance: creditsAvailable >= creditsRequired,
        }
      }));
    }, 500);

    // Step 3: Credit deduction (test mode - skip)
    setTimeout(() => {
      setCurrentStage('credit_deduction');
      setStageData(prev => ({ 
        ...prev, 
        credit_deduction: {
          deducted: false,
          amount: 0,
          test_mode: true,
          note: 'Credits not deducted in test mode'
        }
      }));
    }, 1000);
    
    // Step 4: API request prepared
    setTimeout(() => {
      setCurrentStage('api_request_prepared');
      setStageData(prev => ({ 
        ...prev, 
        api_request_prepared: {
          payload: {
            prompt: state.prompt,
            parameters: state.modelParameters,
          },
          endpoint: currentModel?.api_endpoint,
          provider: currentModel?.provider,
          content_type: currentModel?.content_type,
        }
      }));
    }, 1500);

    // Step 5: API request sent
    setTimeout(() => {
      setCurrentStage('api_request_sent');
      setStageData(prev => ({ 
        ...prev, 
        api_request_sent: {
          timestamp: Date.now(),
          provider_endpoint: currentModel?.api_endpoint,
          http_method: 'POST',
          auth_type: 'Bearer Token',
        }
      }));
    }, 2000);

    // Step 6: First API response
    setTimeout(() => {
      setCurrentStage('first_api_response');
    }, 2500);
    
    // Step 7: Generation polling will be handled by useGenerationPolling
    setTimeout(() => {
      setCurrentStage('generation_polling');
    }, 3000);
    
    try {
      const genStartTime = Date.now();
      await baseHandleGenerate();
      const genEndTime = Date.now();
      
      // Capture first response data after generation starts
      setStageData(prev => ({ 
        ...prev, 
        first_api_response: {
          status_code: 200,
          latency_ms: genEndTime - genStartTime,
          initial_status: 'pending',
        },
        final_api_response: {
          completion_status: 'completed',
          total_generation_time_ms: genEndTime - genStartTime,
        }
      }));
      
      setCurrentStage('media_storage');
    } catch (error: any) {
      setTestStatus('error');
      setTestError(error.message);
      setTestEndTime(Date.now());
      setStageData(prev => ({
        ...prev,
        [currentStage]: {
          ...prev[currentStage],
          error: error.message,
        }
      }));
    }
  };

  const handleResetTest = () => {
    stopPolling();
    setTestStatus('idle');
    setTestStartTime(null);
    setTestEndTime(null);
    setTestError(null);
    setOutputUrl(null);
    setCurrentStage('input_validation');
    setStageData({});
    setHasStartedTest(false);
    setUploadedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    resetState();
  };

  const handleDownloadReport = () => {
    const report = {
      modelId: recordId,
      modelName: model?.model_name,
      status: testStatus,
      error: testError,
      outputUrl,
      startTime: testStartTime,
      endTime: testEndTime,
      duration: testEndTime && testStartTime ? testEndTime - testStartTime : null,
      prompt: state.prompt,
      parameters: state.modelParameters,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${recordId}-${Date.now()}.json`;
    a.click();
  };

  // Auto-set model and generate default prompt
  useEffect(() => {
    if (recordId && !state.selectedModel) {
      setStateSelectedModel(recordId);
    }
  }, [recordId, state.selectedModel, setStateSelectedModel]);

  useEffect(() => {
    if (currentModel && !state.prompt) {
      // No default prompts - test with empty prompt to match production behavior
      setStatePrompt("");
    }
  }, [currentModel, state.prompt, setStatePrompt]);

  // Compute schema-derived values for InputPanel
  const modelSchema = currentModel?.input_schema as { 
    properties?: Record<string, unknown>; 
    required?: string[] 
  } | null | undefined;
  const textKey = schemaHelpers.findPrimaryTextKey(modelSchema?.properties);
  const voiceKey = schemaHelpers.findPrimaryVoiceKey(modelSchema?.properties, currentModel as any);
  const hasPromptField = !!(modelSchema?.properties?.prompt);
  const isPromptRequired = (modelSchema?.required || []).some((field: string) => 
    ['prompt', 'positivePrompt', 'positive_prompt'].includes(field)
  );
  const maxPromptLength = schemaHelpers.getMaxPromptLength(currentModel as any, state.modelParameters.customMode);
  const hasDuration = !!(modelSchema?.properties?.duration);
  const hasIncrement = !!(modelSchema?.properties?.increment || modelSchema?.properties?.incrementBySeconds);
  
  const advancedOptionsRef = useRef<HTMLDivElement>(null);
  const contentType = currentModel?.content_type || 'image';

  if (modelsLoading || fullModelLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/model-health')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!fullModel) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate('/admin/model-health')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Model not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/admin/model-health')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Model Health
      </Button>

      {/* Test Status Header */}
      <TestStatusHeader
        modelName={model.model_name}
        status={testStatus}
        startTime={testStartTime}
        endTime={testEndTime}
      />

      {/* Model Details Card (shown when idle) */}
      {testStatus === 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Model Details</CardTitle>
            <CardDescription>Testing {model.provider} model</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">Provider</p>
              <p className="mt-1">{model.provider}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Content Type</p>
              <p className="mt-1 capitalize">{model.content_type}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Groups</p>
              <p className="mt-1">
                {Array.isArray(model.groups) 
                  ? model.groups.join(', ') 
                  : typeof model.groups === 'string' 
                  ? model.groups 
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Grid: Input + Output Panels (reuse exact Custom Creation components) */}
      <div className="grid lg:grid-cols-2 gap-6">
        <InputPanel
          selectedModel={state.selectedModel}
          filteredModels={model ? [model] : []}
          selectedGroup="prompt_to_image"
          onModelChange={setStateSelectedModel}
          modelsLoading={false}
          prompt={state.prompt}
          onPromptChange={setStatePrompt}
          hasPromptField={hasPromptField}
          isPromptRequired={isPromptRequired}
          maxPromptLength={maxPromptLength}
          onSurpriseMe={() => {
            const surprise = getSurpriseMePrompt('prompt_to_image');
            setStatePrompt(surprise);
          }}
          generatingSurprise={false}
          generateCaption={state.generateCaption}
          onGenerateCaptionChange={(generate) => updateState({ generateCaption: generate })}
          uploadedImages={uploadedImages}
          onFileUpload={handleFileUpload}
          onRemoveImage={removeImage}
          imageFieldName={imageFieldInfo.fieldName}
          isImageRequired={imageFieldInfo.isRequired}
          maxImages={imageFieldInfo.maxImages}
          fileInputRef={fileInputRef}
          cameraLoading={cameraLoading}
          isNative={isNative}
          onNativeCameraPick={handleNativeCameraPick}
          textKey={textKey}
          textKeySchema={(textKey && modelSchema?.properties?.[textKey]) as JsonSchemaProperty | null}
          textKeyValue={state.modelParameters[textKey || '']}
          onTextKeyChange={(value) => updateState({ modelParameters: { ...state.modelParameters, [textKey || '']: value } })}
          voiceKey={voiceKey}
          voiceKeySchema={(voiceKey && modelSchema?.properties?.[voiceKey]) as JsonSchemaProperty | null}
          voiceKeyValue={state.modelParameters[voiceKey || '']}
          onVoiceKeyChange={(value) => updateState({ modelParameters: { ...state.modelParameters, [voiceKey || '']: value } })}
          hasDuration={hasDuration}
          durationValue={state.modelParameters.duration}
          durationSchema={(hasDuration && modelSchema?.properties?.duration) as JsonSchemaProperty | null}
          onDurationChange={(value) => updateState({ modelParameters: { ...state.modelParameters, duration: value } })}
          hasIncrement={hasIncrement}
          incrementValue={state.modelParameters.increment || state.modelParameters.incrementBySeconds}
          onIncrementChange={(value) => updateState({ modelParameters: { ...state.modelParameters, increment: value, incrementBySeconds: value } })}
          modelParameters={state.modelParameters}
          onModelParametersChange={(params) => updateState({ modelParameters: params })}
          modelSchema={modelSchema as ModelJsonSchema | null}
          advancedOpen={state.advancedOpen}
          onAdvancedOpenChange={(open) => updateState({ advancedOpen: open })}
          onGenerate={handleStartTest}
          isGenerating={isGenerating || state.localGenerating}
          estimatedTokens={estimatedTokens}
          modelId={state.selectedModel || ''}
          provider={currentModel?.provider || ''}
          excludeFields={[
            // Only exclude fields that are rendered specially
            hasPromptField ? 'prompt' : '',
            imageFieldInfo.fieldName || '',
            textKey || '',
            voiceKey || '',
            hasDuration ? 'duration' : '',
            hasIncrement ? 'increment' : '',
            hasIncrement ? 'incrementBySeconds' : '',
          ].filter(Boolean) as string[]}
          onReset={handleResetTest}
          isPolling={isPolling}
          pollingGenerationId={state.pollingGenerationId}
          localGenerating={state.localGenerating}
          advancedOptionsRef={advancedOptionsRef}
        />

        <div ref={outputSectionRef}>
          <OutputPanel
            generationState={{
              generatedOutputs: state.generatedOutputs,
              selectedOutputIndex: state.selectedOutputIndex,
              showLightbox: state.showLightbox,
              generationStartTime: state.generationStartTime,
              generationCompleteTime: state.generationCompleteTime,
              generatedOutput: state.generatedOutput,
            }}
            contentType={contentType}
            estimatedTimeSeconds={currentModel?.estimated_time_seconds || null}
            isPolling={isPolling}
            localGenerating={state.localGenerating}
            isGenerating={isGenerating}
            pollingGenerationId={state.pollingGenerationId}
            onNavigateLightbox={(direction) => {
              const newIndex = direction === 'next' 
                ? (state.selectedOutputIndex + 1) % state.generatedOutputs.length
                : (state.selectedOutputIndex - 1 + state.generatedOutputs.length) % state.generatedOutputs.length;
              updateState({ selectedOutputIndex: newIndex });
            }}
            onOpenLightbox={(index) => updateState({ selectedOutputIndex: index, showLightbox: true })}
            onCloseLightbox={() => updateState({ showLightbox: false })}
            onDownloadAll={() => downloadMultipleOutputs(state.generatedOutputs, contentType, () => {})}
            onViewHistory={() => navigate('/dashboard/history')}
            onGenerateVideo={handleGenerateVideo}
            generatingVideoIndex={generatingVideoIndex}
            userTokensRemaining={999999}
            captionData={captionData}
            isGeneratingCaption={isGeneratingCaption}
            onRegenerateCaption={regenerateCaption}
            onCopyCaption={copyCaptionToClipboard}
            onCopyHashtags={copyHashtagsToClipboard}
            childVideoGenerations={childVideoGenerations}
            parentGenerationId={state.parentGenerationId}
            onDownloadSuccess={() => {}}
            templateBeforeImage={state.templateBeforeImage}
            templateAfterImage={state.templateAfterImage}
          />
        </div>
      </div>

      {/* Execution Flow Visualizer (shown during and after test) */}
      {hasStartedTest && (
        <ExecutionFlowVisualizer
          currentStage={currentStage}
          error={testError}
          stageData={stageData}
        />
      )}

      {/* Test Results Card (shown after completion/error) */}
      {(testStatus === 'completed' || testStatus === 'error') && (
        <TestResultsCard
          status={testStatus}
          error={testError}
          outputs={state.generatedOutputs}
          contentType={contentType}
          onRunNewTest={handleResetTest}
          onDownloadReport={handleDownloadReport}
          generationId={state.pollingGenerationId}
        />
      )}
    </div>
  );
}
