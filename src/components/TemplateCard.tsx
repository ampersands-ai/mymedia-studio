import { useState, useRef, useEffect, memo } from "react";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  image: string;
  video?: string;
  alt: string;
  className?: string;
}

const TemplateCardComponent = ({ image, video, alt, className }: TemplateCardProps) => {
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (!video) return;

    // Debounce: wait 300ms before loading video
    hoverTimeoutRef.current = setTimeout(() => {
      setShowVideo(true);
      if (videoRef.current) {
        videoRef.current.play().catch(() => {
          // Autoplay might be blocked, ignore error
        });
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowVideo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleTouchStart = () => {
    if (!video) return;
    
    if (showVideo) {
      // Toggle pause/play
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    } else {
      setShowVideo(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden gpu-accelerated card", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
    >
      {/* Thumbnail image */}
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        width="400"
        height="300"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          showVideo && video ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Video preview */}
      {video && (
        <video
          ref={videoRef}
          src={video}
          muted
          loop
          playsInline
          preload="none"
          poster={image}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            showVideo ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label="Video preview"
        />
      )}

      {/* Play icon overlay (shows on hover for video templates) */}
      {video && !showVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-black ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export const TemplateCard = memo(TemplateCardComponent);
