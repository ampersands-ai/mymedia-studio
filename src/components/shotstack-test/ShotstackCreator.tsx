import { useState, useEffect } from 'react';
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
import { ShotstackConfigStep } from './steps/ShotstackConfigStep';
import { ShotstackRenderingStep } from './steps/ShotstackRenderingStep';

type ShotstackStep = 'config' | 'rendering' | 'complete';

interface ShotstackState {
  step: ShotstackStep;
  renderId: string | null;
  // Config
  videoUrl: string;
  textOverlay: string;
  backgroundColor: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '4:5' | '1:1';
  // Result
  outputUrl: string;
  renderProgress: number;
}

const initialState: ShotstackState = {
  step: 'config',
  renderId: null,
  videoUrl: 'https://shotstack-assets.s3.ap-southeast-2.amazonaws.com/footage/beach-overhead.mp4',
  textOverlay: 'Hello Shotstack!',
  backgroundColor: '#000000',
  duration: 5,
  aspectRatio: '16:9',
  outputUrl: '',
  renderProgress: 0,
};

const componentLogger = logger.child({ component: 'ShotstackCreator' });

export function ShotstackCreator() {
  const [state, setState] = useState<ShotstackState>(initialState);
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
          setState(prev => ({ ...prev, step: 'config' }));
          setIsPolling(false);
        } else {
          // Update progress
          setState(prev => ({
            ...prev,
            renderProgress: data.progress || prev.renderProgress
          }));
        }
      } catch (err) {
        componentLogger.error('Status check failed', err instanceof Error ? err : new Error(String(err)));
        // Don't stop polling on transient errors
      }
    };

    // Initial check after 3 seconds
    const initialTimeout = setTimeout(checkStatus, 3000);
    
    // Then check every 5 seconds
    const pollInterval = setInterval(checkStatus, 5000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
    };
  }, [state.renderId, isPolling]);

  // Handle Submit Render
  const handleSubmitRender = async () => {
    setError(null);
    
    if (!state.videoUrl.trim()) {
      toast.error('Please enter a video URL');
      return;
    }

    setState(prev => ({ ...prev, step: 'rendering', renderProgress: 0 }));

    try {
      // Build Shotstack timeline payload
      const aspectDimensions = {
        '16:9': { width: 1920, height: 1080 },
        '9:16': { width: 1080, height: 1920 },
        '4:5': { width: 1080, height: 1350 },
        '1:1': { width: 1080, height: 1080 },
      };

      const { width, height } = aspectDimensions[state.aspectRatio];

      const payload = {
        timeline: {
          background: state.backgroundColor,
          tracks: [
            // Text overlay track (on top)
            ...(state.textOverlay.trim() ? [{
              clips: [{
                asset: {
                  type: 'title',
                  text: state.textOverlay,
                  style: 'subtitle',
                  color: '#ffffff',
                  size: 'medium',
                  position: 'bottom'
                },
                start: 0,
                length: state.duration
              }]
            }] : []),
            // Video track
            {
              clips: [{
                asset: {
                  type: 'video',
                  src: state.videoUrl
                },
                start: 0,
                length: state.duration
              }]
            }
          ]
        },
        output: {
          format: 'mp4',
          resolution: 'hd',
          size: { width, height }
        }
      };

      const { data, error: funcError } = await supabase.functions.invoke('shotstack-test-render', {
        body: { payload }
      });

      if (funcError) throw funcError;
      if (data.error) throw new Error(data.error);

      if (data.renderId) {
        setState(prev => ({ ...prev, renderId: data.renderId }));
        setIsPolling(true);
        toast.success('Render submitted to Shotstack');
      } else {
        throw new Error('No render ID returned');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit render';
      componentLogger.error('Render submission failed', err instanceof Error ? err : new Error(String(err)));
      setError(errorMsg);
      setState(prev => ({ ...prev, step: 'config' }));
    }
  };

  // Reset to start over
  const handleReset = () => {
    setState(initialState);
    setError(null);
    setIsPolling(false);
    setElapsedSeconds(0);
    toast.success('Ready for a new test!');
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

  const isProcessing = state.step === 'rendering';

  return (
    <Card className="border-2 w-full overflow-hidden">
      <CardContent className="space-y-3 min-w-0 py-6">
        {/* Reset Button */}
        {state.step !== 'config' && (
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
                  <AlertDialogTitle>Reset Test?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear your current configuration and any in-progress render.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, Reset
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

        {/* Step 1: Configuration */}
        <StepCollapsible
          stepNumber={1}
          title="Configure Render"
          isActive={state.step === 'config'}
          isComplete={state.step !== 'config'}
          isDisabled={isProcessing}
        >
          <ShotstackConfigStep
            videoUrl={state.videoUrl}
            textOverlay={state.textOverlay}
            backgroundColor={state.backgroundColor}
            duration={state.duration}
            aspectRatio={state.aspectRatio}
            onVideoUrlChange={(url) => setState(prev => ({ ...prev, videoUrl: url }))}
            onTextOverlayChange={(text) => setState(prev => ({ ...prev, textOverlay: text }))}
            onBackgroundColorChange={(color) => setState(prev => ({ ...prev, backgroundColor: color }))}
            onDurationChange={(dur) => setState(prev => ({ ...prev, duration: dur }))}
            onAspectRatioChange={(ratio) => setState(prev => ({ ...prev, aspectRatio: ratio }))}
            onSubmit={handleSubmitRender}
            isDisabled={isProcessing}
          />
        </StepCollapsible>

        {/* Step 2: Rendering */}
        <StepCollapsible
          stepNumber={2}
          title="Rendering"
          isActive={state.step === 'rendering'}
          isComplete={state.step === 'complete'}
          isDisabled={state.step === 'config'}
        >
          <ShotstackRenderingStep
            progress={state.renderProgress}
            elapsedTime={formatTime(elapsedSeconds)}
            isRendering={state.step === 'rendering'}
          />
        </StepCollapsible>

        {/* Step 3: Complete */}
        <StepCollapsible
          stepNumber={3}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                >
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
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={state.outputUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </a>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={state.outputUrl} download="shotstack-test.mp4">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>

              {/* Render Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Render ID:</strong> {state.renderId}</p>
                <p><strong>Duration:</strong> {state.duration}s</p>
                <p><strong>Aspect Ratio:</strong> {state.aspectRatio}</p>
              </div>

              {/* New Test Button */}
              <Button onClick={handleReset} className="w-full">
                <Video className="mr-2 h-4 w-4" />
                Run Another Test
              </Button>
            </div>
          )}
        </StepCollapsible>
      </CardContent>
    </Card>
  );
}
