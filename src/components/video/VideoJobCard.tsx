import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Eye, Clock, AlertCircle, Play, XCircle, Volume2, Edit, Pause, RotateCcw, CheckCircle, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useSignedUrlLazy } from '@/hooks/useSignedUrlLazy';
import { Slider } from '@/components/ui/slider';


interface VideoJobCardProps {
  job: VideoJob;
  onPreview?: (job: VideoJob) => void;
}

export function VideoJobCard({ job, onPreview }: VideoJobCardProps) {
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);
  const [isEditingVoiceoverScript, setIsEditingVoiceoverScript] = useState(false);
  const [editedScript, setEditedScript] = useState(job.script || '');
  const [editedVoiceoverScript, setEditedVoiceoverScript] = useState(job.script || '');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timeoutCountdown, setTimeoutCountdown] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { approveScript, isApprovingScript, approveVoiceover, isApprovingVoiceover, cancelJob, isCancelling, recoverJob, isRecoveringJob, dismissError, isDismissingError, generateCaption, isGeneratingCaption } = useVideoJobs();
  
  // Check if job is approaching 5-minute timeout
  const isApproachingTimeout = ['assembling', 'fetching_video'].includes(job.status);
  const elapsedMs = Date.now() - new Date(job.created_at).getTime();
  const timeoutMs = 5 * 60 * 1000; // 5 minutes
  const remainingMs = Math.max(0, timeoutMs - elapsedMs);
  const isNearTimeout = isApproachingTimeout && elapsedMs > 4 * 60 * 1000; // After 4 minutes

  // Update countdown every second when near timeout
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
  
  // Check if job is stuck in assembling for >5 minutes
  const isStuckAssembling = job.status === 'assembling' && 
    (Date.now() - new Date(job.updated_at).getTime()) > 5 * 60 * 1000;

  // Fetch signed URL for voiceover (only when needed)
  const { signedUrl: voiceoverSignedUrl, isLoading: isLoadingVoiceUrl, error: voiceUrlError } = useSignedUrlLazy(
    job.status === 'awaiting_voice_approval' ? job.voiceover_url : null,
    'generated-content',
    { immediate: true }
  );

  // Diagnostic logging for voiceover review
  useEffect(() => {
    if (job.status === 'awaiting_voice_approval') {
      console.log('=== VOICEOVER REVIEW DEBUG ===');
      console.log('Job status:', job.status);
      console.log('Voiceover URL:', job.voiceover_url);
      console.log('Signed URL:', voiceoverSignedUrl);
      console.log('Is loading signed URL:', isLoadingVoiceUrl);
      console.log('==============================');
    }
  }, [job.status, job.voiceover_url, voiceoverSignedUrl, isLoadingVoiceUrl]);

  // Reset editing state when script changes
  useEffect(() => {
    setEditedScript(job.script || '');
    setEditedVoiceoverScript(job.script || '');
  }, [job.script]);

  // Cleanup audio on unmount or job change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [job.id]);

  // Cleanup states when job becomes failed (cancelled or error)
  useEffect(() => {
    if (job.status === 'failed') {
      // Stop audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      setCurrentTime(0);
      setDuration(0);
      
      // Reset editing states
      setIsEditingScript(false);
      setIsEditingVoiceoverScript(false);
      
      // Clear countdown
      setTimeoutCountdown(null);
    }
  }, [job.status]);

  const handleToggleVoiceover = async () => {
    if (!voiceoverSignedUrl) {
      toast.error('Voiceover URL not ready yet');
      return;
    }
    
    // If audio is playing, pause it
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }
    
    // If audio exists but is paused, resume it
    if (audioRef.current && !isPlayingAudio) {
      audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }
    
    // Verify URL is accessible before creating audio instance
    console.log('[VideoJobCard] Validating voiceover URL:', voiceoverSignedUrl);
    try {
      const testResponse = await fetch(voiceoverSignedUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        console.error('[VideoJobCard] Voiceover URL not accessible:', testResponse.status);
        toast.error(`Voiceover file is not accessible (HTTP ${testResponse.status}). Please try again.`);
        return;
      }
      console.log('[VideoJobCard] ✅ Voiceover URL validation passed');
    } catch (err) {
      console.error('[VideoJobCard] Failed to validate voiceover URL:', err);
      toast.error('Unable to validate voiceover file. Please check your connection.');
      return;
    }
    
    // Create new audio instance
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
      console.error('[VideoJobCard] Audio playback error:', e);
      setIsPlayingAudio(false);
      audioRef.current = null;
      toast.error('Failed to play voiceover. The file may be corrupted or inaccessible.');
    };
    
    audio.play().catch(err => {
      console.error('[VideoJobCard] Failed to start audio playback:', err);
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

  const handleApproveScript = () => {
    const finalScript = isEditingScript ? editedScript : job.script;
    approveScript.mutate({ 
      jobId: job.id, 
      editedScript: isEditingScript && editedScript !== job.script ? editedScript : undefined 
    });
    setIsEditingScript(false);
  };

  const handleApproveVoiceover = () => {
    approveVoiceover.mutate(job.id);
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this video? This action cannot be undone.')) {
      // Stop and cleanup audio immediately
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlayingAudio(false);
      setCurrentTime(0);
      setDuration(0);
      
      // Reset all editing states
      setIsEditingScript(false);
      setIsEditingVoiceoverScript(false);
      setEditedScript(job.script || '');
      setEditedVoiceoverScript(job.script || '');
      
      // Clear countdown
      setTimeoutCountdown(null);
      
      // Now cancel the job
      cancelJob.mutate(job.id);
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

        {/* Script Approval UI */}
        {job.status === 'awaiting_script_approval' && job.script && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
              <AlertCircle className="h-4 w-4" />
              Review Script
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Generated Script:</label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setIsEditingScript(!isEditingScript)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  {isEditingScript ? 'Cancel Edit' : 'Edit Script'}
                </Button>
              </div>
              
              {isEditingScript ? (
                <Textarea
                  value={editedScript}
                  onChange={(e) => setEditedScript(e.target.value)}
                  className="min-h-[150px] text-sm font-mono"
                  placeholder="Edit the script here..."
                />
              ) : (
                <ScrollArea className="h-32 rounded-md border bg-muted/30 p-3">
                  <p className="text-sm whitespace-pre-wrap">{job.script}</p>
                </ScrollArea>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={handleApproveScript}
                disabled={isApprovingScript || isCancelling}
              >
                {isApprovingScript ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Generate Voiceover
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={handleCancel}
                disabled={isApprovingScript || isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Voiceover Approval UI */}
        {job.status === 'awaiting_voice_approval' && job.script && job.voiceover_url && (
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Review Voiceover
              </div>
              {!isEditingVoiceoverScript && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setIsEditingVoiceoverScript(true)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Edit Script
                </Button>
              )}
            </div>
            
            {isEditingVoiceoverScript ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Edit Script to Regenerate Voiceover:</label>
                <Textarea
                  value={editedVoiceoverScript}
                  onChange={(e) => setEditedVoiceoverScript(e.target.value)}
                  className="min-h-[150px] text-sm font-mono"
                  placeholder="Edit the script here..."
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingVoiceoverScript(false);
                      setEditedVoiceoverScript(job.script || '');
                    }}
                    className="flex-1"
                    disabled={isApprovingScript}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Stop audio if playing
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current = null;
                      }
                      setIsPlayingAudio(false);
                      setCurrentTime(0);
                      setDuration(0);
                      
                      approveScript.mutate(
                        { jobId: job.id, editedScript: editedVoiceoverScript },
                        {
                  onSuccess: () => {
                    setIsEditingVoiceoverScript(false);
                  },
                        }
                      );
                    }}
                    className="flex-1"
                    disabled={isApprovingScript || !editedVoiceoverScript.trim()}
                  >
                    {isApprovingScript ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 mr-2" />
                        Regenerate Voiceover
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

                {/* Error Display - Positioned Before Render Button */}
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

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismissError.mutate(job.id)}
                          disabled={isDismissingError}
                        >
                          {isDismissingError ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Dismiss'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveVoiceover.mutate(job.id)}
                          disabled={isApprovingVoiceover}
                        >
                          {isApprovingVoiceover ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Retrying...
                            </>
                          ) : (
                            'Try Again'
                          )}
                        </Button>
                      </div>

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
                    onClick={handleApproveVoiceover}
                    disabled={isApprovingVoiceover || isCancelling}
                  >
                    {isApprovingVoiceover ? (
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
                    onClick={handleCancel}
                    disabled={isApprovingVoiceover || isCancelling}
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
        )}

        {/* Completed Video */}
        {job.status === 'completed' && job.final_video_url && (
          <div className="rounded-lg border-2 border-green-500 bg-green-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-bold text-green-500">Video Completed!</span>
            </div>
            
            {/* Inline Video Player */}
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

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onPreview?.(job)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Full View
                </Button>
              </div>
              
              {/* Generate Caption Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generateCaption.mutate({
                  jobId: job.id,
                  topic: job.topic,
                  script: job.script || ''
                })}
                disabled={isGeneratingCaption || !job.script}
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGeneratingCaption ? 'Generating...' : 'Generate Caption & Hashtags'}
              </Button>
            </div>

            {/* Display AI Caption if available */}
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

            {/* Display AI Hashtags if available */}
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

        {isStuckAssembling && (
          <div className="pt-2 border-t">
            <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                Video Assembly Taking Longer Than Expected
              </AlertTitle>
              <AlertDescription className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                This job has been assembling for over 5 minutes. Try force syncing to check status.
              </AlertDescription>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs border-orange-300 dark:border-orange-800"
                onClick={() => recoverJob.mutate(job.id)}
                disabled={isRecoveringJob}
              >
                {isRecoveringJob ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  'Force Sync'
                )}
              </Button>
            </Alert>
          </div>
        )}

        {isNearTimeout && timeoutCountdown !== null && timeoutCountdown > 0 && (
          <div className="pt-2 border-t">
            <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                Approaching Timeout
              </AlertTitle>
              <AlertDescription className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                This generation is taking longer than expected. It will automatically move to My Creations in {timeoutCountdown} seconds.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {isProcessing && !isStuckAssembling && !isNearTimeout && (
          <div className="text-xs text-muted-foreground italic">
            ⏳ Processing... This usually takes 3-5 minutes
          </div>
        )}
      </CardContent>
    </Card>
  );
}