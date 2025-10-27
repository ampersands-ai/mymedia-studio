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
          ? "bg-gradient-to-br from-card/90 to-card/70 dark:from-card/90 dark:to-card/70" 
          : "bg-card/95 dark:bg-card/95",
        "border-border/30",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/20",
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
