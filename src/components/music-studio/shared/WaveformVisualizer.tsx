import { cn } from '@/lib/utils';

interface WaveformVisualizerProps {
  isPlaying?: boolean;
  className?: string;
  barCount?: number;
  variant?: 'default' | 'small' | 'large';
}

export function WaveformVisualizer({
  isPlaying = false,
  className,
  barCount = 20,
  variant = 'default',
}: WaveformVisualizerProps) {
  const heights = variant === 'small' ? [40, 70, 50, 90, 60, 80, 45, 95, 55, 75, 65, 85, 50, 70, 60, 80, 55, 90, 45, 75]
    : [30, 60, 45, 80, 55, 70, 40, 90, 50, 65, 55, 75, 45, 65, 55, 70, 50, 85, 40, 60];

  const barHeights: Record<string, string> = {
    small: 'h-4',
    default: 'h-8',
    large: 'h-16',
  };

  return (
    <div className={cn('flex items-end justify-center gap-[2px]', barHeights[variant], className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full bg-gradient-to-t from-primary-orange to-accent-purple transition-all duration-150',
            isPlaying && 'animate-waveform'
          )}
          style={{
            height: isPlaying ? `${heights[i % heights.length]}%` : '20%',
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
