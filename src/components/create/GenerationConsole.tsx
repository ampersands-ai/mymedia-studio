import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import { GenerationProgress } from "@/components/generation/GenerationProgress";
import { ActiveGenerationsStack } from "./ActiveGenerationsStack";
import type { GenerationState } from "@/hooks/useGenerationState";

/**
 * Props for GenerationConsole component
 */
interface GenerationConsoleProps {
  generationState: GenerationState;
  isPolling: boolean;
  onViewHistory: () => void;
  /** Optional: filter to specific model record ID */
  currentModelRecordId?: string | null;
}

/**
 * Console component displaying generation progress
 * Uses ActiveGenerationsStack to show independent consoles for each generation
 * Completed generations show "View in History" instead of inline preview
 */
export const GenerationConsole = ({
  generationState,
  isPolling,
  onViewHistory,
  currentModelRecordId,
}: GenerationConsoleProps) => {
  // Use the new ActiveGenerationsStack for independent consoles
  return (
    <div className="space-y-4">
      {/* Show "finalizing" state if we just completed polling but no output yet */}
      {!isPolling && !generationState.currentOutput && generationState.startTime && generationState.completeTime && (
        <Card className="border-2 border-primary/20 bg-muted/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground animate-pulse" />
              <p className="text-sm">Finalizing your generation...</p>
            </div>
            <GenerationProgress
              startTime={generationState.startTime}
              isComplete={false}
              completedAt={undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Active generations stack - each gets its own independent console */}
      <ActiveGenerationsStack
        onViewHistory={onViewHistory}
        currentModelRecordId={currentModelRecordId}
        maxConsoles={5}
      />

      {/* Navigate away hint when there are active generations */}
      {isPolling && (
        <div className="flex items-start gap-2 px-1">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Feel free to navigate away - your generations will be saved in History
          </p>
        </div>
      )}
    </div>
  );
};
