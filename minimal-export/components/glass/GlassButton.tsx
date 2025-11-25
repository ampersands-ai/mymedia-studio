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
  const baseStyles = "border rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-emerald-500 hover:bg-emerald-400 border-emerald-500 text-white shadow-lg",
    secondary: "bg-gray-800 hover:bg-gray-700 border-gray-700 text-white",
    ghost: "bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-gray-800",
  };
  
  const sizeStyles = {
    sm: "px-4 py-2 text-sm h-10",
    md: "px-6 py-3 text-base h-12",
    lg: "px-8 py-4 text-lg h-14",
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
