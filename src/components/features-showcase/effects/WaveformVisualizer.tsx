import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const WaveformVisualizer = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  const createPath = (amplitude: number, frequency: number, phase: number) => {
    const points: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const x = i * 10;
      const y = 150 + Math.sin((i * frequency + phase) * 0.1) * amplitude;
      points.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    return points.join(" ");
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      <svg
        className="w-full h-full"
        viewBox="0 0 1000 300"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--secondary))" />
            <stop offset="100%" stopColor="hsl(var(--accent))" />
          </linearGradient>
          <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary-orange))" />
            <stop offset="100%" stopColor="hsl(var(--secondary))" />
          </linearGradient>
          <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary-orange))" />
          </linearGradient>
        </defs>

        {/* Wave 1 - Slow */}
        <path
          d={createPath(40, 2, 0)}
          fill="none"
          stroke="url(#waveGradient1)"
          strokeWidth="2"
          style={{
            animation: prefersReducedMotion ? "none" : "wave-draw 8s ease-in-out infinite",
          }}
        />

        {/* Wave 2 - Medium */}
        <path
          d={createPath(30, 3, 50)}
          fill="none"
          stroke="url(#waveGradient2)"
          strokeWidth="2"
          style={{
            animation: prefersReducedMotion ? "none" : "wave-draw 6s ease-in-out infinite",
            animationDelay: "1s",
          }}
        />

        {/* Wave 3 - Fast */}
        <path
          d={createPath(20, 4, 100)}
          fill="none"
          stroke="url(#waveGradient3)"
          strokeWidth="2"
          style={{
            animation: prefersReducedMotion ? "none" : "wave-draw 4s ease-in-out infinite",
            animationDelay: "2s",
          }}
        />
      </svg>
      <style>{`
        @keyframes wave-draw {
          0%, 100% {
            stroke-dasharray: 2000;
            stroke-dashoffset: 0;
          }
          50% {
            stroke-dasharray: 2000;
            stroke-dashoffset: -500;
          }
        }
      `}</style>
    </div>
  );
};
