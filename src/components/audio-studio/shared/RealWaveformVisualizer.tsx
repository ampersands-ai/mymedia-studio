import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface RealWaveformVisualizerProps {
  audioElement?: HTMLAudioElement | null;
  audioUrl?: string;
  isPlaying?: boolean;
  className?: string;
  barCount?: number;
  variant?: 'default' | 'small' | 'large';
  color?: 'orange' | 'purple' | 'gradient';
}

export function RealWaveformVisualizer({
  audioElement,
  audioUrl,
  isPlaying = false,
  className,
  barCount = 32,
  variant = 'default',
  color = 'gradient',
}: RealWaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [frequencies, setFrequencies] = useState<number[]>(() => Array(barCount).fill(20));

  const variantHeights: Record<string, number> = {
    small: 32,
    default: 64,
    large: 128,
  };

  const height = variantHeights[variant];

  const getBarColor = useCallback(() => {
    switch (color) {
      case 'orange':
        return 'hsl(28, 100%, 62%)';
      case 'purple':
        return 'hsl(266, 100%, 68%)';
      default:
        return null; // Will use gradient
    }
  }, [color]);

  // Setup Web Audio API analyzer
  useEffect(() => {
    if (!audioElement || !isPlaying) {
      // Reset to idle state
      setFrequencies(Array(barCount).fill(20));
    }
    
    if (!audioElement || !isPlaying) return;

    let cleanup: (() => void) | undefined;

    // Create or reuse AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    try {
      // Resume context if suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create analyzer if not exists
      if (!analyzerRef.current) {
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 128;
        analyzerRef.current.smoothingTimeConstant = 0.8;
      }

      // Create source if not exists
      if (!sourceRef.current) {
        try {
          sourceRef.current = audioContext.createMediaElementSource(audioElement);
          sourceRef.current.connect(analyzerRef.current);
          analyzerRef.current.connect(audioContext.destination);
        } catch {
          // Source already created for this element - just analyze
          console.log('[Waveform] Audio source already connected');
        }
      }

      const analyzer = analyzerRef.current;
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateFrequencies = () => {
        analyzer.getByteFrequencyData(dataArray);

        // Sample frequencies to match barCount
        const step = Math.floor(bufferLength / barCount);
        const newFrequencies: number[] = [];
        
        for (let i = 0; i < barCount; i++) {
          const index = i * step;
          // Normalize to percentage (0-100)
          const value = Math.max(20, (dataArray[index] / 255) * 100);
          newFrequencies.push(value);
        }

        setFrequencies(newFrequencies);
        animationRef.current = requestAnimationFrame(updateFrequencies);
      };

      updateFrequencies();

      cleanup = () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } catch (error) {
      console.error('[Waveform] Web Audio API error:', error);
      // Fallback to CSS animation
      setFrequencies(Array(barCount).fill(50));
    }

    return cleanup;
  }, [audioElement, isPlaying, barCount]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const barWidth = (width / barCount) - 2;
    const gap = 2;

    frequencies.forEach((freq, i) => {
      const barHeight = (freq / 100) * height;
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      // Create gradient or solid color
      const barColor = getBarColor();
      if (barColor) {
        ctx.fillStyle = barColor;
      } else {
        const gradient = ctx.createLinearGradient(x, y + barHeight, x, y);
        gradient.addColorStop(0, 'hsl(28, 100%, 62%)'); // primary-orange
        gradient.addColorStop(1, 'hsl(266, 100%, 68%)'); // accent-purple
        ctx.fillStyle = gradient;
      }

      // Draw rounded bar
      const radius = Math.min(barWidth / 2, 4);
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, radius);
      ctx.fill();
    });
  }, [frequencies, height, barCount, getBarColor]);

  // Fallback CSS-based animation when Web Audio not available
  if (!audioElement && !audioUrl) {
    return (
      <div className={cn('flex items-end justify-center gap-[2px]', className)} style={{ height }}>
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full bg-gradient-to-t from-primary-orange to-accent-purple transition-all duration-150',
              isPlaying && 'animate-waveform'
            )}
            style={{
              height: isPlaying ? `${30 + Math.random() * 70}%` : '20%',
              animationDelay: `${i * 50}ms`,
              opacity: isPlaying ? 1 : 0.5,
            }}
          />
        ))}
        
        <style>{`
          @keyframes waveform {
            0%, 100% {
              transform: scaleY(0.5);
            }
            50% {
              transform: scaleY(1);
            }
          }
          .animate-waveform {
            animation: waveform 0.8s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={cn('w-full', className)}
      style={{ height }}
    />
  );
}
