import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, X, AlertCircle } from 'lucide-react';
import { useModels } from '@/hooks/useModels';
import { useUserCredits } from '@/hooks/useUserCredits';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

// Filter to only prompt-to-image models based on groups

interface Scene {
  id: string;
  image_prompt: string;
  image_preview_url?: string | null;
}

interface Storyboard {
  id: string;
  intro_image_prompt: string;
  intro_image_preview_url?: string | null;
}

interface BulkPreviewGeneratorProps {
  storyboard: Storyboard;
  scenes: Scene[];
  onGenerateAll: (modelId: string, signal: AbortSignal, onProgress: (current: number, total: number) => void) => Promise<{ success: boolean; generated: number; failed: number }>;
}

export const BulkPreviewGenerator = ({ storyboard, scenes, onGenerateAll }: BulkPreviewGeneratorProps) => {
  const [selectedModelId, setSelectedModelId] = useState<string>('runware:100@1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const { data: models } = useModels();
  const { availableCredits } = useUserCredits();

  // Count scenes needing previews (intro + regular scenes without previews)
  const scenesNeedingPreviews = [
    ...(storyboard?.intro_image_preview_url ? [] : [{ isIntro: true }]),
    ...scenes.filter(s => !s.image_preview_url && s.image_prompt)
  ];

  const totalToGenerate = scenesNeedingPreviews.length;
  
  if (totalToGenerate === 0) {
    return null; // All scenes have previews
  }

  // Show ONLY prompt-to-image models based on groups
  const imageModels = (models ?? [])
    .filter(m => {
      const groups = Array.isArray(m.groups) ? m.groups : [];
      return m.content_type === 'image' && groups.includes('prompt_to_image');
    })
    .sort((a, b) => {
      const costA = a.base_token_cost || 0;
      const costB = b.base_token_cost || 0;
      if (costA !== costB) return costA - costB;
      return (a.model_name || '').localeCompare(b.model_name || '');
    });

  const selectedModel = imageModels.find(m => m.id === selectedModelId) || imageModels[0];
  const tokenCost = selectedModel?.base_token_cost || 1;
  const totalCost = Math.round((tokenCost * totalToGenerate) * 100) / 100;
  const hasEnoughCredits = availableCredits >= totalCost;

  const handleGenerate = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setProgress({ current: 0, total: totalToGenerate });
    
    try {
      const result = await onGenerateAll(selectedModelId, controller.signal, (current, total) => {
        setProgress({ current, total });
      });
      
      if (result.failed > 0) {
        logger.warn('Bulk generation completed with failures', {
          component: 'BulkPreviewGenerator',
          operation: 'handleGenerate',
          storyboardId: storyboard.id,
          failed: result.failed,
          generated: result.generated
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (error.name === 'AbortError' || error.message.includes('cancelled')) {
        logger.debug('Bulk generation cancelled', {
          component: 'BulkPreviewGenerator',
          operation: 'handleGenerate',
          storyboardId: storyboard.id
        });
      } else {
        logger.error('Bulk generation failed', error, {
          component: 'BulkPreviewGenerator',
          operation: 'handleGenerate',
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
    <Card className="p-4 bg-primary/5 border-primary/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate All Scene Previews
            </h4>
            <p className="text-sm text-muted-foreground">
              {totalToGenerate} scene{totalToGenerate !== 1 ? 's' : ''} need preview images
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
                {imageModels.map(model => (
                  <SelectItem key={model.id} value={model.id}>
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

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!hasEnoughCredits || imageModels.length === 0}
              className="w-full"
            >
              <div className="flex items-center justify-center gap-2 w-full">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  <span className="hidden sm:inline">Generate All</span>
                  <span className="sm:hidden">Generate</span>
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
                Generating scene {progress.current} of {progress.total}...
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
              This may take a few minutes. You can cancel anytime.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
