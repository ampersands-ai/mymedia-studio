import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ModelSelector } from "./ModelSelector";
import { PromptInput } from "./PromptInput";
import { ImageUploadSection } from "./ImageUploadSection";
import { AdvancedOptionsPanel } from "./AdvancedOptionsPanel";
import { SchemaInput } from "@/components/generation/SchemaInput";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, RotateCcw, Coins } from "lucide-react";
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

  return (
    <Card className="bg-card border-border shadow-sm rounded-xl order-1">
      <div className="border-b border-border px-4 md:px-6 py-3 md:py-4 bg-muted/30">
        <h2 className="text-base md:text-lg font-bold text-foreground">Input</h2>
      </div>

      <div className="p-4 md:p-8 space-y-6 pb-32 md:pb-8">
        <ModelSelector
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

        {/* Primary text field (script, lyrics, etc.) */}
        {textKey && textKeySchema && (
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

        {/* Desktop action buttons */}
        <div className="hidden md:flex flex-col gap-3">
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
      </div>
    </Card>
  );
};
