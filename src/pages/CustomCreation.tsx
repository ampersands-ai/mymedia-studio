import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/contexts/AuthContext";
import { GenerationErrorBoundary } from "@/components/error/GenerationErrorBoundary";
import { useNavigate } from "react-router-dom";
import { SessionWarning } from "@/components/SessionWarning";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { SuccessConfetti } from "@/components/onboarding/SuccessConfetti";
import { useModels } from "@/hooks/useModels";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserTokens } from "@/hooks/useUserTokens";
import { CREATION_GROUPS, type CreationGroup } from "@/constants/creation-groups";
import { useCustomCreationState } from "@/hooks/useCustomCreationState";
import { useGenerationPolling } from "@/hooks/useGenerationPolling";
import { useCustomGeneration } from "@/hooks/useCustomGeneration";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useCaptionGeneration } from "@/hooks/useCaptionGeneration";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useSchemaHelpers } from "@/hooks/useSchemaHelpers";
import type { GenerationOutput } from "@/hooks/useGenerationState";
import { CreationGroupSelector } from "@/components/custom-creation/CreationGroupSelector";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { BestPracticesCard } from "@/components/custom-creation/BestPracticesCard";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, extractStoragePath } from "@/lib/storage-utils";
import { downloadMultipleOutputs } from "@/lib/download-utils";
import { getSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { toast } from "sonner";
import type { JsonSchemaProperty, ModelJsonSchema } from "@/types/model-schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CustomCreation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
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

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(currentModel as any);

  // Generation polling
  const { startPolling, stopPolling, isPolling } = useGenerationPolling({
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
        generateCaption();
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
        .select('id, status, storage_path, is_batch_output, type, output_index')
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
            outputs = children.map(child => ({
              id: child.id,
              storage_path: child.storage_path,
              output_index: child.output_index,
              model_id: child.model_id,
              provider_task_id: child.provider_task_id,
              type: child.type,
            }));
            console.log(`✅ Found ${outputs.length} batch outputs`);
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
          if (state.generateCaption) {
            generateCaption();
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
                  outputs = children.map(child => ({
                    id: child.id,
                    storage_path: child.storage_path,
                    output_index: child.output_index,
                    model_id: child.model_id,
                    provider_task_id: child.provider_task_id,
                    type: child.type,
                  }));
                  console.log(`✅ Found ${outputs.length} batch outputs via realtime`);
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
                if (state.generateCaption) {
                  generateCaption();
                }
              } else {
                console.warn('⚠️ Generation completed but no outputs found');
                updateState({
                  localGenerating: false,
                  pollingGenerationId: null,
                });
                toast.error('Generation completed but no outputs were found');
              }
            } else if (newStatus === 'failed') {
              console.log('❌ Generation failed via realtime');
              stopPolling();
              updateState({ localGenerating: false, pollingGenerationId: null });
              toast.error('Generation failed', {
                description: 'Your credits have been refunded.'
              });
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
  }, [state.pollingGenerationId, stopPolling, updateState, progress, updateProgress, setFirstGeneration, state.generateCaption]);


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
    isGeneratingVideo,
  } = useVideoGeneration(state.parentGenerationId);

  // Custom generation logic
  const {
    handleGenerate,
    handleSurpriseMe,
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
    const surprisePrompt = getSurpriseMePrompt(state.selectedGroup);
    setStatePrompt(surprisePrompt);
    updateState({ generatingSurprise: false });
  }, [state.selectedGroup, updateState, setStatePrompt]);

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
  const modelSchema = currentModel?.input_schema as { 
    properties?: Record<string, unknown>; 
    required?: string[] 
  } | null | undefined;
  const textKey = schemaHelpers.findPrimaryTextKey(modelSchema?.properties);
  const voiceKey = schemaHelpers.findPrimaryVoiceKey(modelSchema?.properties, currentModel as any);
  const hasPromptField = !!(
    modelSchema?.properties?.prompt || 
    modelSchema?.properties?.positivePrompt ||
    modelSchema?.properties?.positive_prompt ||
    textKey
  );
  const isPromptRequired = (modelSchema?.required || []).some((field: string) => 
    ['prompt', 'positivePrompt', 'positive_prompt'].includes(field)
  );
  const maxPromptLength = schemaHelpers.getMaxPromptLength(currentModel as any, state.modelParameters.customMode);
  const hasDuration = !!(modelSchema?.properties?.duration);
  const hasIncrement = !!(modelSchema?.properties?.increment || modelSchema?.properties?.incrementBySeconds);
  
  const advancedOptionsRef = useRef<HTMLDivElement>(null);

  // Infer content type from first output's file extension if available
  const contentType = (() => {
    const firstPath = state.generatedOutputs[0]?.storage_path || null;
    if (!firstPath) return currentModel?.content_type || 'image';
    const ext = (firstPath.split('.').pop() || '').toLowerCase();
    if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    return currentModel?.content_type || 'image';
  })();

  // Determine if generation button should be disabled
  const isGenerateDisabled = 
    isGenerating || 
    state.localGenerating || 
    !state.selectedModel ||
    (imageFieldInfo.isRequired && uploadedImages.length === 0);

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
            modelsLoading={modelsLoading}
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
            onGenerate={handleGenerate}
            isGenerating={isGenerating || state.localGenerating}
            estimatedTokens={estimatedTokens}
            modelId={state.selectedModel || ''}
            provider={currentModel?.provider || ''}
            excludeFields={[
              // Image/file upload fields
              'prompt', 'positivePrompt', 'positive_prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 
              'filesUrl', 'fileUrls', 'reference_image_urls', 'frameImages',
              
              // Primary fields already shown
              textKey || '', voiceKey || '', 'duration', 'increment', 'incrementBySeconds',
              
              // Number of images fields (move outside advanced)
              'num_images', 'max_images', 'numberOfImages', 'numImages', 'number_of_images',
              
              // Aspect ratio / size fields (move outside advanced)
              'aspect_ratio', 'aspectRatio', 'image_size', 'imageSize', 'image_resolution', 
              'imageResolution', 'resolution', 'size', 'dimensions',
              
              // NOTE: negative_prompt is NOT here - it stays in Advanced Options
            ].filter(Boolean) as string[]}
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
