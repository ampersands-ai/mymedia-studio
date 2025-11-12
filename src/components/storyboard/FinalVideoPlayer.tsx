/**
 * Final Video Player Component
 * Video player with download and open in new tab buttons
 */

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface FinalVideoPlayerProps {
  videoUrl: string | null;
  storyboardId: string;
  isLoading: boolean;
}

export const FinalVideoPlayer = ({
  videoUrl,
  storyboardId,
  isLoading,
}: FinalVideoPlayerProps) => {
  const handleDownload = async () => {
    try {
      if (!videoUrl) {
        toast.error('Video URL not available');
        return;
      }

      toast.loading('Downloading video...', { id: 'download-video' });
      
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `storyboard-${storyboardId}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Video downloaded!', { id: 'download-video' });
    } catch (error) {
      logger.error('Video download failed', error, {
        component: 'FinalVideoPlayer',
        operation: 'handleDownload',
        storyboardId,
        videoUrl
      });
      toast.error('Failed to download video. Try "Open in New Tab" and save from there.', { 
        id: 'download-video' 
      });
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold">🎬 Final Video</h3>
      <div className="rounded-lg overflow-hidden border border-primary/20 bg-black">
        {isLoading ? (
          <div className="w-full aspect-video flex items-center justify-center bg-muted">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <video
            controls
            className="w-full aspect-video"
            src={videoUrl || undefined}
            preload="metadata"
            crossOrigin="anonymous"
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => window.open(videoUrl || '', '_blank')}
        >
          Open in New Tab
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleDownload}
        >
          Download
        </Button>
      </div>
    </div>
  );
};
