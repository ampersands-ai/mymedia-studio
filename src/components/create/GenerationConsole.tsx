import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Download, History as HistoryIcon } from "lucide-react";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { OptimizedGenerationPreview } from "@/components/generation/OptimizedGenerationPreview";
import type { GenerationState } from "@/hooks/useGenerationState";

/**
 * Props for GenerationConsole component
 */
interface GenerationConsoleProps {
  generationState: GenerationState;
  contentType: string;
  isPolling: boolean;
  onDownload: (path: string) => Promise<void>;
  onDownloadAll: () => Promise<void>;
  onViewHistory: () => void;
  onRetry: () => void;
}

/**
 * Console component displaying generation progress and outputs
 * Handles both single and batch outputs (critical for audio)
 */
export const GenerationConsole = ({
  generationState,
  contentType,
  isPolling,
  onDownload,
  onDownloadAll,
  onViewHistory,
}: GenerationConsoleProps) => {
  if (!isPolling && !generationState.currentOutput) {
    return null;
  }

  if (!generationState.startTime) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20 bg-muted/50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Feel free to navigate away - your generation will be saved in History
          </p>
        </div>

        <GenerationProgress
          startTime={generationState.startTime}
          isComplete={!!generationState.currentOutput}
          completedAt={generationState.completeTime || undefined}
        />

        {generationState.currentOutput && (
          <div className="space-y-3 pt-2">
            {/* Display all outputs if multiple (critical for audio batch generations) */}
            {generationState.outputs.length > 1 ? (
              <div className="space-y-4">
                <p className="text-sm font-medium">{generationState.outputs.length} files generated:</p>
                {generationState.outputs.map((output, index) => (
                  <div key={output.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">File {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDownload(output.storage_path)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                    </div>
                    <div className="bg-background rounded-lg border">
                      <OptimizedGenerationPreview
                        key={`generation-${output.storage_path}-${generationState.completeTime}`}
                        storagePath={`${output.storage_path}${output.storage_path.includes('?') ? '&' : '?'}v=${generationState.completeTime}`}
                        contentType={contentType}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Single output display
              <>
                <div className="aspect-video relative overflow-hidden bg-background rounded-lg border">
                  <OptimizedGenerationPreview
                    key={`generation-${generationState.currentOutput}-${generationState.completeTime}`}
                    storagePath={`${generationState.currentOutput}${generationState.currentOutput.includes('?') ? '&' : '?'}v=${generationState.completeTime}`}
                    contentType={contentType}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => onDownload(generationState.currentOutput!)}
                    className="flex-1"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    onClick={onViewHistory}
                    className="flex-1"
                    size="sm"
                  >
                    <HistoryIcon className="h-4 w-4 mr-2" />
                    View in History
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
