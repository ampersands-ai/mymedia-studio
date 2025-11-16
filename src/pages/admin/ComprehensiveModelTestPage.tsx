import { useRef, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useModels } from "@/hooks/useModels";
import { useAllModels } from "@/hooks/useAllModels";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useCustomCreationState } from "@/hooks/useCustomCreationState";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useCustomGeneration } from "@/hooks/useCustomGeneration";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useCaptionGeneration } from "@/hooks/useCaptionGeneration";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { InspectionReviewCard } from "@/components/admin/model-health/InspectionReviewCard";
import { InspectionStepsDisplay } from "@/components/admin/model-health/InspectionStepsDisplay";
import { downloadMultipleOutputs } from "@/lib/download-utils";
import { getSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { toast } from "sonner";
import type { JsonSchemaProperty, ModelJsonSchema } from "@/types/model-schema";
import type { SchemaValue } from "@/types/custom-creation";

const ComprehensiveModelTestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outputSectionRef = useRef<HTMLDivElement>(null);
  const advancedOptionsRef = useRef<HTMLDivElement>(null);

  // State management - using exact same hooks as CustomCreation
  const { 
    state, 
    updateState, 
    resetState,
    setPrompt: setStatePrompt,
    setSelectedModel: setStateSelectedModel,
    setSelectedGroup: setStateSelectedGroup
  } = useCustomCreationState();

  // Inspection state (NEW - not in CustomCreation)
  const [inspectionMode, setInspectionMode] = useState<'disabled' | 'enabled' | 'reviewing'>('enabled');
  const [inspectionData, setInspectionData] = useState<Record<string, any>>({});

  // Models and user data - use ALL models for comprehensive testing
  const { data: allModelsUnfiltered, isLoading: modelsLoading } = useAllModels();
  const { data: userTokens } = useUserTokens();
  const { progress, updateProgress, setFirstGeneration } = useOnboarding();

  // For comprehensive testing, show ALL models (no group filtering)
  const filteredModels = useMemo(() => {
    return (allModelsUnfiltered as any)?.sort((a: any, b: any) => {
      return a.base_token_cost - b.base_token_cost;
    }) || [];
  }, [allModelsUnfiltered]);

  const currentModel = filteredModels.find((m: any) => m.record_id === state.selectedModel);

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(currentModel as any);

  // Generation polling
  const { startPolling, stopPolling, isPolling } = useGenerationPolling({
    onComplete: (outputs, parentId) => {
      updateState({
        generatedOutputs: outputs,
        generatedOutput: outputs[0]?.storage_path || null,
        selectedOutputIndex: 0,
        generationCompleteTime: Date.now(),
        localGenerating: false,
        pollingGenerationId: null,
        parentGenerationId: parentId || null,
      });

      if (progress && !progress.checklist.completedFirstGeneration) {
        updateProgress({ completedFirstGeneration: true });
        setFirstGeneration(outputs[0]?.id || '');
      }
      
      if (progress && !progress.checklist.viewedResult && outputs.length > 0) {
        updateProgress({ viewedResult: true });
      }

      // Capture inspection data
      setInspectionData(prev => ({
        ...prev,
        step11_outputs_displayed: { outputs, parentId }
      }));
    },
    onError: () => {
      updateState({
        localGenerating: false,
        generationStartTime: null,
        pollingGenerationId: null,
      });
    },
  });

  // Image upload
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

  // Caption generation
  const {
    captionData,
    isGeneratingCaption,
    generateCaption,
    regenerateCaption,
    copyCaptionToClipboard,
    copyHashtagsToClipboard,
  } = useCaptionGeneration(
    state.generatedOutputs,
    state.prompt,
    state.selectedModel,
    filteredModels
  );

  // Video generation
  const {
    childVideoGenerations,
    generatingVideoIndex,
    handleGenerateVideo,
  } = useVideoGeneration(state.parentGenerationId);

  // Custom generation
  const {
    handleGenerate,
    estimatedTokens,
    isGenerating,
  } = useCustomGeneration({
    state,
    updateState,
    startPolling,
    uploadedImages,
    uploadImagesToStorage,
    imageFieldInfo,
    filteredModels,
    onboardingProgress: progress,
    updateProgress,
    setFirstGeneration,
    userTokens: userTokens || null,
  });

  // Derived values (exact same logic as CustomCreation)
  const textKey = useMemo(() => {
    if (!currentModel?.input_schema) return null;
    const schema = currentModel.input_schema as ModelJsonSchema;
    if (!schema.properties) return null;
    
    return Object.keys(schema.properties).find(key => {
      const prop = schema.properties![key] as JsonSchemaProperty;
      return prop.type === 'string' && 
             prop.format !== 'data-url' && 
             key.toLowerCase().includes('text');
    }) || null;
  }, [currentModel]);

  const textKeySchema = useMemo(() => {
    if (!textKey || !currentModel?.input_schema) return null;
    const schema = currentModel.input_schema as ModelJsonSchema;
    return schema.properties?.[textKey] as JsonSchemaProperty || null;
  }, [textKey, currentModel]);

  const voiceKey = useMemo(() => {
    if (!currentModel?.input_schema) return null;
    const schema = currentModel.input_schema as ModelJsonSchema;
    if (!schema.properties) return null;
    
    return Object.keys(schema.properties).find(key => {
      const prop = schema.properties![key] as JsonSchemaProperty;
      return key.toLowerCase().includes('voice');
    }) || null;
  }, [currentModel]);

  const voiceKeySchema = useMemo(() => {
    if (!voiceKey || !currentModel?.input_schema) return null;
    const schema = currentModel.input_schema as ModelJsonSchema;
    return schema.properties?.[voiceKey] as JsonSchemaProperty || null;
  }, [voiceKey, currentModel]);

  const hasDuration = useMemo(() => {
    if (!currentModel?.input_schema) return false;
    const schema = currentModel.input_schema as ModelJsonSchema;
    if (!schema.properties) return false;
    return 'duration' in schema.properties;
  }, [currentModel]);

  const durationSchema = useMemo(() => {
    if (!hasDuration || !currentModel?.input_schema) return null;
    const schema = currentModel.input_schema as ModelJsonSchema;
    return schema.properties?.['duration'] as JsonSchemaProperty || null;
  }, [hasDuration, currentModel]);

  const hasIncrement = useMemo(() => {
    if (!currentModel?.input_schema) return false;
    const schema = currentModel.input_schema as ModelJsonSchema;
    if (!schema.properties) return false;
    return 'loop' in schema.properties;
  }, [currentModel]);

  const hasPromptField = useMemo(() => {
    if (!currentModel?.input_schema) return false;
    const schema = currentModel.input_schema as ModelJsonSchema;
    if (!schema.properties) return false;
    return 'prompt' in schema.properties;
  }, [currentModel]);

  const isPromptRequired = useMemo(() => {
    if (!currentModel?.input_schema) return false;
    const schema = currentModel.input_schema as ModelJsonSchema;
    return schema.required?.includes('prompt') || false;
  }, [currentModel]);

  const maxPromptLength = useMemo(() => {
    if (!currentModel?.input_schema) return undefined;
    const schema = currentModel.input_schema as ModelJsonSchema;
    const promptProp = schema.properties?.['prompt'] as JsonSchemaProperty;
    return promptProp?.maxLength;
  }, [currentModel]);

  const excludeFields = useMemo(() => {
    const fields = ['prompt'];
    if (imageFieldInfo.fieldName) fields.push(imageFieldInfo.fieldName);
    if (textKey) fields.push(textKey);
    if (voiceKey) fields.push(voiceKey);
    if (hasDuration) fields.push('duration');
    if (hasIncrement) fields.push('loop');
    return fields;
  }, [imageFieldInfo, textKey, voiceKey, hasDuration, hasIncrement]);

  const textKeyValue = state.modelParameters[textKey || ''];
  const voiceKeyValue = state.modelParameters[voiceKey || ''];
  const durationValue = state.modelParameters['duration'];
  const incrementValue = state.modelParameters['loop'];

  // Event handlers
  const handleModelChange = useCallback((modelId: string | null) => {
    setStateSelectedModel(modelId);
  }, [setStateSelectedModel]);

  const handlePromptChange = useCallback((prompt: string) => {
    setStatePrompt(prompt);
  }, [setStatePrompt]);

  const handleGenerateCaptionChange = useCallback((checked: boolean) => {
    updateState({ generateCaption: checked });
  }, [updateState]);

  const handleTextKeyChange = useCallback((value: string) => {
    if (!textKey) return;
    updateState({ modelParameters: { ...state.modelParameters, [textKey]: value } });
  }, [textKey, state.modelParameters, updateState]);

  const handleVoiceKeyChange = useCallback((value: string) => {
    if (!voiceKey) return;
    updateState({ modelParameters: { ...state.modelParameters, [voiceKey]: value } });
  }, [voiceKey, state.modelParameters, updateState]);

  const handleDurationChange = useCallback((value: SchemaValue) => {
    updateState({ modelParameters: { ...state.modelParameters, duration: value } });
  }, [state.modelParameters, updateState]);

  const handleIncrementChange = useCallback((value: boolean) => {
    updateState({ modelParameters: { ...state.modelParameters, loop: value } });
  }, [state.modelParameters, updateState]);

  const handleAdvancedOpenChange = useCallback((open: boolean) => {
    updateState({ advancedOpen: open });
  }, [updateState]);

  const handleModelParametersChange = useCallback((params: Record<string, any>) => {
    updateState({ modelParameters: params });
  }, [updateState]);

  const handleSurpriseMe = useCallback(() => {
    updateState({ generatingSurprise: true });
    try {
      const selectedPrompt = getSurpriseMePrompt(state.selectedGroup);
      updateState({ prompt: selectedPrompt, generatingSurprise: false });
      toast.success('Prompt loaded!');
    } catch (error) {
      toast.error("Failed to load prompt");
      updateState({ generatingSurprise: false });
    }
  }, [state.selectedGroup, updateState]);

  const handleReset = useCallback(() => {
    updateState({ showResetDialog: true });
  }, [updateState]);

  const handleNavigateLightbox = useCallback((direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, state.selectedOutputIndex - 1)
      : Math.min(state.generatedOutputs.length - 1, state.selectedOutputIndex + 1);
    
    updateState({
      selectedOutputIndex: newIndex,
      generatedOutput: state.generatedOutputs[newIndex]?.storage_path || null,
    });
  }, [state.selectedOutputIndex, state.generatedOutputs, updateState]);

  const handleOpenLightbox = useCallback(() => {
    updateState({ showLightbox: true });
  }, [updateState]);

  const handleCloseLightbox = useCallback(() => {
    updateState({ showLightbox: false });
  }, [updateState]);

  const handleDownloadAll = useCallback(async () => {
    if (state.generatedOutputs.length === 0) return;
    await downloadMultipleOutputs(
      state.generatedOutputs,
      currentModel?.content_type || 'image',
      () => {
        if (progress && !progress.checklist.downloadedResult) {
          updateProgress({ downloadedResult: true });
        }
      }
    );
  }, [state.generatedOutputs, currentModel, progress, updateProgress]);

  const handleViewHistory = useCallback(() => {
    navigate('/dashboard/history');
  }, [navigate]);

  // Inspection wrapper for generation (NEW)
  const preparePayloadSnapshot = useCallback(() => {
    return {
      prompt: state.prompt,
      model_record_id: state.selectedModel,
      parameters: state.modelParameters,
      uploaded_images: uploadedImages.length,
      estimated_tokens: estimatedTokens,
    };
  }, [state, uploadedImages, estimatedTokens]);

  const handleGenerateWithInspection = useCallback(async () => {
    if (inspectionMode === 'disabled' || inspectionMode === 'reviewing') {
      await handleGenerate();
      return;
    }

    // Capture inspection data
    const snapshot = {
      step1_inputs: {
        prompt: state.prompt,
        modelParameters: state.modelParameters,
        uploadedImages: uploadedImages.map(img => ({ name: img.name, size: img.size })),
        selectedModel: state.selectedModel,
      },
      step2_backend_merge: {
        schema_defaults: (currentModel?.input_schema as any)?.properties || {},
        user_advanced: state.modelParameters,
      },
      step3_final_payload: preparePayloadSnapshot(),
    };
    
    setInspectionData(snapshot);
    setInspectionMode('reviewing');
  }, [inspectionMode, handleGenerate, state, uploadedImages, currentModel, preparePayloadSnapshot]);

  const handleContinueTest = useCallback(async () => {
    setInspectionMode('disabled');
    await handleGenerate();
  }, [handleGenerate]);

  const handleCancelTest = useCallback(() => {
    setInspectionMode('enabled');
    setInspectionData({});
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/model-health')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Comprehensive Model Testing</h1>
          <p className="text-muted-foreground">
            Test any model with complete parameter visibility and execution inspection
          </p>
        </div>
      </div>

      {/* Model Summary Card */}
      {currentModel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentModel.model_name}</CardTitle>
                <CardDescription className="space-y-1 mt-2">
                  <div className="flex gap-2 flex-wrap">
                    <Badge>{currentModel.provider}</Badge>
                    <Badge variant="outline">{currentModel.content_type}</Badge>
                    {!currentModel.is_active && <Badge variant="destructive">Inactive</Badge>}
                    {currentModel.model_family && (
                      <Badge variant="secondary">{currentModel.model_family}</Badge>
                    )}
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Base Cost</p>
                <p className="font-medium">{currentModel.base_token_cost} credits</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Time</p>
                <p className="font-medium">{currentModel.estimated_time_seconds || 'N/A'}s</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Images</p>
                <p className="font-medium">{currentModel.max_images || 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Default Outputs</p>
                <p className="font-medium">{currentModel.default_outputs || 1}</p>
              </div>
            </div>

            {currentModel.api_endpoint && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">API Endpoint</p>
                <code className="text-xs bg-muted px-2 py-1 rounded">{currentModel.api_endpoint}</code>
              </div>
            )}

            {currentModel.cost_multipliers && Object.keys(currentModel.cost_multipliers as any).length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Cost Multipliers</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(currentModel.cost_multipliers as any).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}x
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inspection UI */}
      {inspectionMode === 'reviewing' && (
        <InspectionReviewCard
          inspectionData={inspectionData}
          onContinue={handleContinueTest}
          onCancel={handleCancelTest}
        />
      )}

      {inspectionMode !== 'reviewing' && Object.keys(inspectionData).length > 0 && (
        <InspectionStepsDisplay
          inspectionData={inspectionData}
          currentPhase={isGenerating ? 'executing' : 'idle'}
        />
      )}

      {/* EXACT InputPanel from CustomCreation */}
      <InputPanel
        selectedModel={state.selectedModel}
        filteredModels={filteredModels as any}
        selectedGroup={state.selectedGroup}
        onModelChange={handleModelChange}
        modelsLoading={modelsLoading}
        prompt={state.prompt}
        onPromptChange={handlePromptChange}
        hasPromptField={hasPromptField}
        isPromptRequired={isPromptRequired}
        maxPromptLength={maxPromptLength}
        onSurpriseMe={handleSurpriseMe}
        generatingSurprise={state.generatingSurprise}
        generateCaption={state.generateCaption}
        onGenerateCaptionChange={handleGenerateCaptionChange}
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
        textKeySchema={textKeySchema}
        textKeyValue={textKeyValue}
        onTextKeyChange={handleTextKeyChange}
        voiceKey={voiceKey}
        voiceKeySchema={voiceKeySchema}
        voiceKeyValue={voiceKeyValue}
        onVoiceKeyChange={handleVoiceKeyChange}
        hasDuration={hasDuration}
        durationValue={durationValue}
        onDurationChange={handleDurationChange}
        durationSchema={durationSchema}
        hasIncrement={hasIncrement}
        incrementValue={incrementValue}
        onIncrementChange={handleIncrementChange}
        advancedOpen={state.advancedOpen}
        onAdvancedOpenChange={handleAdvancedOpenChange}
        modelSchema={currentModel?.input_schema as ModelJsonSchema || null}
        modelParameters={state.modelParameters}
        onModelParametersChange={handleModelParametersChange}
        excludeFields={excludeFields}
        modelId={currentModel?.id || ''}
        provider={currentModel?.provider || ''}
        advancedOptionsRef={advancedOptionsRef}
        onGenerate={handleGenerateWithInspection}
        onReset={handleReset}
        isGenerating={isGenerating}
        isPolling={isPolling}
        pollingGenerationId={state.pollingGenerationId}
        localGenerating={state.localGenerating}
        estimatedTokens={estimatedTokens}
      />

      {/* EXACT OutputPanel from CustomCreation */}
      <OutputPanel
        ref={outputSectionRef}
        generationState={{
          generatedOutputs: state.generatedOutputs,
          selectedOutputIndex: state.selectedOutputIndex,
          showLightbox: state.showLightbox,
          generationStartTime: state.generationStartTime,
          generationCompleteTime: state.generationCompleteTime,
          generatedOutput: state.generatedOutput,
        }}
        contentType={currentModel?.content_type || 'image'}
        estimatedTimeSeconds={currentModel?.estimated_time_seconds || null}
        isPolling={isPolling}
        localGenerating={state.localGenerating}
        isGenerating={isGenerating}
        pollingGenerationId={state.pollingGenerationId}
        onNavigateLightbox={handleNavigateLightbox}
        onOpenLightbox={handleOpenLightbox}
        onCloseLightbox={handleCloseLightbox}
        onDownloadAll={handleDownloadAll}
        onViewHistory={handleViewHistory}
        onGenerateVideo={handleGenerateVideo}
        generatingVideoIndex={generatingVideoIndex}
        userTokensRemaining={userTokens?.tokens_remaining || 0}
        captionData={captionData}
        isGeneratingCaption={isGeneratingCaption}
        onRegenerateCaption={regenerateCaption}
        onCopyCaption={copyCaptionToClipboard}
        onCopyHashtags={copyHashtagsToClipboard}
        childVideoGenerations={childVideoGenerations}
        parentGenerationId={state.parentGenerationId}
        onDownloadSuccess={() => {
          if (progress && !progress.checklist.downloadedResult) {
            updateProgress({ downloadedResult: true });
          }
        }}
        templateBeforeImage={state.templateBeforeImage}
        templateAfterImage={state.templateAfterImage}
        modelProvider={currentModel?.provider}
        modelName={currentModel?.model_name}
      />
    </div>
  );
};

export default ComprehensiveModelTestPage;
