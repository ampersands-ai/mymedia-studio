import { VideoJob } from '@/types/video';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Eye, Clock, AlertCircle, Play, XCircle, Volume2, Edit, Pause } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useSignedUrlLazy } from '@/hooks/useSignedUrlLazy';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { approveScript, isApprovingScript, approveVoiceover, isApprovingVoiceover, cancelJob, isCancelling } = useVideoJobs();

  // Fetch signed URL for voiceover (only when needed)
  const { signedUrl: voiceoverSignedUrl, isLoading: isLoadingVoiceUrl, error: voiceUrlError } = useSignedUrlLazy(
    job.status === 'awaiting_voice_approval' ? job.voiceover_url : null,
    'video-assets',
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

  const handleToggleVoiceover = () => {
    if (!voiceoverSignedUrl) {
      toast.error('Voiceover URL not ready');
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
    
    // Create new audio instance
    const audio = new Audio(voiceoverSignedUrl);
    audioRef.current = audio;
    setIsPlayingAudio(true);
    
    audio.onended = () => {
      setIsPlayingAudio(false);
      audioRef.current = null;
    };
    
    audio.onerror = () => {
      setIsPlayingAudio(false);
      audioRef.current = null;
      toast.error('Failed to play voiceover');
    };
    
    audio.play();
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
                      approveScript.mutate(
                        { jobId: job.id, editedScript: editedVoiceoverScript },
                        {
                          onSuccess: () => {
                            setIsEditingVoiceoverScript(false);
                            toast.success('Regenerating voiceover with updated script...');
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
                  <ScrollArea className="h-24 rounded-md border bg-muted/30 p-3">
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

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Voiceover Preview:</label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleToggleVoiceover}
                    disabled={isLoadingVoiceUrl || !voiceoverSignedUrl || voiceUrlError}
                  >
                    {isLoadingVoiceUrl ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : isPlayingAudio ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Voiceover
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
              onClick={handleDownload}
            >
              <Download className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
              Download
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