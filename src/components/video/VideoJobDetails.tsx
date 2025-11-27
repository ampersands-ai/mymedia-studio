import { useState } from 'react';
import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Download, Play, CheckCircle, AlertCircle, Sparkles, Coins } from 'lucide-react';
import { useVideoUrl } from '@/hooks/media';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'VideoJobDetails' });

interface VideoJobDetailsProps {
  job: VideoJob;
  onPreview?: (job: VideoJob) => void;
  onGenerateCaption: () => void;
  isGeneratingCaption: boolean;
  availableCredits: number;
}

export function VideoJobDetails({ job, onPreview, onGenerateCaption, isGeneratingCaption, availableCredits }: VideoJobDetailsProps) {
  const [videoError, setVideoError] = useState(false);
  const [showCaptionConfirm, setShowCaptionConfirm] = useState(false);

  const { url: videoSignedUrl, isLoading: isLoadingVideoUrl, error: videoUrlError } = useVideoUrl(
    job.final_video_url ?? null,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  if (job.status !== 'completed' || !job.final_video_url) {
    return null;
  }

  const handleDownload = async () => {
    toast.loading('Preparing download...', { id: 'video-download' });

    try {
      if (!videoSignedUrl) {
        componentLogger.error('Download failed: No signed URL available', new Error('No signed URL'), { jobId: job.id } as any);
        toast.error('Download unavailable - video URL not ready', { id: 'video-download' });
        return;
      }

      componentLogger.info('Downloading video', { jobId: job.id, url: videoSignedUrl } as any);
      const response = await fetch(videoSignedUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `artifio-${job.topic.slice(0, 30)}-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success('Download started!', { id: 'video-download' });
    } catch (error) {
      componentLogger.error('Download error', error as Error, { jobId: job.id } as any);
      toast.error(
        `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: 'video-download' }
      );
    }
  };

  const handleGenerateCaptionClick = () => {
    if (!job.script) {
      toast.error('Script is required to generate caption');
      return;
    }

    if (availableCredits < 0.1) {
      toast.error('Insufficient credits. You need at least 0.1 credits.');
      return;
    }

    setShowCaptionConfirm(true);
  };

  const confirmGenerateCaption = () => {
    onGenerateCaption();
    setShowCaptionConfirm(false);
  };

  return (
    <div className="rounded-lg border-2 border-green-500 bg-green-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span className="font-bold text-green-500">Video Completed!</span>
      </div>

      <div className="rounded-lg overflow-hidden bg-black">
        {isLoadingVideoUrl ? (
          <div className="flex items-center justify-center bg-muted h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : videoUrlError || videoError || !videoSignedUrl ? (
          <div className="flex flex-col items-center justify-center bg-muted/50 h-48 p-4 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Video Preview Unavailable
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!videoSignedUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Video
            </Button>
          </div>
        ) : (
          <video
            src={videoSignedUrl}
            controls
            controlsList="nodownload"
            className="w-full"
            playsInline
            onError={(e) => {
              componentLogger.error('Video playback failed', new Error('Video playback error'), {
                operation: 'videoPlayback',
                videoUrl: videoSignedUrl,
                eventType: e.type
              });
              setVideoError(true);
            }}
            onLoadedData={() => {
              componentLogger.debug('Video loaded successfully', {
                operation: 'videoPlayback',
                videoUrl: videoSignedUrl
              });
              setVideoError(false);
            }}
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 text-xs sm:text-sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1 sm:mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs sm:text-sm"
            onClick={() => onPreview?.(job)}
          >
            <Play className="h-4 w-4 mr-1 sm:mr-2" />
            Full View
          </Button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleGenerateCaptionClick}
          disabled={isGeneratingCaption || !job.script}
          className="w-full text-xs sm:text-sm"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">
            {isGeneratingCaption ? 'Generating...' : 'Generate Caption & Hashtags (0.1 credits)'}
          </span>
          <span className="sm:hidden">
            {isGeneratingCaption ? 'Generating...' : 'Caption & Tags (0.1)'}
          </span>
        </Button>

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
        <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Caption:
          </h4>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">
            {job.ai_caption}
          </p>
        </div>
      )}

      {job.ai_hashtags && job.ai_hashtags.length > 0 && (
        <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Hashtags ({job.ai_hashtags.length}):
          </h4>
          <div className="flex flex-wrap gap-1.5">
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
}
