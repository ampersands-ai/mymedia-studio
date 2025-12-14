import { VideoJob } from '@/types/video';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { GenerationProgress } from '@/components/generation/GenerationProgress';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  completed?: boolean;
  active?: boolean;
  label: string;
}

const StepIndicator = ({ completed, active, label }: StepIndicatorProps) => (
  <div className="flex items-center gap-3">
    <div className={cn(
      "flex items-center justify-center w-6 h-6 rounded-full shrink-0",
      completed ? "bg-green-500" : active ? "bg-primary" : "bg-muted"
    )}>
      {completed ? (
        <CheckCircle className="w-4 h-4 text-white" />
      ) : active ? (
        <Loader2 className="w-4 h-4 text-white animate-spin" />
      ) : (
        <Clock className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
    <span className={cn(
      "text-sm font-medium",
      completed ? "text-foreground" : active ? "text-primary" : "text-muted-foreground"
    )}>
      {label}
    </span>
  </div>
);

interface VideoJobProgressProps {
  job: VideoJob;
  onCancel: () => void;
  isCancelling: boolean;
  actionStartTime?: number | null;
}

const getEstimatedTime = (status: VideoJob['status'], audioDuration?: number): number => {
  // For assembling: render time ≈ audio duration / 2
  if (status === 'assembling' && audioDuration) {
    return Math.ceil(audioDuration / 2);
  }
  
  const estimates = {
    generating_voice: 180,
    fetching_video: 60,
    assembling: 120 // Default fallback if no audio duration
  };
  return estimates[status as keyof typeof estimates] || 180;
};

const getStageDescription = (status: VideoJob['status']): string => {
  const descriptions = {
    generating_voice: '🎙️ Creating natural-sounding voiceover with AI voice synthesis...',
    fetching_video: '🎬 Searching for relevant background videos and images...',
    assembling: '✨ Combining voiceover, visuals, and captions into final video...'
  };
  return descriptions[status as keyof typeof descriptions] || 'Processing...';
};

export function VideoJobProgress({ job, onCancel, isCancelling, actionStartTime }: VideoJobProgressProps) {
  if (!['generating_voice', 'fetching_video', 'assembling'].includes(job.status)) {
    return null;
  }

  return (
    <div className="space-y-4 pt-3 border-t">
      <div className="space-y-3">
        <StepIndicator completed={true} label="Script Generated" />
        <StepIndicator
          active={job.status === 'generating_voice'}
          completed={['fetching_video', 'assembling'].includes(job.status)}
          label="Voiceover Generation"
        />
        <StepIndicator
          active={job.status === 'fetching_video'}
          completed={job.status === 'assembling'}
          label="Finding Background Media"
        />
        <StepIndicator
          active={job.status === 'assembling'}
          label="Assembling Final Video"
        />
      </div>

      <GenerationProgress
        startTime={actionStartTime || new Date(job.updated_at).getTime()}
        isComplete={false}
        estimatedTimeSeconds={getEstimatedTime(job.status, job.actual_audio_duration)}
      />

      <Alert>
        <AlertDescription className="text-sm">
          {getStageDescription(job.status)}
        </AlertDescription>
      </Alert>

      <Button
        variant="destructive"
        size="sm"
        onClick={onCancel}
        disabled={isCancelling}
        className="w-full"
      >
        {isCancelling ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Cancelling...
          </>
        ) : (
          <>
            <XCircle className="w-4 w-4 mr-2" />
            Cancel Generation
          </>
        )}
      </Button>
    </div>
  );
}
