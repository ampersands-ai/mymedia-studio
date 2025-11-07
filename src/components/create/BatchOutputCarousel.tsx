import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OptimizedGenerationPreview } from "@/components/generation/OptimizedGenerationPreview";
import { cn } from "@/lib/utils";
import type { GenerationOutput } from "@/hooks/useGenerationState";

/**
 * Props for BatchOutputCarousel component
 */
interface BatchOutputCarouselProps {
  outputs: GenerationOutput[];
  currentIndex: number;
  contentType: string; // Type of content: 'image', 'video', 'audio'
  onIndexChange: (index: number) => void;
  onDownload?: (output: GenerationOutput) => void;
  className?: string;
}

/**
 * Carousel component for displaying batch generation outputs
 * Allows navigation between multiple generated items
 */
export const BatchOutputCarousel = ({
  outputs,
  currentIndex,
  contentType,
  onIndexChange,
  onDownload,
  className,
}: BatchOutputCarouselProps) => {
  const [isNavigating, setIsNavigating] = useState(false);

  const currentOutput = outputs[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < outputs.length - 1;

  const handlePrevious = () => {
    if (!hasPrevious || isNavigating) return;
    setIsNavigating(true);
    onIndexChange(currentIndex - 1);
    setTimeout(() => setIsNavigating(false), 300);
  };

  const handleNext = () => {
    if (!hasNext || isNavigating) return;
    setIsNavigating(true);
    onIndexChange(currentIndex + 1);
    setTimeout(() => setIsNavigating(false), 300);
  };

  if (!currentOutput || outputs.length === 0) {
    return null;
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Navigation Controls */}
      <div className="absolute top-1/2 left-0 right-0 z-10 flex justify-between px-2 -translate-y-1/2 pointer-events-none">
        <Button
          variant="secondary"
          size="icon"
          onClick={handlePrevious}
          disabled={!hasPrevious || isNavigating}
          className={cn(
            "pointer-events-auto shadow-lg",
            !hasPrevious && "opacity-0"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          onClick={handleNext}
          disabled={!hasNext || isNavigating}
          className={cn(
            "pointer-events-auto shadow-lg",
            !hasNext && "opacity-0"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Output Preview */}
      <div className="relative">
        <OptimizedGenerationPreview
          storagePath={currentOutput.storage_path}
          contentType={contentType}
          className="w-full rounded-lg"
        />
      </div>

      {/* Indicator Dots */}
      {outputs.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {outputs.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onIndexChange(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to output ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium">
        {currentIndex + 1} / {outputs.length}
      </div>
    </Card>
  );
};
