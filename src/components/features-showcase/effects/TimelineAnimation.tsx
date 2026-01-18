import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const TimelineAnimation = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 400"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Timeline track */}
        <rect
          x="50"
          y="180"
          width="1100"
          height="40"
          rx="4"
          fill="hsl(var(--muted))"
          opacity="0.3"
        />

        {/* Clips */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={100 + i * 200}
            y="185"
            width="180"
            height="30"
            rx="4"
            fill={`hsl(var(--${i % 2 === 0 ? "primary-orange" : "secondary"}))`}
            opacity="0.6"
            style={{
              animation: prefersReducedMotion
                ? "none"
                : `clip-slide 8s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

        {/* Playhead */}
        <g
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "playhead-move 8s ease-in-out infinite",
          }}
        >
          <rect x="100" y="170" width="4" height="60" fill="hsl(var(--accent))" rx="2" />
          <polygon points="102,165 97,155 107,155" fill="hsl(var(--accent))" />
        </g>

        {/* Waveform on clips */}
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={`wave-${i}`}
            d={`M ${110 + i * 200} 200 ${Array.from(
              { length: 15 },
              (_, j) =>
                `L ${115 + i * 200 + j * 10} ${200 + Math.sin(j * 0.8) * (8 + Math.random() * 4)}`
            ).join(" ")}`}
            fill="none"
            stroke="white"
            strokeWidth="1"
            opacity="0.4"
          />
        ))}
      </svg>
      <style>{`
        @keyframes clip-slide {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(10px); }
        }
        @keyframes playhead-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(1000px); }
        }
      `}</style>
    </div>
  );
};
