import { useRef, useState, useCallback } from 'react';
import { RecordingState } from '@/types/procedural-background';

interface UseCanvasRecordingOptions {
  frameRate?: number;
  mimeType?: string;
  videoBitsPerSecond?: number;
}

interface UseCanvasRecordingReturn {
  startRecording: () => void;
  stopRecording: () => void;
  recordedBlob: Blob | null;
  duration: number;
  state: RecordingState;
}

export function useCanvasRecording(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  options: UseCanvasRecordingOptions = {}
): UseCanvasRecordingReturn {
  const {
    frameRate = 60,
    mimeType = 'video/webm;codecs=vp9',
    videoBitsPerSecond = 8000000,
  } = options;

  const [state, setState] = useState<RecordingState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<number | null>(null);

  const startRecording = useCallback(() => {
    if (!canvasRef.current) {
      console.error('Canvas ref is not available');
      return;
    }

    try {
      // Get stream from canvas
      const stream = canvasRef.current.captureStream(frameRate);
      
      // Determine supported mime type
      let selectedMimeType = mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          selectedMimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          selectedMimeType = 'video/webm';
        } else {
          console.error('No supported video format found');
          return;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond,
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        setRecordedBlob(blob);
        setState('idle');
        
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setState('idle');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');
      startTimeRef.current = Date.now();
      setDuration(0);

      // Update duration every 100ms
      durationIntervalRef.current = window.setInterval(() => {
        setDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState('idle');
    }
  }, [canvasRef, frameRate, mimeType, videoBitsPerSecond]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  return {
    startRecording,
    stopRecording,
    recordedBlob,
    duration,
    state,
  };
}
