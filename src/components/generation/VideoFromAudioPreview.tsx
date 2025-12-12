import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Video } from "lucide-react";
import { useVideoUrl } from "@/hooks/media";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface VideoFromAudioPreviewProps {
  storagePath: string;
  outputIndex: number;
  onRegenerate?: () => void;
}

export function VideoFromAudioPreview({ 
  storagePath, 
  outputIndex,
  onRegenerate 
}: VideoFromAudioPreviewProps) {
  const { url: videoUrl } = useVideoUrl(storagePath);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    setIsDownloading(true);
    try {
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `suno-music-video-${outputIndex + 1}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      logger.error('Video download failed', error as Error, {
        component: 'VideoFromAudioPreview',
        storagePath: storagePath.substring(0, 50),
        outputIndex,
        operation: 'handleDownload'
      });
      toast.error('Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Badge */}
        <Badge 
          className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm border shadow-sm gap-1"
          variant="secondary"
        >
          <Video className="h-3 w-3" />
          Video from Track #{outputIndex + 1}
        </Badge>

        {/* Video Player */}
        <div className="relative aspect-video bg-background">
          {videoUrl ? (
            <video 
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Video className="h-12 w-12 animate-pulse" />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t flex gap-2">
        <Button
          onClick={handleDownload}
          disabled={!videoUrl || isDownloading}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Downloading...' : 'Download MP4'}
        </Button>
        
        {onRegenerate && (
          <Button
            onClick={onRegenerate}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}
