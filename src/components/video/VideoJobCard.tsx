import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserCredits } from '@/hooks/useUserCredits';
import { VideoJobScript } from './VideoJobScript';
import { VideoJobVoiceover } from './VideoJobVoiceover';
import { VideoJobProgress } from './VideoJobProgress';
import { VideoJobDetails } from './VideoJobDetails';
import { VideoJobActions } from './VideoJobActions';

interface VideoJobCardProps {
  job: VideoJob;
  onPreview?: (job: VideoJob) => void;
}

export function VideoJobCard({ job, onPreview }: VideoJobCardProps) {
  const [timeoutCountdown, setTimeoutCountdown] = useState<number | null>(null);
  const { approveScript, isApprovingScript, approveVoiceover, isApprovingVoiceover, cancelJob, isCancelling, recoverJob, isRecoveringJob, generateCaption, isGeneratingCaption } = useVideoJobs();
  const { availableCredits } = useUserCredits();

  const voiceoverRegenerationCost = Math.ceil((job.script?.length || 0) / 1000 * 144);

  const getStatusColor = (status: VideoJob['status']) => {
    const colors = {
      pending: 'bg-gray-500',
      generating_script: 'bg-blue-500',
      awaiting_script_approval: 'bg-orange-500',
      generating_voice: 'bg-purple-500',
      awaiting_voice_approval: 'bg-amber-500',
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
      awaiting_script_approval: 'Review Script',
      generating_voice: 'Generating Voice',
      awaiting_voice_approval: 'Review Voiceover',
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
  const isApproachingTimeout = ['assembling', 'fetching_video'].includes(job.status);
  const elapsedMs = Date.now() - new Date(job.created_at).getTime();
  const timeoutMs = 5 * 60 * 1000;
  const isNearTimeout = isApproachingTimeout && elapsedMs > 4 * 60 * 1000;
  const isStuckAssembling = job.status === 'assembling' &&
    (Date.now() - new Date(job.updated_at).getTime()) > 5 * 60 * 1000;

  useEffect(() => {
    if (!isNearTimeout) {
      setTimeoutCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - new Date(job.created_at).getTime();
      const remaining = Math.max(0, timeoutMs - elapsed);
      setTimeoutCountdown(Math.ceil(remaining / 1000));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [job.created_at, isNearTimeout, timeoutMs]);

  useEffect(() => {
    setTimeoutCountdown(null);
  }, [job.id, job.status]);

  const handleApproveScript = (editedScript?: string) => {
    approveScript.mutate({
      jobId: job.id,
      editedScript
    });
  };

  const handleApproveVoiceover = () => {
    approveVoiceover.mutate(job.id);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this video? This action cannot be undone.')) {
      cancelJob.mutate(job.id);
    }
  };

  const handleRegenerateVoiceover = (editedScript: string) => {
    approveScript.mutate(
      { jobId: job.id, editedScript },
      {
        onSuccess: () => {
          // Success handled by the hook
        }
      }
    );
  };

  const handleGenerateCaption = () => {
    generateCaption.mutate({
      jobId: job.id,
      topic: job.topic,
      script: job.script || ''
    });
  };

  return (
    <Card className="border-2 hover:border-primary/50 transition-colors w-full overflow-hidden">
      <CardContent className="p-3 md:p-4 space-y-2 md:space-y-3">
        <div className="flex items-start justify-between gap-2 md:gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
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

        <VideoJobScript
          job={job}
          onApprove={handleApproveScript}
          onCancel={handleCancel}
          isApproving={isApprovingScript}
          isCancelling={isCancelling}
        />

        <VideoJobVoiceover
          job={job}
          onApprove={handleApproveVoiceover}
          onCancel={handleCancel}
          onRegenerate={handleRegenerateVoiceover}
          isApproving={isApprovingVoiceover}
          isCancelling={isCancelling}
          isRegenerating={isApprovingScript}
          availableCredits={availableCredits}
          voiceoverRegenerationCost={voiceoverRegenerationCost}
        />

        <VideoJobProgress
          job={job}
          onCancel={handleCancel}
          isCancelling={isCancelling}
        />

        <VideoJobDetails
          job={job}
          onPreview={onPreview}
          onGenerateCaption={handleGenerateCaption}
          isGeneratingCaption={isGeneratingCaption}
          availableCredits={availableCredits}
        />

        <VideoJobActions
          job={job}
          isStuckAssembling={isStuckAssembling}
          isNearTimeout={isNearTimeout}
          timeoutCountdown={timeoutCountdown}
          onRecoverJob={() => recoverJob.mutate(job.id)}
          isRecoveringJob={isRecoveringJob}
        />
      </CardContent>
    </Card>
  );
}
