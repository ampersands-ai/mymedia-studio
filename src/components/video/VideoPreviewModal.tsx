import { useState } from 'react';
import { VideoJob } from '@/types/video';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Download, Share2, Sparkles, Copy, Check, Loader2, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVideoUrl } from '@/hooks/media';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'VideoPreviewModal' });

interface VideoPreviewModalProps {
  job: VideoJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to extract storage path from public URL
const getStoragePathFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // If it's already a storage path, return it
  if (!url.startsWith('http')) return url;
  
  // Extract path from public URL
  const match = url.match(/\/storage\/v1\/object\/public\/generated-content\/(.+)/);
  return match ? match[1] : null;
};

export function VideoPreviewModal({ job, open, onOpenChange }: VideoPreviewModalProps) {
  const isMobile = useIsMobile();
  const { generateCaption, isGeneratingCaption } = useVideoJobs();
  const { availableCredits } = useUserCredits();
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [showCaptionConfirm, setShowCaptionConfirm] = useState(false);

  // Extract storage path and fetch video URL using new architecture
  const videoStoragePath = getStoragePathFromUrl(job.final_video_url);
  const { url: videoSignedUrl, isLoading: isLoadingVideoUrl } = useVideoUrl(
    videoStoragePath ?? null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  const handleGenerateCaption = async () => {
    if (!job.script) {
      toast.error('No script available to generate caption');
      return;
    }
    
    // Check if user has enough credits
    if (availableCredits < 0.1) {
      toast.error('Insufficient credits. You need at least 0.1 credits.');
      return;
    }
    
    setShowCaptionConfirm(true);
  };

  const confirmGenerateCaption = () => {
    generateCaption.mutate({
      jobId: job.id,
      topic: job.topic,
      script: job.script || ''
    });
    setShowCaptionConfirm(false);
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
    const shareUrl = videoSignedUrl || job.final_video_url;
    
    if (navigator.share && shareUrl) {
      try {
        const shareText = job.ai_caption && job.ai_hashtags
          ? `${job.ai_caption}\n\n${job.ai_hashtags.join(' ')}`
          : `Check out this video: ${job.topic}`;
        
        await navigator.share({
          title: job.topic,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      if (shareUrl) {
        const shareText = job.ai_caption && job.ai_hashtags
          ? `${job.ai_caption}\n\n${job.ai_hashtags.join(' ')}\n\n${shareUrl}`
          : shareUrl;
        
        navigator.clipboard.writeText(shareText);
        toast.success(job.ai_caption ? 'Caption, hashtags and URL copied!' : 'Video URL copied to clipboard');
      }
    }
  };

  const handleDownload = async () => {
    toast.loading('Preparing download...', { id: 'video-download' });
    
    try {
      const downloadUrl = videoSignedUrl || job.final_video_url;
      
      if (!downloadUrl) {
        toast.error('Video URL not available', { id: 'video-download' });
        return;
      }
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `artifio-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      componentLogger.error('Video download failed', error instanceof Error ? error : new Error(String(error)), {
        operation: 'handleDownload',
        jobId: job.id,
        videoUrl: job.final_video_url
      });
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'video-download' });
    }
  };

  const content = (
    <div className="space-y-4">
      {job.final_video_url && (
        <div className="rounded-lg overflow-hidden bg-black">
          {isLoadingVideoUrl ? (
            <div className="flex items-center justify-center bg-muted h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <video
              key={job.id}
              src={videoSignedUrl || job.final_video_url}
              controls
              controlsList="nodownload"
              className="w-full"
              playsInline
              onError={(e) => {
                componentLogger.error('Video load error', new Error('Video load failed'), {
                  operation: 'videoPlayback',
                  videoUrl: videoSignedUrl || job.final_video_url,
                  eventType: e.type
                });
              }}
            >
              Your browser does not support the video tag.
            </video>
          )}
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
            {isGeneratingCaption ? 'Generating...' : 'Generate Caption & Hashtags (0.1 credits)'}
          </Button>
        )}

        {/* Caption Generation Confirmation Dialog */}
        <AlertDialog open={showCaptionConfirm} onOpenChange={setShowCaptionConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Generate Caption & Hashtags?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>This will cost <strong>0.1 credits</strong>.</p>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4" />
                  <span>Your current balance: <strong>{availableCredits.toFixed(2)} credits</strong></span>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmGenerateCaption}>
                Generate (0.1 credits)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
