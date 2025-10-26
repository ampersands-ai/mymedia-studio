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
          ? "bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/90 dark:to-gray-900/80" 
          : "bg-white/95 dark:bg-gray-800/95",
        "border-white/40 dark:border-gray-600/40",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl dark:hover:shadow-primary/20",
        className
      )}
    >
      {gradient && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary-yellow/10 to-primary-orange/10 dark:from-primary-yellow/5 dark:to-primary-orange/5 pointer-events-none" />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
