import { useState, useRef, useEffect, memo, useMemo } from "react";
import type React from "react";
import { useInView } from 'react-intersection-observer';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getOptimizedImageUrl, getBlurPlaceholder } from '@/lib/supabase-images';

interface OptimizedBeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  defaultPosition?: number;
  className?: string;
  showHint?: boolean;
  isSupabaseImage?: boolean;
  priority?: boolean;
}

const OptimizedBeforeAfterSliderComponent = ({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
  defaultPosition = 50,
  className,
  showHint = false,
  isSupabaseImage = true,
  priority = false,
}: OptimizedBeforeAfterSliderProps) => {
  const [position, setPosition] = useState(defaultPosition);
  const [showHintText, setShowHintText] = useState(showHint);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '200px',
    skip: priority
  });

  // Update visibility when in view
  useEffect(() => {
    if (inView && !isVisible) {
      setIsVisible(true);
    }
  }, [inView, isVisible]);

  useEffect(() => {
    if (showHint) {
      const timer = setTimeout(() => setShowHintText(false), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
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

  // Detect if already a signed URL (contains /storage/v1/ or starts with http)
  const beforeIsSignedUrl = useMemo(() =>
    beforeImage.includes('/storage/v1/') || beforeImage.startsWith('http'),
    [beforeImage]
  );
  const afterIsSignedUrl = useMemo(() =>
    afterImage.includes('/storage/v1/') || afterImage.startsWith('http'),
    [afterImage]
  );

  // Generate optimized URLs only if not already signed URLs - memoized to prevent excessive recalculation
  const beforeImageOptimized = useMemo(() =>
    (isSupabaseImage && !beforeIsSignedUrl)
      ? getOptimizedImageUrl(beforeImage, { width: 800, quality: 85, format: 'webp' })
      : beforeImage,
    [beforeImage, isSupabaseImage, beforeIsSignedUrl]
  );

  const afterImageOptimized = useMemo(() =>
    (isSupabaseImage && !afterIsSignedUrl)
      ? getOptimizedImageUrl(afterImage, { width: 800, quality: 85, format: 'webp' })
      : afterImage,
    [afterImage, isSupabaseImage, afterIsSignedUrl]
  );

  const beforeImageAvif = useMemo(() =>
    (isSupabaseImage && !beforeIsSignedUrl)
      ? getOptimizedImageUrl(beforeImage, { width: 800, quality: 85, format: 'avif' })
      : null,
    [beforeImage, isSupabaseImage, beforeIsSignedUrl]
  );

  const afterImageAvif = useMemo(() =>
    (isSupabaseImage && !afterIsSignedUrl)
      ? getOptimizedImageUrl(afterImage, { width: 800, quality: 85, format: 'avif' })
      : null,
    [afterImage, isSupabaseImage, afterIsSignedUrl]
  );

  const beforePlaceholder = useMemo(() =>
    (isSupabaseImage && !beforeIsSignedUrl) ? getBlurPlaceholder(beforeImage) : null,
    [beforeImage, isSupabaseImage, beforeIsSignedUrl]
  );

  const afterPlaceholder = useMemo(() =>
    (isSupabaseImage && !afterIsSignedUrl) ? getBlurPlaceholder(afterImage) : null,
    [afterImage, isSupabaseImage, afterIsSignedUrl]
  );

  const shouldLoad = priority || isVisible;

  // Use callback ref pattern to handle both refs
  const setRefs = (node: HTMLDivElement | null) => {
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    inViewRef(node);
  };

  return (
    <div
      ref={setRefs}
      className={cn("relative w-auto h-auto overflow-hidden select-none", className)}
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

      {/* Blur placeholder - Before */}
      {beforePlaceholder && shouldLoad && (
        <img
          src={beforePlaceholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
            opacity: beforeLoaded ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Before Image (Base layer) */}
      {shouldLoad && (
        <picture>
          {beforeImageAvif && (
            <source type="image/avif" srcSet={beforeImageAvif} />
          )}
          <source type="image/webp" srcSet={beforeImageOptimized} />
          <img
            src={beforeImageOptimized}
            alt={beforeLabel}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              beforeLoaded ? "opacity-100" : "opacity-0"
            )}
            draggable={false}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setBeforeLoaded(true)}
          />
        </picture>
      )}

      {/* After Image (Clipped layer) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        {/* Blur placeholder - After */}
        {afterPlaceholder && shouldLoad && (
          <img
            src={afterPlaceholder}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'blur(10px)',
              transform: 'scale(1.1)',
              opacity: afterLoaded ? 0 : 1,
              transition: 'opacity 0.3s ease'
            }}
          />
        )}

        {shouldLoad && (
          <picture>
            {afterImageAvif && (
              <source type="image/avif" srcSet={afterImageAvif} />
            )}
            <source type="image/webp" srcSet={afterImageOptimized} />
            <img
              src={afterImageOptimized}
              alt={afterLabel}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                afterLoaded ? "opacity-100" : "opacity-0"
              )}
              draggable={false}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={priority ? "high" : "auto"}
              onLoad={() => setAfterLoaded(true)}
            />
          </picture>
        )}
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

export const OptimizedBeforeAfterSlider = memo(OptimizedBeforeAfterSliderComponent);
