import { forwardRef, memo } from "react";
import { Card } from "@/components/ui/card";
import { ImageIcon, Loader2 } from "lucide-react";
import { GenerationConsole } from "./GenerationConsole";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import type { GenerationOutput, CaptionData } from "@/types/custom-creation";
import { useActiveGenerations } from "@/hooks/useActiveGenerations";
import { useConcurrentGenerationLimit } from "@/hooks/useConcurrentGenerationLimit";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface OutputPanelProps {
  generationState: {
    generatedOutputs: GenerationOutput[];
    selectedOutputIndex: number;
    showLightbox: boolean;
    generationStartTime: number | null;
    apiCallStartTime: number | null;
    generationCompleteTime: number | null;
    generatedOutput: string | null;
    isBackgroundProcessing?: boolean;
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
  captionData: CaptionData | null;
  isGeneratingCaption: boolean;
  onRegenerateCaption: () => Promise<void>;
  onCopyCaption: () => void;
  onCopyHashtags: () => void;
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
      captionData,
      isGeneratingCaption,
      onRegenerateCaption,
      onCopyCaption,
      onCopyHashtags,
      onDownloadSuccess,
      templateBeforeImage,
      templateAfterImage,
      modelProvider: _modelProvider,
      modelName: _modelName,
      connectionTier: _connectionTier = 'disconnected',
      realtimeConnected: _realtimeConnected = false,
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
      
      !!generationState.generationStartTime ||
      !!failedGenerationError;

    const showStatusBanner = (localGenerating || isGenerating || isPolling || pollingGenerationId) && 
      !generationState.generatedOutput && 
      generationState.generatedOutputs.length === 0;

    const showProgress = Boolean(showStatusBanner);

    const handleNavigateToHistory = () => {
      navigate('/dashboard/history?status=pending');
    };

    return (
        <Card ref={ref} className="h-full flex flex-col border-border/40 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <div className="border-b border-border px-4 md:px-6 py-3 md:py-4 bg-muted/30 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-bold text-foreground">Output</h2>
              {activeGenerations.length > 0 && (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary/20 transition-colors gap-1.5"
                  onClick={handleNavigateToHistory}
                >
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs font-medium">
                    {activeGenerations.length}/{maxConcurrent === 999 ? '∞' : maxConcurrent}
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
              captionData={captionData}
              isGeneratingCaption={isGeneratingCaption}
              onRegenerateCaption={onRegenerateCaption}
              onCopyCaption={onCopyCaption}
              onCopyHashtags={onCopyHashtags}
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
    prevProps.contentType === nextProps.contentType &&
    prevProps.estimatedTimeSeconds === nextProps.estimatedTimeSeconds &&
    prevProps.isGeneratingCaption === nextProps.isGeneratingCaption &&
    prevProps.templateBeforeImage === nextProps.templateBeforeImage &&
    prevProps.templateAfterImage === nextProps.templateAfterImage &&
    prevProps.modelProvider === nextProps.modelProvider &&
    prevProps.modelName === nextProps.modelName &&
    
    prevProps.generationState.generatedOutputs.length === nextProps.generationState.generatedOutputs.length &&
    prevProps.generationState.selectedOutputIndex === nextProps.generationState.selectedOutputIndex &&
    prevProps.generationState.showLightbox === nextProps.generationState.showLightbox &&
    prevProps.generationState.generationStartTime === nextProps.generationState.generationStartTime &&
    prevProps.generationState.generationCompleteTime === nextProps.generationState.generationCompleteTime &&
    prevProps.generationState.generatedOutput === nextProps.generationState.generatedOutput &&
    prevProps.captionData === nextProps.captionData &&
    
    prevProps.failedGenerationError === nextProps.failedGenerationError &&
    prevProps.connectionTier === nextProps.connectionTier
  );
});

OutputPanel.displayName = "OutputPanel";
