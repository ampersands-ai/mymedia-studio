import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModelFamilySelector } from "./ModelFamilySelector";
import { PromptInput } from "./PromptInput";
import { ImageUploadSection } from "./ImageUploadSection";
import { AudioUploadSection } from "./AudioUploadSection";
import { AdvancedOptionsPanel } from "./AdvancedOptionsPanel";
import { SchemaInput } from "@/components/generation/SchemaInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCcw, Coins, Clock, ArrowUp } from "lucide-react";
import type { CreationGroup } from "@/constants/creation-groups";
import type { 
  ModelRecord, 
  SchemaValue, 
  SchemaChangeHandler 
} from "@/types/custom-creation";
import type { JsonSchemaProperty, ModelJsonSchema, ModelParameters } from "@/types/model-schema";
import { getFieldOrder, getSchemaProperty, getFilteredEnum } from "@/types/model-schema";

interface InputPanelProps {
  selectedModel: string | null;
  filteredModels: ModelRecord[];
  selectedGroup: CreationGroup;
  onModelChange: (modelId: string) => void;
  modelsLoading: boolean;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  hasPromptField: boolean;
  isPromptRequired: boolean;
  maxPromptLength: number;
  onSurpriseMe: () => void;
  generatingSurprise: boolean;
  generateCaption: boolean;
  onGenerateCaptionChange: (enabled: boolean) => void;
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
  // Audio upload props
  uploadedAudio: File | null;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudio: () => void;
  audioFieldName: string | null;
  isAudioRequired: boolean;
  audioMaxDuration: number | null;
  audioFileInputRef: React.RefObject<HTMLInputElement>;
  onAudioDurationChange?: (duration: number | null) => void;
  hasDuration: boolean;
  durationValue: SchemaValue;
  onDurationChange: SchemaChangeHandler;
  durationSchema: JsonSchemaProperty | null;
  hasIncrement: boolean;
  incrementValue: boolean;
  onIncrementChange: (value: boolean) => void;
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  modelSchema: ModelJsonSchema | null;
  modelParameters: ModelParameters;
  onModelParametersChange: (params: ModelParameters) => void;
  modelId: string;
  provider: string;
  advancedOptionsRef: React.RefObject<HTMLDivElement>;
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
  // Audio upload props
  uploadedAudio,
  onAudioUpload,
  onRemoveAudio,
  audioFieldName,
  isAudioRequired,
  audioMaxDuration,
  audioFileInputRef,
  onAudioDurationChange,
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
  modelId,
  provider,
  advancedOptionsRef,
  onGenerate,
  onReset,
  isGenerating,
  pollingGenerationId,
  localGenerating,
  estimatedTokens,
}) => {
  const isDisabled = localGenerating || isGenerating || !!pollingGenerationId;
  const canGenerate =
    selectedModel &&
    (!isPromptRequired || prompt.trim()) &&
    (!isImageRequired || uploadedImages.length > 0) &&
    (!isAudioRequired || uploadedAudio !== null) &&
    (maxPromptLength === undefined || prompt.length <= maxPromptLength);
  
  // Get selected model details for duration display
  const selectedModelData = filteredModels.find(m => m.record_id === selectedModel);

  // Read explicit renderer toggles from schema (with backward-compatible defaults)
  const usePromptRenderer = modelSchema?.usePromptRenderer ?? true;
  const useImageRenderer = modelSchema?.useImageRenderer ?? true;
  const useDurationRenderer = modelSchema?.useDurationRenderer ?? false;
  const useIncrementRenderer = modelSchema?.useIncrementRenderer ?? true;
  const useOutputFormatRenderer = modelSchema?.useOutputFormatRenderer ?? false;

  // Calculate shouldUseSpecializedImageRenderer once (outside loop)
  // Special case: Don't use specialized renderer for startFrame if endFrame exists (Veo HQ/Fast)
  const hasEndFrame = modelSchema?.properties?.endFrame;
  const shouldUseSpecializedImageRenderer = useImageRenderer &&
    imageFieldName &&
    !(imageFieldName === 'startFrame' && hasEndFrame);

  // Build set of fields that use specialized renderers (schema-driven approach)
  const specializedFields = new Set<string>();

  // Iterate through all schema properties and check renderer property
  if (modelSchema?.properties) {
    Object.entries(modelSchema.properties).forEach(([key, prop]: [string, any]) => {
      // Prompt renderer fields
      if (usePromptRenderer && hasPromptField && prop.renderer === 'prompt') {
        specializedFields.add(key);
      }

      // Image renderer fields
      if (shouldUseSpecializedImageRenderer &&
          prop.renderer === 'image' &&
          key === imageFieldName) {
        specializedFields.add(key);
      }

      // Audio renderer fields - add to specialized to skip in generic loop
      if (audioFieldName && prop.renderer === 'audio' && key === audioFieldName) {
        specializedFields.add(key);
      }

      // Duration renderer fields
      if (useDurationRenderer && hasDuration && prop.renderer === 'duration') {
        specializedFields.add(key);
      }

      // Increment renderer fields
      if (useIncrementRenderer && hasIncrement && prop.renderer === 'increment') {
        specializedFields.add(key);
      }

      // Output format renderer fields
      if (useOutputFormatRenderer && prop.renderer === 'outputFormat') {
        specializedFields.add(key);
      }
    });
  }

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
            disabled={isDisabled}
            generateCaption={generateCaption}
            onGenerateCaptionChange={onGenerateCaptionChange}
            generatingSurprise={generatingSurprise}
          />
        )}

        {imageFieldName && shouldUseSpecializedImageRenderer && (
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
            modelName={selectedModelData?.model_name}
          />
        )}

        {/* Audio upload section */}
        {audioFieldName && (
          <AudioUploadSection
            audio={uploadedAudio}
            onUpload={onAudioUpload}
            onRemove={onRemoveAudio}
            isRequired={isAudioRequired}
            fileInputRef={audioFileInputRef}
            maxDuration={audioMaxDuration}
            onDurationChange={onAudioDurationChange}
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

        {/* Render parameters based purely on schema flags and x-order */}
        {(() => {
          // Get ordered fields from schema's x-order
          const orderedFields = getFieldOrder(modelSchema);
          
          const basicParams = orderedFields.filter(key => {
            const prop = getSchemaProperty(modelSchema, key);
            if (!prop) return false;
            // Skip if hidden
            if (prop.showToUser === false) return false;
            // Skip if advanced
            if (prop.isAdvanced === true) return false;
            // Skip if using specialized renderer
            if (specializedFields.has(key)) return false;
            return true;
          });
          
          const advancedParams = orderedFields.filter(key => {
            const prop = getSchemaProperty(modelSchema, key);
            if (!prop) return false;
            // Skip if hidden
            if (prop.showToUser === false) return false;
            // Only include advanced
            if (prop.isAdvanced !== true) return false;
            // Skip if using specialized renderer
            if (specializedFields.has(key)) return false;
            return true;
          });
          
          return (
            <>
              {/* Basic parameters - always show outside */}
              {basicParams.length > 0 && (
                <div className="space-y-4">
                  {(() => {
                    const renderedIndices = new Set<number>();
                    
                    return basicParams.map((key, index) => {
                      // Skip if already rendered as part of a group
                      if (renderedIndices.has(index)) return null;
                      
                      const schemaProp = getSchemaProperty(modelSchema, key);
                      if (!schemaProp) return null;
                      
                      // Check if this is an image field and if the next field is also an image
              // Only group single image fields side-by-side, not array-type images
              const isImageField = schemaProp.renderer === 'image' && schemaProp.type !== 'array';
                      const nextKey = basicParams[index + 1];
                      const nextProp = nextKey ? getSchemaProperty(modelSchema, nextKey) : null;
                      const nextIsImage = nextProp?.renderer === 'image' && nextProp?.type !== 'array';
                      
                      // Special case: startFrame and endFrame for Veo HQ/Fast models
                      const isStartFrame = key === 'startFrame';
                      const isEndFrame = nextKey === 'endFrame';
                      const shouldGroupImages = isImageField && nextIsImage && isStartFrame && isEndFrame;
                      
                      if (shouldGroupImages) {
                        // Mark next index as rendered
                        renderedIndices.add(index + 1);
                        
                        // Render both fields side-by-side
                        return (
                          <div key={`group-${key}-${nextKey}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SchemaInput
                              name={key}
                              schema={schemaProp}
                              value={modelParameters[key]}
                              onChange={(value) => onModelParametersChange({ ...modelParameters, [key]: value })}
                              required={modelSchema?.required?.includes(key)}
                              filteredEnum={getFilteredEnum(modelSchema, key, schemaProp, modelParameters)}
                              allValues={modelParameters}
                              modelSchema={modelSchema}
                              modelId={modelId}
                              provider={provider}
                            />
                            <SchemaInput
                              name={nextKey}
                              schema={nextProp!}
                              value={modelParameters[nextKey]}
                              onChange={(value) => onModelParametersChange({ ...modelParameters, [nextKey]: value })}
                              required={modelSchema?.required?.includes(nextKey)}
                              filteredEnum={getFilteredEnum(modelSchema, nextKey, nextProp!, modelParameters)}
                              allValues={modelParameters}
                              modelSchema={modelSchema}
                              modelId={modelId}
                              provider={provider}
                            />
                          </div>
                        );
                      }
                      
                      // Render single field normally
                      return (
                        <SchemaInput
                          key={key}
                          name={key}
                          schema={schemaProp}
                          value={modelParameters[key]}
                          onChange={(value) => onModelParametersChange({ ...modelParameters, [key]: value })}
                          required={modelSchema?.required?.includes(key)}
                          filteredEnum={getFilteredEnum(modelSchema, key, schemaProp, modelParameters)}
                          allValues={modelParameters}
                          modelSchema={modelSchema}
                          modelId={modelId}
                          provider={provider}
                        />
                      );
                    });
                  })()}
                </div>
              )}
              
              {/* Advanced Options panel - only show if there are advanced parameters */}
              {advancedParams.length > 0 && (
                <div ref={advancedOptionsRef}>
              <AdvancedOptionsPanel
                open={advancedOpen}
                onOpenChange={onAdvancedOpenChange}
                modelSchema={modelSchema}
                parameters={modelParameters}
                onParametersChange={onModelParametersChange}
                modelId={modelId}
                provider={provider}
              />
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Sticky action buttons at bottom - ALWAYS VISIBLE */}
      <div className="sticky bottom-0 left-0 right-0 flex flex-col gap-3 p-4 md:px-8 pb-safe md:pb-6 border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-40 shrink-0">
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isDisabled}
          size="lg"
          className="w-full gap-2 font-bold"
        >
          <Sparkles className="h-5 w-5" />
          Generate
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded">
              <Coins className="h-3 w-3" />
              <span className="text-xs">~{estimatedTokens.toFixed(2)}</span>
            </div>
            {selectedModelData?.estimated_time_seconds && (
              <div className="flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded">
                <Clock className="h-3 w-3" />
                <span className="text-xs">~{selectedModelData.estimated_time_seconds}s</span>
              </div>
            )}
          </div>
        </Button>
        <Button onClick={onReset} variant="outline" className="w-full gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      {/* Floating scroll-to-top button - positioned above sticky footer with safe area */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="absolute bottom-32 right-4 md:bottom-36 md:right-8 z-10 shadow-lg rounded-full h-12 w-12 min-h-[48px] min-w-[48px] transition-all duration-300 hover:scale-110"
          title="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </Card>
  );
};
