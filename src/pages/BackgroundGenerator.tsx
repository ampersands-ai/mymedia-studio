import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShaderParams, DEFAULT_SHADER_PARAMS, RecordingState, BackgroundPreset } from '@/types/procedural-background';
import { ProceduralCanvas } from '@/components/procedural/ProceduralCanvas';
import { ControlsPanel } from '@/components/procedural/ControlsPanel';
import { PromptInput } from '@/components/procedural/PromptInput';
import { RecordingControls } from '@/components/procedural/RecordingControls';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';

export default function BackgroundGenerator() {
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Initialize params from preset if passed via navigation
  const initialPreset = (location.state as { preset?: BackgroundPreset })?.preset;
  const [params, setParams] = useState<ShaderParams>(
    initialPreset?.params || DEFAULT_SHADER_PARAMS
  );
  
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
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
        videoBitsPerSecond: 8000000, // 8 Mbps for quality
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
      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState('recording');
      setRecordingDuration(0);

      // Start duration counter
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

  const downloadWebM = useCallback(() => {
    if (!recordedBlob) return;
    
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procedural-background-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('WebM downloaded!');
  }, [recordedBlob]);

  const downloadMp4 = useCallback(async () => {
    if (!recordedBlob) return;
    
    setRecordingState('converting');
    toast.info('Converting to MP4... This may take a moment.');
    
    // For now, just download WebM as MP4 conversion requires FFmpeg.wasm
    // TODO: Implement FFmpeg.wasm conversion
    try {
      // Simulating conversion delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `procedural-background-${Date.now()}.webm`; // Still WebM for now
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setRecordingState('ready');
      toast.info('Downloaded as WebM (MP4 conversion coming soon)');
    } catch (error) {
      console.error('Conversion failed:', error);
      setRecordingState('ready');
      toast.error('Conversion failed');
    }
  }, [recordedBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Background Generator | Create Procedural Animations</title>
        <meta name="description" content="Create mesmerizing 3D procedural animations with thousands of metallic shapes. Customize colors, arrangements, and export as video." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/backgrounds')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Library
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                Background Generator
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>

          {/* Main content */}
          <div className={`grid gap-6 ${isFullscreen ? '' : 'lg:grid-cols-[1fr,380px]'}`}>
            {/* Canvas area */}
            <div className="flex flex-col gap-4">
              <div
                className="relative overflow-hidden rounded-xl border border-border shadow-2xl shadow-primary/10"
                style={{
                  aspectRatio: isFullscreen ? 'auto' : '9/16',
                  maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '70vh',
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

            {/* Controls panel */}
            {!isFullscreen && (
              <div className="flex flex-col gap-4">
                <PromptInput onApply={handleParamsChange} />
                <ControlsPanel params={params} onChange={handleParamsChange} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
