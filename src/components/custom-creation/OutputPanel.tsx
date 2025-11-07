import { forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import { GenerationConsole } from "./GenerationConsole";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import type { GenerationOutput, CaptionData } from "@/types/custom-creation";

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
  childVideoGenerations: any[];
  parentGenerationId: string | null;
  onDownloadSuccess: () => void;
  templateBeforeImage: string | null;
  templateAfterImage: string | null;
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
    },
    ref
  ) => {
    const hasGeneration =
      (localGenerating || isGenerating || pollingGenerationId || generationState.generatedOutput) &&
      generationState.generationStartTime;

    return (
      <Card ref={ref} className="bg-card border-border shadow-sm rounded-xl order-2">
        <div className="border-b border-border px-4 md:px-6 py-3 md:py-4 bg-muted/30">
          <h2 className="text-base md:text-lg font-bold text-foreground">Output</h2>
        </div>

        <div className="p-4 md:p-6">
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
            <div className="flex flex-col items-center justify-center min-h-[400px] lg:min-h-[calc(100vh-200px)] p-4">
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
