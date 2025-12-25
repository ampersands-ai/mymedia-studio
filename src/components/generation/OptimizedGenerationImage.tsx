import { useState, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { getOptimizedImageUrl, getBlurPlaceholder, getPublicImageUrl, getStorageRelativePath } from "@/lib/supabase-images";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import { createSignedUrl } from "@/lib/storage-utils";
import { logger } from "@/lib/logger";

const imageLogger = logger.child({ component: 'OptimizedGenerationImage' });

interface OptimizedGenerationImageProps {
  storagePath: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  onClick?: () => void;
}

/**
 * Optimized image component for generated content using direct public URLs
 * with Supabase image transformations (WebP/AVIF, responsive sizes, blur placeholder)
 */
export const OptimizedGenerationImage = ({
  storagePath,
  alt = "Generated content",
  className = "",
  priority = false,
  onClick,
}: OptimizedGenerationImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  // Lazy load images unless priority
  const { ref, inView } = useInView({
    triggerOnce: true,
    skip: priority,
    rootMargin: "50px",
  });

  const shouldLoad = priority || inView;

  // Generate optimized URLs - memoized to prevent excessive recalculation
  const webpUrl = useMemo(() => getOptimizedImageUrl(storagePath, {
    format: 'webp',
    quality: 85,
    resize: 'contain',
  }), [storagePath]);

  const avifUrl = useMemo(() => getOptimizedImageUrl(storagePath, {
    format: 'avif',
    quality: 85,
    resize: 'contain',
  }), [storagePath]);

  const jpegUrl = useMemo(() => getOptimizedImageUrl(storagePath, {
    format: 'jpeg',
    quality: 85,
    resize: 'contain',
  }), [storagePath]);

  const blurUrl = useMemo(() => getBlurPlaceholder(storagePath), [storagePath]);
  const publicUrl = useMemo(() => getPublicImageUrl(storagePath), [storagePath]);
  const storageRelativePath = useMemo(() => getStorageRelativePath(storagePath), [storagePath]);
  
  // Error fallback
  if (hasError) {
    return (
      <div ref={ref} className={`${className} flex items-center justify-center bg-muted`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  // Show skeleton while not in view
  if (!shouldLoad) {
    return (
      <div ref={ref}>
        <Skeleton className={className} />
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative w-full max-h-[70vh] ${className}`} onClick={onClick}>
      {/* Blur placeholder */}
      {isLoading && (
        <img
          src={blurUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain blur-xl scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main optimized image with modern formats, with robust fallbacks */}
      {fallbackUrl ? (
        <img
          key="fallback"
          src={fallbackUrl}
          alt={alt}
          className={`w-full h-auto max-h-[70vh] object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setIsLoading(false)}
          onError={async () => {
            imageLogger.warn('Fallback image failed to load', { 
              fallbackUrl: fallbackUrl?.substring(0, 50),
              storagePath: storagePath.substring(0, 50) 
            });
            // If public URL failed, try signed URL
            if (fallbackUrl === publicUrl) {
              const signed = await createSignedUrl('generated-content', storageRelativePath);
              if (signed) {
                imageLogger.info('Using signed URL fallback', { 
                  storagePath: storagePath.substring(0, 50) 
                });
                setFallbackUrl(signed);
                setIsLoading(true);
                return;
              }
            }
            imageLogger.error('All image fallback URLs failed', new Error('Image load error'), { 
              storagePath: storagePath.substring(0, 50) 
            });
            setHasError(true);
          }}
        />
      ) : (
        <picture>
          <source srcSet={avifUrl} type="image/avif" />
          <source srcSet={webpUrl} type="image/webp" />
          <source srcSet={jpegUrl} type="image/jpeg" />
          <img
            key="optimized"
            src={jpegUrl}
            alt={alt}
            className={`w-full h-auto max-h-[70vh] object-contain ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => {
              setIsLoading(false);
            }}
            onError={async () => {
              imageLogger.warn('Optimized image load failed, trying fallback', {
                storagePath: storagePath.substring(0, 50),
                jpegUrl: jpegUrl.substring(0, 50)
              });

              // Immediately try public URL (no retry delay)
              if (!fallbackUrl) {
                imageLogger.debug('Falling back to public URL', {
                  storagePath: storagePath.substring(0, 50)
                });
                setFallbackUrl(publicUrl);
                setIsLoading(true);
              } else if (fallbackUrl === publicUrl) {
                // If public URL also failed, try signed URL
                const signed = await createSignedUrl('generated-content', storageRelativePath);
                if (signed) {
                  imageLogger.info('Using signed URL as final fallback', { 
                    storagePath: storagePath.substring(0, 50) 
                  });
                  setFallbackUrl(signed);
                  setIsLoading(true);
                } else {
                  imageLogger.error('All image load attempts failed', new Error('Image load error'), { 
                    storagePath: storagePath.substring(0, 50) 
                  });
                  setHasError(true);
                }
              } else {
                imageLogger.error('Unexpected fallback state', new Error('Image load error'), { 
                  storagePath: storagePath.substring(0, 50),
                  fallbackUrl: fallbackUrl?.substring(0, 50) 
                });
                setHasError(true);
              }
            }}
          />
        </picture>
      )}
 
      {/* Loading skeleton overlay */}
      {isLoading && <Skeleton className="absolute inset-0" />}
    </div>
  );
};
