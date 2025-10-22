import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  defaultPosition?: number;
  className?: string;
  showHint?: boolean;
}

const BeforeAfterSliderComponent = ({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  defaultPosition = 50,
  className,
  showHint = false,
}: BeforeAfterSliderProps) => {
  const [position, setPosition] = useState(defaultPosition);
  const [showHintText, setShowHintText] = useState(showHint);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => setShowHintText(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showHint]);

  useEffect(() => {
    setPosition(defaultPosition);
  }, [defaultPosition]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(newPosition);
    setShowHintText(false);
  };

  const handleMouseLeave = () => {
    setPosition(defaultPosition);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden select-none", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="slider"
      aria-label="Image comparison slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      tabIndex={0}
    >
      {/* Loading skeleton */}
      {(!beforeLoaded || !afterLoaded) && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {/* Before Image (Base layer) */}
      <img
        src={beforeImage}
        alt={beforeLabel}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          beforeLoaded ? "opacity-100" : "opacity-0"
        )}
        draggable={false}
        loading="lazy"
        decoding="async"
        onLoad={() => setBeforeLoaded(true)}
      />

      {/* After Image (Clipped layer) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        <img
          src={afterImage}
          alt={afterLabel}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            afterLoaded ? "opacity-100" : "opacity-0"
          )}
          draggable={false}
          loading="lazy"
          decoding="async"
          onLoad={() => setAfterLoaded(true)}
        />
      </div>

      {/* Vertical Line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-[#FDB022] pointer-events-none z-10"
        style={{ left: `${position}%` }}
      />

      {/* Handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none z-20"
        style={{ left: `${position}%` }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="text-[#FDB022]"
        >
          <path d="M6 3L2 8L6 13M10 3L14 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-5 pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded z-5 pointer-events-none">
        {afterLabel}
      </div>

      {/* Hint Text */}
      {showHintText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 text-white text-xs rounded animate-fade-in pointer-events-none z-5">
          Hover to compare
        </div>
      )}
    </div>
  );
};

export const BeforeAfterSlider = memo(BeforeAfterSliderComponent);
