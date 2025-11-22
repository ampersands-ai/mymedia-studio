import { useRef, useEffect, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
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
import { useQueryClient } from "@tanstack/react-query";
import type { GenerationOutput } from "@/hooks/useGenerationState";
import { CreationGroupSelector } from "@/components/custom-creation/CreationGroupSelector";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { BestPracticesCard } from "@/components/custom-creation/BestPracticesCard";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, extractStoragePath } from "@/lib/storage-utils";
import { downloadMultipleOutputs } from "@/lib/download-utils";
import { useCinematicPrompts, getSurpriseMePromptFromDb } from "@/hooks/useCinematicPrompts";
import { toast } from "sonner";
import type { JsonSchemaProperty, ModelJsonSchema } from "@/types/model-schema";
import { initializeParameters } from "@/types/model-schema";

const CustomCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outputSectionRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  // Get model schema (locked models load from file, unlocked from database)
  const { schema: modelSchema, loading: schemaLoading } = useModelSchema(currentModel as any || null);

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
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(currentModel as any);

  // Generation polling
  const { startPolling, stopPolling, isPolling, connectionTier, realtimeConnected } = useGenerationPolling({
    onComplete: (outputs, parentId) => {
      console.log('✅ Polling onComplete called', { outputCount: outputs.length, parentId });
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
      updateState({ localGenerating: false, pollingGenerationId: null });
      toast.error(message || 'Generation failed', {
        description: 'The provider reported an error. Your credits will be refunded automatically if nothing is produced.',
        action: {
          label: 'View History',
          onClick: () => navigate('/dashboard/history')
        }
      });
    },
    onTimeout: () => {
      updateState({ localGenerating: false, pollingGenerationId: null });
      toast.warning('This is taking longer than usual', {
        description: 'We will check the provider and refund credits if it failed. You can navigate away; results will appear in History.',
      });

      // Proactively check provider status and recover/refund if needed
      if (state.pollingGenerationId) {
        supabase.functions.invoke('poll-kie-status', {
          body: { generation_id: state.pollingGenerationId }
        }).then(({ data, error }) => {
          if (error) return;
          if (data?.status === 'failed') {
            toast.error('Generation failed on provider side. Credits refunded.');
          } else if (data?.status === 'completed') {
            toast.success('Generation completed in background. Check History.');
          }
        });
      }
    }
  });

  // Realtime subscription for instant updates when webhook completes
  useEffect(() => {
    if (!state.pollingGenerationId) return;

    const setupRealtimeAndCheckStatus = async () => {
      console.log('🔴 Setting up realtime subscription', { generationId: state.pollingGenerationId });

      // IMMEDIATE STATUS CHECK (fixes race condition for fast completions)
      const { data: currentGen } = await supabase
        .from('generations')
        .select('id, status, storage_path, is_batch_output, type, output_index, provider_response')
        .eq('id', state.pollingGenerationId)
        .single();

      if (currentGen?.status === 'completed') {
        console.log('🎉 Generation already completed! Handling immediately...');
        
        let outputs: GenerationOutput[] = [];

        // Handle batch outputs (multiple images/audio)
        if (currentGen.is_batch_output) {
          console.log('📦 Fetching batch child outputs...');
          const { data: children } = await supabase
            .from('generations')
            .select('id, storage_path, output_index, model_id, type, provider_task_id')
            .eq('parent_generation_id', state.pollingGenerationId)
            .order('output_index', { ascending: true });

          if (children && children.length > 0) {
            outputs = children
              .filter(child => child.storage_path) // Only include children with valid storage_path
              .map(child => ({
                id: child.id,
                storage_path: child.storage_path,
                output_index: child.output_index,
                model_id: child.model_id,
                provider_task_id: child.provider_task_id,
                type: child.type,
              }));
            console.log(`✅ Found ${outputs.length} batch outputs (filtered out ${children.length - outputs.length} without storage_path)`);
          }
        } else if (currentGen.storage_path) {
          // Single output
          outputs = [{
            id: currentGen.id,
            storage_path: currentGen.storage_path,
            output_index: currentGen.output_index || 0,
            type: currentGen.type,
          }];
          console.log('✅ Found single output');
        }

        if (outputs.length > 0) {
          // Update state
          updateState({
            generatedOutputs: outputs,
            generatedOutput: outputs[0]?.storage_path || null,
            selectedOutputIndex: 0,
            generationCompleteTime: Date.now(),
            localGenerating: false,
            pollingGenerationId: null,
            parentGenerationId: currentGen.id,
          });

          // Update onboarding progress
          if (progress && !progress.checklist.completedFirstGeneration) {
            updateProgress({ completedFirstGeneration: true });
            setFirstGeneration(currentGen.id);
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
        } else {
          console.warn('⚠️ Generation completed but no outputs found');
          updateState({
            localGenerating: false,
            pollingGenerationId: null,
          });
          toast.error('Generation completed but no outputs were found');
        }

        return; // Don't set up subscription
      } else if (currentGen.status === 'failed' || currentGen.status === 'error') {
        // Handle immediate failure (job failed before page load)
        console.log('❌ Generation was already failed');
        
        try {
          const pr: any = currentGen.provider_response || {};
          const detailed = pr?.error || pr?.message || pr?.error_message || pr?.detail || (pr?.error && pr?.error?.message);
          const msg = detailed ? String(detailed) : `Generation ${currentGen.status}`;
          
          // Store error in state for persistent display
          updateState({ 
            localGenerating: false, 
            pollingGenerationId: null,
            failedGenerationError: {
              message: msg,
              generationId: currentGen.id,
              timestamp: Date.now(),
              providerResponse: currentGen.provider_response
            }
          });
          
          toast.error(msg, {
            description: 'Your credits will be refunded automatically if nothing was produced.',
            action: { label: 'View History', onClick: () => navigate('/dashboard/history') }
          });
        } catch (e) {
          console.warn('Failed to display error details for pre-failed generation', e);
          updateState({ 
            localGenerating: false, 
            pollingGenerationId: null,
            failedGenerationError: {
              message: 'Generation failed',
              generationId: currentGen.id,
              timestamp: Date.now(),
              providerResponse: currentGen.provider_response
            }
          });
          toast.error('Generation failed', {
            description: 'Your credits will be refunded automatically if nothing was produced.',
            action: { label: 'View History', onClick: () => navigate('/dashboard/history') }
          });
        }
        
        return; // Don't set up subscription
      }

      // If not yet completed, set up realtime subscription
      const channel = supabase
        .channel(`generation-${state.pollingGenerationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'generations',
            filter: `id=eq.${state.pollingGenerationId}`
          },
          async (payload) => {
            console.log('🔴 Realtime update received', payload);
            
            const newStatus = payload.new.status;
            
            if (newStatus === 'completed') {
              console.log('🎉 Generation completed via realtime!');
              
              // Stop polling
              stopPolling();
              
              // Fetch the full generation data
              const { data: generationData } = await supabase
                .from('generations')
                .select('id, storage_path, output_index, type, is_batch_output')
                .eq('id', state.pollingGenerationId)
                .single();
              
              let outputs: GenerationOutput[] = [];

              // Handle batch outputs (multiple images/audio)
              if (generationData?.is_batch_output) {
                console.log('📦 Fetching batch child outputs...');
                const { data: children } = await supabase
                  .from('generations')
                  .select('id, storage_path, output_index, model_id, type, provider_task_id')
                  .eq('parent_generation_id', state.pollingGenerationId)
                  .order('output_index', { ascending: true });

                if (children && children.length > 0) {
                  outputs = children
                    .filter(child => child.storage_path) // Only include children with valid storage_path
                    .map(child => ({
                      id: child.id,
                      storage_path: child.storage_path,
                      output_index: child.output_index,
                      model_id: child.model_id,
                      provider_task_id: child.provider_task_id,
                      type: child.type,
                    }));
                  console.log(`✅ Found ${outputs.length} batch outputs via realtime (filtered out ${children.length - outputs.length} without storage_path)`);
                }
              } else if (generationData?.storage_path) {
                // Single output
                outputs = [{
                  id: generationData.id,
                  storage_path: generationData.storage_path,
                  output_index: generationData.output_index || 0,
                  type: generationData.type,
                }];
                console.log('✅ Found single output via realtime');
              }
              
              if (outputs.length > 0) {
                console.log('🎉 Updating UI with realtime data', { outputs });
                
                // Update state immediately
                updateState({
                  generatedOutputs: outputs,
                  generatedOutput: outputs[0]?.storage_path || null,
                  selectedOutputIndex: 0,
                  generationCompleteTime: Date.now(),
                  localGenerating: false,
                  pollingGenerationId: null,
                  parentGenerationId: generationData.id,
                });
                
                // Update onboarding progress
                if (progress && !progress.checklist.completedFirstGeneration) {
                  updateProgress({ completedFirstGeneration: true });
                  setFirstGeneration(generationData.id);
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
              } else {
                console.warn('⚠️ Generation completed but no outputs found');
                updateState({
                  localGenerating: false,
                  pollingGenerationId: null,
                });
                toast.error('Generation completed but no outputs were found');
              }
              } else if (newStatus === 'failed' || newStatus === 'error') {
                console.log('❌ Generation failed via realtime');
                stopPolling();

                // Fetch latest provider details for a meaningful error message
                try {
                  const { data: gen } = await supabase
                    .from('generations')
                    .select('provider_response, status')
                    .eq('id', payload.new.id)
                    .single();
                  const pr: any = gen?.provider_response || {};
                  const detailed = pr?.error || pr?.message || pr?.error_message || pr?.detail || (pr?.error && pr?.error?.message);
                  const msg = detailed ? String(detailed) : `Generation ${newStatus}`;

                  // Store error in state for persistent display
                  updateState({ 
                    localGenerating: false, 
                    pollingGenerationId: null,
                    failedGenerationError: {
                      message: msg,
                      generationId: payload.new.id,
                      timestamp: Date.now(),
                      providerResponse: gen?.provider_response
                    }
                  });

                  toast.error(msg, {
                    description: 'Your credits will be refunded automatically if nothing was produced.',
                    action: { label: 'View History', onClick: () => navigate('/dashboard/history') }
                  });
                } catch (e) {
                  console.warn('Failed to fetch provider details for error toast', e);
                  updateState({ 
                    localGenerating: false, 
                    pollingGenerationId: null,
                    failedGenerationError: {
                      message: 'Generation failed',
                      generationId: payload.new.id,
                      timestamp: Date.now()
                    }
                  });
                  toast.error('Generation failed', {
                    description: 'Your credits will be refunded automatically if nothing was produced.',
                    action: { label: 'View History', onClick: () => navigate('/dashboard/history') }
                  });
                }
              }
          }
        )
        .subscribe();

      return () => {
        console.log('🔴 Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeAndCheckStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pollingGenerationId, stopPolling, updateState, progress, updateProgress, setFirstGeneration, state.generateCaption]);

  // Realtime subscription for ai_models updates (schema changes from admin)
  useEffect(() => {
    const channel = supabase
      .channel('ai-models-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ai_models' 
      }, () => {
        console.log('🔄 AI Models schema updated, refreshing...');
        queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);


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
      
      const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);
      if (!currentModel) {
        updateState({ templateBeforeImage: null, templateAfterImage: null });
        return;
      }
      
      const { data: templateData } = await supabase
        .from('content_templates')
        .select('thumbnail_url')
        .eq('model_record_id', state.selectedModel)
        .limit(1)
        .maybeSingle();
      
      if (templateData?.thumbnail_url) {
        const thumbnailUrl = await createSignedUrl('generated-content', extractStoragePath(templateData.thumbnail_url));
        updateState({ templateAfterImage: thumbnailUrl, templateBeforeImage: null });
      } else {
        updateState({ templateBeforeImage: null, templateAfterImage: null });
      }
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
            maxPromptLength={maxPromptLength}
            onSurpriseMe={onSurpriseMe}
            generatingSurprise={state.generatingSurprise}
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
