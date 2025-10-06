import { useState } from "react";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { ImageIcon, Video, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GenerationPreviewProps {
  storagePath: string;
  contentType: string;
  className?: string;
}

export const GenerationPreview = ({ storagePath, contentType, className }: GenerationPreviewProps) => {
  const { signedUrl, isLoading, error } = useSignedUrl(storagePath);
  const [videoError, setVideoError] = useState(false);
  const [imageError, setImageError] = useState(false);

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

  // Show download fallback for videos that fail
  if (contentType === "video" && (error || !signedUrl || videoError)) {
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
                const a = document.createElement('a');
                a.href = data.signedUrl;
                a.download = `video-${Date.now()}.mp4`;
                a.click();
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
      <video
        src={signedUrl}
        className={className}
        controls
        preload="metadata"
        onError={() => setVideoError(true)}
      />
    );
  }

  return (
    <img 
      src={signedUrl} 
      alt="Generated content" 
      className={className}
      onError={() => setImageError(true)}
    />
  );
};
