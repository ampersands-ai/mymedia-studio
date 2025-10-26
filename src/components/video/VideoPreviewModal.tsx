import { useState } from 'react';
import { VideoJob } from '@/types/video';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Download, Share2, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useIsMobile } from '@/hooks/use-mobile';

interface VideoPreviewModalProps {
  job: VideoJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoPreviewModal({ job, open, onOpenChange }: VideoPreviewModalProps) {
  const isMobile = useIsMobile();
  const { generateCaption, isGeneratingCaption } = useVideoJobs();
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  const handleGenerateCaption = async () => {
    if (!job.script) {
      toast.error('No script available to generate caption');
      return;
    }
    
    generateCaption.mutate({
      jobId: job.id,
      topic: job.topic,
      script: job.script
    });
  };

  const handleCopyCaption = async () => {
    if (job.ai_caption) {
      await navigator.clipboard.writeText(job.ai_caption);
      setCopiedCaption(true);
      toast.success('Caption copied!');
      setTimeout(() => setCopiedCaption(false), 2000);
    }
  };

  const handleCopyHashtags = async () => {
    if (job.ai_hashtags) {
      await navigator.clipboard.writeText(job.ai_hashtags.join(' '));
      setCopiedHashtags(true);
      toast.success('Hashtags copied!');
      setTimeout(() => setCopiedHashtags(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && job.final_video_url) {
      try {
        const shareText = job.ai_caption && job.ai_hashtags
          ? `${job.ai_caption}\n\n${job.ai_hashtags.join(' ')}`
          : `Check out this video: ${job.topic}`;
        
        await navigator.share({
          title: job.topic,
          text: shareText,
          url: job.final_video_url,
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      if (job.final_video_url) {
        const shareText = job.ai_caption && job.ai_hashtags
          ? `${job.ai_caption}\n\n${job.ai_hashtags.join(' ')}\n\n${job.final_video_url}`
          : job.final_video_url;
        
        navigator.clipboard.writeText(shareText);
        toast.success(job.ai_caption ? 'Caption, hashtags and URL copied!' : 'Video URL copied to clipboard');
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
      a.download = `artifio-video-${Date.now()}.mp4`;
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

  const content = (
    <div className="space-y-4">
      {job.final_video_url && (
        <div className="rounded-lg overflow-hidden bg-black">
          <video
            src={job.final_video_url}
            controls
            controlsList="nodownload"
            className="w-full"
            playsInline
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

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="default"
            className="flex-1"
            onClick={handleDownload}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
        
        {job.final_video_url && (
          <Button
            variant="secondary"
            onClick={handleGenerateCaption}
            disabled={isGeneratingCaption || !job.script}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGeneratingCaption ? 'Generating...' : 'Generate Caption & Hashtags'}
          </Button>
        )}
      </div>

      {job.ai_caption && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">📝 Caption</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCaption}
            >
              {copiedCaption ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Textarea
            value={job.ai_caption}
            readOnly
            className="text-sm min-h-[80px] resize-none"
          />
        </div>
      )}

      {job.ai_hashtags && job.ai_hashtags.length > 0 && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm">🏷️ Hashtags ({job.ai_hashtags.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyHashtags}
            >
              {copiedHashtags ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {job.ai_hashtags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl ${isMobile ? 'max-h-[90vh]' : ''}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{job.topic}</DialogTitle>
        </DialogHeader>
        
        {isMobile ? (
          <ScrollArea className="max-h-[calc(90vh-120px)] touch-pan-y">
            {content}
          </ScrollArea>
        ) : (
          content
        )}
      </DialogContent>
    </Dialog>
  );
}
