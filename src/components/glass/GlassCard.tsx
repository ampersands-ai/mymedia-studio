import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export const GlassCard = ({ children, className, hover = false }: GlassCardProps) => {
  return (
    <div
      className={cn(
        "backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6",
        hover && "transition-all duration-300 hover:bg-white/10 hover:border-white/20",
        className
      )}
    >
      {children}
    </div>
  );
};
