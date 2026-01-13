import { useRef, useState, memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import type { ModelSample } from "@/hooks/useModelPages";

interface SampleComparisonCardProps {
  sample: ModelSample;
  onClick: () => void;
}

function SampleComparisonCardComponent({ sample, onClick }: SampleComparisonCardProps) {
  const [isHovering, setIsHovering] = useState(false);
  const inputVideoRef = useRef<HTMLVideoElement>(null);
  const outputVideoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
      inputVideoRef.current?.play();
      outputVideoRef.current?.play();
    }, 200);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(false);
    if (inputVideoRef.current) {
      inputVideoRef.current.pause();
      inputVideoRef.current.currentTime = 0;
    }
    if (outputVideoRef.current) {
      outputVideoRef.current.pause();
      outputVideoRef.current.currentTime = 0;
    }
  };

  const handleTouchStart = () => {
    if (isHovering) {
      handleMouseLeave();
    } else {
      setIsHovering(true);
      inputVideoRef.current?.play();
      outputVideoRef.current?.play();
    }
  };

  const isInputVideo = sample.input_type === "video";
  const isOutputVideo = sample.output_type === "video";
  const hasVideo = isInputVideo || isOutputVideo;

  return (
    <Card
      className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      {/* Side-by-side layout */}
      <div className="grid grid-cols-2 gap-0.5 bg-muted/50">
        {/* Input side */}
        <div className="aspect-square relative overflow-hidden bg-muted">
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 z-10 text-xs"
          >
            Input
          </Badge>
          {isInputVideo ? (
            <video
              ref={inputVideoRef}
              src={sample.input_url || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={sample.input_url || ""}
              alt="Input"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>

        {/* Output side */}
        <div className="aspect-square relative overflow-hidden bg-muted">
          <Badge className="absolute top-2 right-2 z-10 bg-primary text-xs">
            Output
          </Badge>
          {isOutputVideo ? (
            <video
              ref={outputVideoRef}
              src={sample.output_url}
              poster={sample.thumbnail_url || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={sample.thumbnail_url || sample.output_url}
              alt="Output"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      </div>

      {/* Play icon overlay when not hovering (for videos) */}
      {hasVideo && !isHovering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Title/Prompt */}
      <div className="p-4 space-y-1">
        {sample.title && (
          <h3 className="font-medium line-clamp-1">{sample.title}</h3>
        )}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {sample.prompt}
        </p>
      </div>
    </Card>
  );
}

export const SampleComparisonCard = memo(SampleComparisonCardComponent);
