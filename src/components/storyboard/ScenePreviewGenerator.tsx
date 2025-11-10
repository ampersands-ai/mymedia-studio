import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, RefreshCw, Image as ImageIcon, Video, Coins, Clock, Images } from 'lucide-react';
import { useGeneration } from '@/hooks/useGeneration';
import { useModels } from '@/hooks/useModels';
import { useUserTokens } from '@/hooks/useUserTokens';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Approved models for storyboard scene generation
const APPROVED_STORYBOARD_IMAGE_MODEL_IDS = [
  'runware:100@1', // Flux.1 Schnell
  'runware:101@1', // Flux.1 Dev
  'runware:97@3',  // HiDream Fast
  'runware:97@2',  // HiDream Dev
  'google/nano-banana', // Google Nano Banana
  'bytedance/seedream-v4-text-to-image', // ByteDance SeeDream V4
] as const;

// Approved video models for animation (image-to-video)
const APPROVED_STORYBOARD_VIDEO_MODEL_IDS = [
  'bytedance:2@2', // Seedance 1.0 Pro Fast (Runware)
] as const;

const APPROVED_IMAGE_ORDER = [...APPROVED_STORYBOARD_IMAGE_MODEL_IDS];
const APPROVED_VIDEO_ORDER = [...APPROVED_STORYBOARD_VIDEO_MODEL_IDS];

interface Scene {
  id: string;
  image_prompt: string;
  image_preview_url?: string | null;
}

interface ScenePreviewGeneratorProps {
  scene: Scene;
  sceneNumber: number;
  onImageGenerated: (sceneId: string, imageUrl: string) => void;
}

