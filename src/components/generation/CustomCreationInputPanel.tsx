import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Loader2, Camera, Sparkles, Coins, ChevronDown, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { useUserTokens } from "@/hooks/useUserTokens";
import { ModelParameterForm } from "./ModelParameterForm";
import { cn } from "@/lib/utils";

interface CustomCreationInputPanelProps {
  selectedModel: string | null;
  models: any[];
  prompt: string;
  onPromptChange: (prompt: string) => void;
  uploadedImages: File[];
  onImagesChange: (files: File[]) => void;
  modelParameters: Record<string, any>;
  onParametersChange: (params: Record<string, any>) => void;
  enhancePrompt: boolean;
  onEnhancePromptChange: (enhance: boolean) => void;
  generateCaption: boolean;
  onGenerateCaptionChange: (generate: boolean) => void;
  estimatedTokens: number;
  isGenerating: boolean;
  maxPromptLength: number;
  onGenerate: () => void;
  onBack: () => void;
}

export const CustomCreationInputPanel = ({
  selectedModel,
  models,
  prompt,
  onPromptChange,
  uploadedImages,
  onImagesChange,
  modelParameters,
  onParametersChange,
  enhancePrompt,
  onEnhancePromptChange,
  generateCaption,
  onGenerateCaptionChange,
  estimatedTokens,
  isGenerating,
  maxPromptLength,
  onGenerate,
  onBack,
}: CustomCreationInputPanelProps) => {
  const { pickImage, pickMultipleImages, isLoading: cameraLoading, isNative } = useNativeCamera();
  const { data: userTokens } = useUserTokens();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const tokenBalance = userTokens?.tokens_remaining || 0;
  const hasEnoughTokens = tokenBalance >= estimatedTokens;

  // Get current model details
  const currentModel = models.find(m => m.record_id === selectedModel);
  const modelSchema = currentModel?.input_schema;

  // Get image field info
  const getImageFieldInfo = () => {
    if (!modelSchema?.properties) return { fieldName: null, isRequired: false, maxImages: 0 };
    
    const properties = modelSchema.properties;
    const required = modelSchema.required || [];
    
    const imageFieldNames = ['inputImage', 'image_urls', 'imageUrl', 'image_url', 'image', 'images', 'filesUrl', 'filesURL', 'file_urls', 'fileUrls', 'reference_image_urls'];
    for (const fieldName of imageFieldNames) {
      if (properties[fieldName]) {
        const isRequired = required.includes(fieldName);
        const maxImages = currentModel.max_images ?? 0;
        return { fieldName, isRequired, maxImages };
      }
    }
    
    return { fieldName: null, isRequired: false, maxImages: 0 };
  };

  const imageFieldInfo = getImageFieldInfo();
  const isImageRequired = imageFieldInfo.isRequired;
  const maxImages = imageFieldInfo.maxImages;

  const schemaRequired = modelSchema?.required || [];
  const isPromptRequired = schemaRequired.includes('prompt');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      onImagesChange(fileArray);
      toast.success(`${fileArray.length} image${fileArray.length > 1 ? 's' : ''} selected`);
    }
  };

  const handleNativeCamera = async () => {
    try {
      const files = maxImages > 1 
        ? await pickMultipleImages(maxImages)
        : [await pickImage('camera')].filter(Boolean) as File[];
      
      if (files.length > 0) {
        onImagesChange(files);
        toast.success(`${files.length} image${files.length > 1 ? 's' : ''} captured`);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Failed to capture image');
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const canGenerate = selectedModel && 
    (isPromptRequired ? prompt.trim() : true) &&
    (isImageRequired ? uploadedImages.length > 0 : true);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <Button
              variant="ghost"
              onClick={onBack}
              className="mb-4 text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <h1 className="text-2xl font-bold">{currentModel?.model_name || "Select a Model"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentModel?.description || "Choose a model to get started"}
            </p>
          </div>

          {/* Model Steps Badge */}
          {currentModel && (
            <Badge variant="outline" className="w-fit">
              <Sparkles className="h-3 w-3 mr-1" />
              Single Step
            </Badge>
          )}

          {/* Prompt Input */}
          {modelSchema?.properties?.prompt && (
            <div className="space-y-2">
              <Label>
                Prompt
                {isPromptRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value.slice(0, maxPromptLength))}
                placeholder="Describe what you want to create..."
                className="min-h-[120px] resize-none"
                maxLength={maxPromptLength}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{prompt.length} / {maxPromptLength} characters</span>
              </div>
            </div>
          )}

          {/* Image Upload */}
          {imageFieldInfo.fieldName && (
            <div className="space-y-2">
              <Label>
                Image
                {isImageRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                
                {isNative && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleNativeCamera}
                    disabled={cameraLoading || isGenerating}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={maxImages > 1}
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Image Previews */}
              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {uploadedImages.map((file, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Advanced Options */}
          {currentModel && (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  Advanced Options
                  <ChevronDown className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Model Parameters */}
                {modelSchema && (
                  <ModelParameterForm
                    modelSchema={modelSchema as any}
                    currentValues={modelParameters}
                    onChange={onParametersChange}
                  />
                )}

                {/* Enhance Prompt */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="enhance"
                    checked={enhancePrompt}
                    onCheckedChange={(checked) => onEnhancePromptChange(checked as boolean)}
                  />
                  <Label htmlFor="enhance" className="text-sm font-normal cursor-pointer">
                    Enhance prompt with AI
                  </Label>
                </div>

                {/* Generate Caption */}
                {currentModel?.content_type === 'image' && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="caption"
                      checked={generateCaption}
                      onCheckedChange={(checked) => onGenerateCaptionChange(checked as boolean)}
                    />
                    <Label htmlFor="caption" className="text-sm font-normal cursor-pointer">
                      Generate social media caption
                    </Label>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Token Cost Display */}
          <Card className={cn(
            "border-2",
            !hasEnoughTokens && "border-destructive"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Estimated Cost</span>
                </div>
                <Badge variant={hasEnoughTokens ? "secondary" : "destructive"}>
                  {estimatedTokens} tokens
                </Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Your balance:{" "}
                <span className={cn(
                  "font-medium",
                  hasEnoughTokens ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}>
                  {tokenBalance.toLocaleString()} tokens
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Execute Button - Fixed at bottom */}
      <div className="p-6 border-t bg-background">
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating || !hasEnoughTokens}
          className="w-full h-12"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Execute Creation
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
