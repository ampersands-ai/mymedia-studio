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
import { Sparkles, RotateCcw, Coins, Clock, ArrowUp } from "lucide-react";
import type { CreationGroup } from "@/constants/creation-groups";
import type { 
  ModelRecord, 
  SchemaValue, 
  SchemaChangeHandler 
} from "@/types/custom-creation";
import type { JsonSchemaProperty, ModelJsonSchema, ModelParameters } from "@/types/model-schema";
import { getFieldOrder, getSchemaProperty } from "@/types/model-schema";

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
    (maxPromptLength === undefined || prompt.length <= maxPromptLength);
  
  // Get selected model details for duration display
  const selectedModelData = filteredModels.find(m => m.record_id === selectedModel);

  // Read explicit renderer toggles from schema (with backward-compatible defaults)
  const usePromptRenderer = modelSchema?.usePromptRenderer ?? true;
  const useImageRenderer = modelSchema?.useImageRenderer ?? true;
  const useVoiceRenderer = modelSchema?.useVoiceRenderer ?? false;
  const useDurationRenderer = modelSchema?.useDurationRenderer ?? false;
  const useIncrementRenderer = modelSchema?.useIncrementRenderer ?? true;
  const useOutputFormatRenderer = modelSchema?.useOutputFormatRenderer ?? false;

  // Build set of fields that use specialized renderers
  const specializedFields = new Set<string>();

  // Prompt renderer fields
  if (usePromptRenderer && hasPromptField) {
    if (modelSchema?.properties?.prompt) specializedFields.add('prompt');
    if (modelSchema?.properties?.positivePrompt) specializedFields.add('positivePrompt');
    if (modelSchema?.properties?.positive_prompt) specializedFields.add('positive_prompt');
  }

  // Image renderer fields
  // Special case: Don't use specialized renderer for imageUrls if End_Frame exists (Veo models)
  // so both can be rendered side-by-side in the schema loop
  const hasEndFrame = modelSchema?.properties?.End_Frame;
  const shouldUseSpecializedImageRenderer = useImageRenderer && imageFieldName && 
    !(imageFieldName === 'imageUrls' && hasEndFrame);
  
  if (shouldUseSpecializedImageRenderer) {
    specializedFields.add(imageFieldName);
  }

  // Duration renderer fields
  if (useDurationRenderer && hasDuration) {
    specializedFields.add('duration');
  }

  // Increment renderer fields
  if (useIncrementRenderer && hasIncrement) {
    if (modelSchema?.properties?.increment) specializedFields.add('increment');
    if (modelSchema?.properties?.incrementBySeconds) specializedFields.add('incrementBySeconds');
  }

  // Output format renderer fields
  if (useOutputFormatRenderer) {
    if (modelSchema?.properties?.outputFormat) specializedFields.add('outputFormat');
    if (modelSchema?.properties?.output_format) specializedFields.add('output_format');
    if (modelSchema?.properties?.format) specializedFields.add('format');
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
                      const isImageField = schemaProp.renderer === 'image';
                      const nextKey = basicParams[index + 1];
                      const nextProp = nextKey ? getSchemaProperty(modelSchema, nextKey) : null;
                      const nextIsImage = nextProp?.renderer === 'image';
                      
                      // Special case: imageUrls and End_Frame for Veo models
                      const isStartFrame = key === 'imageUrls';
                      const isEndFrame = nextKey === 'End_Frame';
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
                              modelId={modelId}
                              provider={provider}
                            />
                            <SchemaInput
                              name={nextKey}
                              schema={nextProp!}
                              value={modelParameters[nextKey]}
                              onChange={(value) => onModelParametersChange({ ...modelParameters, [nextKey]: value })}
                              required={modelSchema?.required?.includes(nextKey)}
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
      <div className="sticky bottom-0 left-0 right-0 flex flex-col gap-3 p-4 md:px-8 md:pb-6 border-t border-border bg-background/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-40 shrink-0">
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
