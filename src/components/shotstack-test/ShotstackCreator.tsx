import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { AlertCircle, Download, RefreshCw, CheckCircle2, Video, ExternalLink, Copy, Check } from 'lucide-react';

// Step Components
import { StepCollapsible } from '@/components/video/steps/StepCollapsible';
import { ShotstackTopicStep, AspectRatio, VideoStyle } from './steps/ShotstackTopicStep';
import { ShotstackScenesStep, ShotstackScene } from './steps/ShotstackScenesStep';
import { ShotstackRenderingStep } from './steps/ShotstackRenderingStep';

type ShotstackStep = 'topic' | 'scenes' | 'rendering' | 'complete';

interface ShotstackState {
  step: ShotstackStep;
  // Topic step
  topic: string;
  duration: number;
  style: VideoStyle;
  aspectRatio: AspectRatio;
  // Scenes step
  scenes: ShotstackScene[];
  // Render step
  renderId: string | null;
  outputUrl: string;
  renderProgress: number;
}

const initialState: ShotstackState = {
  step: 'topic',
  topic: '',
  duration: 30,
  style: 'cinematic',
  aspectRatio: '16:9',
  scenes: [],
  renderId: null,
  outputUrl: '',
  renderProgress: 0,
};

const componentLogger = logger.child({ component: 'ShotstackCreator' });

