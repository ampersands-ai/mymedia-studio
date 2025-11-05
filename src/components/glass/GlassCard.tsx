import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  variant?: "solid" | "glass";
}

export const GlassCard = ({ children, className, hover = false, variant = "solid" }: GlassCardProps) => {
  const variantStyles = {
    solid: "bg-gray-900 border border-gray-700 rounded-xl",
    glass: "backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl"
  };

  return (
    <div
      className={cn(
        "p-6",
        variantStyles[variant],
        hover && "transition-all duration-300 hover:bg-gray-800",
        className
      )}
    >
      {children}
    </div>
  );
};