export const ScenePreviewGenerator = ({
  scene,
  sceneNumber,
  onImageGenerated,
}: ScenePreviewGeneratorProps) => {
  const [generationMode, setGenerationMode] = useState<'regenerate' | 'animate'>('regenerate');
  const [selectedModelId, setSelectedModelId] = useState<string>('runware:100@1');
  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
  const [isAsyncGeneration, setIsAsyncGeneration] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>('pending');
  const [pollOutputUrl, setPollOutputUrl] = useState<string | null>(null);
  
  const { generate, isGenerating, result, error } = useGeneration();
  const { data: models } = useModels();
  const { data: tokenData } = useUserTokens();
  const queryClient = useQueryClient();
  const lastHandledUrlRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // DEBUG: Log raw models data on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ScenePreviewGenerator] Raw models from useModels:', models);
      console.log('[ScenePreviewGenerator] Total models:', models?.length);
      console.log('[ScenePreviewGenerator] Image models:', models?.filter(m => m.content_type === 'image').length);
    }
  }, [models]);
  
  // Inline polling for async generation
  useEffect(() => {
    if (!pendingGenerationId || !isAsyncGeneration) return;

    const pollGeneration = async () => {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('status, output_url')
          .eq('id', pendingGenerationId)
          .single();

        if (error) throw error;

        setPollStatus(data.status);

        if (data.status === 'completed' && data.output_url) {
          setPollOutputUrl(data.output_url);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (data.status === 'failed') {
          toast.error('Generation failed');
          setPollStatus('failed');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('[ScenePreviewGenerator] Polling error:', error);
      }
    };

    // Initial poll
    pollGeneration();

    // Poll every 3 seconds
    pollIntervalRef.current = setInterval(pollGeneration, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [pendingGenerationId, isAsyncGeneration]);

  // Compute display URL from result or scene prop
  const displayUrl = result?.output_url ?? pollOutputUrl ?? scene.image_preview_url ?? null;
  
  // Determine if the display content is a video or image
  const isVideoContent = displayUrl && (
    displayUrl.includes('.mp4') || 
    displayUrl.includes('.webm') || 
    displayUrl.includes('video') ||
    result?.content_type === 'video'
  );

  // Handle sync generation result - only call onImageGenerated once per new URL
  useEffect(() => {
    if (result?.output_url && lastHandledUrlRef.current !== result.output_url) {
      lastHandledUrlRef.current = result.output_url;
      onImageGenerated(scene.id, result.output_url);
    }
  }, [result?.output_url, scene.id, onImageGenerated]);

  // Handle async generation result from polling
  useEffect(() => {
    if (pollStatus === 'completed' && pollOutputUrl && lastHandledUrlRef.current !== pollOutputUrl) {
      console.log('[ScenePreviewGenerator] Async generation completed:', pollOutputUrl);
      lastHandledUrlRef.current = pollOutputUrl;
      onImageGenerated(scene.id, pollOutputUrl);
      setIsAsyncGeneration(false);
      setPendingGenerationId(null);
      setPollStatus('pending');
      setPollOutputUrl(null);
    } else if (pollStatus === 'failed') {
      console.error('[ScenePreviewGenerator] Async generation failed');
      setIsAsyncGeneration(false);
      setPendingGenerationId(null);
      setPollStatus('pending');
      setPollOutputUrl(null);
    }
  }, [pollStatus, pollOutputUrl, scene.id, onImageGenerated]);

  // Log errors to console instead of toasting
  useEffect(() => {
    if (error) {
      console.error('[ScenePreviewGenerator] Generation error:', error);
      toast.error(error);
    }
  }, [error]);

  // Filter models based on generation mode
  const allowedImageIds = new Set<string>(APPROVED_STORYBOARD_IMAGE_MODEL_IDS);
  const allowedVideoIds = new Set<string>(APPROVED_STORYBOARD_VIDEO_MODEL_IDS);

  const imageModels = (models ?? [])
    .filter(m => m.content_type === 'image' && allowedImageIds.has(m.id))
    .sort((a, b) => {
      const costA = a.base_token_cost || 0;
      const costB = b.base_token_cost || 0;
      if (costA !== costB) return costA - costB;
      return (a.model_name || '').localeCompare(b.model_name || '');
    });

  const videoModels = (models ?? [])
    .filter(m => m.content_type === 'video' && allowedVideoIds.has(m.id))
    .sort((a, b) => {
      const costA = a.base_token_cost || 0;
      const costB = b.base_token_cost || 0;
      if (costA !== costB) return costA - costB;
      return (a.model_name || '').localeCompare(b.model_name || '');
    });

  // Use appropriate model list based on mode
  const availableModels = generationMode === 'animate' ? videoModels : imageModels;
  const approvedOrder = generationMode === 'animate' ? APPROVED_VIDEO_ORDER : APPROVED_IMAGE_ORDER;

  // DEBUG: Confirm what ends up in the dropdown
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ScenePreviewGenerator] Mode:', generationMode);
      console.log('[ScenePreviewGenerator] Available models:', availableModels.map(m => ({ id: m.id, name: m.model_name, type: m.content_type })));
    }
  }, [availableModels, generationMode]);

  // Auto-select first available model from approved order if current selection is invalid
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find(m => m.id === selectedModelId)) {
      const firstAvailable = approvedOrder.find(id => availableModels.some(m => m.id === id));
      setSelectedModelId(firstAvailable ?? availableModels[0].id);
    }
  }, [availableModels, selectedModelId, approvedOrder]);

  // Reset to first model when switching modes
  useEffect(() => {
    if (availableModels.length > 0) {
      const firstAvailable = approvedOrder.find(id => availableModels.some(m => m.id === id));
      setSelectedModelId(firstAvailable ?? availableModels[0].id);
    }
  }, [generationMode]);

  const selectedModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];
  const tokenCost = selectedModel?.base_token_cost || 1;

  const handleGenerate = async () => {
    if (!scene.image_prompt) {
      return; // Silent no-op
    }

    if ((tokenData?.tokens_remaining || 0) < tokenCost) {
      return; // Silent no-op, UI already shows insufficient credits message
    }
  
    // Reset state for new generation
    lastHandledUrlRef.current = null;
    setPendingGenerationId(null);
    setIsAsyncGeneration(false);

    // For animate mode, pass the image URL as reference
    const customParams = generationMode === 'animate' && displayUrl
      ? { image: displayUrl }
      : {};

    const generationResult = await generate({
      model_id: selectedModelId,
      prompt: scene.image_prompt,
      custom_parameters: customParams,
    });

    // Check if this is an async generation (no output_url yet)
    if (!generationResult.output_url && generationResult.id) {
      console.log('[ScenePreviewGenerator] Async generation started:', generationResult.id);
      setPendingGenerationId(generationResult.id);
      setIsAsyncGeneration(true);
    }
  };

  const hasExistingPreview = !!displayUrl;

  return (
    <Card className={cn(
      'p-4 bg-card/95 backdrop-blur-xl border border-border/30',
      'hover:border-border/50 transition-all duration-300',
      'flex flex-col'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-muted-foreground">
          🎨 Scene {sceneNumber} Preview
        </h4>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['ai-models'] });
                console.log('🔄 Cache cleared! Refetching models...');
                toast.success('Model cache cleared');
              }}
              className="h-8 px-2 text-xs"
              title="Clear model cache (dev only)"
            >
              🔄 Clear Cache
            </Button>
          )}
          {hasExistingPreview && !isGenerating && !isAsyncGeneration && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGenerate}
              className="h-8 px-2"
              title="Regenerate preview"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mode Toggle */}
      {hasExistingPreview && !isGenerating && !isAsyncGeneration && (
        <div className="mb-4">
          <ToggleGroup
            type="single"
            value={generationMode}
            onValueChange={(value) => value && setGenerationMode(value as 'regenerate' | 'animate')}
            className="justify-start"
          >
            <ToggleGroupItem value="regenerate" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              <span>Regenerate</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="animate" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              <span>Animate</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Image Display */}
      <div className="relative rounded-lg overflow-hidden bg-muted/20 border border-border/20 mb-4 h-[280px] sm:h-[300px]">
        {(isGenerating || isAsyncGeneration) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center space-y-1">
                {isGenerating ? (
                  <>
                    <p className="text-sm font-medium">Submitting generation...</p>
                    <p className="text-xs text-muted-foreground">
                      Using {selectedModel?.model_name || 'AI model'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Processing...</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {pollStatus}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      This may take 20-60 seconds
                    </p>
                  </>
                )}
              </div>
            </div>
        ) : displayUrl ? (
          <div className="relative w-full h-full group">
            {isVideoContent ? (
              <video
                src={displayUrl}
                className="w-full h-full object-contain"
                controls
                autoPlay
                loop
                muted
              />
            ) : (
              <img
                src={displayUrl}
                alt={`Scene ${sceneNumber} preview`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs text-white/90 bg-black/40 rounded px-2 py-1">
                  ✅ This {isVideoContent ? 'video' : 'image'} will be used in video render
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
            <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">No preview generated</p>
              <p className="text-xs text-muted-foreground/70">
                Generate a preview to see what this scene will look like. Leave it blank to auto-generate for free.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {!isGenerating && !isAsyncGeneration && (
        <div className="space-y-3">
          {!hasExistingPreview ? (
            <>
              {/* Initial generation controls */}
              {availableModels.length > 0 ? (
                <Select 
                  value={selectedModelId} 
                  onValueChange={setSelectedModelId}
                >
                  <SelectTrigger className="w-full h-auto py-3 px-4 bg-background border-border hover:bg-muted/30 transition-colors">
                    <SelectValue>
                      {selectedModel && (
                        <div className="flex items-center gap-3">
                          {selectedModel.logo_url && (
                            <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <img 
                                src={selectedModel.logo_url} 
                                alt={selectedModel.model_name || ''} 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                            <span className="font-semibold text-foreground truncate w-full text-left">
                              {selectedModel.model_name}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                <span>{selectedModel.base_token_cost}</span>
                              </div>
                              {selectedModel.estimated_time_seconds && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{selectedModel.estimated_time_seconds}s</span>
                                </div>
                              )}
                              {selectedModel.default_outputs && selectedModel.default_outputs > 1 && (
                                <div className="flex items-center gap-1">
                                  <Images className="w-3 h-3" />
                                  <span>{selectedModel.default_outputs}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    {availableModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-3 py-1">
                          {model.logo_url && (
                            <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                              <img 
                                src={model.logo_url} 
                                alt={model.model_name || ''} 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                            <span className="font-semibold text-foreground">
                              {model.model_name}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Coins className="w-3 h-3" />
                                <span>{model.base_token_cost}</span>
                              </div>
                              {model.estimated_time_seconds && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{model.estimated_time_seconds}s</span>
                                </div>
                              )}
                              {model.default_outputs && model.default_outputs > 1 && (
                                <div className="flex items-center gap-1">
                                  <Images className="w-3 h-3" />
                                  <span>{model.default_outputs}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    {generationMode === 'animate' 
                      ? '🎬 Video models are not yet available. Image-to-video animation is coming soon!'
                      : 'No image models are currently available. Please try again later or contact support.'}
                  </p>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isAsyncGeneration || (tokenData?.tokens_remaining || 0) < tokenCost || availableModels.length === 0}
                className="w-full"
                variant="outline"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Preview ({tokenCost} credit{tokenCost !== 1 ? 's' : ''})
              </Button>

              {(tokenData?.tokens_remaining || 0) < tokenCost && (
                <p className="text-xs text-destructive">
                  Insufficient credits. You need {tokenCost} credit{tokenCost !== 1 ? 's' : ''}.
                </p>
              )}
            </>
          ) : (
            <>
              {/* Regeneration controls */}
              <div className="pt-3 border-t border-border/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Want to try a different model?</span>
                </div>
                
                {availableModels.length > 0 ? (
                  <>
                    <Select 
                      value={selectedModelId} 
                      onValueChange={setSelectedModelId}
                    >
                      <SelectTrigger className="w-full h-auto py-3 px-4 bg-background border-border hover:bg-muted/30 transition-colors">
                        <SelectValue>
                          {selectedModel && (
                            <div className="flex items-center gap-3">
                              {selectedModel.logo_url && (
                                <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <img 
                                    src={selectedModel.logo_url} 
                                    alt={selectedModel.model_name || ''} 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                                <span className="font-semibold text-foreground truncate w-full text-left">
                                  {selectedModel.model_name}
                                </span>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    <span>{selectedModel.base_token_cost}</span>
                                  </div>
                                  {selectedModel.estimated_time_seconds && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{selectedModel.estimated_time_seconds}s</span>
                                    </div>
                                  )}
                                  {selectedModel.default_outputs && selectedModel.default_outputs > 1 && (
                                    <div className="flex items-center gap-1">
                                      <Images className="w-3 h-3" />
                                      <span>{selectedModel.default_outputs}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border">
                        {availableModels.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-center gap-3 py-1">
                              {model.logo_url && (
                                <div className="h-8 w-8 rounded-md bg-white/90 dark:bg-white/95 p-1 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <img 
                                    src={model.logo_url} 
                                    alt={model.model_name || ''} 
                                    className="w-full h-full object-contain"
                                  />
                                </div>
                              )}
                              <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                                <span className="font-semibold text-foreground">
                                  {model.model_name}
                                </span>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Coins className="w-3 h-3" />
                                    <span>{model.base_token_cost}</span>
                                  </div>
                                  {model.estimated_time_seconds && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{model.estimated_time_seconds}s</span>
                                    </div>
                                  )}
                                  {model.default_outputs && model.default_outputs > 1 && (
                                    <div className="flex items-center gap-1">
                                      <Images className="w-3 h-3" />
                                      <span>{model.default_outputs}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || isAsyncGeneration || (tokenData?.tokens_remaining || 0) < tokenCost}
                      className="w-full"
                      variant="outline"
                    >
                      {generationMode === 'animate' ? (
                        <>
                          <Video className="w-4 h-4 mr-2" />
                          Animate with {selectedModel?.model_name} ({tokenCost} credit{tokenCost !== 1 ? 's' : ''})
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate with {selectedModel?.model_name} ({tokenCost} credit{tokenCost !== 1 ? 's' : ''})
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                      {generationMode === 'animate' 
                        ? '🎬 Video models are not yet available. Image-to-video animation is coming soon!'
                        : 'No image models are currently available. Please try again later or contact support.'}
                    </p>
                  </div>
                )}

                {(tokenData?.tokens_remaining || 0) < tokenCost && (
                  <p className="text-xs text-destructive">
                    Insufficient credits. You need {tokenCost} credit{tokenCost !== 1 ? 's' : ''}.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
};
