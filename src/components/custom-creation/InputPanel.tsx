import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModelFamilySelector } from "./ModelFamilySelector";
import { PromptInput } from "./PromptInput";
import { ImageUploadSection } from "./ImageUploadSection";
import { AdvancedOptionsPanel } from "./AdvancedOptionsPanel";
import { SchemaInput } from "@/components/generation/SchemaInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCcw, Coins, ArrowUp } from "lucide-react";
import type { CreationGroup } from "@/constants/creation-groups";

interface InputPanelProps {
  // Model selection
  selectedModel: string | null;
  filteredModels: any[];
  selectedGroup: CreationGroup;
  onModelChange: (modelId: string) => void;
  modelsLoading: boolean;

  // Prompt
  prompt: string;
  onPromptChange: (prompt: string) => void;
  hasPromptField: boolean;
  isPromptRequired: boolean;
  maxPromptLength: number;
  onSurpriseMe: () => void;
  generatingSurprise: boolean;

  // Enhance & Caption
  enhancePrompt: boolean;
  onEnhancePromptChange: (enabled: boolean) => void;
  generateCaption: boolean;
  onGenerateCaptionChange: (enabled: boolean) => void;

  // Image upload
  uploadedImages: File[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (index: number) => void;
  imageFieldName: string | null;
  isImageRequired: boolean;
  maxImages: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraLoading: boolean;
  isNative: boolean;
  onNativeCameraPick: (source: 'camera' | 'gallery') => Promise<void>;

  // Primary fields (text/voice)
  textKey: string | undefined;
  textKeySchema: any;
  textKeyValue: any;
  onTextKeyChange: (value: any) => void;
  voiceKey: string | undefined;
  voiceKeySchema: any;
  voiceKeyValue: any;
  onVoiceKeyChange: (value: any) => void;

  // Duration & Increment
  hasDuration: boolean;
  durationValue: any;
  onDurationChange: (value: any) => void;
  durationSchema: any;
  hasIncrement: boolean;
  incrementValue: boolean;
  onIncrementChange: (value: boolean) => void;

  // Advanced options
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  modelSchema: any;
  modelParameters: Record<string, any>;
  onModelParametersChange: (params: Record<string, any>) => void;
  excludeFields: string[];
  modelId: string;
  provider: string;
  advancedOptionsRef: React.RefObject<HTMLDivElement>;

  // Actions
  onGenerate: () => void;
  onReset: () => void;
  isGenerating: boolean;
  isPolling: boolean;
  pollingGenerationId: string | null;
  localGenerating: boolean;
  estimatedTokens: number;
}

/**
 * Complete input panel combining all input components
 */
export const InputPanel: React.FC<InputPanelProps> = ({
  selectedModel,
  filteredModels,
  selectedGroup,
  onModelChange,
  modelsLoading,
  prompt,
  onPromptChange,
  hasPromptField,
  isPromptRequired,
  maxPromptLength,
  onSurpriseMe,
  generatingSurprise,
  enhancePrompt,
  onEnhancePromptChange,
  generateCaption,
  onGenerateCaptionChange,
  uploadedImages,
  onFileUpload,
  onRemoveImage,
  imageFieldName,
  isImageRequired,
  maxImages,
  fileInputRef,
  cameraLoading,
  isNative,
  onNativeCameraPick,
  textKey,
  textKeySchema,
  textKeyValue,
  onTextKeyChange,
  voiceKey,
  voiceKeySchema,
  voiceKeyValue,
  onVoiceKeyChange,
  hasDuration,
  durationValue,
  onDurationChange,
  durationSchema,
  hasIncrement,
  incrementValue,
  onIncrementChange,
  advancedOpen,
  onAdvancedOpenChange,
  modelSchema,
  modelParameters,
  onModelParametersChange,
  excludeFields,
  modelId,
  provider,
  advancedOptionsRef,
  onGenerate,
  onReset,
  isGenerating,
  isPolling,
  pollingGenerationId,
  localGenerating,
  estimatedTokens,
}) => {
  const isDisabled = localGenerating || isGenerating || !!pollingGenerationId;
  const canGenerate =
    selectedModel &&
    (!isPromptRequired || prompt.trim()) &&
    (!isImageRequired || uploadedImages.length > 0) &&
    prompt.length <= maxPromptLength;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll position to show/hide scroll-to-top button
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      // Show button after scrolling down 200px
      setShowScrollTop(scrollContainer.scrollTop > 200);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Card className="h-full flex flex-col border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 relative">
      <div className="border-b border-border px-4 md:px-6 py-3 md:py-4 bg-muted/30 shrink-0">
        <h2 className="text-base md:text-lg font-bold text-foreground">Input</h2>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <ModelFamilySelector
          models={filteredModels}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          selectedGroup={selectedGroup}
          isLoading={modelsLoading}
        />

        {hasPromptField && (
          <PromptInput
            value={prompt}
            onChange={onPromptChange}
            isRequired={isPromptRequired}
            maxLength={maxPromptLength}
            onSurpriseMe={onSurpriseMe}
            onEnhance={onEnhancePromptChange}
            enhanceEnabled={enhancePrompt}
            disabled={isDisabled}
            generateCaption={generateCaption}
            onGenerateCaptionChange={onGenerateCaptionChange}
            generatingSurprise={generatingSurprise}
          />
        )}

        {imageFieldName && (
          <ImageUploadSection
            images={uploadedImages}
            onUpload={onFileUpload}
            onRemove={onRemoveImage}
            maxImages={maxImages}
            isRequired={isImageRequired}
            isNative={isNative}
            cameraLoading={cameraLoading}
            fileInputRef={fileInputRef}
            onNativeCameraPick={onNativeCameraPick}
          />
        )}

        {/* Number of Images Control - Outside Advanced */}
        {(modelSchema?.properties?.num_images || 
          modelSchema?.properties?.max_images || 
          modelSchema?.properties?.numberOfImages ||
          modelSchema?.properties?.numImages ||
          modelSchema?.properties?.number_of_images) && (
          <div className="space-y-2">
            {modelSchema?.properties?.num_images && (
              <SchemaInput
                name="num_images"
                schema={modelSchema.properties.num_images}
                value={modelParameters.num_images}
                onChange={(value) => onModelParametersChange({ ...modelParameters, num_images: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.max_images && (
              <SchemaInput
                name="max_images"
                schema={modelSchema.properties.max_images}
                value={modelParameters.max_images}
                onChange={(value) => onModelParametersChange({ ...modelParameters, max_images: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.numberOfImages && (
              <SchemaInput
                name="numberOfImages"
                schema={modelSchema.properties.numberOfImages}
                value={modelParameters.numberOfImages}
                onChange={(value) => onModelParametersChange({ ...modelParameters, numberOfImages: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.numImages && (
              <SchemaInput
                name="numImages"
                schema={modelSchema.properties.numImages}
                value={modelParameters.numImages}
                onChange={(value) => onModelParametersChange({ ...modelParameters, numImages: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.number_of_images && (
              <SchemaInput
                name="number_of_images"
                schema={modelSchema.properties.number_of_images}
                value={modelParameters.number_of_images}
                onChange={(value) => onModelParametersChange({ ...modelParameters, number_of_images: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
          </div>
        )}

        {/* Aspect Ratio / Image Size Control - Outside Advanced */}
        {(modelSchema?.properties?.aspect_ratio || 
          modelSchema?.properties?.aspectRatio ||
          modelSchema?.properties?.image_size ||
          modelSchema?.properties?.imageSize ||
          modelSchema?.properties?.image_resolution ||
          modelSchema?.properties?.imageResolution ||
          modelSchema?.properties?.resolution ||
          modelSchema?.properties?.size ||
          modelSchema?.properties?.dimensions) && (
          <div className="space-y-2">
            {modelSchema?.properties?.aspect_ratio && (
              <SchemaInput
                name="aspect_ratio"
                schema={modelSchema.properties.aspect_ratio}
                value={modelParameters.aspect_ratio}
                onChange={(value) => onModelParametersChange({ ...modelParameters, aspect_ratio: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.aspectRatio && (
              <SchemaInput
                name="aspectRatio"
                schema={modelSchema.properties.aspectRatio}
                value={modelParameters.aspectRatio}
                onChange={(value) => onModelParametersChange({ ...modelParameters, aspectRatio: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.image_size && (
              <SchemaInput
                name="image_size"
                schema={modelSchema.properties.image_size}
                value={modelParameters.image_size}
                onChange={(value) => onModelParametersChange({ ...modelParameters, image_size: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.imageSize && (
              <SchemaInput
                name="imageSize"
                schema={modelSchema.properties.imageSize}
                value={modelParameters.imageSize}
                onChange={(value) => onModelParametersChange({ ...modelParameters, imageSize: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.image_resolution && (
              <SchemaInput
                name="image_resolution"
                schema={modelSchema.properties.image_resolution}
                value={modelParameters.image_resolution}
                onChange={(value) => onModelParametersChange({ ...modelParameters, image_resolution: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.imageResolution && (
              <SchemaInput
                name="imageResolution"
                schema={modelSchema.properties.imageResolution}
                value={modelParameters.imageResolution}
                onChange={(value) => onModelParametersChange({ ...modelParameters, imageResolution: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.resolution && (
              <SchemaInput
                name="resolution"
                schema={modelSchema.properties.resolution}
                value={modelParameters.resolution}
                onChange={(value) => onModelParametersChange({ ...modelParameters, resolution: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.size && (
              <SchemaInput
                name="size"
                schema={modelSchema.properties.size}
                value={modelParameters.size}
                onChange={(value) => onModelParametersChange({ ...modelParameters, size: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
            {modelSchema?.properties?.dimensions && (
              <SchemaInput
                name="dimensions"
                schema={modelSchema.properties.dimensions}
                value={modelParameters.dimensions}
                onChange={(value) => onModelParametersChange({ ...modelParameters, dimensions: value })}
                modelId={modelId}
                provider={provider}
              />
            )}
          </div>
        )}

        {/* Primary text field (script, lyrics, etc.) */}
        {textKey && textKeySchema && !['prompt', 'input_text', 'text'].includes(textKey.toLowerCase()) && (
          <SchemaInput
            name={textKey}
            schema={textKeySchema}
            value={textKeyValue}
            onChange={onTextKeyChange}
            modelId={modelId}
            provider={provider}
          />
        )}

        {/* Primary voice field for ElevenLabs */}
        {voiceKey && voiceKeySchema && (
          <SchemaInput
            name={voiceKey}
            schema={voiceKeySchema}
            value={voiceKeyValue}
            onChange={onVoiceKeyChange}
            modelId={modelId}
            provider={provider}
          />
        )}

        {/* Duration field (outside advanced) */}
        {hasDuration && durationSchema && (
          <SchemaInput
            name="duration"
            schema={durationSchema}
            value={durationValue}
            onChange={onDurationChange}
            modelId={modelId}
            provider={provider}
          />
        )}

        {/* Increment field (outside advanced) */}
        {hasIncrement && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <Label htmlFor="increment" className="text-sm font-medium cursor-pointer">
              Increment (Continue from previous)
            </Label>
            <Switch
              id="increment"
              checked={incrementValue}
              onCheckedChange={onIncrementChange}
              disabled={isDisabled}
            />
          </div>
        )}

        <div ref={advancedOptionsRef}>
          <AdvancedOptionsPanel
            open={advancedOpen}
            onOpenChange={onAdvancedOpenChange}
            modelSchema={modelSchema}
            parameters={modelParameters}
            onParametersChange={onModelParametersChange}
            excludeFields={excludeFields}
            modelId={modelId}
            provider={provider}
          />
        </div>
      </div>

      {/* Sticky action buttons at bottom */}
      <div className="hidden md:flex flex-col gap-3 p-4 md:px-8 md:pb-6 border-t border-border bg-card/80 backdrop-blur shrink-0">
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isDisabled}
          size="lg"
          className="w-full gap-2 font-bold"
        >
          <Sparkles className="h-5 w-5" />
          Generate
          <div className="flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded ml-auto">
            <Coins className="h-3 w-3" />
            <span className="text-xs">~{estimatedTokens.toFixed(2)}</span>
          </div>
        </Button>
        <Button onClick={onReset} variant="outline" className="w-full gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Floating scroll-to-top button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="absolute bottom-28 right-4 md:bottom-32 md:right-8 z-10 shadow-lg rounded-full h-12 w-12 transition-all duration-300 hover:scale-110"
          title="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </Card>
  );
};
