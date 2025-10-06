import { useSignedUrl } from "@/hooks/useSignedUrl";
import { ImageIcon, Video } from "lucide-react";

interface GenerationPreviewProps {
  storagePath: string;
  contentType: string;
  className?: string;
}

export const GenerationPreview = ({ storagePath, contentType, className }: GenerationPreviewProps) => {
  const { signedUrl, isLoading } = useSignedUrl(storagePath);

  if (isLoading || !signedUrl) {
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

  if (contentType === "video") {
    return (
      <video
        src={signedUrl}
        className={className}
        controls
        preload="metadata"
      />
    );
  }

  return <img src={signedUrl} alt="Generated content" className={className} />;
};
