import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Download, Eye, Clock, AlertCircle, Play, XCircle, Volume2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface VideoJobCardProps {
  job: VideoJob;
  onPreview?: (job: VideoJob) => void;
}

export function VideoJobCard({ job, onPreview }: VideoJobCardProps) {
  const getStatusColor = (status: VideoJob['status']) => {
    const colors = {
      pending: 'bg-gray-500',
      generating_script: 'bg-blue-500',
      generating_voice: 'bg-purple-500',
      awaiting_approval: 'bg-orange-500',
      fetching_video: 'bg-indigo-500',
      assembling: 'bg-yellow-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusLabel = (status: VideoJob['status']) => {
    const labels = {
      pending: 'Queued',
      generating_script: 'Writing Script',
      generating_voice: 'Generating Voice',
      awaiting_approval: 'Ready for Review',
      fetching_video: 'Finding Background',
      assembling: 'Assembling Video',
      completed: 'Completed',
      failed: 'Failed'
    };
    return labels[status] || status;
  };

  const getStyleEmoji = (style: string) => {
    const emojis: Record<string, string> = {
      modern: '🎨',
      tech: '💻',
      educational: '📚',
      dramatic: '🎬'
    };
    return emojis[style] || '🎬';
  };

  const isProcessing = ['pending', 'generating_script', 'generating_voice', 'fetching_video', 'assembling'].includes(job.status);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const { approveJob, isApproving, cancelJob, isCancelling } = useVideoJobs();

  const handlePlayVoiceover = () => {
    if (!job.voiceover_url) return;
    
    const audio = new Audio(job.voiceover_url);
    audio.crossOrigin = 'anonymous';
    setIsPlayingAudio(true);
    
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      setIsPlayingAudio(false);
      toast.error('Failed to play voiceover');
    };
    
    audio.play();
  };

  const handleApprove = () => {
    approveJob.mutate(job.id);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this video? This action cannot be undone.')) {
      cancelJob.mutate(job.id);
    }
  };

  return (
    <Card className="border-2 hover:border-primary/50 transition-colors w-full overflow-hidden">
      <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base md:text-lg truncate">
              {getStyleEmoji(job.style)} {job.topic}
            </h4>
            <div className="flex items-center gap-1.5 md:gap-2 mt-1 text-xs md:text-sm text-muted-foreground flex-wrap">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{job.duration}s</span>
              <span>•</span>
              <span className="capitalize">{job.style}</span>
              {job.voice_name && (
                <>
                  <span>•</span>
                  <span className="truncate">🎙️ {job.voice_name}</span>
                </>
              )}
            </div>
          </div>
          <Badge className={`${getStatusColor(job.status)} text-white shrink-0 text-xs`}>
            {isProcessing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {getStatusLabel(job.status)}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
        </div>

        {job.status === 'awaiting_approval' && job.script && job.voiceover_url && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
              <AlertCircle className="h-4 w-4" />
              Review Required
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Generated Script:</label>
              <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
                <p className="text-sm whitespace-pre-wrap">{job.script}</p>
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Voiceover Preview:</label>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handlePlayVoiceover}
                disabled={isPlayingAudio}
              >
                {isPlayingAudio ? (
                  <>
                    <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
                    Playing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play Voiceover
                  </>
                )}
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleApprove}
                disabled={isApproving || isCancelling}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Proceed with Video
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleCancel}
                disabled={isApproving || isCancelling}
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Job
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {job.status === 'completed' && job.final_video_url && (
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="default" 
              className="flex-1 text-xs md:text-sm"
              onClick={() => onPreview?.(job)}
            >
              <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              Preview
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 text-xs md:text-sm"
              asChild
            >
              <a href={job.final_video_url} download={`${job.topic.slice(0, 30)}.mp4`}>
                <Download className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                Download
              </a>
            </Button>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 md:p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm">
                <p className="font-medium text-destructive">Generation Failed</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {job.error_message || 'An unknown error occurred'}
                </p>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-xs text-muted-foreground italic">
            ⏳ Processing... This usually takes 3-5 minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}
