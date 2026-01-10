import { useRef, useEffect, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { GenerationErrorBoundary } from "@/components/error/GenerationErrorBoundary";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SessionWarning } from "@/components/SessionWarning";
import type { CreationGroup } from "@/constants/creation-groups";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";

import { useModels } from "@/hooks/useModels";
import { useModelHealthCheck } from "@/hooks/useModelHealthCheck";
import { useUserTokens } from "@/hooks/useUserTokens";
import { useModelSchema } from "@/hooks/useModelSchema";
import { useCustomCreationState } from "@/hooks/useCustomCreationState";
import { useOutputProcessor } from "@/hooks/useOutputProcessor";
import { useCustomGeneration } from "@/hooks/useCustomGeneration";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAudioUpload } from "@/hooks/useAudioUpload";
import { useVideoUpload } from "@/hooks/useVideoUpload";
import { useCaptionGeneration } from "@/hooks/useCaptionGeneration";
import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { useConcurrentGenerationLimit } from "@/hooks/useConcurrentGenerationLimit";

import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import { CreationGroupSelector } from "@/components/custom-creation/CreationGroupSelector";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { BestPracticesCard } from "@/components/custom-creation/BestPracticesCard";
import { GenerationHistoryTable } from "@/components/custom-creation/GenerationHistoryTable";
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  
  // Run model health check to detect stale cache issues
  useModelHealthCheck(
    allModels?.map(m => m.record_id) || [],
    modelsLoading
  );
  const { progress, updateProgress, setFirstGeneration, markComplete, dismiss } = useOnboarding();
  const { data: cinematicPrompts } = useCinematicPrompts();
  
  // Concurrent generation limit enforcement
  const { data: activeGenerations = [] } = useActiveGenerations();
  const { data: maxConcurrent = 1 } = useConcurrentGenerationLimit();

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

  // Initialize model parameters with schema defaults when model changes or parameters are empty
  useEffect(() => {
    if (!modelSchema) return;
    
    const initialized = initializeParameters(modelSchema, state.modelParameters);
    
    // Only update if defaults changed (avoid infinite loop)
    if (JSON.stringify(initialized) !== JSON.stringify(state.modelParameters)) {
      updateState({ modelParameters: initialized });
    }
  }, [currentModel?.record_id, modelSchema, state.modelParameters]);

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(modelConfig);
  const audioFieldInfo = schemaHelpers.getAudioFieldInfo(modelConfig);
  const videoFieldInfo = schemaHelpers.getVideoFieldInfo(modelConfig);

  // Extract maxDuration from locked file schema (overrides database value)
  const effectiveAudioMaxDuration = useMemo(() => {
    if (!modelSchema?.audioInputField || !modelSchema?.properties) {
      return audioFieldInfo.maxDuration;
    }
    const audioFieldKey = modelSchema.audioInputField as string;
    const audioField = modelSchema.properties[audioFieldKey] as { maxDuration?: number } | undefined;
    return audioField?.maxDuration ?? audioFieldInfo.maxDuration;
  }, [modelSchema, audioFieldInfo.maxDuration]);

  // Output processor (independent module for handling generation outputs)
  const { 
    isProcessing: isPolling, 
    status: processorStatus, 
    error: processorError,
    startProcessing: startPolling, 
    stopProcessing: stopPolling 
  } = useOutputProcessor({
    onApiCallStarted: (timestamp) => {
      // Update state when API call actually starts (from database)
      if (!state.apiCallStartTime) {
        updateState({ apiCallStartTime: timestamp });
      }
    },
    onComplete: async (outputs, parentId) => {
      logger.info('OutputProcessor onComplete called', { outputCount: outputs.length, parentId });
      
      // Calculate timing data
      const completeTime = Date.now();
      const setupDurationMs = state.apiCallStartTime && state.generationStartTime 
        ? state.apiCallStartTime - state.generationStartTime 
        : null;
      const apiDurationMs = state.apiCallStartTime 
        ? completeTime - state.apiCallStartTime 
        : null;
      
      // Save timing data to database
      if (parentId && (setupDurationMs !== null || apiDurationMs !== null)) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase
            .from('generations')
            .update({
              setup_duration_ms: setupDurationMs,
              api_duration_ms: apiDurationMs,
            })
            .eq('id', parentId);
          
          logger.info('Timing data saved', { parentId, setupDurationMs, apiDurationMs });
        } catch (err) {
          logger.error('Failed to save timing data', err instanceof Error ? err : new Error(String(err)));
        }
      }
      
      // Reset cooldown since generation completed successfully
      resetCooldown();
      
      updateState({
        generatedOutputs: outputs,
        generatedOutput: outputs[0]?.storage_path || null,
        selectedOutputIndex: 0,
        generationCompleteTime: completeTime,
        localGenerating: false,
        pollingGenerationId: null,
        parentGenerationId: parentId || null,
      });

      // Track first generation for onboarding
      if (progress && !progress.checklist.clickedGenerate) {
        setFirstGeneration(outputs[0]?.id || '');
      }

      // Auto-scroll to output on mobile (use window.scrollTo for better mobile support)
      setTimeout(() => {
        if (window.matchMedia('(max-width: 1023px)').matches && outputSectionRef.current) {
          (document.activeElement as HTMLElement | null)?.blur?.();
          const top = outputSectionRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
        }
      }, 250);

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
  });

  // Derive connection status from processor status
  const connectionTier = processorStatus === 'realtime' ? 'realtime' : processorStatus === 'polling' ? 'polling' : 'disconnected';
  const realtimeConnected = processorStatus === 'realtime';

  // Handle processor error as timeout scenario
  useEffect(() => {
    if (processorError && state.pollingGenerationId) {
      toast.warning('This is taking longer than usual', {
        description: 'We will check the provider and refund credits if it failed. You can navigate away; results will appear in History.',
      });

      // Proactively check provider status and recover/refund if needed
      execute(
        async () => {
          // Determine which poll function to use based on provider
          const isRunwareModel = currentModel?.provider === 'runware';
          const pollFunction = isRunwareModel ? 'poll-runware-status' : 'poll-kie-status';
          
          const { data, error } = await supabase.functions.invoke(pollFunction, {
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
            operation: 'pollProviderStatus',
            generationId: state.pollingGenerationId
          }
        }
      );
    }
  }, [processorError, state.pollingGenerationId, execute, updateState, currentModel?.provider]);

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

  // Audio upload
  const {
    uploadedAudios,
    setUploadedAudios,
    handleFileUpload: handleAudioUpload,
    removeAudio,
    uploadAudiosToStorage: _uploadAudiosToStorage, // Will be used in generation flow
    fileInputRef: audioFileInputRef,
  } = useAudioUpload(modelConfig);

  // Get isPerSecondPricing from current model (flows through AIModel type)
  const isPerSecondPricing = currentModel?.is_per_second_pricing ?? false;

  // Check if audio has been uploaded (for per-second pricing display)
  const hasAudioUploaded = useMemo(() => {
    return uploadedAudios.length > 0 && state.audioDuration != null;
  }, [uploadedAudios.length, state.audioDuration]);

  // Video upload
  const {
    uploadedVideos,
    setUploadedVideos,
    handleFileUpload: handleVideoUpload,
    removeVideo,
    uploadVideosToStorage: _uploadVideosToStorage, // Will be used in generation flow
    fileInputRef: videoFileInputRef,
  } = useVideoUpload(modelConfig);

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


  // Custom generation logic
  const {
    handleGenerate,
    handleCancelGeneration,
    estimatedTokens,
    isGenerating,
    isOnCooldown,
    cooldownRemaining,
    resetCooldown,
  } = useCustomGeneration({
    state,
    updateState,
    startPolling,
    uploadedImages,
    uploadImagesToStorage,
    imageFieldInfo,
    uploadedAudios,
    uploadAudiosToStorage: _uploadAudiosToStorage,
    getAudioDuration: async (file: File) => {
      return new Promise<number>((resolve) => {
        const audio = new Audio();
        audio.onloadedmetadata = () => resolve(audio.duration);
        audio.src = URL.createObjectURL(file);
      });
    },
    audioFieldInfo,
    uploadedVideos,
    uploadVideosToStorage: _uploadVideosToStorage,
    filteredModels,
    onboardingProgress: progress,
    updateProgress,
    setFirstGeneration,
    userTokens: userTokens || null,
    // Concurrent generation limit enforcement
    activeGenerationsCount: activeGenerations.length,
    maxConcurrentGenerations: maxConcurrent,
  });

  // Wrap handleGenerate with scroll-to-output behavior for mobile
  const handleGenerateWithScroll = useCallback(() => {
    if (window.matchMedia('(max-width: 1023px)').matches && outputSectionRef.current) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      const top = outputSectionRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });

      // Retry after layout/keyboard settles (common on mobile)
      setTimeout(() => {
        if (outputSectionRef.current) {
          const retryTop = outputSectionRef.current.getBoundingClientRect().top + window.scrollY;
          window.scrollTo({ top: Math.max(0, retryTop - 12), behavior: 'smooth' });
        }
      }, 350);
    }

    handleGenerate();
  }, [handleGenerate]);


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

  // Recovery: If we have a pollingGenerationId but no outputs and not actively polling, try to recover
  useEffect(() => {
    if (!state.pollingGenerationId || state.generatedOutputs.length > 0 || isPolling || processorStatus !== 'idle') {
      return;
    }

    const recoverOutputs = async () => {
      try {
        logger.info('Attempting to recover outputs for generation', { generationId: state.pollingGenerationId });
        
        const { data: gen, error } = await supabase
          .from('generations')
          .select('id, status, storage_path, type, model_id, model_record_id')
          .eq('id', state.pollingGenerationId)
          .single();

        if (error || !gen) {
          logger.warn('Failed to recover generation', { error });
          return;
        }

        if (gen.status === 'completed' && gen.storage_path) {
          // Hydrate outputs - generation completed in background
          logger.info('Recovered completed generation', { generationId: gen.id, storagePath: gen.storage_path });
          updateState({
            generatedOutputs: [{
              id: gen.id,
              storage_path: gen.storage_path,
              output_index: 0,
              model_id: gen.model_id || undefined,
              provider: undefined,
            }],
            generatedOutput: gen.storage_path,
            generationCompleteTime: Date.now(),
            localGenerating: false,
          });
        } else if (gen.status === 'processing' || gen.status === 'pending') {
          // Resume polling - generation still in progress
          logger.info('Resuming polling for in-progress generation', { generationId: gen.id, status: gen.status });
          startPolling(state.pollingGenerationId!);
        } else if (gen.status === 'failed' || gen.status === 'error') {
          // Clear failed generation
          updateState({
            pollingGenerationId: null,
            localGenerating: false,
            failedGenerationError: {
              message: 'Generation failed',
              generationId: gen.id,
              timestamp: Date.now(),
            }
          });
        }
      } catch (err) {
        logger.error('Error recovering generation outputs', err instanceof Error ? err : new Error(String(err)));
      }
    };

    recoverOutputs();
  }, [state.pollingGenerationId, state.generatedOutputs.length, isPolling, processorStatus, updateState, startPolling]);

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

  // Sync URL group param to state on mount only
  useEffect(() => {
    const urlGroup = searchParams.get('group');
    if (urlGroup) {
      const validGroups = ['image_editing', 'prompt_to_image', 'prompt_to_video', 
                           'image_to_video', 'video_to_video', 'lip_sync', 'prompt_to_audio'];
      if (validGroups.includes(urlGroup)) {
        setStateSelectedGroup(urlGroup as CreationGroup);
      }
    }
    // Only run on mount - intentionally exclude state.selectedGroup to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL model and prompt params to state on mount (for deep linking from model pages)
  useEffect(() => {
    const urlModel = searchParams.get('model');
    const urlPrompt = searchParams.get('prompt');
    
    if (!allModels || allModels.length === 0) return;
    
    if (urlModel) {
      // Find the model by slug first (SEO-friendly), fallback to record_id for backwards compatibility
      // We check against model 'id' (which is the unique model identifier like 'kling-2.6/motion-control')
      // and also the model slug from model_pages table
      const targetModel = allModels.find(m => 
        m.id === urlModel ||        // Match by model id (slug-based, SEO-friendly)
        m.record_id === urlModel    // Fallback: match by record_id (UUID, legacy)
      );
      
      if (targetModel) {
        // Determine the model's group from its groups array
        const modelGroups = (Array.isArray(targetModel.groups) ? targetModel.groups : []) as string[];
        const validGroups = ['image_editing', 'prompt_to_image', 'prompt_to_video', 
                             'image_to_video', 'video_to_video', 'lip_sync', 'prompt_to_audio'];
        
        // Find the first valid group this model belongs to
        const targetGroup = modelGroups.find(g => validGroups.includes(g)) as CreationGroup | undefined;
        
        if (targetGroup && targetGroup !== state.selectedGroup) {
          // Switch to the correct group first
          setStateSelectedGroup(targetGroup);
        }
        
        // Set the model
        setStateSelectedModel(urlModel);
        
        // Clear the model param from URL to prevent re-triggering
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('model');
        if (urlPrompt) newParams.delete('prompt');
        newParams.set('group', targetGroup || state.selectedGroup);
        setSearchParams(newParams, { replace: true });
      }
    }
    
    // Set prompt if provided
    if (urlPrompt) {
      setStatePrompt(decodeURIComponent(urlPrompt));
    }
    
    // Only run once when models are loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allModels]);

  // Sync state changes back to URL (when user clicks group buttons)
  useEffect(() => {
    const currentUrlGroup = searchParams.get('group');
    if (state.selectedGroup !== currentUrlGroup) {
      setSearchParams({ group: state.selectedGroup }, { replace: true });
    }
  }, [state.selectedGroup, searchParams, setSearchParams]);

  // Track onboarding: navigatedToTextToImage when user selects prompt_to_image group
  useEffect(() => {
    if (state.selectedGroup === 'prompt_to_image' && progress && !progress.checklist.navigatedToTextToImage) {
      updateProgress({ navigatedToTextToImage: true });
    }
  }, [state.selectedGroup, progress, updateProgress]);

  // Track onboarding: selectedZImage when user selects a Z-Image model
  useEffect(() => {
    if (state.selectedModel && progress && !progress.checklist.selectedZImage) {
      const model = filteredModels.find(m => String(m.record_id) === state.selectedModel);
      const modelName = model?.model_name?.toLowerCase() || '';
      if (modelName.includes('z-image') || modelName.includes('zimage')) {
        updateProgress({ selectedZImage: true });
      }
    }
  }, [state.selectedModel, filteredModels, progress, updateProgress]);

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
      <div className="min-h-screen bg-background pb-safe overflow-x-hidden">
      <SessionWarning />
      
      {/* Onboarding */}
      {progress && (
        <OnboardingChecklist 
            progress={progress}
            onComplete={markComplete}
            onDismiss={dismiss}
          />
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
            notifyOnCompletion={state.notifyOnCompletion}
            onNotifyOnCompletionChange={(notify) => updateState({ notifyOnCompletion: notify })}
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
            uploadedAudio={uploadedAudios[0] || null}
            onAudioUpload={(e) => { handleAudioUpload(e); updateState({ generateCaption: false }); }}
            onRemoveAudio={() => { removeAudio(); updateState({ generateCaption: false }); }}
            audioFieldName={audioFieldInfo.fieldName}
            isAudioRequired={audioFieldInfo.isRequired}
            audioMaxDuration={effectiveAudioMaxDuration}
            audioFileInputRef={audioFileInputRef}
            onAudioDurationChange={(duration) => updateState({ audioDuration: duration })}
            uploadedVideo={uploadedVideos[0] || null}
            onVideoUpload={(e) => { handleVideoUpload(e); updateState({ generateCaption: false }); }}
            onRemoveVideo={() => { removeVideo(); updateState({ generateCaption: false }); }}
            videoFieldName={videoFieldInfo.fieldName}
            isVideoRequired={videoFieldInfo.isRequired}
            videoMaxDuration={videoFieldInfo.maxDuration}
            videoMaxFileSize={videoFieldInfo.maxFileSize}
            videoFileInputRef={videoFileInputRef}
            onVideoDurationChange={(duration) => updateState({ videoDuration: duration })}
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
            onGenerate={handleGenerateWithScroll}
            estimatedTokens={estimatedTokens}
            isOnCooldown={isOnCooldown}
            cooldownRemaining={cooldownRemaining}
            activeGenerationsCount={activeGenerations.length}
            maxConcurrentGenerations={maxConcurrent}
            showNotifyOnCompletion={
              (currentModel?.show_notify_on_completion ?? true) && 
              (currentModel?.estimated_time_seconds ?? 0) >= 30
            }
            isPerSecondPricing={isPerSecondPricing}
            hasAudioUploaded={hasAudioUploaded}
            modelId={state.selectedModel || ''}
            provider={currentModel?.provider || ''}
            onReset={() => {
              handleCancelGeneration(state.pollingGenerationId);
              stopPolling();
              
              // CRITICAL: Clear all persisted storage FIRST before clearing React state
              // This prevents upload hooks from restoring old data when model becomes null
              resetState();
              
              // Then clear React state (hooks won't find anything to restore)
              setUploadedImages([]);
              setUploadedAudios([]);
              setUploadedVideos([]);
              
              // Clear file inputs
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
              if (audioFileInputRef.current) {
                audioFileInputRef.current.value = '';
              }
              if (videoFileInputRef.current) {
                videoFileInputRef.current.value = '';
              }
            }}
            isPolling={isPolling}
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
                apiCallStartTime: state.apiCallStartTime,
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
              captionData={captionData}
              isGeneratingCaption={isGeneratingCaption}
              onRegenerateCaption={regenerateCaption}
              onCopyCaption={copyCaptionToClipboard}
              onCopyHashtags={copyHashtagsToClipboard}
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

        {/* Generation History */}
        <GenerationHistoryTable />

      </div>
    </div>
    </GenerationErrorBoundary>
  );
};

export default CustomCreation;
