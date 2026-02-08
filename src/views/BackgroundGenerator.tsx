import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShaderParams, DEFAULT_SHADER_PARAMS, RecordingState, BackgroundPreset } from '@/types/procedural-background';
import { ProceduralCanvas } from '@/components/procedural/ProceduralCanvas';
import { ControlsPanel } from '@/components/procedural/ControlsPanel';
import { PromptInput } from '@/components/procedural/PromptInput';
import { RecordingControls } from '@/components/procedural/RecordingControls';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { convertToMp4, downloadBlob, generateFilename } from '@/utils/videoConverter';
import { cn } from '@/lib/utils';

export default function BackgroundGenerator() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // TODO: location.state is not available in Next.js App Router.
  // Consider passing preset via searchParams or a state management solution.
  const initialPreset = undefined as BackgroundPreset | undefined;
  const [params, setParams] = useState<ShaderParams>(
    initialPreset?.params || DEFAULT_SHADER_PARAMS
  );
  
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const durationIntervalRef = useRef<number | null>(null);

  const handleParamsChange = useCallback((newParams: Partial<ShaderParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const startRecording = useCallback(() => {
    if (!canvasRef.current) {
      toast.error('Canvas not ready');
      return;
    }

    try {
      const stream = canvasRef.current.captureStream(60);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8000000,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordingState('ready');
        toast.success('Recording complete!');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setRecordingState('recording');
      setRecordingDuration(0);

      durationIntervalRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);

      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  }, [recordingState]);

  const downloadWebM = useCallback(async () => {
    if (!recordedBlob) return;
    
    const filename = generateFilename('procedural-background');
    await downloadBlob(recordedBlob, `${filename}.webm`);
    toast.success('WebM downloaded!');
  }, [recordedBlob]);

  const downloadMp4 = useCallback(async () => {
    if (!recordedBlob) return;
    
    setRecordingState('converting');
    toast.info('Converting to MP4... This may take a moment.');
    
    try {
      const mp4Blob = await convertToMp4(recordedBlob, (progress) => {
        console.log('Conversion progress:', progress);
      });
      
      const filename = generateFilename('procedural-background');
      await downloadBlob(mp4Blob, `${filename}.mp4`);
      
      setRecordingState('ready');
      toast.success('MP4 downloaded!');
    } catch (error) {
      console.error('Conversion failed:', error);
      setRecordingState('ready');
      toast.error('Conversion failed, downloading as WebM');
      await downloadBlob(recordedBlob, `${generateFilename('procedural-background')}.webm`);
    }
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
          {/* Header - Mobile optimized */}
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard/backgrounds')}
                className="h-9 w-9 sm:h-10 sm:w-auto sm:gap-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </Button>
              <h1 className="text-lg font-bold text-foreground sm:text-2xl">
                Generator
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile controls toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowControls(!showControls)}
                className="h-9 w-9 lg:hidden"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-9 w-9 sm:h-10 sm:w-auto sm:gap-2 sm:px-3"
              >
                {isFullscreen ? (
                  <>
                    <Minimize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Exit</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Fullscreen</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Mobile controls drawer */}
          <div
            className={cn(
              'mb-4 overflow-hidden transition-all duration-300 lg:hidden',
              showControls ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <div className="flex flex-col gap-3">
              <PromptInput onApply={handleParamsChange} />
              <ControlsPanel params={params} onChange={handleParamsChange} />
            </div>
          </div>

          {/* Main content */}
          <div className={cn(
            'grid gap-4 sm:gap-6',
            isFullscreen ? '' : 'lg:grid-cols-[1fr,380px]'
          )}>
            {/* Canvas area */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div
                className="relative overflow-hidden rounded-xl border border-border shadow-2xl shadow-primary/10"
                style={{
                  aspectRatio: isFullscreen ? 'auto' : '9/16',
                  maxHeight: isFullscreen ? 'calc(100vh - 180px)' : 'min(70vh, 600px)',
                }}
              >
                <ProceduralCanvas ref={canvasRef} params={params} />
              </div>
              
              {/* Recording controls */}
              <RecordingControls
                state={recordingState}
                duration={recordingDuration}
                onStartRecording={startRecording}
                onStopRecording={stopRecording}
                onDownloadWebM={downloadWebM}
                onDownloadMp4={downloadMp4}
                hasRecording={!!recordedBlob}
              />
            </div>

            {/* Desktop controls panel */}
            {!isFullscreen && (
              <div className="hidden flex-col gap-4 lg:flex">
                <PromptInput onApply={handleParamsChange} />
                <ControlsPanel params={params} onChange={handleParamsChange} />
              </div>
            )}
          </div>
        </div>
      </div>
  );
}