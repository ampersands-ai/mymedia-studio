import { useRef, useEffect, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { GenerationErrorBoundary } from "@/components/error/GenerationErrorBoundary";
import { useNavigate } from "react-router-dom";
import { SessionWarning } from "@/components/SessionWarning";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { SuccessConfetti } from "@/components/onboarding/SuccessConfetti";
import { useModels } from "@/hooks/useModels";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useModelSchema } from "@/hooks/useModelSchema";
import { useCustomCreationState } from "@/hooks/useCustomCreationState";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useCustomGeneration } from "@/hooks/useCustomGeneration";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useCaptionGeneration } from "@/hooks/useCaptionGeneration";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import { CreationGroupSelector } from "@/components/custom-creation/CreationGroupSelector";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { BestPracticesCard } from "@/components/custom-creation/BestPracticesCard";
import { downloadMultipleOutputs } from "@/lib/download-utils";
import { supabase } from "@/integrations/supabase/client";
import { useCinematicPrompts, getSurpriseMePromptFromDb } from "@/hooks/useCinematicPrompts";
import { toast } from "sonner";
import type { JsonSchemaProperty, ModelJsonSchema } from "@/types/model-schema";
import { initializeParameters } from "@/types/model-schema";
import type { ModelConfiguration } from "@/types/schema";

