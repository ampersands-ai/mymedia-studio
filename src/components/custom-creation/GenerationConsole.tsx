import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, History } from "lucide-react";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { OutputGrid } from "@/components/generation/OutputGrid";
import { OutputLightbox } from "@/components/generation/OutputLightbox";
import { OptimizedGenerationPreview } from "@/components/generation/OptimizedGenerationPreview";
import { CaptionDisplay } from "./CaptionDisplay";
import { VideoGenerationList } from "./VideoGenerationList";
import type { GenerationOutput, CaptionData } from "@/types/custom-creation";

interface GenerationConsoleProps {
  generationState: {
    generatedOutputs: GenerationOutput[];
    selectedOutputIndex: number;
    showLightbox: boolean;
    generationStartTime: number | null;
    generationCompleteTime: number | null;
    generatedOutput: string | null;
  };
  contentType: string;
  estimatedTimeSeconds: number | null;
  showProgress?: boolean;
  onNavigateLightbox: (direction: 'prev' | 'next') => void;
  onOpenLightbox: (index: number) => void;
  onCloseLightbox: () => void;
  onDownloadAll: () => Promise<void>;
  onViewHistory: () => void;
  onGenerateVideo?: (outputIndex: number) => void;
  generatingVideoIndex: number | null;
  userTokensRemaining: number;
  captionData: CaptionData | null;
  isGeneratingCaption: boolean;
  onRegenerateCaption: () => Promise<void>;
  onCopyCaption: () => void;
  onCopyHashtags: () => void;
  childVideoGenerations: Array<{
    id: string;
    status: string;
    storage_path?: string;
    output_index: number;
    type?: string;
  }>;
  parentGenerationId: string | null;
  onDownloadSuccess: () => void;
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
  onGenerateVideo,
  generatingVideoIndex,
  userTokensRemaining,
  captionData,
  isGeneratingCaption,
  onRegenerateCaption,
  onCopyCaption,
  onCopyHashtags,
  childVideoGenerations,
  parentGenerationId,
  onDownloadSuccess,
}) => {
  console.log('📺 GenerationConsole render', {
    outputsCount: generationState.generatedOutputs.length,
    outputs: generationState.generatedOutputs,
    singleOutput: generationState.generatedOutput,
    contentType
  });

  return (
    <div className="space-y-4">
      <Card className="border-border bg-muted/50">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Feel free to navigate away - your generation will be saved in History
            </p>
          </div>

          {showProgress && (
            <GenerationProgress
              startTime={generationState.generationStartTime || Date.now()}
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
                onGenerateVideo={onGenerateVideo}
                generatingVideoIndex={generatingVideoIndex}
                userTokensRemaining={userTokensRemaining}
                onDownloadSuccess={onDownloadSuccess}
              />


              <OutputLightbox
                outputs={generationState.generatedOutputs}
                selectedIndex={generationState.selectedOutputIndex}
                contentType={contentType}
                open={generationState.showLightbox}
                onOpenChange={onCloseLightbox}
                onNavigate={onNavigateLightbox}
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

          {/* Generated videos (shown even if no primary outputs) */}
          {childVideoGenerations.filter(v => v.type === 'video').length > 0 && (
            <VideoGenerationList
              videoGenerations={childVideoGenerations.filter(v => v.type === 'video')}
              parentGenerationId={parentGenerationId}
              onRegenerate={onGenerateVideo}
              generatingVideoIndex={generatingVideoIndex}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
