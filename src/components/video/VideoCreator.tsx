import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

// Step Components
import { StepCollapsible } from './steps/StepCollapsible';
import { TopicStep } from './steps/TopicStep';
import { ScriptReviewStep } from './steps/ScriptReviewStep';
import { VoiceoverSetupStep } from './steps/VoiceoverSetupStep';
import { VoiceoverReviewStep } from './steps/VoiceoverReviewStep';
import { RenderSetupStep } from './steps/RenderSetupStep';
import { Loader2, AlertCircle } from 'lucide-react';

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
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  captionStyle: CaptionStyle;
  selectedBackgroundMedia: SelectedMedia[];
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
  aspectRatio: '4:5',
  captionStyle: captionPresets.modern,
  selectedBackgroundMedia: [],
};

export function VideoCreator() {
  const [state, setState] = useState<VideoCreatorState>(initialState);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { createJob, isCreating } = useVideoJobs();
  const { availableCredits, refetch: refetchCredits } = useUserCredits();

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
        setState((prev) => ({ ...prev, step: 'complete' }));
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
  const handleRegenerateVoiceover = async () => {
    if (!state.jobId) return;

    setError(null);
    setState((prev) => ({ ...prev, step: 'voiceover_generating' }));

    try {
      const { error } = await supabase.functions.invoke('approve-script', {
        body: {
          job_id: state.jobId,
          regenerate: true,
          voiceover_tier: state.voiceoverTier,
        },
      });

      if (error) throw error;
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
    setState(initialState);
    setError(null);
    setIsPolling(false);
  };

  const isProcessing = ['script_generating', 'voiceover_generating', 'rendering'].includes(state.step);

  return (
    <Card className="border-2 w-full overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl sm:text-2xl font-black break-words">
          CREATE FACELESS VIDEO
          <span className="block text-sm font-medium text-muted-foreground mt-1">
            Starting from 0.3 credits per second
          </span>
        </CardTitle>
        <CardDescription className="text-sm">
          Generate professional videos with AI in minutes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 min-w-0 pb-6">
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
              voiceoverTier={state.voiceoverTier}
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
            <AlertDescription className="text-center py-2">
              <p className="font-bold text-primary mb-2">🎉 Video Created Successfully!</p>
              <p className="text-sm text-muted-foreground mb-3">
                Your video is ready. You can find it in the list below.
              </p>
              <button
                onClick={handleReset}
                className="text-primary underline text-sm hover:no-underline"
              >
                Create Another Video
              </button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
