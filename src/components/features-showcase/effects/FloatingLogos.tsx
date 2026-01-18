import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Video, Image, Music, Sparkles } from "lucide-react";

const logos = [
  { icon: Video, label: "Sora", color: "text-primary-orange" },
  { icon: Image, label: "Midjourney", color: "text-accent" },
  { icon: Music, label: "ElevenLabs", color: "text-secondary" },
  { icon: Video, label: "Runway", color: "text-primary" },
  { icon: Image, label: "FLUX", color: "text-primary-orange" },
  { icon: Sparkles, label: "Kling", color: "text-accent" },
];

export const FloatingLogos = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div 
        className="relative w-[400px] h-[400px] md:w-[500px] md:h-[500px]"
        style={{
          animation: prefersReducedMotion ? "none" : "orbit-container 60s linear infinite",
        }}
      >
        {logos.map((logo, index) => {
          const angle = (index / logos.length) * 360;
          const radius = 180;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          const Icon = logo.icon;

          return (
            <div
              key={logo.label}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                animation: prefersReducedMotion
                  ? "none"
                  : `logo-float ${3 + index * 0.5}s ease-in-out infinite`,
                animationDelay: `${index * 0.3}s`,
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-lg">
                  <Icon className={`w-6 h-6 md:w-7 md:h-7 ${logo.color}`} />
                </div>
                <span className="text-xs text-muted-foreground font-medium opacity-60">
                  {logo.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes orbit-container {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes logo-float {
          0%, 100% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1); }
          50% { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y) - 10px)) scale(1.05); }
        }
      `}</style>
    </div>
  );
};
