import { useState, useEffect } from "react";
import { OptimizedGenerationImage } from "./OptimizedGenerationImage";
import { AudioWaveform } from "./AudioWaveform";
import { Video, Music, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNativeShare } from "@/hooks/useNativeShare";
import { useNativeDownload } from "@/hooks/useNativeDownload";
import { triggerHaptic } from "@/utils/capacitor-utils";
import { useVideoUrl } from "@/hooks/media";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedVideoUrl, getOptimizedAudioUrl, detectConnectionSpeed } from "@/lib/supabase-videos";
import { useVideoPreload } from "@/hooks/useVideoPreload";
import { extractPosterFrame, PosterCache } from "@/utils/video-poster";
import { logger } from "@/lib/logger";

const previewLogger = logger.child({ component: 'OptimizedGenerationPreview' });

interface OptimizedGenerationPreviewProps {
  storagePath: string | null;
  contentType: string;
  className?: string;
  showActions?: boolean;
}

/**
 * Optimized preview component for images using direct public URLs
 * For videos and audio, uses existing logic with streaming/signed URLs
 */
export const OptimizedGenerationPreview = ({
  storagePath,
  contentType,
  className,
  showActions = true
}: OptimizedGenerationPreviewProps) => {
  // Normalize contentType to basic media types (image, video, audio)
  const normalizeContentType = (type: string): 'image' | 'video' | 'audio' => {
    const normalized = type.toLowerCase();
    // Video types
    if (normalized.includes('video') || normalized === 'image_to_video' || normalized === 'prompt_to_video') {
      return 'video';
    }
    // Audio types
    if (normalized.includes('audio') || normalized === 'prompt_to_audio') {
      return 'audio';
    }
    // Image types (default for image_editing, prompt_to_image, etc.)
    return 'image';
  };

  // Infer type from file extension as fallback
  const inferTypeFromExtension = (path: string): 'image' | 'video' | 'audio' => {
    const ext = (path.split('.').pop() || '').toLowerCase();
    if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
    return 'image';
  };

  // Use contentType first (normalized), fall back to file extension
  const effectiveType = contentType
    ? normalizeContentType(contentType)
    : (storagePath ? inferTypeFromExtension(storagePath) : 'image');

  // All hooks must be called before any conditional returns
  const { shareFile, canShare } = useNativeShare();
  const { downloadFile } = useNativeDownload();
  const [videoError, setVideoError] = useState(false);
  const [audioError] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  // Use direct public URLs for videos/audio (CDN-optimized, no signed URL delay)
  // Fallback to signed URL only if public URL fails
  const videoUrl = effectiveType === "video" && storagePath
    ? getOptimizedVideoUrl(storagePath, 'generated-content')
    : null;

  const audioUrl = effectiveType === "audio" && storagePath
    ? getOptimizedAudioUrl(storagePath, 'generated-content')
    : null;

  // Smart video preloading based on connection speed
  const { ref: preloadRef, isPreloaded } = useVideoPreload({
    src: videoUrl || '',
    enabled: effectiveType === "video" && !!videoUrl,
  });

  // Use video URL hook for fallback with signed strategy
  const { url: fallbackSignedUrl } = useVideoUrl(
    (effectiveType === "video" || effectiveType === "audio") && (videoError || audioError) && storagePath ? storagePath : null,
    { strategy: 'signed-short', bucket: 'generated-content' }
  );

  // Detect connection speed on mount
  useEffect(() => {
    const speed = detectConnectionSpeed();
    setConnectionSpeed(speed);
  }, []);

  // Extract poster frame for videos (with caching)
  useEffect(() => {
    if (effectiveType !== "video" || !videoUrl) {
      return;
    }

    // Clear old cache entry first to prevent showing stale poster
    PosterCache.remove(videoUrl);

    // Extract fresh poster frame (only for fast connections to save bandwidth)
    if (connectionSpeed === 'fast') {
      extractPosterFrame(videoUrl, 0.5).then(posterDataUrl => {
        if (posterDataUrl) {
          setPosterUrl(posterDataUrl);
          PosterCache.set(videoUrl, posterDataUrl);
          previewLogger.debug('Poster frame extracted', { videoUrl: videoUrl.substring(0, 50) });
        }
      }).catch(error => {
        previewLogger.warn('Failed to extract poster frame', {
          error: (error as Error).message,
          videoUrl: videoUrl.substring(0, 50)
        });
      });
    }
  }, [videoUrl, contentType, connectionSpeed, effectiveType]);

  // Handle null storage path
  if (!storagePath) {
    return (
      <div className={cn("flex items-center justify-center bg-muted rounded-lg min-h-[200px]", className)}>
        {effectiveType === "video" ? (
          <Video className="h-8 w-8 text-muted-foreground" />
        ) : effectiveType === "audio" ? (
          <Music className="h-8 w-8 text-muted-foreground" />
        ) : (
          <div className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
    );
  }

  const handleShare = async () => {
    try {
      let shareUrl: string;
      
      // Use direct URLs for sharing (faster, CDN-cached)
      if (contentType === "audio" && audioUrl) {
        shareUrl = audioUrl;
      } else if (contentType === "video" && videoUrl) {
        shareUrl = videoUrl;
      } else {
        // Fallback to creating a signed URL on demand
        const { data } = await supabase.storage
          .from('generated-content')
          .createSignedUrl(storagePath, 14400);
        
        if (!data?.signedUrl) {
          toast.error('Failed to create share link');
          return;
        }
        shareUrl = data.signedUrl;
      }
      
      await shareFile(shareUrl, 'Check out my AI creation!');
      await triggerHaptic('light');
      previewLogger.info('Content shared successfully', { contentType });
    } catch (error) {
      previewLogger.error('Share failed', error as Error, { contentType, storagePath });
      toast.error('Failed to share');
    }
  };

  const handleDownload = async () => {
    try {
      await triggerHaptic('light');
      
      let downloadUrl: string;
      
      // Use direct URLs for download (faster)
      if (contentType === "audio" && audioUrl) {
        downloadUrl = audioUrl;
      } else if (contentType === "video" && videoUrl) {
        downloadUrl = videoUrl;
      } else {
        // Create signed URL for download (short expiry for security)
        const { data } = await supabase.storage
          .from('generated-content')
          .createSignedUrl(storagePath, 60);
        
        if (!data?.signedUrl) {
          toast.error('Failed to create download link');
          return;
        }
        downloadUrl = data.signedUrl;
      }
      
      const ext = storagePath?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
      let filename: string;
      
      if (effectiveType === "video") {
        filename = `video-${Date.now()}.${ext || 'mp4'}`;
      } else if (effectiveType === "audio") {
        filename = `audio-${Date.now()}.${ext || 'mp3'}`;
      } else {
        filename = `image-${Date.now()}.${ext || 'jpg'}`;
      }
      
      await downloadFile(downloadUrl, filename);
      previewLogger.info('Content downloaded successfully', { contentType: effectiveType, filename });
    } catch (error) {
      previewLogger.error('Download failed', error as Error, { contentType, storagePath });
      toast.error('Download failed');
    }
  };

  // For images - use optimized component with direct public URLs
  if (effectiveType === "image") {
    return (
      <div className="relative group">
        <OptimizedGenerationImage
          storagePath={storagePath}
          alt="Generated content"
          className={cn(className, "animate-fade-in")}
          priority={true}
        />
        {/* Action buttons overlay (only show if not in grid) */}
        {showActions && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
            {canShare && (
              <Button
                variant="secondary"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="h-8 w-8 backdrop-blur-sm"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="h-8 w-8 backdrop-blur-sm"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // For audio - show waveform visualization
  if (effectiveType === "audio") {
    if (!audioUrl || !storagePath) {
      return (
        <div className={`${className} flex flex-col items-center justify-center bg-muted gap-3`}>
          <Music className="h-12 w-12 text-gray-600 dark:text-gray-400" />
          <p className="text-sm text-muted-foreground">Audio Preview Unavailable</p>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Audio
          </Button>
        </div>
      );
    }

    return (
      <div className="p-6 bg-gradient-to-br from-background to-muted/30 rounded-lg border">
        <AudioWaveform 
          audioUrl={audioError && fallbackSignedUrl ? fallbackSignedUrl : audioUrl} 
        />
      </div>
    );
  }

  // For video - use direct public URL with CDN
  if (effectiveType === "video") {
    if (!videoUrl || !storagePath) {
      return (
        <div className={`${className} flex flex-col items-center justify-center bg-muted gap-3`}>
          <Video className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Video Preview Unavailable</p>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Video
          </Button>
        </div>
      );
    }
    
    return (
      <div ref={preloadRef} className="relative group">
        <video
          key={videoUrl}
          src={videoError && fallbackSignedUrl ? fallbackSignedUrl : videoUrl}
          poster={posterUrl || undefined}
          className={cn(className, "animate-fade-in")}
          controls
          preload={connectionSpeed === 'slow' ? 'none' : 'metadata'}
          playsInline
          muted
          onError={() => {
            if (!videoError) {
              previewLogger.warn('Video load failed, trying fallback URL', { 
                storagePath,
                videoUrl: videoUrl?.substring(0, 50) 
              });
              setVideoError(true);
            } else {
              previewLogger.error('Video failed to load with fallback', new Error('Video playback error'), { 
                storagePath,
                fallbackUrl: fallbackSignedUrl?.substring(0, 50) 
              });
            }
          }}
        />
        {/* Show preload indicator for fast connections */}
        {isPreloaded && connectionSpeed === 'fast' && (
          <div className="absolute top-2 left-2 text-xs bg-green-500/80 text-white px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            ⚡ Preloaded
          </div>
        )}
        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity duration-200">
          {canShare && (
            <Button
              variant="secondary"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="h-8 w-8 backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="h-8 w-8 backdrop-blur-sm"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
