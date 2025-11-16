import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Clock } from "lucide-react";
import { TokenCostPreview } from "@/components/onboarding/TokenCostPreview";
import { GenerationConsole } from "./GenerationConsole";
import { formatEstimatedTime } from "@/lib/time-utils";
import type { GenerationState } from "@/hooks/useGenerationState";

/**
 * Props for GenerationDialog component
 */
interface GenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate: GenerationState['selectedTemplate'];
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  isPolling: boolean;
  userTokens: number;
  generationState: GenerationState;
  onDownload: (path: string) => Promise<void>;
  onDownloadAll?: () => Promise<void>;
  onViewHistory: () => void;
  onRetry?: () => void;
  onboardingProgress?: any;
  updateOnboardingProgress?: (updates: any) => void;
}

/**
 * Dialog component for generation workflow
 * Manages prompt input, generation, and output display
 */
export const GenerationDialog = ({
  open,
  onOpenChange,
  selectedTemplate,
  prompt,
  onPromptChange,
  onGenerate,
  isGenerating,
  isPolling,
  userTokens,
  generationState,
  onDownload,
  onDownloadAll,
  onViewHistory,
  onRetry,
  onboardingProgress,
  updateOnboardingProgress,
}: GenerationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-black">{selectedTemplate?.name}</DialogTitle>
          <DialogDescription>
            {selectedTemplate?.description || "Enter your prompt to generate content"}
          </DialogDescription>
          {selectedTemplate?.estimated_time_seconds !== null && 
           selectedTemplate?.estimated_time_seconds !== undefined && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Clock className="h-4 w-4" />
              <span>Estimated time: ~{formatEstimatedTime(selectedTemplate.estimated_time_seconds)}</span>
            </div>
          )}
        </DialogHeader>
        
        <div className="space-y-4">
          {!generationState.currentOutput && !isPolling && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt</label>
                <Textarea
                  value={prompt}
                  onChange={(e) => onPromptChange(e.target.value)}
                  placeholder="Describe what you want to create..."
                  className="min-h-[100px] resize-none"
                  disabled={isGenerating || isPolling}
                />
              </div>
              
              {/* Token Cost Preview */}
              <TokenCostPreview
                baseCost={selectedTemplate?.ai_models?.base_token_cost || 0}
                totalCost={selectedTemplate?.ai_models?.base_token_cost || 0}
                userTokens={userTokens}
              />
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                  disabled={isGenerating || isPolling}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onGenerate}
                  className="flex-1"
                  disabled={isGenerating || isPolling || !prompt.trim()}
                  title={isPolling ? "Generation in progress - please wait for it to complete" : ""}
                >
                  {(isGenerating || isPolling) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isPolling ? 'Processing...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
              
              {isPolling && (
                <p className="text-xs text-muted-foreground text-center">
                  Please wait for the current generation to complete before starting a new one
                </p>
              )}
            </>
          )}

          {/* Output Console */}
          <GenerationConsole
            generationState={generationState}
            contentType={selectedTemplate?.ai_models?.content_type || "image"}
            isPolling={isPolling}
            onDownload={onDownload}
            onViewHistory={onViewHistory}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
