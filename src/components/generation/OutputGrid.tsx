import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { OptimizedGenerationPreview } from "./OptimizedGenerationPreview";
import { downloadSingleOutput } from "@/lib/download-utils";
import { GetLyricsButton } from "./GetLyricsButton";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface OutputGridProps {
  outputs: Array<{
    id: string;
    storage_path: string;
    output_index: number;
  }>;
  contentType: string;
  onSelectOutput: (index: number) => void;
  onDownloadAll?: () => void;
  onDownloadSuccess?: () => void;
  userCredits?: number;
  parentGenerationId?: string;
}

export const OutputGrid = ({ 
  outputs, 
  contentType, 
  onSelectOutput, 
  onDownloadAll,
  onDownloadSuccess,
  userCredits,
  parentGenerationId,
}: OutputGridProps) => {
  const isMobile = useIsMobile();
  const isAudio = contentType === 'audio';
  
  // Single output - show full size
  if (outputs.length === 1) {
    return (
      <div className="space-y-3">
        <div 
          className="relative bg-background rounded-lg overflow-hidden border cursor-pointer hover:border-primary transition-colors group"
          onClick={() => onSelectOutput(0)}
        >
          {/* Download button for single output */}
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "absolute top-2 left-2 z-10 h-10 w-10 min-h-[44px] min-w-[44px] transition-opacity",
              isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              downloadSingleOutput(outputs[0].storage_path, outputs[0].output_index, contentType, onDownloadSuccess);
            }}
          >
            <Download className="h-4 w-4" />
          </Button>
          
          <OptimizedGenerationPreview
            storagePath={outputs[0].storage_path}
            contentType={contentType}
            className="w-full"
            showActions={false}
          />
        </div>
        
        {/* Get Lyrics button for audio */}
        {isAudio && parentGenerationId && (
          <div className="flex justify-center">
            <GetLyricsButton
              generationId={parentGenerationId}
              outputIndex={outputs[0].output_index}
              userCredits={userCredits}
            />
          </div>
        )}
      </div>
    );
  }

  // Multiple outputs - show grid with adaptive layout
  // Use 2x2 grid for 4 or fewer outputs to maximize image size
  const getGridClass = () => {
    if (isAudio) return "grid grid-cols-1 md:grid-cols-2 gap-3";
    if (outputs.length <= 2) return "grid grid-cols-2 gap-4";
    if (outputs.length <= 4) return "grid grid-cols-2 gap-4";
    return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3";
  };

  // No forced aspect ratio - let images display naturally
  const getAspectClass = () => {
    if (isAudio) return "";
    return ""; // Images display at natural aspect ratio with max-height constraint
  };

  return (
    <div className="space-y-3">
      {/* Grid of thumbnails */}
      <div className={getGridClass()}>
        {outputs.map((output, index) => (
          <div key={output.id} className="space-y-2">
            <div
              className={cn(
                "relative cursor-pointer group",
                !isAudio && getAspectClass()
              )}
              onClick={() => onSelectOutput(index)}
            >
              {/* Output number badge */}
              <Badge 
                className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur-sm border shadow-sm"
                variant="secondary"
              >
                #{output.output_index + 1}
              </Badge>

              {/* Download button (top-left) - always visible on mobile for touch accessibility */}
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  "absolute top-2 left-2 z-10 h-10 w-10 min-h-[44px] min-w-[44px] transition-opacity",
                  isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  downloadSingleOutput(output.storage_path, output.output_index, contentType, onDownloadSuccess);
                }}
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Thumbnail */}
              <div className={isAudio 
                ? "relative w-full rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all bg-background" 
                : "relative w-full h-full rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all group-hover:scale-[1.02] bg-background"
              }>
                <OptimizedGenerationPreview
                  storagePath={output.storage_path}
                  contentType={contentType}
                  className={isAudio ? "w-full" : "w-full h-full object-cover"}
                  showActions={false}
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />
            </div>

            {/* Get Lyrics button for audio (below each output) */}
            {isAudio && parentGenerationId && (
              <div className="flex justify-center mt-2">
                <GetLyricsButton
                  generationId={parentGenerationId}
                  outputIndex={output.output_index}
                  userCredits={userCredits}
                  size="sm"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Download All button */}
      {outputs.length > 1 && onDownloadAll && (
        <Button
          onClick={onDownloadAll}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Download className="h-4 w-4 mr-2" />
          Download All ({outputs.length} outputs)
        </Button>
      )}
    </div>
  );
};