export function ShotstackCreator() {
  const [state, setState] = useState<ShotstackState>(initialState);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Timer for rendering step
  useEffect(() => {
    if (state.step !== 'rendering') {
      setElapsedSeconds(0);
      return;
    }
    
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.step]);

  // Poll for render status
  useEffect(() => {
    if (!state.renderId || !isPolling) return;

    const checkStatus = async () => {
      try {
        const { data, error: funcError } = await supabase.functions.invoke('check-video-status', {
          body: { render_id: state.renderId }
        });

        if (funcError) throw funcError;

        componentLogger.debug('Shotstack status check', { status: data.status, progress: data.progress });

        if (data.status === 'done' && data.url) {
          setState(prev => ({
            ...prev,
            step: 'complete',
            outputUrl: data.url,
            renderProgress: 100
          }));
          setIsPolling(false);
          toast.success('Video rendered successfully!');
        } else if (data.status === 'failed') {
          setError('Render failed. Please try again.');
          setState(prev => ({ ...prev, step: 'scenes' }));
          setIsPolling(false);
        } else {
          setState(prev => ({
            ...prev,
            renderProgress: data.progress || prev.renderProgress
          }));
        }
      } catch (err) {
        componentLogger.error('Status check failed', err instanceof Error ? err : new Error(String(err)));
      }
    };

    const initialTimeout = setTimeout(checkStatus, 3000);
    const pollInterval = setInterval(checkStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
    };
  }, [state.renderId, isPolling]);

  // Generate storyboard from topic
  const handleGenerateStoryboard = async () => {
    setError(null);
    setIsGeneratingStoryboard(true);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('generate-shotstack-storyboard', {
        body: {
          topic: state.topic,
          duration: state.duration,
          style: state.style,
          aspectRatio: state.aspectRatio,
        }
      });

      if (funcError) throw funcError;
      if (data.error) throw new Error(data.error);

      if (!data.scenes || data.scenes.length === 0) {
        throw new Error('No scenes generated');
      }

      // Transform scenes to our format with IDs
      const scenes: ShotstackScene[] = data.scenes.map((scene: any, index: number) => ({
        id: crypto.randomUUID(),
        sceneNumber: scene.sceneNumber || index + 1,
        voiceoverText: scene.voiceoverText,
        imagePrompt: scene.imagePrompt,
        imageUrl: null,
        isGeneratingImage: false,
      }));

      setState(prev => ({
        ...prev,
        step: 'scenes',
        scenes,
      }));

      toast.success(`Generated ${scenes.length} scenes!`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate storyboard';
      componentLogger.error('Storyboard generation failed', err instanceof Error ? err : new Error(String(err)));
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  };

  // Update a scene field
  const handleSceneUpdate = (sceneId: string, field: 'voiceoverText' | 'imagePrompt', value: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(scene =>
        scene.id === sceneId ? { ...scene, [field]: value } : scene
      ),
    }));
  };

  // Generate image for a single scene
  const handleGenerateImage = useCallback(async (sceneId: string) => {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;

    // Mark as generating
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s =>
        s.id === sceneId ? { ...s, isGeneratingImage: true } : s
      ),
    }));

    try {
      // Use Nano banana (gemini-2.5-flash-image) for image generation
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          model_id: 'nano-banana', // Lovable AI image generation
          prompt: scene.imagePrompt,
          parameters: {
            aspectRatio: state.aspectRatio,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Image generation failed');
      }

      const data = await response.json();
      
      if (!data.output_url) {
        throw new Error('No image URL returned');
      }

      // Update scene with image URL
      setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(s =>
          s.id === sceneId ? { ...s, imageUrl: data.output_url, isGeneratingImage: false } : s
        ),
      }));

      toast.success(`Scene ${scene.sceneNumber} image generated!`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate image';
      componentLogger.error('Image generation failed', err instanceof Error ? err : new Error(String(err)));
      toast.error(errorMsg);

      // Reset generating state
      setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(s =>
          s.id === sceneId ? { ...s, isGeneratingImage: false } : s
        ),
      }));
    }
  }, [state.scenes, state.aspectRatio]);

  // Generate all images
  const handleGenerateAllImages = async () => {
    setIsGeneratingAllImages(true);
    const scenesToGenerate = state.scenes.filter(s => !s.imageUrl);

    for (const scene of scenesToGenerate) {
      await handleGenerateImage(scene.id);
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsGeneratingAllImages(false);
  };

  // Render video with Shotstack
  const handleRenderVideo = async () => {
    setError(null);
    setState(prev => ({ ...prev, step: 'rendering', renderProgress: 0 }));

    try {
      const { data, error: funcError } = await supabase.functions.invoke('shotstack-render-video', {
        body: {
          scenes: state.scenes.map(s => ({
            id: s.id,
            sceneNumber: s.sceneNumber,
            voiceoverText: s.voiceoverText,
            imageUrl: s.imageUrl,
          })),
          aspectRatio: state.aspectRatio,
        }
      });

      if (funcError) throw funcError;
      if (data.error) throw new Error(data.error);

      if (data.renderId) {
        setState(prev => ({ ...prev, renderId: data.renderId }));
        setIsPolling(true);
        toast.success('Render submitted to Shotstack!');
      } else {
        throw new Error('No render ID returned');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit render';
      componentLogger.error('Render submission failed', err instanceof Error ? err : new Error(String(err)));
      setError(errorMsg);
      setState(prev => ({ ...prev, step: 'scenes' }));
    }
  };

  // Reset to start over
  const handleReset = () => {
    setState(initialState);
    setError(null);
    setIsPolling(false);
    setElapsedSeconds(0);
    setIsGeneratingStoryboard(false);
    setIsGeneratingAllImages(false);
    toast.success('Ready for a new video!');
  };

  // Copy URL to clipboard
  const handleCopyUrl = async () => {
    if (!state.outputUrl) return;
    await navigator.clipboard.writeText(state.outputUrl);
    setCopiedUrl(true);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isProcessing = state.step === 'rendering' || isGeneratingStoryboard;

  return (
    <Card className="border-2 w-full overflow-hidden">
      <CardContent className="space-y-3 min-w-0 py-6">
        {/* Reset Button */}
        {state.step !== 'topic' && (
          <div className="flex justify-end -mt-2 mb-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start Over?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear your current storyboard and any in-progress work.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Start Over
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: Topic & Settings */}
        <StepCollapsible
          stepNumber={1}
          title="Topic & Settings"
          isActive={state.step === 'topic'}
          isComplete={state.step !== 'topic'}
          isDisabled={isProcessing}
        >
          <ShotstackTopicStep
            topic={state.topic}
            duration={state.duration}
            style={state.style}
            aspectRatio={state.aspectRatio}
            onTopicChange={(topic) => setState(prev => ({ ...prev, topic }))}
            onDurationChange={(duration) => setState(prev => ({ ...prev, duration }))}
            onStyleChange={(style) => setState(prev => ({ ...prev, style }))}
            onAspectRatioChange={(aspectRatio) => setState(prev => ({ ...prev, aspectRatio }))}
            onGenerateStoryboard={handleGenerateStoryboard}
            isGenerating={isGeneratingStoryboard}
            isDisabled={isProcessing}
          />
        </StepCollapsible>

        {/* Step 2: Scenes & Images */}
        <StepCollapsible
          stepNumber={2}
          title="Scenes & Images"
          isActive={state.step === 'scenes'}
          isComplete={state.step === 'rendering' || state.step === 'complete'}
          isDisabled={state.step === 'topic'}
        >
          <ShotstackScenesStep
            scenes={state.scenes}
            onSceneUpdate={handleSceneUpdate}
            onGenerateImage={handleGenerateImage}
            onGenerateAllImages={handleGenerateAllImages}
            onRenderVideo={handleRenderVideo}
            isGeneratingAll={isGeneratingAllImages}
            isDisabled={isProcessing}
          />
        </StepCollapsible>

        {/* Step 3: Rendering */}
        <StepCollapsible
          stepNumber={3}
          title="Rendering"
          isActive={state.step === 'rendering'}
          isComplete={state.step === 'complete'}
          isDisabled={state.step === 'topic' || state.step === 'scenes'}
        >
          <ShotstackRenderingStep
            progress={state.renderProgress}
            elapsedTime={formatTime(elapsedSeconds)}
            isRendering={state.step === 'rendering'}
          />
        </StepCollapsible>

        {/* Step 4: Complete */}
        <StepCollapsible
          stepNumber={4}
          title="Complete"
          isActive={state.step === 'complete'}
          isComplete={false}
          isDisabled={state.step !== 'complete'}
        >
          {state.step === 'complete' && state.outputUrl && (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Video rendered successfully!</span>
              </div>

              {/* Video Preview */}
              <div className="rounded-lg overflow-hidden border-2 bg-background">
                <video
                  src={state.outputUrl}
                  controls
                  className="w-full max-h-[400px] object-contain"
                  preload="metadata"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                  {copiedUrl ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy URL
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={state.outputUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={state.outputUrl} download="shotstack-video.mp4">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>

              {/* Render Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Topic:</strong> {state.topic}</p>
                <p><strong>Scenes:</strong> {state.scenes.length}</p>
                <p><strong>Duration:</strong> {state.scenes.length * 5}s</p>
                <p><strong>Render ID:</strong> {state.renderId}</p>
              </div>

              {/* New Video Button */}
              <Button onClick={handleReset} className="w-full">
                <Video className="mr-2 h-4 w-4" />
                Create Another Video
              </Button>
            </div>
          )}
        </StepCollapsible>
      </CardContent>
    </Card>
  );
}
