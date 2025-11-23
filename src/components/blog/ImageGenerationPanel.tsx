import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ImagePlus, Sparkles, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAllModels } from "@/lib/models/registry";

interface SuggestedImage {
  prompt: string;
  alt_text: string;
  position: number;
}

interface GeneratedImage {
  url: string;
  prompt: string;
  alt_text: string;
  model_id: string;
  generation_id: string;
}

interface ImageGenerationPanelProps {
  suggestedImages: SuggestedImage[];
  onImageGenerated: (image: GeneratedImage) => void;
  blogTitle: string;
}

export const ImageGenerationPanel = ({
  suggestedImages,
  onImageGenerated,
  blogTitle,
}: ImageGenerationPanelProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [altText, setAltText] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  // Get available image generation models
  const imageModels = getAllModels()
    .filter((m) =>
      m.MODEL_CONFIG.contentType === "prompt_to_image" &&
      m.MODEL_CONFIG.isActive
    )
    .map((m) => ({
      id: m.MODEL_CONFIG.recordId,
      name: m.MODEL_CONFIG.modelName,
      provider: m.MODEL_CONFIG.provider,
      cost: m.MODEL_CONFIG.baseCreditCost,
    }));

  const handleSelectSuggested = (suggested: SuggestedImage) => {
    setSelectedPrompt(suggested.prompt);
    setCustomPrompt(suggested.prompt);
    setAltText(suggested.alt_text);
    toast.success("Prompt loaded! Select a model and generate.");
  };

  const handleGenerate = async () => {
    if (!customPrompt) {
      toast.error("Please enter or select an image prompt");
      return;
    }

    if (!selectedModel) {
      toast.error("Please select an AI model");
      return;
    }

    if (!altText) {
      toast.error("Please provide alt text for SEO");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Find the selected model
      const modelModule = getAllModels().find(
        (m) => m.MODEL_CONFIG.recordId === selectedModel
      );

      if (!modelModule) throw new Error("Model not found");

      // Execute generation using the model's execute function
      const generationId = await modelModule.execute({
        userId: user.id,
        prompt: customPrompt,
        modelParameters: {
          width: 1024,
          height: 1024,
        },
        startPolling: () => {},
      });

      // Poll for completion
      let generation = null;
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max

      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from("generations")
          .select("*")
          .eq("id", generationId)
          .single();

        if (error) throw error;

        if (data.status === "completed" && data.output_url) {
          generation = data;
          break;
        }

        if (data.status === "failed") {
          throw new Error("Generation failed");
        }

        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
        attempts++;
      }

      if (!generation || !generation.output_url) {
        throw new Error("Generation timed out");
      }

      const newImage: GeneratedImage = {
        url: generation.output_url,
        prompt: customPrompt,
        alt_text: altText,
        model_id: selectedModel,
        generation_id: generationId,
      };

      setGeneratedImages([...generatedImages, newImage]);
      onImageGenerated(newImage);

      toast.success("Image generated successfully!");

      // Reset form
      setCustomPrompt("");
      setAltText("");
    } catch (error: any) {
      console.error("Error generating image:", error);
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyImageTag = (image: GeneratedImage) => {
    const imageTag = `<img src="${image.url}" alt="${image.alt_text}" class="rounded-lg shadow-lg my-4" />`;
    navigator.clipboard.writeText(imageTag);
    toast.success("Image HTML copied! Paste it in the editor.");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5" />
          AI Image Generation
        </CardTitle>
        <CardDescription>
          Generate SEO-optimized images using your AI models
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Suggested Image Prompts */}
        {suggestedImages.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">AI-Suggested Image Ideas:</Label>
            <div className="space-y-2">
              {suggestedImages.map((suggested, idx) => (
                <Card
                  key={idx}
                  className="p-3 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleSelectSuggested(suggested)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{suggested.prompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alt: {suggested.alt_text}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Position {suggested.position}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Custom Image Generation */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="image-prompt">Image Prompt</Label>
            <Input
              id="image-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt-text">Alt Text (SEO)</Label>
            <Input
              id="alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="SEO-friendly image description..."
              disabled={isGenerating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-select">AI Model</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isGenerating}>
              <SelectTrigger id="model-select">
                <SelectValue placeholder="Select an image generation model..." />
              </SelectTrigger>
              <SelectContent>
                {imageModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{model.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {model.cost} credits
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {imageModels.length} models available
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !customPrompt || !selectedModel || !altText}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>
        </div>

        {/* Generated Images Gallery */}
        {generatedImages.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Generated Images:</Label>
            <div className="grid grid-cols-2 gap-4">
              {generatedImages.map((image, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    <img
                      src={image.url}
                      alt={image.alt_text}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {image.alt_text}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyImageTag(image)}
                      className="w-full text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy HTML Tag
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
