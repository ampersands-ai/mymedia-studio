import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const GlassButton = ({ 
  children, 
  variant = "primary", 
  size = "md",
  loading = false,
  className,
  disabled,
  ...props 
}: GlassButtonProps) => {
  const baseStyles = "backdrop-blur-xl border rounded-2xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-white/10 text-white hover:from-indigo-500/30 hover:to-purple-500/30 hover:border-white/20 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]",
    secondary: "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20",
    ghost: "bg-transparent border-transparent text-white/70 hover:text-white hover:bg-white/5",
  };
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };
  
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};
