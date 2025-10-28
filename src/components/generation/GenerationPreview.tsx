import { useState, useRef } from "react";
import { useVideoUrl, useImageUrl, useAudioUrl } from "@/hooks/media";
import { ImageIcon, Video, Download, Share2, Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNativeShare } from "@/hooks/useNativeShare";
import { useNativeDownload } from "@/hooks/useNativeDownload";
import { triggerHaptic } from "@/utils/capacitor-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface GenerationPreviewProps {
  storagePath: string;
  contentType: string;
  className?: string;
}

export const GenerationPreview = ({ storagePath, contentType, className }: GenerationPreviewProps) => {
  // Use content-type-specific hooks from new architecture
  const { url: imageUrl, isLoading: imageLoading, error: imageError } = useImageUrl(
    contentType === 'image' ? storagePath : null,
    { strategy: 'public-cdn', bucket: 'generated-content' }
  );
  
  const { url: videoUrl, isLoading: videoLoading, error: videoError } = useVideoUrl(
    contentType === 'video' ? storagePath : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  
  const { url: audioUrl, isLoading: audioLoading, error: audioError } = useAudioUrl(
    contentType === 'audio' ? storagePath : null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );
  
  // Combine states for backward compatibility
  const signedUrl = contentType === 'image' ? imageUrl : contentType === 'video' ? videoUrl : audioUrl;
  const isLoading = imageLoading || videoLoading || audioLoading;
  const error = imageError || videoError || audioError;
  
  const { shareFile, canShare } = useNativeShare();
  const { downloadFile, isNative } = useNativeDownload();
  const isMobile = useIsMobile();
  const [videoPlaybackError, setVideoPlaybackError] = useState(false);
  const [imageDisplayError, setImageDisplayError] = useState(false);
  const [audioPlaybackError, setAudioPlaybackError] = useState(false);
  
  // For video thumbnails using new architecture
  const thumbPath = contentType === 'video' && storagePath ? storagePath.replace(/\.[^/.]+$/, '.jpg') : null;
  const { url: thumbUrl } = useImageUrl(thumbPath, { strategy: 'public-direct' });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);
  
  // Detect iOS specifically
  const isIOS = typeof navigator !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  const handleShare = async () => {
    if (!signedUrl) return;
    await shareFile(signedUrl, 'Check out my AI creation!');
    await triggerHaptic('light');
  };

  const handleDownload = async () => {
    if (!signedUrl) return;
    
    try {
      await triggerHaptic('light');
      
      // Derive extension from storagePath for correct file type
      const ext = storagePath?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
      let filename: string;
      
      if (contentType === "video") {
        filename = `video-${Date.now()}.${ext || 'mp4'}`;
      } else if (contentType === "audio") {
        filename = `audio-${Date.now()}.${ext || 'mp3'}`;
      } else {
        filename = `image-${Date.now()}.${ext || 'jpg'}`;
      }
      
      await downloadFile(signedUrl, filename);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Download failed');
    }
  };
  
  // Generate thumbnail from video frame
  const generateThumbnail = async () => {
    if (!videoRef.current || thumbnailGenerated || !thumbPath) return;
    
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and upload
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        
        const response = await fetch(`${supabaseUrl}/storage/v1/object/generated-content/${thumbPath}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'image/jpeg',
          },
          body: blob,
        });
        
        if (response.ok) {
          setThumbnailGenerated(true);
          console.log('Thumbnail generated successfully');
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        {contentType === "video" ? (
          <Video className="h-8 w-8 text-muted-foreground animate-pulse" />
        ) : contentType === "audio" ? (
          <Music className="h-8 w-8 text-gray-600 dark:text-gray-400 animate-pulse" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
        )}
      </div>
    );
  }

  // Show download fallback for videos only when playback fails
  if (contentType === "video" && (videoPlaybackError || !signedUrl)) {
    return (
      <div className={`${className} flex flex-col items-center justify-center bg-muted gap-3`}>
        <Video className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Video Preview Unavailable</p>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              const { data } = await supabase.storage
                .from('generated-content')
                .createSignedUrl(storagePath, 60);
              if (data?.signedUrl) {
                const response = await fetch(data.signedUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `video-${Date.now()}.mp4`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(blobUrl);
                document.body.removeChild(a);
                toast.success('Download started!');
              }
            } catch (error) {
              toast.error('Failed to download');
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Video
        </Button>
      </div>
    );
  }

  // Show error fallback for images
  if (contentType === "image" && (error || !signedUrl || imageDisplayError)) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (contentType === "audio") {
    // Show error fallback for audio
    if (audioPlaybackError || !signedUrl) {
      return (
        <div className={`${className} flex flex-col items-center justify-center bg-muted gap-3`}>
          <Music className="h-12 w-12 text-gray-600 dark:text-gray-400" />
          <p className="text-sm text-muted-foreground">Audio Preview Unavailable</p>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const { data } = await supabase.storage
                  .from('generated-content')
                  .createSignedUrl(storagePath, 60);
                if (data?.signedUrl) {
                  const response = await fetch(data.signedUrl);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `audio-${Date.now()}.mp3`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(blobUrl);
                  document.body.removeChild(a);
                  toast.success('Download started!');
                }
              } catch (error) {
                toast.error('Failed to download');
              }
            }}
          >
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
            src={signedUrl}
            className="w-full"
            controls
            preload="metadata"
            onError={() => {
              console.error('Audio playback error for:', storagePath);
              setAudioPlaybackError(true);
            }}
            onLoadedMetadata={() => console.log('Audio loaded successfully:', storagePath)}
          />
          
          {/* Action buttons */}
          <div className="flex gap-2 justify-end">
            {canShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (contentType === "video") {
    // Infer file extension and MIME type
    const ext = storagePath?.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? 'mp4';
    const mime = ext === 'webm' ? 'video/webm' : 'video/mp4';
    
    // Always use the signed URL for playback
    const videoSrc = signedUrl || "";
    
    // Check if browser can play this format
    const canPlay = typeof document !== 'undefined' && document.createElement('video').canPlayType(mime);
    
    if (videoError || !canPlay) {
      return (
        <Card className={cn("flex flex-col items-center justify-center p-6 space-y-4", className)}>
          {thumbUrl ? (
            <img src={thumbUrl} alt="Video thumbnail" className="w-full h-auto rounded-lg mb-4" />
          ) : (
            <Video className="h-16 w-16 text-muted-foreground mb-2" />
          )}
          <p className="text-sm text-muted-foreground text-center">
            {isMobile ? "Your device may not support this codec. Try Open Externally or Download." : "Video Preview Unavailable"}
          </p>
          <div className="flex gap-2">
            {signedUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(signedUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Externally
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!signedUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </Card>
      );
    }
    
    return (
      <div className="relative group">
        <video
          ref={videoRef}
          src={videoSrc}
          poster={thumbUrl || undefined}
          className={cn(className, "animate-fade-in")}
          controls
          preload="metadata"
          playsInline
          muted
          onLoadedData={generateThumbnail}
          onError={() => {
            console.error('Video playback error for:', storagePath);
            setVideoPlaybackError(true);
          }}
          onLoadedMetadata={() => console.log('Video loaded successfully:', storagePath)}
        >
          <source src={videoSrc} type={mime} />
        </video>
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

  return (
    <div className="relative group">
      <img 
        src={signedUrl} 
        alt="Generated content" 
        className={cn(className, "animate-fade-in")}
        onError={() => setImageDisplayError(true)}
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
};
