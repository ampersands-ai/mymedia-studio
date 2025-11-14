import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import { GenerationConsole } from "./GenerationConsole";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import type { GenerationOutput, CaptionData } from "@/types/custom-creation";
import { Button } from "@/components/ui/button";

interface OutputPanelProps {
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
  localGenerating: boolean;
  isGenerating: boolean;
  pollingGenerationId: string | null;
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
  templateBeforeImage: string | null;
  templateAfterImage: string | null;
  modelProvider?: string;
  modelName?: string;
}

/**
 * Complete output panel with empty state or generation console
 */
export const OutputPanel = forwardRef<HTMLDivElement, OutputPanelProps>(
  (
    {
      generationState,
      contentType,
      estimatedTimeSeconds,
      isPolling,
      localGenerating,
      isGenerating,
      pollingGenerationId,
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
      templateBeforeImage,
      templateAfterImage,
      modelProvider,
      modelName,
    },
    ref
  ) => {
    const hasGeneration =
      localGenerating || isGenerating || isPolling || pollingGenerationId || 
      generationState.generatedOutput || 
      generationState.generatedOutputs.length > 0 ||
      (childVideoGenerations && childVideoGenerations.length > 0) ||
      !!generationState.generationStartTime;

    const showStatusBanner = (localGenerating || isGenerating || isPolling || pollingGenerationId) && 
      !generationState.generatedOutput && 
      generationState.generatedOutputs.length === 0;

    console.log('🎨 OutputPanel render', {
      hasGeneration,
      showStatusBanner,
      outputsLength: generationState.generatedOutputs.length,
      hasGeneratedOutput: !!generationState.generatedOutput,
      localGenerating,
      isGenerating,
      pollingGenerationId
    });

    return (
      <Card ref={ref} className="h-full flex flex-col border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="border-b border-border px-4 md:px-6 py-3 md:py-4 bg-muted/30 shrink-0">
          <h2 className="text-base md:text-lg font-bold text-foreground">Output</h2>
        </div>

        {/* Status Banner */}
        {showStatusBanner && (
          <div className="border-b border-border/50 bg-primary/5 px-4 py-2 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0 flex-1">
              <Loader2 className="h-3 w-3 animate-spin flex-shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Generating your content...
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewHistory}
              className="h-7 px-2 flex-shrink-0"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              My Creations
            </Button>
          </div>
        )}

        <div className="flex-1 p-4 md:p-6">
          {hasGeneration ? (
            <GenerationConsole
              generationState={generationState}
              contentType={contentType}
              estimatedTimeSeconds={estimatedTimeSeconds}
              isPolling={isPolling}
              onNavigateLightbox={onNavigateLightbox}
              onOpenLightbox={onOpenLightbox}
              onCloseLightbox={onCloseLightbox}
              onDownloadAll={onDownloadAll}
              onViewHistory={onViewHistory}
              onGenerateVideo={onGenerateVideo}
              generatingVideoIndex={generatingVideoIndex}
              userTokensRemaining={userTokensRemaining}
              captionData={captionData}
              isGeneratingCaption={isGeneratingCaption}
              onRegenerateCaption={onRegenerateCaption}
              onCopyCaption={onCopyCaption}
              onCopyHashtags={onCopyHashtags}
              childVideoGenerations={childVideoGenerations}
              parentGenerationId={parentGenerationId}
              onDownloadSuccess={onDownloadSuccess}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
              {templateBeforeImage && templateAfterImage ? (
                <div className="w-full max-w-2xl">
                  <BeforeAfterSlider
                    beforeImage={templateBeforeImage}
                    afterImage={templateAfterImage}
                    beforeLabel="Before"
                    afterLabel="After"
                  />
                </div>
              ) : templateAfterImage || templateBeforeImage ? (
                <img
                  src={templateAfterImage || templateBeforeImage!}
                  alt="Template preview"
                  className="max-w-full max-h-[500px] rounded-lg shadow-lg object-contain"
                />
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    Your generated content will appear here
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Select a model and click Generate to start creating
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
);

OutputPanel.displayName = "OutputPanel";
