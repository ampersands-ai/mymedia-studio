import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Video, 
  Play, 
  Download, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Zap
} from 'lucide-react';

type RenderStatus = 'idle' | 'submitting' | 'rendering' | 'done' | 'failed';

interface ShotstackTestState {
  videoUrl: string;
  textOverlay: string;
  backgroundColor: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  renderId: string | null;
  finalVideoUrl: string | null;
  status: RenderStatus;
  progress: number;
  error: string | null;
}

const initialState: ShotstackTestState = {
  videoUrl: '',
  textOverlay: 'Hello Shotstack!',
  backgroundColor: '#000000',
  duration: 5,
  aspectRatio: '16:9',
  renderId: null,
  finalVideoUrl: null,
  status: 'idle',
  progress: 0,
  error: null,
};

export default function ShotstackTest() {
  const [state, setState] = useState<ShotstackTestState>(initialState);
  const [, setIsPolling] = useState(false);

  // Build Shotstack timeline payload
  const buildPayload = () => {
    const resolutions: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 },
    };

    const { width, height } = resolutions[state.aspectRatio];

    const tracks: any[] = [];

    // Video/Image track
    if (state.videoUrl) {
      tracks.push({
        clips: [
          {
            asset: {
              type: 'video',
              src: state.videoUrl,
            },
            start: 0,
            length: state.duration,
            fit: 'cover',
          },
        ],
      });
    } else {
      // Solid color background if no video
      tracks.push({
        clips: [
          {
            asset: {
              type: 'html',
              html: `<div style="width:100%;height:100%;background:${state.backgroundColor}"></div>`,
              width,
              height,
            },
            start: 0,
            length: state.duration,
          },
        ],
      });
    }

    // Text overlay track
    if (state.textOverlay) {
      tracks.unshift({
        clips: [
          {
            asset: {
              type: 'title',
              text: state.textOverlay,
              style: 'future',
              size: 'medium',
            },
            start: 0,
            length: state.duration,
            position: 'center',
          },
        ],
      });
    }

    return {
      timeline: {
        background: state.backgroundColor,
        tracks,
      },
      output: {
        format: 'mp4',
        resolution: 'hd',
        fps: 30,
        size: {
          width,
          height,
        },
      },
    };
  };

  // Submit render
  const handleSubmit = async () => {
    setState(prev => ({ ...prev, status: 'submitting', error: null, progress: 10 }));

    try {
      const payload = buildPayload();
      console.log('[ShotstackTest] Submitting payload:', JSON.stringify(payload, null, 2));

      const { data, error } = await supabase.functions.invoke('shotstack-test-render', {
        body: { payload },
      });

      if (error) throw new Error(error.message);

      if (!data?.renderId) {
        throw new Error('No render ID returned');
      }

      setState(prev => ({
        ...prev,
        renderId: data.renderId,
        status: 'rendering',
        progress: 30,
      }));

      toast.success('Render submitted to Shotstack!');
      startPolling(data.renderId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit render';
      setState(prev => ({ ...prev, status: 'failed', error: message }));
      toast.error(message);
    }
  };

  // Poll for status
  const startPolling = (renderId: string) => {
    setIsPolling(true);

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-video-status', {
          body: { render_id: renderId },
        });

        if (error) throw new Error(error.message);

        console.log('[ShotstackTest] Status:', data);

        if (data.status === 'done') {
          setState(prev => ({
            ...prev,
            status: 'done',
            finalVideoUrl: data.url,
            progress: 100,
          }));
          setIsPolling(false);
          toast.success('Video rendered successfully!');
          return;
        }

        if (data.status === 'failed') {
          setState(prev => ({
            ...prev,
            status: 'failed',
            error: 'Render failed on Shotstack',
          }));
          setIsPolling(false);
          toast.error('Render failed');
          return;
        }

        // Update progress
        const progress = Math.min(30 + (data.progress || 0) * 0.7, 95);
        setState(prev => ({ ...prev, progress }));

        // Continue polling
        setTimeout(poll, 3000);
      } catch (err) {
        console.error('[ShotstackTest] Polling error:', err);
        setTimeout(poll, 5000);
      }
    };

    poll();
  };

  // Reset
  const handleReset = () => {
    setIsPolling(false);
    setState(initialState);
  };

  const isRendering = state.status === 'submitting' || state.status === 'rendering';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-accent">
              <Zap className="h-6 w-6 md:h-8 md:w-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black">
              SHOTSTACK TEST
            </h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Test Shotstack.io video rendering API directly
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Configuration
            </CardTitle>
            <CardDescription>
              Configure your test video and submit to Shotstack for rendering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Video URL */}
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video/Image URL (optional)</Label>
              <Input
                id="videoUrl"
                placeholder="https://example.com/video.mp4"
                value={state.videoUrl}
                onChange={(e) => setState(prev => ({ ...prev, videoUrl: e.target.value }))}
                disabled={isRendering}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use a solid color background
              </p>
            </div>

            {/* Text Overlay */}
            <div className="space-y-2">
              <Label htmlFor="textOverlay">Text Overlay</Label>
              <Textarea
                id="textOverlay"
                placeholder="Enter text to display on video"
                value={state.textOverlay}
                onChange={(e) => setState(prev => ({ ...prev, textOverlay: e.target.value }))}
                disabled={isRendering}
                rows={2}
              />
            </div>

            {/* Settings Row */}
            <div className="grid grid-cols-3 gap-4">
              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (s)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={60}
                  value={state.duration}
                  onChange={(e) => setState(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  disabled={isRendering}
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-2">
                <Label>Aspect Ratio</Label>
                <Select
                  value={state.aspectRatio}
                  onValueChange={(v) => setState(prev => ({ ...prev, aspectRatio: v as any }))}
                  disabled={isRendering}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Background Color */}
              <div className="space-y-2">
                <Label htmlFor="bgColor">Background</Label>
                <div className="flex gap-2">
                  <Input
                    id="bgColor"
                    type="color"
                    value={state.backgroundColor}
                    onChange={(e) => setState(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    disabled={isRendering}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={state.backgroundColor}
                    onChange={(e) => setState(prev => ({ ...prev, backgroundColor: e.target.value }))}
                    disabled={isRendering}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {state.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {/* Progress */}
            {isRendering && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {state.status === 'submitting' ? 'Submitting...' : 'Rendering...'}
                  </span>
                  <span>{Math.round(state.progress)}%</span>
                </div>
                <Progress value={state.progress} />
              </div>
            )}

            {/* Success */}
            {state.status === 'done' && state.finalVideoUrl && (
              <div className="space-y-4">
                <Alert className="border-primary/30 bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">
                    Video rendered successfully!
                  </AlertDescription>
                </Alert>

                {/* Video Preview */}
                <div className="rounded-lg overflow-hidden border bg-muted">
                  <video
                    src={state.finalVideoUrl}
                    controls
                    className="w-full"
                    autoPlay
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {state.status === 'idle' && (
                <Button onClick={handleSubmit} className="flex-1" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Render Video
                </Button>
              )}

              {state.status === 'done' && (
                <>
                  <Button
                    onClick={() => {
                      if (state.finalVideoUrl) {
                        const a = document.createElement('a');
                        a.href = state.finalVideoUrl;
                        a.download = 'shotstack-test.mp4';
                        a.click();
                      }
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Render
                  </Button>
                </>
              )}

              {state.status === 'failed' && (
                <Button onClick={handleReset} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        {state.renderId && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Debug Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono space-y-1">
                <p><strong>Render ID:</strong> {state.renderId}</p>
                <p><strong>Status:</strong> {state.status}</p>
                {state.finalVideoUrl && (
                  <p className="truncate"><strong>URL:</strong> {state.finalVideoUrl}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
