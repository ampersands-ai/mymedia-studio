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

export default function ModelHealthTestPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data fetching
  const { data: allModels, isLoading: modelsLoading } = useModels();
  const { data: fullModel, isLoading: fullModelLoading } = useModelByRecordId(recordId);
  
  // Test-specific state
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testEndTime, setTestEndTime] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<'input' | 'validation' | 'generation' | 'storage' | 'output'>('input');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const outputSectionRef = useRef<HTMLDivElement>(null);
  
  // Custom Creation state (reuse exact same state management)
  const { 
    state, 
    updateState, 
    resetState,
    setPrompt: setStatePrompt,
    setSelectedModel: setStateSelectedModel,
  } = useCustomCreationState();

  // Get current model
  const model = allModels?.find((m) => m.record_id === recordId);
  const currentModel = fullModel;

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(currentModel);

  // Generation polling (same as Custom Creation)
  const { startPolling, stopPolling, isPolling } = useGenerationPolling({
    onComplete: async (outputs, parentId) => {
      setCurrentStage('output');
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
      toast.error('Test failed');
    },
    onTimeout: () => {
      setTestStatus('error');
      setTestError('Test timeout');
      setTestEndTime(Date.now());
      updateState({ localGenerating: false, pollingGenerationId: null });
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
  } = useImageUpload(currentModel);

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
    userTokens: 999999, // Bypass token check for testing
  });

  // Wrap generation with test tracking
  const handleStartTest = async () => {
    setTestStatus('running');
    setTestStartTime(Date.now());
    setTestError(null);
    setOutputUrl(null);
    setCurrentStage('validation');
    
    updateState({
      generationStartTime: Date.now(),
      localGenerating: true,
    });

    setTimeout(() => setCurrentStage('generation'), 500);
    
    try {
      await baseHandleGenerate();
      setCurrentStage('storage');
    } catch (error: any) {
      setTestStatus('error');
      setTestError(error.message);
      setTestEndTime(Date.now());
    }
  };

  const handleResetTest = () => {
    stopPolling();
    setTestStatus('idle');
    setTestStartTime(null);
    setTestEndTime(null);
    setTestError(null);
    setOutputUrl(null);
    setCurrentStage('input');
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
      const contentType = currentModel.content_type;
      let defaultPrompt = '';
      
      if (contentType === 'image_editing' || contentType === 'image_to_video') {
        defaultPrompt = "Change the attire of the person to black color";
      } else if (contentType === 'image') {
        defaultPrompt = getSurpriseMePrompt('prompt_to_image');
      } else if (contentType === 'video') {
        defaultPrompt = getSurpriseMePrompt('prompt_to_video');
      } else if (contentType === 'audio') {
        defaultPrompt = getSurpriseMePrompt('prompt_to_audio');
      } else {
        defaultPrompt = "Test prompt for model validation";
      }
      
      setStatePrompt(defaultPrompt);
    }
  }, [currentModel, state.prompt, setStatePrompt]);

  // Compute schema-derived values for InputPanel
  const modelSchema = currentModel?.input_schema;
  const textKey = schemaHelpers.findPrimaryTextKey(modelSchema?.properties);
  const voiceKey = schemaHelpers.findPrimaryVoiceKey(modelSchema?.properties, state.selectedModel || undefined);
  const hasPromptField = !!textKey;
  const isPromptRequired = (modelSchema?.required || []).includes(textKey || 'prompt');
  const maxPromptLength = schemaHelpers.getMaxPromptLength(currentModel, state.modelParameters.customMode);
  const hasDuration = !!(modelSchema?.properties?.duration);
  const hasIncrement = !!(modelSchema?.properties?.increment || modelSchema?.properties?.incrementBySeconds);
  
  const advancedOptionsRef = useRef<HTMLDivElement>(null);
  const contentType = currentModel?.content_type || 'image';

  const isGenerateDisabled = 
    isGenerating || 
    state.localGenerating || 
    !state.selectedModel ||
    (imageFieldInfo.isRequired && uploadedImages.length === 0) ||
    testStatus === 'running';

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

  if (!model || !fullModel) {
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
              <p className="mt-1">{Array.isArray(model.groups) ? model.groups.join(', ') : model.groups}</p>
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
            toast.success('Surprise prompt generated!');
          }}
          generatingSurprise={false}
          enhancePrompt={state.enhancePrompt}
          onEnhancePromptChange={(enhance) => updateState({ enhancePrompt: enhance })}
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
          textKeySchema={textKey ? modelSchema?.properties?.[textKey] : undefined}
          textKeyValue={state.modelParameters[textKey || '']}
          onTextKeyChange={(value) => updateState({ modelParameters: { ...state.modelParameters, [textKey || '']: value } })}
          voiceKey={voiceKey}
          voiceKeySchema={voiceKey ? modelSchema?.properties?.[voiceKey] : undefined}
          voiceKeyValue={state.modelParameters[voiceKey || '']}
          onVoiceKeyChange={(value) => updateState({ modelParameters: { ...state.modelParameters, [voiceKey || '']: value } })}
          hasDuration={hasDuration}
          durationValue={state.modelParameters.duration}
          durationSchema={hasDuration ? modelSchema?.properties?.duration : undefined}
          onDurationChange={(value) => updateState({ modelParameters: { ...state.modelParameters, duration: value } })}
          hasIncrement={hasIncrement}
          incrementValue={state.modelParameters.increment || state.modelParameters.incrementBySeconds}
          onIncrementChange={(value) => updateState({ modelParameters: { ...state.modelParameters, increment: value, incrementBySeconds: value } })}
          modelParameters={state.modelParameters}
          onModelParametersChange={(params) => updateState({ modelParameters: params })}
          modelSchema={modelSchema}
          advancedOpen={state.advancedOpen}
          onAdvancedOpenChange={(open) => updateState({ advancedOpen: open })}
          onGenerate={handleStartTest}
          isGenerating={isGenerating || state.localGenerating}
          estimatedTokens={estimatedTokens}
          modelId={state.selectedModel || ''}
          provider={currentModel?.provider || ''}
          excludeFields={['prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'fileUrls', 'reference_image_urls', 'frameImages', textKey || '', voiceKey || '', 'duration', 'increment', 'incrementBySeconds'].filter(Boolean) as string[]}
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

      {/* Execution Flow Visualizer (shown during test) */}
      {testStatus === 'running' && (
        <ExecutionFlowVisualizer
          currentStage={currentStage}
          error={testError}
        />
      )}

      {/* Test Results Card (shown after completion/error) */}
      {(testStatus === 'completed' || testStatus === 'error') && (
        <TestResultsCard
          status={testStatus}
          error={testError}
          outputUrl={outputUrl}
          contentType={contentType}
          onRunNewTest={handleResetTest}
          onDownloadReport={handleDownloadReport}
          generationId={state.pollingGenerationId}
        />
      )}
    </div>
  );
}
