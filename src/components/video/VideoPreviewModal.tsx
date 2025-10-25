import { VideoJob } from '@/types/video';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface VideoPreviewModalProps {
  job: VideoJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPreviewModal({ job, open, onOpenChange }: VideoPreviewModalProps) {
  const handleShare = async () => {
    if (navigator.share && job.final_video_url) {
      try {
        await navigator.share({
          title: job.topic,
          text: `Check out this video: ${job.topic}`,
          url: job.final_video_url,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      if (job.final_video_url) {
        navigator.clipboard.writeText(job.final_video_url);
        toast.success('Video URL copied to clipboard');
      }
    }
  };

  const handleDownload = async () => {
    if (!job.final_video_url) return;
    
    toast.loading('Preparing download...', { id: 'video-download' });
    
    try {
      const response = await fetch(job.final_video_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${job.topic.slice(0, 30)}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success('Download started!', { id: 'video-download' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download video', { id: 'video-download' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{job.topic}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {job.final_video_url && (
            <div className="rounded-lg overflow-hidden bg-black">
              <video
                src={job.final_video_url}
                controls
                className="w-full"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {job.script && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <h3 className="font-bold mb-2">Script</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.script}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Video
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
