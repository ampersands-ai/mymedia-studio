import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { OptimizedGenerationPreview } from "./OptimizedGenerationPreview";

interface OutputGridProps {
  outputs: Array<{
    id: string;
    storage_path: string;
    output_index: number;
  }>;
  contentType: string;
  onSelectOutput: (index: number) => void;
  onDownloadAll?: () => void;
  onGenerateVideo?: (outputIndex: number) => void;
  generatingVideoIndex?: number | null;
}

export const OutputGrid = ({ 
  outputs, 
  contentType, 
  onSelectOutput, 
  onDownloadAll,
  onGenerateVideo,
  generatingVideoIndex
}: OutputGridProps) => {
  const isAudio = contentType === 'audio';
  // Single output - show full size
  if (outputs.length === 1) {
    return (
      <div className="space-y-3">
        <div 
          className="relative aspect-square bg-background rounded-lg overflow-hidden border cursor-pointer hover:border-primary transition-colors"
          onClick={() => onSelectOutput(0)}
        >
          <OptimizedGenerationPreview
            storagePath={outputs[0].storage_path}
            contentType={contentType}
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Generate Video button for single audio output */}
        {isAudio && onGenerateVideo && (
          <Button
            onClick={() => onGenerateVideo(0)}
            disabled={generatingVideoIndex === 0}
            variant="outline"
            className="w-full"
            size="sm"
          >
            {generatingVideoIndex === 0 ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                🎬 Generate Video
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Multiple outputs - show grid
  return (
    <div className="space-y-3">
      {/* Grid of thumbnails */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {outputs.map((output, index) => (
          <div key={output.id} className="space-y-2">
            <div
              className="relative aspect-square cursor-pointer group"
              onClick={() => onSelectOutput(index)}
            >
              {/* Output number badge */}
              <Badge 
                className="absolute top-2 right-2 z-10 bg-background/90 backdrop-blur-sm border shadow-sm"
                variant="secondary"
              >
                #{output.output_index + 1}
              </Badge>

              {/* Thumbnail */}
              <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-transparent group-hover:border-primary transition-all group-hover:scale-[1.02] bg-background">
                <OptimizedGenerationPreview
                  storagePath={output.storage_path}
                  contentType={contentType}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors rounded-lg pointer-events-none" />
            </div>

            {/* Generate Video button for each audio output */}
            {isAudio && onGenerateVideo && (
              <Button
                onClick={() => onGenerateVideo(index)}
                disabled={generatingVideoIndex === index}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {generatingVideoIndex === index ? (
                  <>
                    <Download className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    🎬 Video
                  </>
                )}
              </Button>
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
