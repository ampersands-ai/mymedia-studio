import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Video, X, AlertCircle } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

// Default to Seedance 1.5 Pro I2V
const DEFAULT_ANIMATION_MODEL = 'b2c3d4e5-6f7a-8b9c-0d1e-f2a3b4c5d6e7';

interface Scene {
  id: string;
  image_prompt: string;
  image_preview_url?: string | null;
  video_url?: string | null;
}

interface Storyboard {
  id: string;
  intro_image_prompt: string;
  intro_image_preview_url?: string | null;
  intro_video_url?: string | null;
}

interface BulkAnimationGeneratorProps {
  storyboard: Storyboard;
  scenes: Scene[];
  onAnimateAll: (modelId: string, signal: AbortSignal, onProgress: (current: number, total: number) => void) => Promise<{ success: boolean; generated: number; failed: number }>;
}

export const BulkAnimationGenerator = ({ storyboard, scenes, onAnimateAll }: BulkAnimationGeneratorProps) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_ANIMATION_MODEL);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { data: models } = useModels();
  const { availableCredits } = useUserCredits();

  // Count scenes with images but no video (intro + regular scenes)
  const scenesNeedingAnimation = [
    ...(storyboard?.intro_image_preview_url && !storyboard?.intro_video_url ? [{ isIntro: true }] : []),
    ...scenes.filter(s => s.image_preview_url && !s.video_url)
  ];

  const totalToAnimate = scenesNeedingAnimation.length;
  
  if (totalToAnimate === 0) {
    return null; // All scenes with images are already animated
  }

  // Show ONLY image-to-video models with storyboarding enabled
  const videoModels = (models ?? [])
    .filter(m => {
      const groups = Array.isArray(m.groups) ? m.groups : [];
      return groups.includes('image_to_video') && m.storyboarding === true;
    })
    .sort((a, b) => {
      // Prioritize Seedance 1.5 Pro at top
      if (a.record_id === DEFAULT_ANIMATION_MODEL) return -1;
      if (b.record_id === DEFAULT_ANIMATION_MODEL) return 1;
      const costA = a.base_token_cost || 0;
      const costB = b.base_token_cost || 0;
      if (costA !== costB) return costA - costB;
      return (a.model_name || '').localeCompare(b.model_name || '');
    });

  const selectedModel = videoModels.find(m => m.record_id === selectedModelId) || videoModels[0];
  const tokenCost = selectedModel?.base_token_cost || 1;
  const totalCost = Math.round((tokenCost * totalToAnimate) * 100) / 100;
  const hasEnoughCredits = availableCredits >= totalCost;

  const handleAnimate = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setProgress({ current: 0, total: totalToAnimate });
    
    try {
      const result = await onAnimateAll(selectedModelId, controller.signal, (current, total) => {
        setProgress({ current, total });
      });
      
      if (result.failed > 0) {
        logger.warn('Bulk animation completed with failures', {
          component: 'BulkAnimationGenerator',
          operation: 'handleAnimate',
          storyboardId: storyboard.id,
          failed: result.failed,
          generated: result.generated
        });
      }
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('cancelled'))) {
        logger.debug('Bulk animation cancelled', {
          component: 'BulkAnimationGenerator',
          operation: 'handleAnimate',
          storyboardId: storyboard.id
        });
      } else {
        logger.error('Bulk animation failed', error instanceof Error ? error : new Error(String(error)), {
          component: 'BulkAnimationGenerator',
          operation: 'handleAnimate',
          storyboardId: storyboard.id,
          modelId: selectedModelId
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <Card className="p-4 bg-accent/5 border-accent/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Video className="w-4 h-4" />
              Animate All Scenes
            </h4>
            <p className="text-sm text-muted-foreground">
              {totalToAnimate} scene{totalToAnimate !== 1 ? 's' : ''} with images ready to animate
            </p>
          </div>
          {isGenerating && (
            <div className="text-sm font-medium">
              {progress.current} / {progress.total}
            </div>
          )}
        </div>

        {!isGenerating && (
          <>
            {/* Model Selection */}
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoModels.map(model => (
                  <SelectItem key={model.record_id} value={model.record_id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{model.model_name}</span>
                      <span className="text-xs text-muted-foreground">
                        ~{model.base_token_cost} credit{model.base_token_cost !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Animate Button */}
            <Button
              onClick={handleAnimate}
              disabled={!hasEnoughCredits || videoModels.length === 0}
              className="w-full"
              variant="secondary"
            >
              <div className="flex items-center justify-center gap-2 w-full">
                <Video className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  <span className="hidden sm:inline">Animate All</span>
                  <span className="sm:hidden">Animate</span>
                </span>
                <span className="whitespace-nowrap flex-shrink-0">
                  (~{totalCost.toFixed(2)} credits)
                </span>
              </div>
            </Button>

            {/* Credit Warning */}
            {!hasEnoughCredits && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient credits. Need {totalCost} credits, you have {availableCredits.toFixed(2)}.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Progress Indicator with Cancel Button */}
        {isGenerating && (
          <div className="space-y-3">
            <Progress value={(progress.current / progress.total) * 100} />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Completed {progress.current} of {progress.total} animations...
              </p>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                className="h-7"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/70 text-center">
              Video generation takes longer. Please be patient.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
