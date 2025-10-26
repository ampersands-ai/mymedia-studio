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
          ? "bg-gradient-to-br from-white/60 to-white/30 dark:from-gray-800/60 dark:to-gray-900/30" 
          : "bg-white/70 dark:bg-gray-800/70",
        "border-white/20 dark:border-gray-700/20",
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
