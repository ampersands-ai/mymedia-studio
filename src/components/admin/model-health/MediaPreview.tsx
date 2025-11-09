import { ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaPreviewProps {
  url: string;
  previewUrl?: string;
  contentType?: string;
}

export const MediaPreview = ({ url, previewUrl, contentType }: MediaPreviewProps) => {
  const isVideo = contentType?.startsWith('video') || url.match(/\.(mp4|webm|mov)$/i);
  const isImage = contentType?.startsWith('image') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const displayUrl = previewUrl || url;

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden border border-border bg-muted">
        {isVideo ? (
          <video 
            src={displayUrl} 
            controls 
            className="w-full max-h-96"
            preload="metadata"
          />
        ) : isImage ? (
          <img 
            src={displayUrl} 
            alt="Generated content"
            className="w-full h-auto max-h-96 object-contain"
          />
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>Preview not available</p>
            <p className="text-xs mt-1">Use download button to view file</p>
          </div>
        )}
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild className="flex-1">
          <a href={url} download>
            <Download className="w-4 h-4 mr-2" />
            Download
          </a>
        </Button>
      </div>
    </div>
  );
};
