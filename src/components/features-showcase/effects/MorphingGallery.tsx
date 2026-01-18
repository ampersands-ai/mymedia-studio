import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const gradients = [
  "from-secondary/40 to-accent/40",
  "from-primary-orange/40 to-secondary/40",
  "from-accent/40 to-primary-orange/40",
  "from-secondary/40 to-primary/40",
  "from-primary/40 to-accent/40",
  "from-accent/40 to-secondary/40",
  "from-primary-orange/40 to-accent/40",
  "from-secondary/40 to-primary-orange/40",
  "from-primary/40 to-secondary/40",
  "from-accent/40 to-primary/40",
  "from-primary-orange/40 to-primary/40",
  "from-secondary/40 to-accent/40",
];

export const MorphingGallery = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      <div className="grid grid-cols-4 grid-rows-3 gap-2 w-full h-full p-4">
        {gradients.map((gradient, i) => (
          <div
            key={i}
            className={`rounded-lg bg-gradient-to-br ${gradient}`}
            style={{
              animation: prefersReducedMotion
                ? "none"
                : `morph-fade ${6 + (i % 3) * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
              filter: i < 2 || i > 9 ? "blur(8px)" : "blur(0px)",
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes morph-fade {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
};
