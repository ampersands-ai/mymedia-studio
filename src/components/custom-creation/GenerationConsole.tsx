import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, History } from "lucide-react";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { OutputGrid } from "@/components/generation/OutputGrid";
import { OutputLightbox } from "@/components/generation/OutputLightbox";
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
  isPolling: boolean;
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
  isPolling,
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

          {generationState.generationStartTime && (
            <GenerationProgress
              startTime={generationState.generationStartTime}
              isComplete={!!generationState.generatedOutput}
              completedAt={generationState.generationCompleteTime || undefined}
              estimatedTimeSeconds={estimatedTimeSeconds}
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

              {/* Child video generations */}
              {childVideoGenerations.filter(v => v.type === 'video').length > 0 && (
                <VideoGenerationList
                  videoGenerations={childVideoGenerations.filter(v => v.type === 'video')}
                  parentGenerationId={parentGenerationId}
                  onRegenerate={onGenerateVideo}
                  generatingVideoIndex={generatingVideoIndex}
                />
              )}

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
            <div className="text-center text-sm text-muted-foreground p-4">
              <p>Generation complete. Check History for details.</p>
              <Button onClick={onViewHistory} variant="outline" className="mt-2 gap-2">
                <History className="h-4 w-4" />
                View History
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
