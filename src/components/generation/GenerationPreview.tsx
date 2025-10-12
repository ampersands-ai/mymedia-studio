import { useState } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { ImageIcon, Video, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNativeShare } from "@/hooks/useNativeShare";
import { useNativeDownload } from "@/hooks/useNativeDownload";
import { triggerHaptic } from "@/utils/capacitor-utils";

interface GenerationPreviewProps {
  storagePath: string;
  contentType: string;
  className?: string;
}

export const GenerationPreview = ({ storagePath, contentType, className }: GenerationPreviewProps) => {
  const { signedUrl, isLoading, error } = useSignedUrl(storagePath);
  const { shareFile, canShare } = useNativeShare();
  const { downloadFile, isNative } = useNativeDownload();
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleShare = async () => {
    if (!signedUrl) return;
    await shareFile(signedUrl, 'Check out my AI creation!');
    await triggerHaptic('light');
  };

  const handleDownload = async () => {
    if (!signedUrl) return;
    await downloadFile(signedUrl, `creation-${Date.now()}.${contentType === 'video' ? 'mp4' : 'png'}`);
    await triggerHaptic('medium');
  };

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        {contentType === "video" ? (
          <Video className="h-8 w-8 text-muted-foreground animate-pulse" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground animate-pulse" />
        )}
      </div>
    );
  }

  // Show download fallback for videos only when playback fails
  if (contentType === "video" && (videoError || !storagePath)) {
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
  if (contentType === "image" && (error || !signedUrl || imageError)) {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (contentType === "video") {
    return (
      <div className="relative group">
        <video
          src={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-content?bucket=generated-content&path=${encodeURIComponent(storagePath)}`}
          className={cn(className, "animate-fade-in")}
          controls
          preload="metadata"
          playsInline
          muted
          crossOrigin="anonymous"
          onError={() => {
            console.error('Video playback error for:', storagePath);
            setVideoError(true);
          }}
          onLoadedMetadata={() => console.log('Video loaded successfully:', storagePath)}
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

  return (
    <div className="relative group">
      <img 
        src={signedUrl} 
        alt="Generated content" 
        className={cn(className, "animate-fade-in")}
        onError={() => setImageError(true)}
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
