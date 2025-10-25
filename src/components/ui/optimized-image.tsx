import { ImgHTMLAttributes, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  ...props
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate responsive srcSet
  const srcSet = [640, 750, 828, 1080, 1200, 1920]
    .map(w => `${src}?w=${w}&q=80 ${w}w`)
    .join(', ');

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio: width && height ? `${width} / ${height}` : undefined }}
    >
      {isLoading && (
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
      <picture>
        {/* WebP for modern browsers */}
        <source 
          type="image/webp"
          srcSet={srcSet}
          sizes={sizes}
        />
        {/* Fallback to original */}
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
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
          {...props}
        />
      </picture>
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs">
          Failed to load image
        </div>
      )}
    </div>
  );
};
