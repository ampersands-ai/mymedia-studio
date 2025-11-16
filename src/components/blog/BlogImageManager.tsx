import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BlogImage } from "@/types/blog";
import { Image as ImageIcon, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useModels } from "@/hooks/useModels";
import { useGeneration } from "@/hooks/useGeneration";

interface BlogImageManagerProps {
  images: Partial<BlogImage>[];
  onChange: (images: Partial<BlogImage>[]) => void;
  blogPostId?: string;
}

export const BlogImageManager = ({ images, onChange, blogPostId }: BlogImageManagerProps) => {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");

  const { data: models } = useModels();
  const { generateImage, isGenerating } = useGeneration();

  // Filter to only image generation models
  const imageModels = models?.filter(m =>
    m.category === 'image' &&
    m.status === 'active'
  );

  const handleGenerateImage = async (index?: number) => {
    if (!generatePrompt || !selectedModelId) {
      toast.error("Please enter a prompt and select a model");
      return;
    }

    try {
      if (index !== undefined) {
        setGeneratingIndex(index);
      }

      toast.info("Generating image...");

      const result = await generateImage({
        model_id: selectedModelId,
        prompt: generatePrompt,
        parameters: {}
      });

      if (result.output_url) {
        const newImage: Partial<BlogImage> = {
          image_url: result.output_url,
          alt_text: altText || generatePrompt,
          caption: caption,
          prompt: generatePrompt,
          model_id: selectedModelId,
          generation_id: result.id,
          position: index !== undefined ? index : images.length,
          is_featured: images.length === 0 // First image is featured by default
        };

        if (index !== undefined) {
          // Replace existing image
          const updatedImages = [...images];
          updatedImages[index] = newImage;
          onChange(updatedImages);
        } else {
          // Add new image
          onChange([...images, newImage]);
        }

        toast.success("Image generated successfully!");
        setShowGenerateDialog(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const resetForm = () => {
    setGeneratePrompt("");
    setAltText("");
    setCaption("");
  };

  const handleRemoveImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onChange(updatedImages);
    toast.success("Image removed");
  };

  const handleUpdateImage = (index: number, updates: Partial<BlogImage>) => {
    const updatedImages = [...images];
    updatedImages[index] = { ...updatedImages[index], ...updates };
    onChange(updatedImages);
  };

  const handleSetFeatured = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_featured: i === index
    }));
    onChange(updatedImages);
    toast.success("Featured image updated");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Blog Images</CardTitle>
              <CardDescription>Add AI-generated images to your blog post</CardDescription>
            </div>
            <Button onClick={() => setShowGenerateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Image
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No images added yet</p>
              <Button onClick={() => setShowGenerateDialog(true)} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate First Image
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {images.map((image, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    {image.image_url ? (
                      <img
                        src={image.image_url}
                        alt={image.alt_text || "Blog image"}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                    ) : (
                      <div className="w-full h-48 bg-muted rounded-md mb-4 flex items-center justify-center">
                        {generatingIndex === index ? (
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Alt Text</Label>
                        <Input
                          value={image.alt_text || ""}
                          onChange={(e) => handleUpdateImage(index, { alt_text: e.target.value })}
                          placeholder="Descriptive alt text for SEO"
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Caption (Optional)</Label>
                        <Textarea
                          value={image.caption || ""}
                          onChange={(e) => handleUpdateImage(index, { caption: e.target.value })}
                          placeholder="Image caption"
                          rows={2}
                          className="text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant={image.is_featured ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSetFeatured(index)}
                          className="flex-1"
                        >
                          {image.is_featured ? "Featured" : "Set as Featured"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {image.prompt && (
                        <p className="text-xs text-muted-foreground">
                          Prompt: {image.prompt}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Image Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Blog Image</DialogTitle>
            <DialogDescription>
              Use AI to create custom images for your blog post
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model">Select Model</Label>
              <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an image generation model" />
                </SelectTrigger>
                <SelectContent>
                  {imageModels?.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      {model.display_name || model.model_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Image Prompt</Label>
              <Textarea
                id="prompt"
                value={generatePrompt}
                onChange={(e) => setGeneratePrompt(e.target.value)}
                placeholder="Describe the image you want to generate... Be specific and detailed for best results."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alt">Alt Text (SEO)</Label>
              <Input
                id="alt"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descriptive text for search engines and accessibility"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption (Optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Optional caption to display below the image"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleGenerateImage()}
              disabled={isGenerating || !generatePrompt || !selectedModelId}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
