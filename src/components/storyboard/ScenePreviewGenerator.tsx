import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { useGeneration } from '@/hooks/useGeneration';
import { useModels } from '@/hooks/useModels';
import { useUserTokens } from '@/hooks/useUserTokens';
import { useGenerationPolling } from '@/hooks/useGenerationPolling';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  const [selectedModelId, setSelectedModelId] = useState<string>('runware:100@1');
  const [pendingGenerationId, setPendingGenerationId] = useState<string | null>(null);
  const [isAsyncGeneration, setIsAsyncGeneration] = useState(false);
  
  const { generate, isGenerating, result, error } = useGeneration();
  const { data: models } = useModels();
  const { data: tokenData } = useUserTokens();
  const queryClient = useQueryClient();
  const lastHandledUrlRef = useRef<string | null>(null);

  // DEBUG: Log raw models data on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ScenePreviewGenerator] Raw models from useModels:', models);
      console.log('[ScenePreviewGenerator] Total models:', models?.length);
      console.log('[ScenePreviewGenerator] Image models:', models?.filter(m => m.content_type === 'image').length);
    }
  }, [models]);
  
  const { status: pollStatus, outputUrl: pollOutputUrl, error: pollError } = useGenerationPolling(
    pendingGenerationId,
    isAsyncGeneration
  );

  // Compute display URL from result or scene prop
  const displayUrl = result?.output_url ?? pollOutputUrl ?? scene.image_preview_url ?? null;

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
    } else if (pollStatus === 'failed' && pollError) {
      console.error('[ScenePreviewGenerator] Async generation failed:', pollError);
      toast.error(pollError);
      setIsAsyncGeneration(false);
      setPendingGenerationId(null);
    }
  }, [pollStatus, pollOutputUrl, pollError, scene.id, onImageGenerated]);

  // Log errors to console instead of toasting
  useEffect(() => {
    if (error) {
      console.error('[ScenePreviewGenerator] Generation error:', error);
      toast.error(error);
    }
  }, [error]);

  // Filter models for scene preview (image generation only)
  // Show ALL active image models to restore full selection
  const imageModels = (models ?? [])
    .filter(m => m.content_type === 'image')
    .sort((a, b) => {
      // Preferred order: Runware variants first, then Nano Banana, then the rest alphabetically
      const priority: Record<string, number> = {
        'runware:100@1': 1, // Flux.1 Schnell
        'runware:101@1': 2, // Flux.1 Dev
        'runware:97@3': 3,  // HiDream Fast
        'runware:97@2': 4,  // HiDream Dev
        'google/nano-banana': 5,
      };
      const pa = priority[a.id] ?? 999;
      const pb = priority[b.id] ?? 999;
      if (pa !== pb) return pa - pb;
      // Group by provider next, then model name
      const prov = (a.provider || '').localeCompare(b.provider || '');
      if (prov !== 0) return prov;
      return (a.model_name || '').localeCompare(b.model_name || '');
    });

  // DEBUG: Log final filtered models
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[ScenePreviewGenerator] Filtered imageModels (ALL image):', imageModels.map(m => ({
        id: m.id,
        name: m.model_name,
        provider: m.provider
      })));
    }
  }, [imageModels]);

  // Auto-select first available model if current selection is invalid
  useEffect(() => {
    if (imageModels.length > 0 && !imageModels.find(m => m.id === selectedModelId)) {
      setSelectedModelId(imageModels[0].id);
    }
  }, [imageModels, selectedModelId]);

  const selectedModel = imageModels.find(m => m.id === selectedModelId) || imageModels[0];
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

    const generationResult = await generate({
      model_id: selectedModelId,
      prompt: scene.image_prompt,
      custom_parameters: {},
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
            <img
              src={displayUrl}
              alt={`Scene ${sceneNumber} preview`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-xs text-white/90 bg-black/40 rounded px-2 py-1">
                  ✅ This image will be used in video render
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
      {!hasExistingPreview && !isGenerating && !isAsyncGeneration && (
        <>
          <div className="space-y-3">
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {imageModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>{model.model_name}</span>
                      <span className="text-xs text-muted-foreground">
                        (~{model.base_token_cost} token{model.base_token_cost !== 1 ? 's' : ''})
                      </span>
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
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Preview ({tokenCost} credit{tokenCost !== 1 ? 's' : ''})
            </Button>
          </div>

          {(tokenData?.tokens_remaining || 0) < tokenCost && (
            <p className="text-xs text-destructive mt-2">
              Insufficient credits. You need {tokenCost} credit{tokenCost !== 1 ? 's' : ''}.
            </p>
          )}
        </>
      )}
    </Card>
  );
};
