import { useState } from "react";
import { useInView } from "react-intersection-observer";
import { getOptimizedImageUrl, getBlurPlaceholder, getPublicImageUrl, getStorageRelativePath } from "@/lib/supabase-images";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import { createSignedUrl } from "@/lib/storage-utils";

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
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const MAX_RETRIES = 2;
  
  // Lazy load images unless priority
  const { ref, inView } = useInView({
    triggerOnce: true,
    skip: priority,
    rootMargin: "50px",
  });

  const shouldLoad = priority || inView;

  // Generate optimized URLs
  const webpUrl = getOptimizedImageUrl(storagePath, {
    format: 'webp',
    quality: 85,
    resize: 'contain',
  });

  const avifUrl = getOptimizedImageUrl(storagePath, {
    format: 'avif',
    quality: 85,
    resize: 'contain',
  });

  const jpegUrl = getOptimizedImageUrl(storagePath, {
    format: 'jpeg',
    quality: 85,
    resize: 'contain',
  });

  const blurUrl = getBlurPlaceholder(storagePath);
  const publicUrl = getPublicImageUrl(storagePath);
  const storageRelativePath = getStorageRelativePath(storagePath);
  
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
    <div ref={ref} className={`relative ${className}`} onClick={onClick}>
      {/* Blur placeholder */}
      {isLoading && (
        <img
          src={blurUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover blur-xl scale-110 ${className}`}
          aria-hidden="true"
        />
      )}

      {/* Main optimized image with modern formats, with robust fallbacks */}
      {fallbackUrl ? (
        <img
          key={`fallback-${retryCount}`}
          src={fallbackUrl}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setIsLoading(false)}
          onError={async () => {
            console.warn('Fallback image failed to load:', { fallbackUrl });
            // If public URL failed, try signed URL
            if (fallbackUrl === publicUrl) {
              const signed = await createSignedUrl('generated-content', storageRelativePath);
              if (signed) {
                console.warn('Using signed URL fallback for image');
                setFallbackUrl(signed);
                setIsLoading(true);
                return;
              }
            }
            setHasError(true);
          }}
        />
      ) : (
        <picture>
          <source srcSet={avifUrl} type="image/avif" />
          <source srcSet={webpUrl} type="image/webp" />
          <source srcSet={jpegUrl} type="image/jpeg" />
          <img
            key={retryCount}
            src={jpegUrl}
            alt={alt}
            className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            loading={priority ? "eager" : "lazy"}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              console.error('Optimized image load failed, will retry/fallback:', {
                storagePath,
                webpUrl,
                jpegUrl,
                retryCount
              });
              
              if (retryCount < MAX_RETRIES) {
                // Retry with a slight delay
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                  setIsLoading(true);
                }, 1000 * (retryCount + 1));
              } else {
                console.warn('Falling back to public object URL for image');
                setFallbackUrl(publicUrl);
                setIsLoading(true);
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
