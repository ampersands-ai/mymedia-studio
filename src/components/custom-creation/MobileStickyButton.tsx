import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Coins, Clock } from "lucide-react";

interface MobileStickyButtonProps {
  onGenerate: () => void;
  disabled: boolean;
  isGenerating: boolean;
  estimatedTokens: number;
  estimatedDuration?: number | null;
}

/**
 * Mobile sticky generate button at bottom
 */
export const MobileStickyButton: React.FC<MobileStickyButtonProps> = ({
  onGenerate,
  disabled,
  isGenerating,
  estimatedTokens,
  estimatedDuration,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] z-40 safe-area-padding-bottom">
      <Button 
        onClick={onGenerate} 
        disabled={disabled}
        size="lg"
        className="w-full h-14 text-base font-bold bg-primary-500 hover:bg-primary-600 text-neutral-900 border-2 border-primary-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full">
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <span className="whitespace-nowrap">Generate</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded">
                <Coins className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-bold whitespace-nowrap">(~{estimatedTokens.toFixed(2)})</span>
              </div>
              {estimatedDuration && (
                <div className="flex items-center gap-1.5 bg-black/10 px-2.5 py-1 rounded">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-bold whitespace-nowrap">(~{estimatedDuration}s)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Button>
    </div>
  );
};
