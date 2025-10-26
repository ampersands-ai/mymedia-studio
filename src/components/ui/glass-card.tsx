import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export const GlassCard = ({ 
  children, 
  className = '', 
  hover = true,
  gradient = false 
}: GlassCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-xl backdrop-blur-lg border shadow-lg",
        gradient 
          ? "bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/70" 
          : "bg-white/90 dark:bg-gray-800/90",
        "border-white/30 dark:border-gray-700/30",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl",
        className
      )}
    >
      {gradient && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-yellow/10 to-primary-orange/10 pointer-events-none" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
