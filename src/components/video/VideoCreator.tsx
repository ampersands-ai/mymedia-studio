import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useVideoJobs } from '@/hooks/useVideoJobs';
import { useUserCredits } from '@/hooks/useUserCredits';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { captionPresets } from '@/config/captionStyles';
import { CaptionStyle } from '@/types/video';
import type { VideoJobInput } from '@/types/video';
import { SelectedMedia } from './BackgroundMediaSelector';
import { downloadFromUrl } from '@/lib/downloads/downloadManager';
import { 
  saveCriticalId, 
  loadCriticalId, 
  clearCriticalId, 
  verifyVideoJob, 
  mapVideoStatusToStep 
} from '@/lib/state-persistence';

// Step Components
import { StepCollapsible } from './steps/StepCollapsible';
import { TopicStep } from './steps/TopicStep';
import { ScriptReviewStep } from './steps/ScriptReviewStep';
import { VoiceoverSetupStep } from './steps/VoiceoverSetupStep';
import { VoiceoverReviewStep } from './steps/VoiceoverReviewStep';
import { RenderSetupStep } from './steps/RenderSetupStep';
import { Loader2, AlertCircle, Download, Sparkles, Copy, Check } from 'lucide-react';

type VideoCreatorStep =
  | 'topic'
  | 'script_generating'
  | 'script_review'
  | 'voiceover_setup'
  | 'voiceover_generating'
  | 'voiceover_review'
  | 'render_setup'
  | 'rendering'
  | 'complete';

interface VideoCreatorState {
  step: VideoCreatorStep;
  jobId: string | null;
  topic: string;
  duration: number;
  style: string;
  script: string;
  voiceId: string;
  voiceName: string;
  voiceoverTier: 'standard' | 'pro';
  voiceoverUrl: string;
  videoUrl: string;
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  captionStyle: CaptionStyle;
  selectedBackgroundMedia: SelectedMedia[];
  caption: string;
  hashtags: string[];
}

const initialState: VideoCreatorState = {
  step: 'topic',
  jobId: null,
  topic: '',
  duration: 60,
  style: 'educational',
  script: '',
  voiceId: 'nPczCjzI2devNBz1zQrb',
  voiceName: 'Brian',
  voiceoverTier: 'standard',
  voiceoverUrl: '',
  videoUrl: '',
  aspectRatio: '4:5',
  captionStyle: captionPresets.modern,
  selectedBackgroundMedia: [],
  caption: '',
  hashtags: [],
};

const FACELESS_VIDEO_DRAFT_KEY = 'faceless_video_draft';
const FACELESS_VIDEO_JOB_KEY = 'faceless_video_job_id'; // Critical ID key
const DRAFT_EXPIRY_HOURS = 24;

