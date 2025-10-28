import { useState, useEffect } from "react";
import { OptimizedGenerationImage } from "./OptimizedGenerationImage";
import { Video, Music, Download, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNativeShare } from "@/hooks/useNativeShare";
import { useNativeDownload } from "@/hooks/useNativeDownload";
import { triggerHaptic } from "@/utils/capacitor-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedVideoUrl, getOptimizedAudioUrl, detectConnectionSpeed } from "@/lib/supabase-videos";
import { useVideoPreload } from "@/hooks/useVideoPreload";
import { extractPosterFrame, PosterCache } from "@/utils/video-poster";

interface OptimizedGenerationPreviewProps {
  storagePath: string;
  contentType: string;
  className?: string;
}

/**
 * Optimized preview component for images using direct public URLs
 * For videos and audio, uses existing logic with streaming/signed URLs
 */
export const OptimizedGenerationPreview = ({ 
  storagePath, 
  contentType, 
  className 
}: OptimizedGenerationPreviewProps) => {
  const { shareFile, canShare } = useNativeShare();
  const { downloadFile } = useNativeDownload();
  const isMobile = useIsMobile();
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast'>('medium');

  // Use direct public URLs for videos/audio (CDN-optimized, no signed URL delay)
  // Fallback to signed URL only if public URL fails
  const videoUrl = contentType === "video" && storagePath 
    ? getOptimizedVideoUrl(storagePath, 'generated-content')
    : null;
  
  const audioUrl = contentType === "audio" && storagePath
    ? getOptimizedAudioUrl(storagePath, 'generated-content')
    : null;

  // Smart video preloading based on connection speed
  const { ref: preloadRef, isPreloaded } = useVideoPreload({
    src: videoUrl || '',
    enabled: contentType === "video" && !!videoUrl,
  });

  // Keep signed URL hook for fallback only (not used in primary render)
  const { signedUrl: fallbackSignedUrl } = useSignedUrl(
    (contentType === "video" || contentType === "audio") && videoError || audioError ? storagePath : null,
    'generated-content'
  );

  // Detect connection speed on mount
  useEffect(() => {
    const speed = detectConnectionSpeed();
    setConnectionSpeed(speed);
  }, []);

  // Extract poster frame for videos (with caching)
  useEffect(() => {
    if (contentType !== "video" || !videoUrl) {
      return;
    }

    // Check cache first
    const cachedPoster = PosterCache.get(videoUrl);
    if (cachedPoster) {
      setPosterUrl(cachedPoster);
      return;
    }

    // Extract poster frame (only for fast connections to save bandwidth)
    if (connectionSpeed === 'fast') {
      extractPosterFrame(videoUrl, 0.5).then(posterDataUrl => {
        if (posterDataUrl) {
          setPosterUrl(posterDataUrl);
          PosterCache.set(videoUrl, posterDataUrl);
        }
      }).catch(error => {
        console.warn('Failed to extract poster frame:', error);
      });
    }
  }, [videoUrl, contentType, connectionSpeed]);

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
    } catch (error) {
      console.error('Share failed:', error);
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
      
      if (contentType === "video") {
        filename = `video-${Date.now()}.${ext || 'mp4'}`;
      } else if (contentType === "audio") {
        filename = `audio-${Date.now()}.${ext || 'mp3'}`;
      } else {
        filename = `image-${Date.now()}.${ext || 'jpg'}`;
      }
      
      await downloadFile(downloadUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };

  // For images - use optimized component with direct public URLs
  if (contentType === "image") {
    return (
      <div className="relative group">
        <OptimizedGenerationImage
          storagePath={storagePath}
          alt="Generated content"
          className={cn(className, "animate-fade-in")}
        />
        {/* Action buttons overlay */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {canShare && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // For audio - show audio player with direct public URL
  if (contentType === "audio") {
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
      <div className="relative group">
        <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-background to-muted/30 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Music className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Audio File</p>
              <p className="text-xs text-muted-foreground">Generated audio content</p>
            </div>
          </div>
          
          <audio
            src={audioUrl}
            className="w-full"
            controls
            preload="metadata"
            onError={() => {
              console.warn('Audio load failed, trying fallback URL');
              setAudioError(true);
            }}
          />
          
          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            {canShare && (
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // For video - use direct public URL with CDN
  if (contentType === "video") {
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
          src={videoError && fallbackSignedUrl ? fallbackSignedUrl : videoUrl}
          poster={posterUrl || undefined}
          className={cn(className, "animate-fade-in")}
          controls
          preload={connectionSpeed === 'slow' ? 'none' : 'metadata'}
          playsInline
          muted
          onError={(e) => {
            console.warn('Video load failed, trying fallback URL');
            if (!videoError) {
              setVideoError(true);
            } else {
              console.error('Video failed to load even with fallback');
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
        <div className={cn(
          "absolute top-2 right-2 flex gap-2 transition-opacity",
          isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {canShare && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            className="h-8 w-8"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
