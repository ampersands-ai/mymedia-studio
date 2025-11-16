import { useRef, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Video as VideoIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useVideoUrl } from '@/hooks/media';

interface OptimizedVideoPreviewProps {
  storagePath: string | null;
  outputUrl?: string | null;
  className?: string;
  showControls?: boolean;
  playOnHover?: boolean;
  priority?: boolean;
  isExternalUrl?: boolean;
}

/**
 * OptimizedVideoPreview - Lazy-loaded video component with Intersection Observer
 * Features:
 * - Only loads video when near viewport
 * - Preload="none" until visible
 * - Play on hover support
 * - Skeleton placeholder
 */
export const OptimizedVideoPreview = ({
  storagePath,
  outputUrl,
  className = '',
  showControls = false,
  playOnHover = false,
  priority = false,
  isExternalUrl = false,
}: OptimizedVideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  // Lazy load video unless priority
  const { ref, inView } = useInView({
    triggerOnce: true,
    skip: priority,
    rootMargin: '200px',
  });

  const shouldLoad = priority || inView;

  // Build source for signing
  const sourceForSigning = storagePath || outputUrl;

  // Use video URL hook for Supabase storage
  const { url: videoSignedUrl, isLoading: isLoadingVideoUrl } = useVideoUrl(
    !isExternalUrl ? sourceForSigning : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  // Use external URL directly if not in Supabase Storage
  const finalVideoUrl = isExternalUrl ? sourceForSigning : videoSignedUrl;

  // Handle mouse interactions for hover play
  const handleMouseEnter = () => {
    if (playOnHover && videoRef.current && !showControls) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && videoRef.current && !showControls) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  // Show skeleton while not loaded
  if (!shouldLoad) {
    return (
      <div ref={ref} className={className}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  // Show loading state
  if (isLoadingVideoUrl || !finalVideoUrl) {
    return (
      <div ref={ref} className={`${className} flex items-center justify-center bg-muted`}>
        <VideoIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  // Show error state
  if (videoError) {
    return (
      <div ref={ref} className={`${className} flex items-center justify-center bg-muted`}>
        <VideoIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={finalVideoUrl || undefined}
      className={className}
      preload={shouldLoad ? "metadata" : "none"}
      controls={showControls}
      playsInline
      muted={!showControls}
      loop={playOnHover}
      {...(!isExternalUrl ? { crossOrigin: 'anonymous' } : {})}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onError={() => setVideoError(true)}
    />
  );
};
