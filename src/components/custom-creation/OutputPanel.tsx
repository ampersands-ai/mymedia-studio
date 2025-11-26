import { forwardRef, memo } from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon, Loader2, Wifi, WifiOff } from "lucide-react";
import { GenerationConsole } from "./GenerationConsole";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import type { GenerationOutput, CaptionData } from "@/types/custom-creation";
import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { useConcurrentGenerationLimit } from "@/hooks/useConcurrentGenerationLimit";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  connectionTier?: 'realtime' | 'polling' | 'disconnected';
  realtimeConnected?: boolean;
  failedGenerationError?: {
    message: string;
    generationId: string;
    timestamp: number;
    providerResponse?: Record<string, unknown>;
  } | null;
  onClearError?: () => void;
}

/**
 * Complete output panel with empty state or generation console
 */
const OutputPanelComponent = forwardRef<HTMLDivElement, OutputPanelProps>(
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
      connectionTier = 'disconnected',
      realtimeConnected = false,
      failedGenerationError,
      onClearError,
    },
    ref
  ) => {
    const { data: activeGenerations = [] } = useActiveGenerations();
    const { data: maxConcurrent = 1 } = useConcurrentGenerationLimit();
    const navigate = useNavigate();

    const hasGeneration =
      localGenerating || isGenerating || isPolling || pollingGenerationId || 
      generationState.generatedOutput || 
      generationState.generatedOutputs.length > 0 ||
      (childVideoGenerations && childVideoGenerations.length > 0) ||
      !!generationState.generationStartTime ||
      !!failedGenerationError;

    const showStatusBanner = (localGenerating || isGenerating || isPolling || pollingGenerationId) && 
      !generationState.generatedOutput && 
      generationState.generatedOutputs.length === 0;

    const showProgress = showStatusBanner;

    const handleNavigateToHistory = () => {
      navigate('/dashboard/my-creations?status=pending');
    };

    return (
        <Card ref={ref} className="h-full flex flex-col border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="border-b border-border px-4 md:px-6 py-3 md:py-4 bg-muted/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-foreground">Output</h2>
                {(isPolling || pollingGenerationId) && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant={connectionTier === 'realtime' ? 'default' : 'secondary'}
                          className="gap-1 text-xs"
                        >
                          {connectionTier === 'realtime' ? (
                            <>
                              <Wifi className="h-3 w-3" />
                              Live
                            </>
                          ) : connectionTier === 'polling' ? (
                            <>
                              <WifiOff className="h-3 w-3" />
                              Slow
                            </>
                          ) : null}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {connectionTier === 'realtime' 
                            ? 'Real-time updates active' 
                            : connectionTier === 'polling'
                            ? 'Using slower polling mode'
                            : 'Connecting to status updates'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              {activeGenerations.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary/20 transition-colors gap-1.5"
                  onClick={handleNavigateToHistory}
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs font-medium">
                    {activeGenerations.length}/{maxConcurrent}
                  </span>
                </Badge>
              )}
            </div>
          </div>


        <div className="flex-1 p-4 md:p-6">
          {hasGeneration ? (
            <GenerationConsole
              generationState={generationState}
              contentType={contentType}
              estimatedTimeSeconds={estimatedTimeSeconds}
              isPolling={isPolling}
              showProgress={showProgress}
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
              failedGenerationError={failedGenerationError}
              onClearError={onClearError}
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

OutputPanelComponent.displayName = "OutputPanel";

// Memoize to prevent unnecessary re-renders
export const OutputPanel = memo(OutputPanelComponent, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return (
    prevProps.isPolling === nextProps.isPolling &&
    prevProps.localGenerating === nextProps.localGenerating &&
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.pollingGenerationId === nextProps.pollingGenerationId &&
    prevProps.generatingVideoIndex === nextProps.generatingVideoIndex &&
    prevProps.userTokensRemaining === nextProps.userTokensRemaining &&
    prevProps.contentType === nextProps.contentType &&
    prevProps.estimatedTimeSeconds === nextProps.estimatedTimeSeconds &&
    prevProps.isGeneratingCaption === nextProps.isGeneratingCaption &&
    prevProps.templateBeforeImage === nextProps.templateBeforeImage &&
    prevProps.templateAfterImage === nextProps.templateAfterImage &&
    prevProps.modelProvider === nextProps.modelProvider &&
    prevProps.modelName === nextProps.modelName &&
    prevProps.parentGenerationId === nextProps.parentGenerationId &&
    prevProps.generationState.generatedOutputs.length === nextProps.generationState.generatedOutputs.length &&
    prevProps.generationState.selectedOutputIndex === nextProps.generationState.selectedOutputIndex &&
    prevProps.generationState.showLightbox === nextProps.generationState.showLightbox &&
    prevProps.generationState.generationStartTime === nextProps.generationState.generationStartTime &&
    prevProps.generationState.generationCompleteTime === nextProps.generationState.generationCompleteTime &&
    prevProps.generationState.generatedOutput === nextProps.generationState.generatedOutput &&
    prevProps.captionData === nextProps.captionData &&
    prevProps.childVideoGenerations.length === nextProps.childVideoGenerations.length
  );
});

OutputPanel.displayName = "OutputPanel";
