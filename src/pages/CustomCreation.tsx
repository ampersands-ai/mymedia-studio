import { useRef, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import { CreationGroupSelector } from "@/components/custom-creation/CreationGroupSelector";
import { InputPanel } from "@/components/custom-creation/InputPanel";
import { OutputPanel } from "@/components/custom-creation/OutputPanel";
import { MobileStickyButton } from "@/components/custom-creation/MobileStickyButton";
import { BestPracticesCard } from "@/components/custom-creation/BestPracticesCard";
import { supabase } from "@/integrations/supabase/client";
import { createSignedUrl, extractStoragePath } from "@/lib/storage-utils";
import { downloadMultipleOutputs } from "@/lib/download-utils";
import { getSurpriseMePrompt } from "@/data/surpriseMePrompts";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

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

  // Sort preference
  const [modelSortBy, setModelSortBy] = useState<string>("name");

  // Filter and sort models by selected group
  const filteredModels = allModels?.filter(model => {
    const groups = model.groups as string[] || [];
    return groups.includes(state.selectedGroup);
  }).sort((a, b) => {
    switch (modelSortBy) {
      case "name":
        return a.model_name.localeCompare(b.model_name);
      case "cost":
        return a.base_token_cost - b.base_token_cost;
      case "duration":
        const aDuration = a.estimated_time_seconds || 999999;
        const bDuration = b.estimated_time_seconds || 999999;
        return aDuration - bDuration;
      default:
        return a.base_token_cost - b.base_token_cost;
    }
  }) || [];

  // Get current model
  const currentModel = filteredModels.find(m => m.record_id === state.selectedModel);

  // Schema helpers
  const schemaHelpers = useSchemaHelpers();
  const imageFieldInfo = schemaHelpers.getImageFieldInfo(currentModel);

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

      // Update onboarding progress
      if (progress && !progress.checklist.completedFirstGeneration) {
        updateProgress({ completedFirstGeneration: true });
        setFirstGeneration(outputs[0]?.id || '');
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
    onError: () => {
      updateState({ localGenerating: false, pollingGenerationId: null });
    },
    onTimeout: () => {
      updateState({ localGenerating: false, pollingGenerationId: null });
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
  } = useImageUpload(currentModel);

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
    userTokens: userTokens?.tokens_remaining || 0,
  });

  // Surprise Me handler
  const onSurpriseMe = () => {
    updateState({ generatingSurprise: true });
    const surprisePrompt = getSurpriseMePrompt(state.selectedGroup);
    setStatePrompt(surprisePrompt);
    updateState({ generatingSurprise: false });
  };

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
  }, [state.selectedModel, filteredModels]);

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
  const modelSchema = currentModel?.input_schema;
  const textKey = schemaHelpers.findPrimaryTextKey(modelSchema?.properties);
  const voiceKey = schemaHelpers.findPrimaryVoiceKey(modelSchema?.properties, state.selectedModel || undefined);
  const hasPromptField = !!(modelSchema?.properties?.prompt);
  const isPromptRequired = (modelSchema?.required || []).includes('prompt');
  const maxPromptLength = schemaHelpers.getMaxPromptLength(currentModel, state.modelParameters.customMode);
  const hasDuration = !!(modelSchema?.properties?.duration);
  const hasIncrement = !!(modelSchema?.properties?.increment || modelSchema?.properties?.incrementBySeconds);
  
  const advancedOptionsRef = useRef<HTMLDivElement>(null);

  const contentType = currentModel?.content_type || 'image';

  // Determine if generation button should be disabled
  const isGenerateDisabled = 
    isGenerating || 
    state.localGenerating || 
    !state.selectedModel ||
    (imageFieldInfo.isRequired && uploadedImages.length === 0);

  return (
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

        {/* Model Sort Selector */}
        <div className="mb-4 flex justify-end">
          <Select value={modelSortBy} onValueChange={setModelSortBy}>
            <SelectTrigger className="w-[200px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort models..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">Cost (Low to High)</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="duration">Speed (Fastest First)</SelectItem>
            </SelectContent>
          </Select>
        </div>

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
            onPromptChange={setStatePrompt}
            hasPromptField={hasPromptField}
            isPromptRequired={isPromptRequired}
            maxPromptLength={maxPromptLength}
            onSurpriseMe={onSurpriseMe}
            generatingSurprise={state.generatingSurprise}
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
            onGenerate={handleGenerate}
            isGenerating={isGenerating || state.localGenerating}
            estimatedTokens={estimatedTokens}
            modelId={state.selectedModel || ''}
            provider={currentModel?.provider || ''}
            excludeFields={[
              // Image/file upload fields
              'prompt', 'inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 
              'filesUrl', 'fileUrls', 'reference_image_urls', 'frameImages',
              
              // Primary fields already shown
              textKey || '', voiceKey || '', 'duration', 'increment', 'incrementBySeconds',
              
              // Number of images fields (move outside advanced)
              'num_images', 'max_images', 'numberOfImages', 'numImages', 'number_of_images',
              
              // Aspect ratio / size fields (move outside advanced)
              'aspect_ratio', 'aspectRatio', 'image_size', 'imageSize', 'image_resolution', 
              'imageResolution', 'resolution', 'size', 'dimensions',
              
              // Output format fields (commonly single choice, not advanced)
              'outputFormat', 'output_format', 'format',
              
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
            />
          </div>
        </div>

        {/* Best Practices */}
        <BestPracticesCard />

        {/* Mobile Sticky Button */}
        <MobileStickyButton
          onGenerate={handleGenerate}
          disabled={isGenerateDisabled}
          isGenerating={isGenerating || state.localGenerating}
          estimatedTokens={estimatedTokens}
          estimatedDuration={currentModel?.estimated_time_seconds}
        />
      </div>
    </div>
  );
};

export default CustomCreation;
