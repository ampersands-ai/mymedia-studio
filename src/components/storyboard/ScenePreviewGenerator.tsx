import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, RefreshCw, Image as ImageIcon, Video, CheckCircle2, Clock } from 'lucide-react';
import { useGeneration } from '@/hooks/useGeneration';
import { useModels } from '@/hooks/useModels';
import { useUserCredits } from '@/hooks/useUserCredits';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ModelFamilySelector } from '@/components/custom-creation/ModelFamilySelector';
import { mapAspectRatioToModelParameters } from '@/lib/aspect-ratio-mapper';
import { logger } from '@/lib/logger';



interface Scene {
  id: string;
  image_prompt: string;
  image_preview_url?: string | null;
}

interface ScenePreviewGeneratorProps {
  scene: Scene;
  sceneNumber: number;
  onImageGenerated: (sceneId: string, imageUrl: string) => void;
  aspectRatio?: string | null;
}

export const ScenePreviewGenerator = ({
  scene,
  sceneNumber,
  onImageGenerated,
  aspectRatio,
}: ScenePreviewGeneratorProps) => {
  const [generationMode, setGenerationMode] = useState<'regenerate' | 'animate'>('regenerate');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
  const [isAsyncGeneration, setIsAsyncGeneration] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>('pending');
  const [pollOutputUrl, setPollOutputUrl] = useState<string | null>(null);
  const [batchOutputs, setBatchOutputs] = useState<Array<{
    id: string;
    storage_path: string;
    output_index: number;
    output_url: string;
  }>>([]);
  const [selectedOutputIndex, setSelectedOutputIndex] = useState<number>(0);
  const [showOutputGrid, setShowOutputGrid] = useState<boolean>(false);
  
  const { generate, isGenerating, result, error } = useGeneration();
  const { data: models } = useModels();
  const { availableCredits } = useUserCredits();
  const queryClient = useQueryClient();
  const lastHandledUrlRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timer state for free regeneration after 5 minutes
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isFreeRegeneration, setIsFreeRegeneration] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // DEBUG: Log raw models data on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('Models data loaded (dev)', {
        component: 'ScenePreviewGenerator',
        totalModels: models?.length,
        imageModels: models?.filter(m => m.content_type === 'image').length,
        operation: 'debugModels'
      });
    }
  }, [models]);
  
  // Inline polling for async generation
  useEffect(() => {
    if (!pendingGenerationId || !isAsyncGeneration) return;

    const pollGeneration = async () => {
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('status, output_url, is_batch_output, provider_response')
          .eq('id', pendingGenerationId)
          .single();

        if (error) throw error;

        setPollStatus(data.status);

        if (data.status === 'completed') {
          if (data.is_batch_output) {
            // Fetch child generations for batch output (e.g., Midjourney 4 variations)
            const { data: children, error: childError } = await supabase
              .from('generations')
              .select('id, output_url, output_index, storage_path')
              .eq('parent_generation_id', pendingGenerationId)
              .not('output_url', 'is', null)
              .order('output_index', { ascending: true });
            
            if (!childError && children && children.length > 0) {
              logger.debug('Batch generation outputs received', {
                component: 'ScenePreviewGenerator',
                sceneId: scene.id,
                outputCount: children.length,
                operation: 'pollGeneration'
              });
              setBatchOutputs(children);
              setShowOutputGrid(true);
              setPollOutputUrl(children[0].output_url); // Default to first
            } else {
              logger.error('No batch outputs found', new Error('Empty batch results'), {
                component: 'ScenePreviewGenerator',
                sceneId: scene.id,
                generationId: pendingGenerationId,
                operation: 'pollGeneration'
              });
            }
          } else if (data.output_url) {
            // Single output - existing logic
            setPollOutputUrl(data.output_url);
          }
          
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else if (data.status === 'failed') {
          const providerResponse = data.provider_response as Record<string, unknown> | null;
          const responseData = providerResponse?.data as Record<string, unknown> | undefined;
          const failMsg = responseData?.failMsg || providerResponse?.error_message || 'Unknown error';
          toast.error(`Generation failed: ${failMsg}`);
          setPollStatus('failed');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch (error) {
        logger.error('Scene generation polling failed', error as Error, {
          component: 'ScenePreviewGenerator',
          sceneId: scene.id,
          generationId: pendingGenerationId,
          operation: 'pollGeneration'
        });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGenerationId, isAsyncGeneration]);

  // Timer effect for tracking elapsed time and enabling free regeneration
  useEffect(() => {
    if (!generationStartTime || (!isGenerating && !isAsyncGeneration)) {
      // Clear timer when generation completes
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setElapsedSeconds(0);
      return;
    }

    // Update elapsed time every second
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
      setElapsedSeconds(elapsed);
      
      // Enable free regeneration after 300 seconds (5 minutes)
      if (elapsed >= 300) {
        setIsFreeRegeneration(true);
      }
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [generationStartTime, isGenerating, isAsyncGeneration]);

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
      logger.debug('Async generation completed', {
        component: 'ScenePreviewGenerator',
        sceneId: scene.id,
        outputUrl: pollOutputUrl.substring(0, 100),
        operation: 'asyncGenerationMonitor'
      });
      lastHandledUrlRef.current = pollOutputUrl;
      onImageGenerated(scene.id, pollOutputUrl);
      setIsAsyncGeneration(false);
      setPendingGenerationId(null);
      setPollStatus('pending');
      setPollOutputUrl(null);
    } else if (pollStatus === 'failed') {
      logger.error('Async scene generation failed', new Error('Generation status: failed'), {
        component: 'ScenePreviewGenerator',
        sceneId: scene.id,
        generationId: pendingGenerationId,
        operation: 'asyncGenerationMonitor'
      });
      setIsAsyncGeneration(false);
      setPendingGenerationId(null);
      setPollStatus('pending');
      setPollOutputUrl(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollStatus, pollOutputUrl, scene.id, onImageGenerated]);

  // Log errors to console instead of toasting
  useEffect(() => {
    if (error) {
      logger.error('Scene generation error occurred', new Error(error), {
        component: 'ScenePreviewGenerator',
        sceneId: scene.id,
        selectedModelId,
        generationMode,
        operation: 'generationErrorHandler'
      });
      toast.error(error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // Filter to ONLY prompt-to-image and image-to-video models based on groups
  const imageModels = (models ?? [])
    .filter(m => {
      const groups = Array.isArray(m.groups) ? m.groups : [];
      return m.content_type === 'image' && groups.includes('prompt_to_image');
    });

  const videoModels = (models ?? [])
    .filter(m => {
      const groups = Array.isArray(m.groups) ? m.groups : [];
      return m.content_type === 'video' && groups.includes('image_to_video');
    });

  // Use appropriate model list based on mode
  const availableModels = generationMode === 'animate' ? videoModels : imageModels;

  // DEBUG: Confirm what ends up in the dropdown
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('Model dropdown populated (dev)', {
        component: 'ScenePreviewGenerator',
        generationMode,
        availableModels: availableModels.map(m => ({ id: m.id, name: m.model_name, type: m.content_type })),
        operation: 'debugModelDropdown'
      });
    }
  }, [availableModels, generationMode]);

  // Auto-select first available model if current selection is invalid
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find(m => m.record_id === selectedModelId)) {
      setSelectedModelId(availableModels[0].record_id);
    }
  }, [availableModels, selectedModelId]);

  // Reset to first model when switching modes
  useEffect(() => {
    if (availableModels.length > 0) {
      setSelectedModelId(availableModels[0].record_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationMode]);

  const selectedModel = availableModels.find(m => m.record_id === selectedModelId);
  const tokenCost = selectedModel?.base_token_cost || 0;

  const handleGenerate = async (isFreeRetry = false) => {
    if (!scene.image_prompt) {
      return; // Silent no-op
    }

    // Only check token cost if not a free retry
    if (!isFreeRetry && availableCredits < tokenCost) {
      return; // Silent no-op, UI already shows insufficient credits message
    }
  
    // Reset state for new generation
    lastHandledUrlRef.current = null;
    setPendingGenerationId(null);
    setIsAsyncGeneration(false);
    setBatchOutputs([]);
    setShowOutputGrid(false);
    setSelectedOutputIndex(0);
    setGenerationStartTime(Date.now());
    setElapsedSeconds(0);
    setIsFreeRegeneration(false);

    // Cancel previous generation if it exists and this is a free retry
    if (isFreeRetry && pendingGenerationId) {
      try {
        await supabase
          .from('generations')
          .update({ status: 'cancelled' })
          .eq('id', pendingGenerationId);
        logger.debug('Previous generation cancelled for retry', {
          component: 'ScenePreviewGenerator',
          cancelledGenerationId: pendingGenerationId,
          operation: 'handleGeneratePreview'
        });
      } catch (error) {
        logger.error('Failed to cancel previous generation', error as Error, {
          component: 'ScenePreviewGenerator',
          sceneId: scene.id,
          generationId: pendingGenerationId,
          operation: 'handleGeneratePreview'
        });
      }
    }

    // Get the selected model's schema to auto-detect aspect ratio format
    const selectedModelData = availableModels.find(m => m.record_id === selectedModelId);
    
    // Map aspect ratio to model-specific parameters
    const aspectRatioParams = selectedModelData?.input_schema 
      ? mapAspectRatioToModelParameters(
          aspectRatio,
          selectedModelData.input_schema as Record<string, unknown>
        )
      : {};

    logger.debug('Scene generation initiated', {
      component: 'ScenePreviewGenerator',
      sceneId: scene.id,
      aspectRatioParams,
      generationMode,
      hasDisplayUrl: !!displayUrl,
      operation: 'handleGeneratePreview'
    });

    // For animate mode, pass the image URL as reference
    const customParams = generationMode === 'animate' && displayUrl
      ? { image: displayUrl, ...aspectRatioParams }
      : aspectRatioParams;

    const generationResult = await generate({
      model_record_id: selectedModelId,
      prompt: scene.image_prompt,
      custom_parameters: {
        ...customParams,
        skip_token_deduction: isFreeRetry
      },
    });

    // Check if this is an async generation (no output_url yet)
    if (!generationResult.output_url && generationResult.id) {
      logger.debug('Async scene generation started', {
        component: 'ScenePreviewGenerator',
        sceneId: scene.id,
        generationId: generationResult.id,
        operation: 'handleGeneratePreview'
      });
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
                logger.debug('Model cache cleared (dev mode)', {
                  component: 'ScenePreviewGenerator',
                  operation: 'clearCache'
                });
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
              onClick={() => handleGenerate()}
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

      {/* Horizontal Layout: Grid on Left, Preview on Right */}
      <div className={cn(
        "mb-4",
        showOutputGrid && batchOutputs.length > 1 ? "flex gap-4" : ""
      )}>
        {/* Batch Output Grid */}
        {showOutputGrid && batchOutputs.length > 1 && (
          <div className="space-y-3 flex-shrink-0 w-[280px]">
            <p className="text-xs text-muted-foreground font-medium">
              Select an image variation to use:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {batchOutputs.map((output, index) => (
                <div
                  key={output.id}
                  className={cn(
                    "relative aspect-square cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                    selectedOutputIndex === index
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => {
                    setSelectedOutputIndex(index);
                    setPollOutputUrl(output.output_url);
                  }}
                >
                  <img
                    src={output.output_url}
                    alt={`Variation ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <Badge
                    className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm"
                    variant={selectedOutputIndex === index ? "default" : "secondary"}
                  >
                    #{index + 1}
                  </Badge>
                  {selectedOutputIndex === index && (
                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-2">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              onClick={async () => {
                const selectedOutput = batchOutputs[selectedOutputIndex];
                onImageGenerated(scene.id, selectedOutput.output_url);
                toast.success(`Variation #${selectedOutputIndex + 1} applied! You can still change your selection.`);
              }}
              className="w-full"
              disabled={!batchOutputs[selectedOutputIndex]}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Apply Variation #{selectedOutputIndex + 1}
            </Button>
          </div>
        )}

        {/* Image Display */}
        <div className={cn(
          "relative rounded-lg overflow-hidden bg-muted/20 border border-border/20 h-[280px] sm:h-[300px]",
          showOutputGrid && batchOutputs.length > 1 ? "flex-1" : "mb-4"
        )}>
        {(isGenerating || isAsyncGeneration) ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="text-center space-y-2 max-w-md">
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
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/70 mt-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        Elapsed: {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    
                    {/* Timer progress bar */}
                    <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden mx-auto mt-3">
                      <div 
                        className="h-full bg-primary transition-all duration-1000 ease-linear"
                        style={{ width: `${Math.min((elapsedSeconds / 300) * 100, 100)}%` }}
                      />
                    </div>
                    
                    {elapsedSeconds < 300 ? (
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        Free regeneration available in {300 - elapsedSeconds}s
                      </p>
                    ) : (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-2">
                        ⚡ Free regeneration now available!
                      </p>
                    )}
                  </>
                )}
              </div>
              
              {/* Free Regeneration Button */}
              {isFreeRegeneration && isAsyncGeneration && (
                <div className="space-y-2 w-full max-w-xs mt-4">
                  <Button
                    onClick={() => handleGenerate(true)}
                    variant="outline"
                    className="w-full border-yellow-500/50 hover:bg-yellow-500/10 hover:border-yellow-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Free Regeneration (No Charge)
                  </Button>
                  <p className="text-xs text-muted-foreground text-center px-2">
                    Generation is taking longer than expected. Retry without using credits.
                  </p>
                </div>
              )}
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

      {/* Close horizontal layout wrapper */}
      </div>

      {/* Controls */}
      {!isGenerating && !isAsyncGeneration && (
        <div className="space-y-3">
          {!hasExistingPreview ? (
            <>
              {/* Initial generation controls - Use shared ModelFamilySelector */}
              {availableModels.length > 0 ? (
                <ModelFamilySelector
                  models={availableModels}
                  selectedModel={selectedModelId}
                  onModelChange={setSelectedModelId}
                  selectedGroup={generationMode === 'animate' ? 'image_to_video' as any : 'prompt_to_image' as any}
                  isLoading={false}
                />
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
                onClick={() => handleGenerate()}
                disabled={isGenerating || isAsyncGeneration || availableCredits < tokenCost || availableModels.length === 0}
                className="w-full"
                variant="outline"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Preview ({tokenCost} credit{tokenCost !== 1 ? 's' : ''})
              </Button>

              {availableCredits < tokenCost && (
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
                    <ModelFamilySelector
                      models={availableModels}
                      selectedModel={selectedModelId}
                      onModelChange={setSelectedModelId}
                      selectedGroup={generationMode === 'animate' ? 'image_to_video' as any : 'prompt_to_image' as any}
                      isLoading={false}
                    />
                    
                    <Button
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || isAsyncGeneration || availableCredits < tokenCost}
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

                {availableCredits < tokenCost && (
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
