import { useState, useEffect, useRef } from 'react';
import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Loader2, AlertCircle, Volume2, XCircle, Edit, Play, Pause, RotateCcw, Eye, Coins } from 'lucide-react';
import { useAudioUrl } from '@/hooks/media';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const componentLogger = logger.child({ component: 'VideoJobVoiceover' });

interface VideoJobVoiceoverProps {
  job: VideoJob;
  onApprove: () => void;
  onCancel: () => void;
  onRegenerate: (editedScript: string) => void;
  isApproving: boolean;
  isCancelling: boolean;
  isRegenerating: boolean;
  availableCredits: number;
  voiceoverRegenerationCost: number;
}

export function VideoJobVoiceover({
  job,
  onApprove,
  onCancel,
  onRegenerate,
  isApproving,
  isCancelling,
  isRegenerating,
  availableCredits,
  voiceoverRegenerationCost
}: VideoJobVoiceoverProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [editedScript, setEditedScript] = useState(job.script || '');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canAffordRegeneration = availableCredits >= voiceoverRegenerationCost;

  const { url: voiceoverSignedUrl, isLoading: isLoadingVoiceUrl, error: voiceUrlError } = useAudioUrl(
    job.voiceover_url,
    { strategy: 'public-direct', bucket: 'generated-content' }
  );

  useEffect(() => {
    setEditedScript(job.script || '');
  }, [job.script]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [job.id]);

  useEffect(() => {
    if (job.status === 'failed') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      setCurrentTime(0);
      setDuration(0);
      setIsEditingScript(false);
    }
  }, [job.status]);

  if (job.status !== 'awaiting_voice_approval' || !job.script || !job.voiceover_url) {
    return null;
  }

  const handleToggleVoiceover = async () => {
    if (!voiceoverSignedUrl) {
      toast.error('Voiceover URL not ready yet');
      return;
    }

    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (audioRef.current && !isPlayingAudio) {
      audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }

    componentLogger.debug('Validating voiceover URL', { url: voiceoverSignedUrl, jobId: job.id } as any);
    try {
      const testResponse = await fetch(voiceoverSignedUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        componentLogger.error('Voiceover URL not accessible', new Error(`HTTP ${testResponse.status}`), { jobId: job.id, status: testResponse.status } as any);
        toast.error(`Voiceover file is not accessible (HTTP ${testResponse.status}). Please try again.`);
        return;
      }
      componentLogger.debug('Voiceover URL validation passed', { jobId: job.id } as any);
    } catch (err) {
      componentLogger.error('Failed to validate voiceover URL', err as Error, { jobId: job.id } as any);
      toast.error('Unable to validate voiceover file. Please check your connection.');
      return;
    }

    const audio = new Audio(voiceoverSignedUrl);
    audioRef.current = audio;
    setIsPlayingAudio(true);

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlayingAudio(false);
      setCurrentTime(0);
    };

    audio.onerror = (e) => {
      componentLogger.error('Audio playback error', new Error('Audio playback failed'), { jobId: job.id, event: e } as any);
      setIsPlayingAudio(false);
      audioRef.current = null;
      toast.error('Failed to play voiceover. The file may be corrupted or inaccessible.');
    };

    audio.play().catch(err => {
      componentLogger.error('Failed to start audio playback', err as Error, { jobId: job.id } as any);
      toast.error('Failed to start playback. Please try again.');
      setIsPlayingAudio(false);
    });
  };

  const handleRestartAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlayingAudio) {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegenerate = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setCurrentTime(0);
    setDuration(0);
    onRegenerate(editedScript);
  };

  return (
    <div className="space-y-3 pt-2 border-t">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
          <AlertCircle className="h-4 w-4" />
          Review Voiceover
        </div>
        {!isEditingScript && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => setIsEditingScript(true)}
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit Script
          </Button>
        )}
      </div>

      {isEditingScript ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Edit Script to Regenerate Voiceover:</label>
              <Badge variant="secondary" className="text-xs">
                {editedScript.length} chars
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Coins className="w-3 h-3 text-primary" />
              <span className="font-medium text-primary">{voiceoverRegenerationCost} credits</span>
            </div>
          </div>
          <Textarea
            value={editedScript}
            onChange={(e) => setEditedScript(e.target.value)}
            className="min-h-[150px] text-sm font-mono"
            placeholder="Edit the script here..."
          />
          {!canAffordRegeneration && (
            <p className="text-xs text-destructive font-medium">
              Insufficient credits. You need {Number(voiceoverRegenerationCost).toFixed(2)} credits to regenerate this voiceover.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditingScript(false);
                setEditedScript(job.script || '');
              }}
              className="flex-1"
              disabled={isRegenerating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRegenerate}
              className="flex-1"
              disabled={isRegenerating || !editedScript.trim() || !canAffordRegeneration}
            >
              {isRegenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Regenerate Voiceover ({voiceoverRegenerationCost} credits)
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Script:</label>
            <ScrollArea className="h-72 rounded-md border bg-muted/30 p-3">
              <p className="text-xs whitespace-pre-wrap">{job.script}</p>
            </ScrollArea>
          </div>

          {voiceUrlError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Loading Audio</AlertTitle>
              <AlertDescription>
                Could not load voiceover preview. You can still proceed with rendering the video.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Voiceover Preview:</label>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleVoiceover}
                disabled={isLoadingVoiceUrl || !voiceoverSignedUrl || voiceUrlError}
                className="shrink-0"
              >
                {isLoadingVoiceUrl ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlayingAudio ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleRestartAudio}
                disabled={!audioRef.current}
                className="shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>

              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs font-mono tabular-nums shrink-0">
                  {formatTime(currentTime)}
                </span>
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  disabled={!audioRef.current}
                  className="flex-1"
                />
                <span className="text-xs font-mono tabular-nums text-muted-foreground shrink-0">
                  {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {job.error_details && (
            <Alert variant="destructive" className="border-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5" />
              <AlertTitle className="text-base font-semibold">Video Rendering Failed</AlertTitle>
              <AlertDescription className="space-y-3 mt-2">
                <p className="text-sm leading-relaxed">{job.error_details.message}</p>

                {job.error_details.step && (
                  <p className="text-xs text-muted-foreground">
                    Failed during: <span className="font-medium">{job.error_details.step}</span>
                  </p>
                )}

                {job.error_details.timestamp && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.error_details.timestamp).toLocaleString()}
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  💡 If the issue persists, try editing the script or selecting a different background.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={onApprove}
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
                  Render Video
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={onCancel}
              disabled={isApproving || isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