export function VideoCreator() {
  const [state, setState] = useState<VideoCreatorState>(initialState);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);

  const queryClient = useQueryClient();
  const { createJob, isCreating } = useVideoJobs();
  const { availableCredits, refetch: refetchCredits } = useUserCredits();

  // Load and verify state from localStorage on mount
  useEffect(() => {
    const loadAndVerifyState = async () => {
      try {
        // First check for critical job ID
        const savedJobId = loadCriticalId(FACELESS_VIDEO_JOB_KEY, DRAFT_EXPIRY_HOURS);
        
        if (savedJobId) {
          // Verify job exists in database
          const jobState = await verifyVideoJob(savedJobId);
          
          if (jobState.exists) {
            // Load full draft state for non-critical fields
            const saved = localStorage.getItem(FACELESS_VIDEO_DRAFT_KEY);
            const savedDraft = saved ? JSON.parse(saved).state : {};
            
            // Sync state with database (DB is source of truth)
            const step = mapVideoStatusToStep(jobState.status || 'pending') as VideoCreatorStep;
            
            setState({
              ...initialState,
              ...savedDraft,
              jobId: savedJobId,
              script: jobState.script || savedDraft.script || '',
              voiceoverUrl: jobState.voiceoverUrl || savedDraft.voiceoverUrl || '',
              videoUrl: jobState.videoUrl || savedDraft.videoUrl || '',
              step,
            });
            
            // Resume polling if in processing state
            if (['script_generating', 'voiceover_generating', 'rendering'].includes(step)) {
              setIsPolling(true);
            }
          } else if (jobState.verified) {
            // Job definitely doesn't exist in DB (verified=true), safe to clear localStorage
            logger.info('Video job not found in database, clearing local state');
            clearCriticalId(FACELESS_VIDEO_JOB_KEY);
            localStorage.removeItem(FACELESS_VIDEO_DRAFT_KEY);
          } else {
            // Couldn't verify (network/auth issue) - preserve existing localStorage state
            logger.warn('Could not verify job, preserving local state');
            const saved = localStorage.getItem(FACELESS_VIDEO_DRAFT_KEY);
            if (saved) {
              const { state: savedState } = JSON.parse(saved);
              setState({
                ...initialState,
                ...savedState,
                jobId: savedJobId,
              });
            }
          }
        } else {
          // No job ID, try loading draft for form inputs only
          const saved = localStorage.getItem(FACELESS_VIDEO_DRAFT_KEY);
          if (saved) {
            const { state: savedState, timestamp } = JSON.parse(saved);
            const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);
            
            if (hoursSince < DRAFT_EXPIRY_HOURS && !savedState.jobId) {
              // Only restore form inputs, not job state
              setState(prev => ({
                ...prev,
                topic: savedState.topic || '',
                duration: savedState.duration || 60,
                style: savedState.style || 'educational',
                voiceId: savedState.voiceId || prev.voiceId,
                voiceName: savedState.voiceName || prev.voiceName,
                aspectRatio: savedState.aspectRatio || '4:5',
              }));
            } else {
              localStorage.removeItem(FACELESS_VIDEO_DRAFT_KEY);
            }
          }
        }
      } catch (e) {
        // Don't clear state on exception - preserve for retry on next load
        logger.error('Failed to load video state', e instanceof Error ? e : new Error(String(e)));
      }
      setIsLoaded(true);
    };

    loadAndVerifyState();
  }, []);

  // Save critical job ID immediately when it changes
  useEffect(() => {
    if (!isLoaded) return;
    saveCriticalId(FACELESS_VIDEO_JOB_KEY, state.jobId);
  }, [state.jobId, isLoaded]);

  // Save full state to localStorage on changes (debounced for non-critical fields)
  useEffect(() => {
    if (!isLoaded) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(FACELESS_VIDEO_DRAFT_KEY, JSON.stringify({
        state,
        timestamp: Date.now()
      }));
    }, 500);
    return () => clearTimeout(timeout);
  }, [state, isLoaded]);

  // Poll for job status updates
  useEffect(() => {
    if (!state.jobId || !isPolling) return;

    const interval = setInterval(async () => {
      const { data: job, error } = await supabase
        .from('video_jobs')
        .select('*')
        .eq('id', state.jobId)
        .single();

      if (error) {
        logger.error('Error polling job', error);
        return;
      }

      // Update state based on job status
      if (job.status === 'awaiting_script_approval' && state.step === 'script_generating') {
        setState((prev) => ({
          ...prev,
          step: 'script_review',
          script: job.script || '',
        }));
        setIsPolling(false);
      } else if (job.status === 'awaiting_voice_approval' && state.step === 'voiceover_generating') {
        setState((prev) => ({
          ...prev,
          step: 'voiceover_review',
          voiceoverUrl: job.voiceover_url || '',
        }));
        setIsPolling(false);
        refetchCredits();
      } else if (job.status === 'completed' && state.step === 'rendering') {
        setState((prev) => ({ ...prev, step: 'complete', videoUrl: job.final_video_url || '' }));
        setIsPolling(false);
        queryClient.invalidateQueries({ queryKey: ['video-jobs'] });
        refetchCredits();
      } else if (job.status === 'failed') {
        setError(job.error_message || 'An error occurred');
        setIsPolling(false);
        // Reset to appropriate step based on where we were
        if (state.step === 'script_generating') {
          setState((prev) => ({ ...prev, step: 'topic' }));
        } else if (state.step === 'voiceover_generating') {
          setState((prev) => ({ ...prev, step: 'voiceover_setup' }));
        } else if (state.step === 'rendering') {
          setState((prev) => ({ ...prev, step: 'render_setup' }));
        }
        refetchCredits();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.jobId, state.step, isPolling, refetchCredits, queryClient]);

  // Handle Generate Script
  const handleGenerateScript = async () => {
    if (!state.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setError(null);
    setState((prev) => ({ ...prev, step: 'script_generating' }));

    try {
      const result = await new Promise<{ job: { id: string } }>((resolve, reject) => {
        createJob.mutate(
          {
            topic: state.topic.trim(),
            duration: state.duration,
            style: state.style as VideoJobInput['style'],
            voice_id: state.voiceId,
            voice_name: state.voiceName,
            aspect_ratio: state.aspectRatio,
            background_video_url: state.selectedBackgroundMedia[0]?.url,
            background_video_thumbnail: state.selectedBackgroundMedia[0]?.thumbnail,
            background_media_type: state.selectedBackgroundMedia[0]?.type || 'video',
            caption_style: state.captionStyle,
          },
          {
            onSuccess: (data) => resolve(data),
            onError: (err) => reject(err),
          }
        );
      });

      setState((prev) => ({ ...prev, jobId: result.job.id }));
      setIsPolling(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to create video job', error);
      setError(error.message);
      setState((prev) => ({ ...prev, step: 'topic' }));
    }
  };

  // Handle Script Continue
  const handleScriptContinue = () => {
    setState((prev) => ({ ...prev, step: 'voiceover_setup' }));
  };

  // Handle Generate Voiceover
  const handleGenerateVoiceover = async () => {
    if (!state.jobId) return;

    setError(null);
    setState((prev) => ({ ...prev, step: 'voiceover_generating' }));

    try {
      // Update job with voiceover tier
      await supabase
        .from('video_jobs')
        .update({ voiceover_tier: state.voiceoverTier })
        .eq('id', state.jobId);

      const { error } = await supabase.functions.invoke('approve-script', {
        body: {
          job_id: state.jobId,
          edited_script: state.script,
          voiceover_tier: state.voiceoverTier,
        },
      });

      if (error) throw error;
      setIsPolling(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to generate voiceover', error);
      setError(error.message);
      setState((prev) => ({ ...prev, step: 'voiceover_setup' }));
    }
  };

  // Handle Regenerate Voiceover
  const handleRegenerateVoiceover = async (tier: 'standard' | 'pro') => {
    if (!state.jobId) return;

    setError(null);
    setState((prev) => ({ ...prev, step: 'voiceover_generating', voiceoverTier: tier }));

    try {
      const { error } = await supabase.functions.invoke('approve-script', {
        body: {
          job_id: state.jobId,
          regenerate: true,
          voiceover_tier: tier,
        },
      });

      if (error) throw error;
      
      // Immediately refresh credits since they're deducted on API call
      refetchCredits();
      
      setIsPolling(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to regenerate voiceover', error);
      setError(error.message);
      setState((prev) => ({ ...prev, step: 'voiceover_review' }));
    }
  };

  // Handle Voiceover Continue
  const handleVoiceoverContinue = () => {
    setState((prev) => ({ ...prev, step: 'render_setup' }));
  };

  // Handle Render Video
  const handleRenderVideo = async () => {
    if (!state.jobId) return;

    setError(null);

    try {
      // Verify job is in correct status before proceeding
      const { data: job, error: jobError } = await supabase
        .from('video_jobs')
        .select('status, voiceover_url')
        .eq('id', state.jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Failed to verify job status');
      }

      // Check if voiceover has been generated
      if (job.status !== 'awaiting_voice_approval' || !job.voiceover_url) {
        setError('Please generate a voiceover before rendering the video');
        setState((prev) => ({ ...prev, step: 'voiceover_setup' }));
        return;
      }

      setState((prev) => ({ ...prev, step: 'rendering' }));

      // Update job with final settings
      await supabase
        .from('video_jobs')
        .update({
          aspect_ratio: state.aspectRatio,
          caption_style: state.captionStyle,
          custom_background_video: state.selectedBackgroundMedia[0]?.url || null,
          background_video_thumbnail: state.selectedBackgroundMedia[0]?.thumbnail || null,
        })
        .eq('id', state.jobId);

      const { error } = await supabase.functions.invoke('approve-voiceover', {
        body: {
          job_id: state.jobId,
          background_media: state.selectedBackgroundMedia,
        },
      });

      if (error) throw error;
      setIsPolling(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Failed to render video', error);
      setError(error.message);
      setState((prev) => ({ ...prev, step: 'render_setup' }));
    }
  };

  // Reset to create new video
  const handleReset = () => {
    clearCriticalId(FACELESS_VIDEO_JOB_KEY);
    localStorage.removeItem(FACELESS_VIDEO_DRAFT_KEY);
    setState(initialState);
    setError(null);
    setIsPolling(false);
  };

  // Generate caption and hashtags
  const handleGenerateCaption = async () => {
    if (!state.jobId || !state.script) return;
    
    setIsGeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-caption', {
        body: {
          video_job_id: state.jobId,
          prompt: state.script,
          content_type: 'video'
        }
      });

      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        caption: data.caption || '',
        hashtags: data.hashtags || []
      }));
      refetchCredits();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate caption';
      toast.error(errorMsg);
      logger.error('Caption generation failed', err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Copy to clipboard handlers
  const handleCopyCaption = async () => {
    if (!state.caption) return;
    await navigator.clipboard.writeText(state.caption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleCopyHashtags = async () => {
    if (!state.hashtags.length) return;
    await navigator.clipboard.writeText(state.hashtags.join(' '));
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const isProcessing = ['script_generating', 'voiceover_generating', 'rendering'].includes(state.step);

  return (
    <Card className="border-2 w-full overflow-hidden">
      <CardContent className="space-y-3 min-w-0 py-6">
        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Topic Setup */}
        <StepCollapsible
          stepNumber={1}
          title="Topic & Settings"
          subtitle={state.topic ? `${state.topic.slice(0, 30)}...` : undefined}
          isActive={state.step === 'topic' || state.step === 'script_generating'}
          isComplete={['script_review', 'voiceover_setup', 'voiceover_generating', 'voiceover_review', 'render_setup', 'rendering', 'complete'].includes(state.step)}
          isDisabled={false}
          summary={state.topic ? `${state.duration}s • ${state.style}` : undefined}
        >
          {state.step === 'script_generating' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating your script...</p>
            </div>
          ) : (
            <TopicStep
              topic={state.topic}
              duration={state.duration}
              style={state.style}
              onTopicChange={(topic) => setState((prev) => ({ ...prev, topic }))}
              onDurationChange={(duration) => setState((prev) => ({ ...prev, duration }))}
              onStyleChange={(style) => setState((prev) => ({ ...prev, style }))}
              onGenerateScript={handleGenerateScript}
              isGenerating={isCreating}
              isDisabled={isProcessing}
              availableCredits={availableCredits}
            />
          )}
        </StepCollapsible>

        {/* Step 2: Script Review */}
        <StepCollapsible
          stepNumber={2}
          title="Review Script"
          isActive={state.step === 'script_review'}
          isComplete={['voiceover_setup', 'voiceover_generating', 'voiceover_review', 'render_setup', 'rendering', 'complete'].includes(state.step)}
          isDisabled={state.step === 'topic' || state.step === 'script_generating'}
          summary={state.script ? `${state.script.split(/\s+/).length} words` : undefined}
        >
          <ScriptReviewStep
            script={state.script}
            onScriptChange={(script) => setState((prev) => ({ ...prev, script }))}
            onContinue={handleScriptContinue}
            isDisabled={isProcessing}
          />
        </StepCollapsible>

        {/* Step 3: Voiceover Setup */}
        <StepCollapsible
          stepNumber={3}
          title="Voiceover"
          subtitle={state.voiceName}
          isActive={state.step === 'voiceover_setup' || state.step === 'voiceover_generating'}
          isComplete={['voiceover_review', 'render_setup', 'rendering', 'complete'].includes(state.step)}
          isDisabled={!['voiceover_setup', 'voiceover_generating', 'voiceover_review', 'render_setup', 'rendering', 'complete'].includes(state.step)}
          summary={`${state.voiceName} • ${state.voiceoverTier}`}
        >
          {state.step === 'voiceover_generating' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating voiceover...</p>
            </div>
          ) : (
            <VoiceoverSetupStep
              voiceId={state.voiceId}
              voiceName={state.voiceName}
              voiceoverTier={state.voiceoverTier}
              scriptLength={state.script.length}
              onVoiceChange={(id, name) => setState((prev) => ({ ...prev, voiceId: id, voiceName: name }))}
              onTierChange={(tier) => setState((prev) => ({ ...prev, voiceoverTier: tier }))}
              onGenerateVoiceover={handleGenerateVoiceover}
              isGenerating={false}
              isDisabled={isProcessing || state.step !== 'voiceover_setup'}
              availableCredits={availableCredits}
            />
          )}
        </StepCollapsible>

        {/* Step 4: Voiceover Review */}
        <StepCollapsible
          stepNumber={4}
          title="Review Voiceover"
          isActive={state.step === 'voiceover_review'}
          isComplete={['render_setup', 'rendering', 'complete'].includes(state.step)}
          isDisabled={!['voiceover_review', 'render_setup', 'rendering', 'complete'].includes(state.step)}
        >
          {state.voiceoverUrl && (
            <VoiceoverReviewStep
              voiceoverUrl={state.voiceoverUrl}
              scriptLength={state.script.length}
              onRegenerate={handleRegenerateVoiceover}
              onContinue={handleVoiceoverContinue}
              isRegenerating={state.step === 'voiceover_generating'}
              isDisabled={isProcessing || state.step !== 'voiceover_review'}
              availableCredits={availableCredits}
            />
          )}
        </StepCollapsible>

        {/* Step 5: Render Setup */}
        <StepCollapsible
          stepNumber={5}
          title="Render Video"
          isActive={state.step === 'render_setup' || state.step === 'rendering'}
          isComplete={state.step === 'complete'}
          isDisabled={!['render_setup', 'rendering', 'complete'].includes(state.step)}
          summary={state.aspectRatio}
        >
          {state.step === 'rendering' ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Rendering your video...</p>
              <p className="text-xs text-muted-foreground">This may take a few minutes</p>
            </div>
          ) : (
            <RenderSetupStep
              aspectRatio={state.aspectRatio}
              captionStyle={state.captionStyle}
              selectedBackgroundMedia={state.selectedBackgroundMedia}
              duration={state.duration}
              style={state.style}
              onAspectRatioChange={(ratio) => setState((prev) => ({ ...prev, aspectRatio: ratio }))}
              onCaptionStyleChange={(style) => setState((prev) => ({ ...prev, captionStyle: style }))}
              onBackgroundMediaChange={(media) => setState((prev) => ({ ...prev, selectedBackgroundMedia: media }))}
              onRenderVideo={handleRenderVideo}
              isRendering={false}
              isDisabled={isProcessing || state.step !== 'render_setup'}
            />
          )}
        </StepCollapsible>

        {/* Complete State */}
        {state.step === 'complete' && (
          <Alert className="bg-primary/10 border-primary/30">
            <AlertDescription className="py-4">
              <p className="font-bold text-primary mb-4 text-center">🎉 Video Created Successfully!</p>
              
              {state.videoUrl && (
                <div className="mb-4 rounded-lg overflow-hidden bg-black/50">
                  <video 
                    src={state.videoUrl} 
                    controls 
                    className="w-full max-h-[400px] object-contain"
                    autoPlay={false}
                  />
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <Button
                  onClick={() => downloadFromUrl(state.videoUrl, { 
                    filename: `faceless-video-${state.jobId}.mp4` 
                  })}
                  className="min-h-[44px]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Video
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleGenerateCaption}
                  disabled={isGeneratingCaption}
                  className="min-h-[44px]"
                >
                  {isGeneratingCaption ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isGeneratingCaption ? 'Generating...' : 'Generate Caption & Hashtags'}
                </Button>
              </div>

              {/* Generated Caption & Hashtags */}
              {state.caption && (
                <div className="space-y-3 text-left bg-background/50 rounded-lg p-4 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Caption</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyCaption}
                        className="h-6 px-2"
                      >
                        {copiedCaption ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm">{state.caption}</p>
                  </div>
                  
                  {state.hashtags.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-muted-foreground">Hashtags</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyHashtags}
                          className="h-6 px-2"
                        >
                          {copiedHashtags ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-primary">{state.hashtags.join(' ')}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-center">
                <button
                  onClick={handleReset}
                  className="text-primary underline text-sm hover:no-underline"
                >
                  Create Another Video
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
