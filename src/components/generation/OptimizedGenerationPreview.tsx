import { useState } from "react";
import { OptimizedGenerationImage } from "./OptimizedGenerationImage";
import { Video, Music, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNativeShare } from "@/hooks/useNativeShare";
import { useNativeDownload } from "@/hooks/useNativeDownload";
import { triggerHaptic } from "@/utils/capacitor-utils";
import { useIsMobile } from "@/hooks/use-mobile";

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

  const handleShare = async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${storagePath}`;
    await shareFile(publicUrl, 'Check out my AI creation!');
    await triggerHaptic('light');
  };

  const handleDownload = async () => {
    try {
      await triggerHaptic('light');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${storagePath}`;
      
      const ext = storagePath?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
      let filename: string;
      
      if (contentType === "video") {
        filename = `video-${Date.now()}.${ext || 'mp4'}`;
      } else if (contentType === "audio") {
        filename = `audio-${Date.now()}.${ext || 'mp3'}`;
      } else {
        filename = `image-${Date.now()}.${ext || 'jpg'}`;
      }
      
      await downloadFile(publicUrl, filename);
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

  // For audio - show audio player
  if (contentType === "audio") {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/generated-content/${storagePath}`;

    if (audioError || !storagePath) {
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
            src={publicUrl}
            className="w-full"
            controls
            preload="metadata"
            onError={() => setAudioError(true)}
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

  // For video - use streaming edge function (existing logic)
  if (contentType === "video") {
    const isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-content?bucket=generated-content&path=${encodeURIComponent(storagePath)}`;

    if (videoError || !storagePath) {
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
      <div className="relative group">
        <video
          src={streamUrl}
          className={cn(className, "animate-fade-in")}
          controls
          preload="metadata"
          playsInline
          muted
          onError={() => setVideoError(true)}
        />
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
