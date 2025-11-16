import { ImgHTMLAttributes, useState, useRef } from "react";
import { useInView } from 'react-intersection-observer';
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";
import { getOptimizedImageUrl, getResponsiveSrcSet, getBlurPlaceholder } from '@/lib/supabase-images';

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
  isSupabaseImage?: boolean; // Set to true if src is a Supabase bucket path
}

export const OptimizedImage = ({
  src,
  alt,
  width = 1200,
  height,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  isSupabaseImage = false,
  ...props
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    triggerOnce: true,
    rootMargin: '200px',
    skip: priority
  });

  // Update visibility when in view
  if (inView && !isVisible) {
    setIsVisible(true);
  }

  // Generate responsive srcSet and optimized URLs
  const shouldLoad = priority || isVisible;
  
  let webpUrl = src;
  let avifUrl = src;
  let jpegUrl = src;
  let placeholderUrl = src;
  let srcSet = '';

  if (isSupabaseImage) {
    // Use Supabase transformations
    webpUrl = getOptimizedImageUrl(src, { width, format: 'webp' });
    avifUrl = getOptimizedImageUrl(src, { width, format: 'avif' });
    jpegUrl = getOptimizedImageUrl(src, { width, format: 'jpeg' });
    placeholderUrl = getBlurPlaceholder(src);
    srcSet = getResponsiveSrcSet(src);
  } else {
    // Generate standard srcSet for external images
    srcSet = [640, 750, 828, 1080, 1200, 1920]
      .map(w => `${src}?w=${w}&q=80 ${w}w`)
      .join(', ');
  }

  return (
    <div
      ref={inViewRef}
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio: width && height ? `${width} / ${height}` : undefined }}
    >
      {/* Blur placeholder */}
      {isSupabaseImage && (
        <img
          src={placeholderUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: 'blur(10px)',
            transform: 'scale(1.1)',
            opacity: isLoading ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Loading skeleton */}
      {isLoading && !isSupabaseImage && (
        <Skeleton className="absolute inset-0 w-full h-full">
          <svg 
            width="40" 
            height="40" 
            viewBox="0 0 40 40"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
          >
            <path 
              d="M5 5h30v30H5z" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            />
            <circle cx="15" cy="15" r="3" fill="currentColor" />
            <path d="M5 25l10-10 5 5 15-15" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </Skeleton>
      )}

      {shouldLoad && (
        <picture>
          {/* AVIF for best compression (modern browsers) */}
          {isSupabaseImage && (
            <source type="image/avif" srcSet={avifUrl} />
          )}
          
          {/* WebP fallback */}
          <source
            type="image/webp"
            srcSet={isSupabaseImage ? webpUrl : srcSet}
            sizes={sizes}
          />
          
          {/* JPEG fallback for universal support */}
          <img
            {...props}
            ref={imgRef}
            src={isSupabaseImage ? jpegUrl : src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100",
              hasError && "hidden"
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </picture>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs">
          Failed to load image
        </div>
      )}
    </div>
  );
};
