import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export const GradientBackground = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{
              animation: prefersReducedMotion
                ? "none"
                : `gradient-shift ${8 + i * 2}s ease-in-out infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${
                i === 0
                  ? "from-secondary/30 via-transparent to-transparent"
                  : i === 1
                  ? "from-transparent via-primary-orange/20 to-transparent"
                  : i === 2
                  ? "from-transparent via-transparent to-accent/25"
                  : "from-primary/20 via-transparent to-secondary/20"
              }`}
            />
          </div>
        ))}
      </div>
      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};
