import { useRef, useState } from "react";
import { Video, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoUrl } from "@/hooks/media";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import type { Generation } from "../hooks/useGenerationHistory";

interface VideoPlayerProps {
  generation: Generation;
  className?: string;
  showControls?: boolean;
  playOnHover?: boolean;
}

export const VideoPlayer = ({
  generation,
  className,
  showControls = false,
  playOnHover = false
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setIsPlaying] = useState(false);
  const [, setVideoError] = useState(false);

  // Build a source and get video URL using new architecture
  const sourceForSigning = generation.storage_path
    ? generation.storage_path
    : (generation.is_video_job ? generation.output_url : null);

  // Detect external vs Supabase URLs (e.g., JSON2Video URLs)
  const isExternalUrl = sourceForSigning &&
    !sourceForSigning.startsWith('storyboard-videos/') &&
    !sourceForSigning.startsWith('faceless-videos/') &&
    /^https?:\/\//.test(sourceForSigning);

  const { url: videoSignedUrl, isLoading: isLoadingVideoUrl } = useVideoUrl(
    !isExternalUrl ? sourceForSigning : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  // Use external URL directly if not in Supabase Storage
  const finalVideoUrl = isExternalUrl ? sourceForSigning : videoSignedUrl;

  if (isLoadingVideoUrl || !finalVideoUrl) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-2 p-4`}>
        <Video className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground text-center">Video Preview Unavailable</p>
        <Button
          size="sm"
          variant="outline"
          onClick={async (e) => {
            e.stopPropagation();
            toast.loading('Preparing your download...', { id: 'video-download' });
            try {
              const urlToFetch = finalVideoUrl
                || (generation.is_video_job ? generation.output_url : null)
                || null;

              if (!urlToFetch) {
                throw new Error('No video URL available for download');
              }

              const response = await fetch(urlToFetch);
              if (!response.ok) throw new Error('Download failed');

              const blob = await response.blob();
              const blobUrl = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = blobUrl;
              a.download = `artifio-video-${Date.now()}.mp4`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(blobUrl);
              document.body.removeChild(a);
              toast.success('Download started successfully!', { id: 'video-download' });
            } catch (error) {
              logger.error('Video download error', error as Error, {
                component: 'VideoPlayer',
                operation: 'handleVideoDownload'
              });
              toast.error('Failed to download', { id: 'video-download' });
            }
          }}
        >
          <Download className="h-3 w-3 mr-1" />
          Download Video
        </Button>
      </div>
    );
  }

  const handleMouseEnter = () => {
    if (playOnHover && videoRef.current) {
      videoRef.current.play().catch(() => { });
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (playOnHover && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <video
      ref={videoRef}
      src={finalVideoUrl || undefined}
      className={className}
      preload="metadata"
      controls={showControls}
      playsInline
      muted={!showControls}
      loop={playOnHover}
      {...(!isExternalUrl ? { crossOrigin: 'anonymous' } : {})}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onError={() => {
        logger.error('Video playback error', new Error('Video failed to load'), {
          component: 'VideoPlayer',
          operation: 'videoPlayback',
          videoUrl: finalVideoUrl?.substring(0, 100)
        });
        setVideoError(true);
      }}
      onLoadedMetadata={() => logger.debug('Video loaded successfully', {
        component: 'VideoPlayer',
        operation: 'videoPlayback',
        videoUrl: finalVideoUrl?.substring(0, 100)
      })}
    />
  );
};
