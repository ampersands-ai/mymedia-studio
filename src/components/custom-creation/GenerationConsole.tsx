import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, History } from "lucide-react";
import { logger } from "@/lib/logger";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { OutputGrid } from "@/components/generation/OutputGrid";
import { OutputLightbox } from "@/components/generation/OutputLightbox";
import { OptimizedGenerationPreview } from "@/components/generation/OptimizedGenerationPreview";
import { CaptionDisplay } from "./CaptionDisplay";

import type { GenerationOutput, CaptionData } from "@/types/custom-creation";

interface GenerationConsoleProps {
  generationState: {
    generatedOutputs: GenerationOutput[];
    selectedOutputIndex: number;
    showLightbox: boolean;
    generationStartTime: number | null;
    apiCallStartTime: number | null;
    generationCompleteTime: number | null;
    generatedOutput: string | null;
  };
  contentType: string;
  estimatedTimeSeconds: number | null;
  showProgress?: boolean;
  isPolling?: boolean;
  onNavigateLightbox: (direction: 'prev' | 'next') => void;
  onOpenLightbox: (index: number) => void;
  onCloseLightbox: () => void;
  onDownloadAll: () => Promise<void>;
  onViewHistory: () => void;
  captionData: CaptionData | null;
  isGeneratingCaption: boolean;
  onRegenerateCaption: () => Promise<void>;
  onCopyCaption: () => void;
  onCopyHashtags: () => void;
  onDownloadSuccess: () => void;
  failedGenerationError?: {
    message: string;
    generationId: string;
    timestamp: number;
    providerResponse?: Record<string, unknown>;
  } | null;
  onClearError?: () => void;
}

/**
 * Output display: GenerationProgress, OutputGrid, lightbox, caption
 */
export const GenerationConsole: React.FC<GenerationConsoleProps> = ({
  generationState,
  contentType,
  estimatedTimeSeconds,
  showProgress = true,
  onNavigateLightbox,
  onOpenLightbox,
  onCloseLightbox,
  onDownloadAll,
  onViewHistory,
  captionData,
  isGeneratingCaption,
  onRegenerateCaption,
  onCopyCaption,
  onCopyHashtags,
  onDownloadSuccess,
  failedGenerationError,
  onClearError,
}) => {
  logger.debug('GenerationConsole render', {
    outputsCount: generationState.generatedOutputs.length,
    outputs: generationState.generatedOutputs,
    singleOutput: generationState.generatedOutput,
    contentType
  });

  return (
    <div className="space-y-4">
      <Card className="border-border bg-muted/50">
        <CardContent className="p-4 space-y-4">
          {failedGenerationError ? (
            // Show persistent error display
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-destructive/20 p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-foreground">Generation Failed</h3>
                    <p className="text-sm font-semibold text-destructive">Model Status: Temporarily Offline, try a different model.</p>
                    <p className="text-sm text-muted-foreground">{failedGenerationError.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Your credits have been refunded automatically
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {onClearError && (
                    <Button onClick={onClearError} size="sm" variant="outline">
                      Clear Error
                    </Button>
                  )}
                  <Button onClick={onViewHistory} size="sm" variant="ghost">
                    <History className="w-4 h-4 mr-2" />
                    View History
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Normal generation display
            <>
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Feel free to navigate away - your generation will be saved in History
            </p>
          </div>

          {showProgress && (
            <GenerationProgress
              startTime={generationState.generationStartTime || Date.now()}
              apiStartTime={generationState.apiCallStartTime}
              isComplete={!!generationState.generatedOutput || generationState.generatedOutputs.length > 0}
              completedAt={generationState.generationCompleteTime || undefined}
              estimatedTimeSeconds={estimatedTimeSeconds}
              onViewHistory={onViewHistory}
            />
          )}

          {generationState.generatedOutputs.length > 0 ? (
            <div className="space-y-3 pt-2">
              <OutputGrid
                outputs={generationState.generatedOutputs}
                contentType={contentType}
                onSelectOutput={onOpenLightbox}
                onDownloadAll={onDownloadAll}
                onDownloadSuccess={onDownloadSuccess}
              />


              <OutputLightbox
                outputs={generationState.generatedOutputs}
                selectedIndex={generationState.selectedOutputIndex}
                contentType={contentType}
                open={generationState.showLightbox}
                onOpenChange={onCloseLightbox}
                onNavigate={onNavigateLightbox}
                onDownloadSuccess={onDownloadSuccess}
              />

              {/* Caption display */}
              {captionData && (
                <CaptionDisplay
                  captionData={captionData}
                  isGenerating={isGeneratingCaption}
                  onRegenerate={onRegenerateCaption}
                  onCopyCaption={onCopyCaption}
                  onCopyHashtags={onCopyHashtags}
                />
              )}

              <Button onClick={onViewHistory} variant="outline" className="w-full gap-2">
                <History className="h-4 w-4" />
                View All in History
              </Button>
            </div>
          ) : generationState.generatedOutput ? (
            // Single output fallback
            <div className="space-y-3 pt-2">
              <div className="relative bg-background rounded-lg overflow-hidden border">
                <OptimizedGenerationPreview
                  storagePath={generationState.generatedOutput}
                  contentType={contentType}
                  className="w-full"
                />
              </div>
              <Button onClick={onViewHistory} variant="outline" className="w-full gap-2">
                <History className="h-4 w-4" />
                View in History
              </Button>
            </div>
          ) : null}

            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
