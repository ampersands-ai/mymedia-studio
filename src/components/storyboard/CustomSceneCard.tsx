import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Sparkles, Image as ImageIcon, Upload, Video, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserTokens } from '@/hooks/useUserTokens';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackgroundMediaSelector } from '../video/BackgroundMediaSelector';
import type { SelectedMedia } from '../video/BackgroundMediaSelector';
import { logger } from '@/lib/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CustomScene {
  voiceOverText: string;
  imagePrompt: string;
  imageUrl?: string;
}

interface CustomSceneCardProps {
  scene: CustomScene;
  index: number;
  totalScenes: number;
  disabled: boolean;
  onUpdate: (field: keyof CustomScene, value: string) => void;
  onRemove: () => void;
}

export function CustomSceneCard({
  scene,
  index,
  totalScenes,
  disabled,
  onUpdate,
  onRemove,
}: CustomSceneCardProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const { data: tokenData, refetch: refetchTokens } = useUserTokens();

  const handleEnhancePrompt = async () => {
    setShowEnhanceDialog(false);
    
    if (!scene.imagePrompt.trim()) {
      toast.error('Enter an image prompt first', { duration: 2000 });
      return;
    }

    const currentTokens = Number(tokenData?.tokens_remaining || 0);
    if (currentTokens < 0.1) {
      toast.error('Insufficient credits. You need 0.1 credits to enhance prompts.', { duration: 2000 });
      return;
    }

    setIsEnhancing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: {
          prompt: scene.imagePrompt,
          category: 'image',
        },
      });

      if (error) throw error;

      if (data?.enhanced_prompt) {
        onUpdate('imagePrompt', data.enhanced_prompt);
        toast.success('Prompt enhanced! (0.1 credits used)');
        refetchTokens();
      }
    } catch (error: any) {
      logger.error('Scene prompt enhancement failed', error, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        promptLength: scene.imagePrompt.length,
        operation: 'handleEnhancePrompt'
      });
      toast.error(error.message || 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!scene.imagePrompt.trim()) {
      toast.error('Enter an image prompt first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: 'google/gemini-2.5-flash-image-preview',
          prompt: scene.imagePrompt,
          type: 'image',
        },
      });

      if (error) throw error;

      if (data?.output_url) {
        onUpdate('imageUrl', data.output_url);
        toast.success('Image generated successfully!');
        refetchTokens();
      }
    } catch (error: any) {
      logger.error('Scene image generation failed', error, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        promptLength: scene.imagePrompt.length,
        operation: 'handleGenerateImage'
      });
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/uploads/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generated-content')
        .getPublicUrl(filePath);

      onUpdate('imageUrl', publicUrl);
      toast.success('Image uploaded successfully!');
      setUploadDialogOpen(false);
    } catch (error: any) {
      logger.error('Scene image upload failed', error, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        fileName: file.name,
        fileSize: file.size,
        operation: 'handleUploadImage'
      });
      toast.error(error.message || 'Failed to upload image');
    }
  };

  const handleSelectStockMedia = (mediaList: SelectedMedia[]) => {
    if (mediaList.length > 0) {
      onUpdate('imageUrl', mediaList[0].url);
      toast.success('Stock media selected!');
      setUploadDialogOpen(false);
    }
  };

  return (
    <Card className="relative bg-muted/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">
            Scene {index + 1} (5s)
          </CardTitle>
          {totalScenes > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-sm">Voice-Over Text</Label>
          <Textarea
            value={scene.voiceOverText}
            onChange={(e) => onUpdate('voiceOverText', e.target.value)}
            placeholder="Enter the narration text for this scene..."
            disabled={disabled}
            className="min-h-[80px] resize-none"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Image Prompt</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEnhanceDialog(true)}
              disabled={disabled || isEnhancing || !scene.imagePrompt.trim()}
              className="h-7 text-xs"
            >
              {isEnhancing ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3 mr-1" />
              )}
              Enhance (0.1 credits)
            </Button>
          </div>
          <Textarea
            value={scene.imagePrompt}
            onChange={(e) => onUpdate('imagePrompt', e.target.value)}
            placeholder="Describe the visual for this scene..."
            disabled={disabled}
            className="min-h-[60px] resize-none"
          />
        </div>

        {/* Image Preview */}
        {scene.imageUrl && (
          <div className="relative rounded-lg overflow-hidden border-2 border-primary/30">
            <img
              src={scene.imageUrl}
              alt={`Scene ${index + 1} preview`}
              className="w-full h-32 object-cover"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
              onClick={() => onUpdate('imageUrl', '')}
            >
              ×
            </Button>
          </div>
        )}

        {/* Image Generation/Upload Options */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateImage}
            disabled={disabled || isGenerating || !scene.imagePrompt.trim()}
            className="flex-1"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <ImageIcon className="w-3 h-3 mr-1" />
            )}
            Generate Image
          </Button>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className="flex-1"
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload/Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Select Media for Scene {index + 1}</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="stock" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="stock">
                    <Video className="w-4 h-4 mr-2" />
                    Stock Media
                  </TabsTrigger>
                  <TabsTrigger value="upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="stock" className="mt-4">
                  <BackgroundMediaSelector
                    style="modern"
                    duration={5}
                    aspectRatio="16:9"
                    selectedMedia={scene.imageUrl ? [{ url: scene.imageUrl, thumbnail: scene.imageUrl, type: 'image' }] : []}
                    onSelectMedia={handleSelectStockMedia}
                  />
                </TabsContent>

                <TabsContent value="upload" className="mt-4">
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">Upload Your Image</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Drag and drop or click to browse
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(file);
                      }}
                      className="hidden"
                      id={`file-upload-${index}`}
                    />
                    <label htmlFor={`file-upload-${index}`}>
                      <Button type="button" variant="outline" asChild>
                        <span>Choose File</span>
                      </Button>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>

      <AlertDialog open={showEnhanceDialog} onOpenChange={setShowEnhanceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enhance Image Prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will use AI to improve your image prompt and replace your current text. 
              This action costs 0.1 credits and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnhancePrompt}>
              Enhance (0.1 credits)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
