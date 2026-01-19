import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Sparkles, Image as ImageIcon, Upload, Video, Loader2, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useModels } from '@/hooks/useModels';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackgroundMediaSelector } from '../video/BackgroundMediaSelector';
import type { SelectedMedia } from '../video/BackgroundMediaSelector';
import { logger } from '@/lib/logger';
import { getAllModels } from '@/lib/models/registry';
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
  videoUrl?: string;
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showEnhanceDialog, setShowEnhanceDialog] = useState(false);
  const [selectedImageModelId, setSelectedImageModelId] = useState<string>('');
  const [selectedVideoModelId, setSelectedVideoModelId] = useState<string>('');
  const { availableCredits, refetch: refetchCredits } = useUserCredits();
  const { data: models } = useModels();
  
  // Polling refs
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Filter models by content type
  const imageModels = (models ?? [])
    .filter(m => m.content_type === 'prompt_to_image')
    .sort((a, b) => a.base_token_cost - b.base_token_cost);

  const videoModels = (models ?? [])
    .filter(m => m.content_type === 'image_to_video')
    .sort((a, b) => a.base_token_cost - b.base_token_cost);

  // Set default models on first load
  useEffect(() => {
    if (imageModels.length > 0 && !selectedImageModelId) {
      setSelectedImageModelId(imageModels[0].record_id);
    }
    if (videoModels.length > 0 && !selectedVideoModelId) {
      setSelectedVideoModelId(videoModels[0].record_id);
    }
  }, [imageModels, videoModels, selectedImageModelId, selectedVideoModelId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Get selected model costs
  const selectedImageModel = imageModels.find(m => m.record_id === selectedImageModelId);
  const selectedVideoModel = videoModels.find(m => m.record_id === selectedVideoModelId);
  const imageCost = selectedImageModel?.base_token_cost ?? 0;
  const videoCost = selectedVideoModel?.base_token_cost ?? 0;

  // Poll for generation result
  const pollForResult = useCallback(async (generationId: string, type: 'image' | 'video'): Promise<string | null> => {
    const maxAttempts = 60; // 5 minutes max (5s intervals)
    let attempts = 0;

    return new Promise((resolve) => {
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        
        try {
          const { data, error } = await supabase
            .from('generations')
            .select('status, output_url, provider_response')
            .eq('id', generationId)
            .single();

          if (error) throw error;

          if (data?.status === 'completed' && data?.output_url) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            resolve(data.output_url);
            return;
          }

          if (data?.status === 'failed' || data?.status === 'error') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            const response = data?.provider_response as Record<string, unknown> | null;
            const errorMsg = response?.error_message || response?.failMsg || 'Generation failed';
            toast.error(String(errorMsg));
            resolve(null);
            return;
          }

          if (attempts >= maxAttempts) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            toast.error(`${type === 'image' ? 'Image' : 'Video'} generation timed out`);
            resolve(null);
          }
        } catch (error) {
          logger.error('Polling error', error instanceof Error ? error : new Error(String(error)), {
            component: 'CustomSceneCard',
            generationId,
            type
          });
        }
      }, 5000); // Poll every 5 seconds
    });
  }, []);

  const handleEnhancePrompt = async () => {
    setShowEnhanceDialog(false);
    
    if (!scene.imagePrompt.trim()) {
      toast.error('Enter an image prompt first', { duration: 2000 });
      return;
    }

    if (availableCredits < 0.1) {
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
        refetchCredits();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Scene prompt enhancement failed', err, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        promptLength: scene.imagePrompt.length,
        operation: 'handleEnhancePrompt'
      });
      toast.error('Failed to enhance prompt. Please try again.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!scene.imagePrompt.trim()) {
      toast.error('Enter an image prompt first');
      return;
    }

    if (!selectedImageModelId) {
      toast.error('Select an image model first');
      return;
    }

    if (availableCredits < imageCost) {
      toast.error(`Insufficient credits. Need ${imageCost} credits.`);
      return;
    }

    setIsGenerating(true);
    try {
      // Find model module from registry
      const modules = getAllModels();
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === selectedImageModelId);
      
      if (!modelModule) {
        throw new Error('Model configuration not found');
      }

      // Determine which endpoint to use based on provider
      const provider = modelModule.MODEL_CONFIG.provider;
      const isSync = provider === 'runware' || provider === 'lovable_ai_sync';
      const functionName = isSync ? 'generate-content-sync' : 'generate-content';

      // Prepare payload using model's preparePayload function
      const customParameters = modelModule.preparePayload?.({ 
        prompt: scene.imagePrompt,
        positivePrompt: scene.imagePrompt, // Some models use this
        aspect_ratio: '16:9',
        aspectRatio: '16:9',
      }) || { prompt: scene.imagePrompt };

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          model_id: modelModule.MODEL_CONFIG.modelId,
          model_record_id: modelModule.MODEL_CONFIG.recordId,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: scene.imagePrompt,
          custom_parameters: customParameters,
          preCalculatedCost: imageCost,
        },
      });

      if (error) throw error;

      let outputUrl = data?.output_url;
      
      // For async models, poll for result
      if (!outputUrl && data?.id) {
        toast.info('Generating image...', { duration: 3000 });
        outputUrl = await pollForResult(data.id, 'image');
      }

      if (outputUrl) {
        onUpdate('imageUrl', outputUrl);
        toast.success('Image generated!');
        refetchCredits();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Scene image generation failed', err, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        promptLength: scene.imagePrompt.length,
        modelId: selectedImageModelId,
        operation: 'handleGenerateImage'
      });
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnimateImage = async () => {
    if (!scene.imageUrl) {
      toast.error('Generate or upload an image first');
      return;
    }

    if (!selectedVideoModelId) {
      toast.error('Select an animation model first');
      return;
    }

    if (availableCredits < videoCost) {
      toast.error(`Insufficient credits. Need ${videoCost} credits.`);
      return;
    }

    setIsAnimating(true);
    try {
      // Find model module from registry
      const modules = getAllModels();
      const modelModule = modules.find(m => m.MODEL_CONFIG.recordId === selectedVideoModelId);
      
      if (!modelModule) {
        throw new Error('Animation model configuration not found');
      }

      // Prepare payload for image-to-video
      const customParameters = modelModule.preparePayload?.({ 
        prompt: scene.imagePrompt || 'Animate this image with subtle motion',
        image_url: scene.imageUrl,
        imageUrls: [scene.imageUrl],
        aspectRatio: '16:9',
      }) || { 
        prompt: scene.imagePrompt || 'Animate this image with subtle motion',
        image_url: scene.imageUrl,
      };

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          model_id: modelModule.MODEL_CONFIG.modelId,
          model_record_id: modelModule.MODEL_CONFIG.recordId,
          model_config: modelModule.MODEL_CONFIG,
          model_schema: modelModule.SCHEMA,
          prompt: scene.imagePrompt || 'Animate this image with subtle motion',
          custom_parameters: customParameters,
          preCalculatedCost: videoCost,
        },
      });

      if (error) throw error;

      let outputUrl = data?.output_url;
      
      // Poll for video result
      if (!outputUrl && data?.id) {
        toast.info('Creating animation...', { duration: 5000 });
        outputUrl = await pollForResult(data.id, 'video');
      }

      if (outputUrl) {
        onUpdate('videoUrl', outputUrl);
        toast.success('Animation created!');
        refetchCredits();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Scene animation failed', err, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        modelId: selectedVideoModelId,
        operation: 'handleAnimateImage'
      });
      toast.error('Failed to create animation. Please try again.');
    } finally {
      setIsAnimating(false);
    }
  };

  const handleUploadImage = async (file: File) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/uploads/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('generated-content')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('generated-content')
        .getPublicUrl(filePath);

      onUpdate('imageUrl', publicUrl);
      toast.success('Image uploaded successfully!');
      setUploadDialogOpen(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Scene image upload failed', err, {
        component: 'CustomSceneCard',
        sceneIndex: index,
        fileName: file.name,
        fileSize: file.size,
        operation: 'handleUploadImage'
      });
      toast.error('Failed to upload image. Please try again.');
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
              Enhance (0.1 cr)
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

        {/* Image Model Selector */}
        <div className="space-y-2">
          <Label className="text-sm">Image Model</Label>
          <Select 
            value={selectedImageModelId} 
            onValueChange={setSelectedImageModelId}
            disabled={disabled || isGenerating}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select model..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {imageModels.map(model => (
                <SelectItem key={model.record_id} value={model.record_id}>
                  <div className="flex items-center justify-between w-full gap-2">
                    <span className="truncate text-sm">{model.model_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {model.base_token_cost} cr
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            disabled={disabled || isGenerating || !scene.imagePrompt.trim() || !selectedImageModelId}
            className="flex-1"
          >
            {isGenerating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <ImageIcon className="w-3 h-3 mr-1" />
            )}
            Generate ({imageCost} cr)
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

        {/* Animation Section - Only show when image exists */}
        {scene.imageUrl && videoModels.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-1">
                <Play className="w-3 h-3" />
                Animate Scene
              </Label>
            </div>
            
            <Select 
              value={selectedVideoModelId} 
              onValueChange={setSelectedVideoModelId}
              disabled={disabled || isAnimating}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select animation model..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {videoModels.map(model => (
                  <SelectItem key={model.record_id} value={model.record_id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate text-sm">{model.model_name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {model.base_token_cost} cr
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAnimateImage}
              disabled={disabled || isAnimating || !selectedVideoModelId}
              className="w-full"
            >
              {isAnimating ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Video className="w-3 h-3 mr-1" />
              )}
              Animate Image ({videoCost} cr)
            </Button>
          </div>
        )}

        {/* Video Preview */}
        {scene.videoUrl && (
          <div className="relative rounded-lg overflow-hidden border-2 border-green-500/30">
            <video
              src={scene.videoUrl}
              className="w-full h-32 object-cover"
              controls
              muted
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80 hover:bg-background"
              onClick={() => onUpdate('videoUrl', '')}
            >
              ×
            </Button>
          </div>
        )}
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
              Enhance (0.1 cr)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
