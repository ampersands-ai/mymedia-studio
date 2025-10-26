import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  getOptimizedImageUrl, 
  getBlurPlaceholder, 
  getResponsiveSrcSet,
  getBestFormat 
} from "@/lib/supabase-images";

interface OptimizedGenerationImageProps {
  storagePath: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
  sizes?: string; // Responsive sizes attribute
  aspectRatio?: string; // e.g., "16/9", "1/1"
}

/**
 * Enhanced optimized image component with:
 * - AVIF/WebP/JPEG format support with automatic detection
 * - Responsive srcSet for multiple screen sizes
 * - Progressive blur-up loading effect
 * - Intersection observer for lazy loading
 * - Priority loading for above-fold images
 */
export const OptimizedGenerationImage = ({
  storagePath,
  alt = "Generated content",
  className = "",
  priority = false,
  onClick,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  aspectRatio,
}: OptimizedGenerationImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [blurLoaded, setBlurLoaded] = useState(false);
  
  const { ref, inView } = useInView({
    triggerOnce: true,
    skip: priority,
    rootMargin: "100px", // Start loading earlier
  });

  const shouldLoad = priority || inView;

  // Detect best format support
  const bestFormat = getBestFormat();

  // Generate optimized URLs with best format
  const optimizedUrl = getOptimizedImageUrl(storagePath, {
    width: 1200,
    quality: 85,
    format: bestFormat === 'avif' ? 'avif' : 'webp',
  });

  // Generate responsive srcSet for multiple sizes
  const srcSet = getResponsiveSrcSet(storagePath, [640, 750, 828, 1080, 1200, 1920], 'jpeg');

  // AVIF srcSet (best compression, modern browsers)
  const avifSrcSet = getResponsiveSrcSet(storagePath, [640, 750, 828, 1080, 1200, 1920], 'avif');

  // WebP srcSet (fallback)
  const webpSrcSet = getResponsiveSrcSet(storagePath, [640, 750, 828, 1080, 1200, 1920], 'webp');

  // Tiny blur placeholder (40px, quality 10)
  const blurUrl = getBlurPlaceholder(storagePath);

  // Preload blur placeholder
  useEffect(() => {
    if (!shouldLoad) return;
    
    const img = new Image();
    img.src = blurUrl;
    img.onload = () => setBlurLoaded(true);
  }, [shouldLoad, blurUrl]);

  return (
    <div 
      ref={ref} 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: aspectRatio || 'auto' }}
    >
      {/* Blur placeholder (progressive loading) */}
      {!isLoading && blurLoaded && (
        <img
          src={blurUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 transition-opacity duration-500"
          style={{
            opacity: isLoading ? 1 : 0,
          }}
        />
      )}

      {/* Loading skeleton */}
      {isLoading && !blurLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="w-12 h-12" />
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Main image with modern formats */}
      {shouldLoad && !hasError && (
        <picture>
          {/* AVIF format (best compression ~50% smaller than JPEG) */}
          <source
            type="image/avif"
            srcSet={avifSrcSet}
            sizes={sizes}
          />
          
          {/* WebP format (good compression, 96%+ browser support) */}
          <source
            type="image/webp"
            srcSet={webpSrcSet}
            sizes={sizes}
          />
          
          {/* JPEG fallback (universal support) */}
          <img
            src={optimizedUrl}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            loading={priority ? "eager" : "lazy"}
            decoding={priority ? "sync" : "async"}
            fetchPriority={priority ? "high" : "auto"}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            onClick={onClick}
            className={`relative w-full h-full object-cover transition-opacity duration-500 ${
              isLoading ? "opacity-0" : "opacity-100"
            } ${onClick ? "cursor-pointer hover:scale-105 transition-transform" : ""}`}
            style={{
              willChange: isLoading ? 'opacity' : 'auto',
            }}
          />
        </picture>
      )}
    </div>
  );
};