const CustomCreation = () => {
  const { execute } = useErrorHandler();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outputSectionRef = useRef<HTMLDivElement>(null);

  // State management
  const { 
    state, 
    updateState, 
    resetState,
    setPrompt: setStatePrompt,
    setSelectedModel: setStateSelectedModel,
    setSelectedGroup: setStateSelectedGroup
  } = useCustomCreationState();

  // Models and user data
  const { data: allModels, isLoading: modelsLoading } = useModels();
  const { data: userTokens } = useUserTokens();
  const { progress, updateProgress, setFirstGeneration, markComplete, dismiss } = useOnboarding();
  const { data: cinematicPrompts } = useCinematicPrompts();

  // Filter and sort models by selected group (default to cost sorting)
  const filteredModels = useMemo(() => {
    return allModels?.filter(model => {
      const groups = (Array.isArray(model.groups) ? model.groups : []) as string[];
      return groups.includes(state.selectedGroup);
    }).sort((a, b) => {
      return a.base_token_cost - b.base_token_cost;
    }) || [];
  }, [allModels, state.selectedGroup]);

  // Get current model
  const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);

  // Convert AIModel to ModelConfiguration for useModelSchema
  const modelConfig = currentModel ? {
    ...currentModel,
    cost_multipliers: currentModel.cost_multipliers ? 
      Object.fromEntries(
        Object.entries(currentModel.cost_multipliers).map(([k, v]) => [k, typeof v === 'number' ? v : 1])
      ) as Record<string, number> : null
  } as ModelConfiguration : null;

  // Get model schema (locked models load from file, unlocked from database)
  const { schema: modelSchema, loading: schemaLoading } = useModelSchema(modelConfig);

  // Initialize model parameters with schema defaults when model changes
  useEffect(() => {
    if (!modelSchema) return;
    
    const initialized = initializeParameters(modelSchema, state.modelParameters);
    
    // Only update if defaults changed (avoid infinite loop)
    if (JSON.stringify(initialized) !== JSON.stringify(state.modelParameters)) {
      updateState({ modelParameters: initialized });
    }
  }, [currentModel?.record_id, modelSchema]);

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(modelConfig);

  // Generation polling
  const { startPolling, stopPolling, isPolling, connectionTier, realtimeConnected } = useGenerationPolling({
    onComplete: (outputs, parentId) => {
      logger.info('Polling onComplete called', { outputCount: outputs.length, parentId });
      updateState({
        generatedOutputs: outputs,
        generatedOutput: outputs[0]?.storage_path || null,
        selectedOutputIndex: 0,
        generationCompleteTime: Date.now(),
        localGenerating: false,
        pollingGenerationId: null,
        parentGenerationId: parentId || null,
      });

      // Update onboarding progress
      if (progress && !progress.checklist.completedFirstGeneration) {
        updateProgress({ completedFirstGeneration: true });
        setFirstGeneration(outputs[0]?.id || '');
      }
      
      // Track viewing result
      if (progress && !progress.checklist.viewedResult && outputs.length > 0) {
        updateProgress({ viewedResult: true });
      }

      // Auto-scroll to output on mobile
      setTimeout(() => {
        if (outputSectionRef.current && window.innerWidth < 1024) {
          outputSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);

      // Generate caption if enabled
      if (state.generateCaption && outputs.length > 0) {
        generateCaption(outputs);
      }
    },
    onError: (message?: string) => {
      updateState({ 
        localGenerating: false, 
        pollingGenerationId: null,
        failedGenerationError: {
          message: message || 'Generation failed',
          generationId: state.pollingGenerationId || 'unknown',
          timestamp: Date.now(),
        }
      });
    },
    onTimeout: async () => {
      updateState({ localGenerating: false, pollingGenerationId: null });
      toast.warning('This is taking longer than usual', {
        description: 'We will check the provider and refund credits if it failed. You can navigate away; results will appear in History.',
      });

      // Proactively check provider status and recover/refund if needed
      if (state.pollingGenerationId) {
        await execute(
          async () => {
            const { data, error } = await supabase.functions.invoke('poll-kie-status', {
              body: { generation_id: state.pollingGenerationId }
            });

            if (error) throw error;

            if (data?.status === 'failed') {
              updateState({
                failedGenerationError: {
                  message: 'Generation failed on provider side',
                  generationId: state.pollingGenerationId || 'unknown',
                  timestamp: Date.now(),
                }
              });
            } else if (data?.status === 'completed') {
              toast.success('Generation completed in background. Check History.');
            }
          },
          {
            showSuccessToast: false,
            showErrorToast: false,
            context: {
              component: 'CustomCreation',
              operation: 'pollKieStatus',
              generationId: state.pollingGenerationId
            }
          }
        );
      }
    }
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
  } = useImageUpload(modelConfig);

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

  // Custom generation logic
  const {
    handleGenerate,
    handleCancelGeneration,
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

  // Surprise Me handler - wrapped in useCallback for stable reference
  const onSurpriseMe = useCallback(() => {
    logger.info('Surprise Me triggered', { selectedGroup: state.selectedGroup } as any);
    updateState({ generatingSurprise: true });
    const surprisePrompt = getSurpriseMePromptFromDb(state.selectedGroup, cinematicPrompts);
    setStatePrompt(surprisePrompt);
    updateState({ generatingSurprise: false });
  }, [state.selectedGroup, updateState, setStatePrompt, cinematicPrompts]);

  // Download all outputs
  const handleDownloadAll = async () => {
    if (!user?.id || state.generatedOutputs.length === 0) return;
    
    await downloadMultipleOutputs(
      state.generatedOutputs,
      currentModel?.content_type || 'image',
      () => {
        // Track onboarding: downloadedResult
        if (progress && !progress.checklist.downloadedResult) {
          updateProgress({ downloadedResult: true });
        }
      }
    );
  };

  // Lightbox navigation
  const handleNavigateLightbox = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (state.selectedOutputIndex + 1) % state.generatedOutputs.length
      : (state.selectedOutputIndex - 1 + state.generatedOutputs.length) % state.generatedOutputs.length;
    
    updateState({ selectedOutputIndex: newIndex });
  };

  // SEO metadata
  useEffect(() => {
    document.title = "Custom Creation Studio - artifio.ai";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Create custom AI-generated content with advanced controls and fine-tuning options.');
    }
  }, []);

  // Load template preview images
  useEffect(() => {
    const loadTemplateImages = async () => {
      if (!state.selectedModel) {
        updateState({ templateBeforeImage: null, templateAfterImage: null });
        return;
      }
      
      // DEPRECATED: content_templates removed - no before/after images
      updateState({ templateBeforeImage: null, templateAfterImage: null });
    };
    
    loadTemplateImages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedModel]);

  // Auto-select first model when filtered models change
  useEffect(() => {
    if (filteredModels.length > 0 && !state.selectedModel) {
      setStateSelectedModel(String(filteredModels[0].record_id));
    }
  }, [filteredModels, state.selectedModel, setStateSelectedModel]);

  // Track onboarding: selected template/model
  useEffect(() => {
    if (state.selectedModel && progress && !progress.checklist.selectedTemplate) {
      updateProgress({ selectedTemplate: true });
    }
  }, [state.selectedModel, progress, updateProgress]);

  // Track onboarding: entered prompt
  useEffect(() => {
    if (state.prompt.length > 10 && progress && !progress.checklist.enteredPrompt) {
      updateProgress({ enteredPrompt: true });
    }
  }, [state.prompt, progress, updateProgress]);

  // Compute schema-derived values for InputPanel
  const hasPromptField = useMemo(() => {
    if (!modelSchema?.properties) return false;
    return Object.keys(modelSchema.properties).some(key => {
      const prop = modelSchema.properties![key] as JsonSchemaProperty;
      return prop.renderer === 'prompt';
    });
  }, [modelSchema]);
  
  const isPromptRequired = useMemo(() => {
    if (!modelSchema?.properties || !modelSchema?.required) return false;
    const promptKey = Object.keys(modelSchema.properties).find(key => {
      const prop = modelSchema.properties![key] as JsonSchemaProperty;
      return prop.renderer === 'prompt';
    });
    return promptKey ? modelSchema.required.includes(promptKey) : false;
  }, [modelSchema]);
  
  const maxPromptLength = useMemo(() => {
    if (!modelSchema?.properties) return undefined;
    const promptKey = Object.keys(modelSchema.properties).find(key => {
      const prop = modelSchema.properties![key] as JsonSchemaProperty;
      return prop.renderer === 'prompt';
    });
    if (!promptKey) return undefined;
    const promptProp = modelSchema.properties[promptKey] as JsonSchemaProperty;
    return promptProp?.maxLength ?? 5000;
  }, [modelSchema]);
  
  const hasDuration = useMemo(() => {
    if (!modelSchema?.properties) return false;
    return Object.keys(modelSchema.properties).some(key => {
      const prop = modelSchema.properties![key] as JsonSchemaProperty;
      return prop.renderer === 'duration';
    });
  }, [modelSchema]);
  
  const hasIncrement = useMemo(() => {
    if (!modelSchema?.properties) return false;
    return Object.keys(modelSchema.properties).some(key => {
      const prop = modelSchema.properties![key] as JsonSchemaProperty;
      return prop.renderer === 'increment';
    });
  }, [modelSchema]);
  
  const advancedOptionsRef = useRef<HTMLDivElement>(null);

  // Handler to clear failed generation error
  const handleClearError = useCallback(() => {
    updateState({ 
      failedGenerationError: null,
      pollingGenerationId: null,
      localGenerating: false,
      generationStartTime: null
    });
  }, [updateState]);

  // Infer content type from first output's file extension if available
  const contentType = (() => {
    const firstPath = state.generatedOutputs[0]?.storage_path || null;
    if (!firstPath) return currentModel?.content_type || 'image';
    const ext = (firstPath.split('.').pop() || '').toLowerCase();
    if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    return currentModel?.content_type || 'image';
  })();

  return (
    <GenerationErrorBoundary onReset={() => {
      updateState({ 
        localGenerating: false, 
        pollingGenerationId: null,
        generatingSurprise: false 
      });
      stopPolling();
    }}>
      <div className="min-h-screen bg-background">
      <SessionWarning />
      
      {/* Onboarding */}
      {progress && (
        <>
          <OnboardingChecklist 
            progress={progress}
            onComplete={markComplete}
            onDismiss={dismiss}
          />
          {progress.checklist.completedFirstGeneration && !progress.dismissed && (
            <SuccessConfetti trigger={progress.checklist.completedFirstGeneration} />
          )}
        </>
      )}

      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        {/* Group Selector */}
        <CreationGroupSelector 
          selectedGroup={state.selectedGroup}
          onGroupChange={setStateSelectedGroup}
        />


        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6 mb-20 md:mb-6">
          {/* Input Panel */}
          <InputPanel
            selectedModel={state.selectedModel}
            filteredModels={filteredModels}
            selectedGroup={state.selectedGroup}
            onModelChange={setStateSelectedModel}
            modelsLoading={modelsLoading || schemaLoading}
            prompt={state.prompt}
            onPromptChange={(value) => {
              setStatePrompt(value);
              // Sync with positivePrompt for Runware models
              if (modelSchema?.properties?.positivePrompt) {
                updateState({ 
                  modelParameters: { 
                    ...state.modelParameters, 
                    positivePrompt: value 
                  }
                });
              }
            }}
            hasPromptField={hasPromptField}
            isPromptRequired={isPromptRequired}
            maxPromptLength={maxPromptLength ?? 5000}
            onSurpriseMe={onSurpriseMe}
            generatingSurprise={state.generatingSurprise}
            generateCaption={state.generateCaption}
            onGenerateCaptionChange={(generate) => updateState({ generateCaption: generate })}
            uploadedImages={uploadedImages}
            onFileUpload={(e) => { handleFileUpload(e); updateState({ generateCaption: false }); }}
            onRemoveImage={(idx) => { removeImage(idx); updateState({ generateCaption: false }); }}
            imageFieldName={imageFieldInfo.fieldName}
            isImageRequired={imageFieldInfo.isRequired}
            maxImages={imageFieldInfo.maxImages}
            fileInputRef={fileInputRef}
            cameraLoading={cameraLoading}
            isNative={isNative}
            onNativeCameraPick={handleNativeCameraPick}
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
            onGenerate={handleGenerate}
            isGenerating={isGenerating || state.localGenerating}
            estimatedTokens={estimatedTokens}
            modelId={state.selectedModel || ''}
            provider={currentModel?.provider || ''}
            onReset={() => {
              handleCancelGeneration(state.pollingGenerationId);
              stopPolling();
              setUploadedImages([]);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
              resetState();
            }}
            isPolling={isPolling}
            pollingGenerationId={state.pollingGenerationId}
            localGenerating={state.localGenerating}
            advancedOptionsRef={advancedOptionsRef}
          />

          {/* Output Panel */}
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
              onNavigateLightbox={handleNavigateLightbox}
              onOpenLightbox={(index) => updateState({ selectedOutputIndex: index, showLightbox: true })}
              onCloseLightbox={() => updateState({ showLightbox: false })}
              onDownloadAll={handleDownloadAll}
              onViewHistory={() => navigate('/dashboard/history')}
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
              connectionTier={connectionTier}
              realtimeConnected={realtimeConnected}
              failedGenerationError={state.failedGenerationError}
              onClearError={handleClearError}
            />
          </div>
        </div>

        {/* Best Practices */}
        <BestPracticesCard />

      </div>
    </div>
    </GenerationErrorBoundary>
  );
};

export default CustomCreation;
