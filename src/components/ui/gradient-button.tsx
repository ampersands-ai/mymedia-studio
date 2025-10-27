import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export const GradientButton = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}: GradientButtonProps) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-yellow to-primary-orange text-foreground shadow-lg hover:shadow-primary/50 hover:shadow-2xl',
    secondary: 'bg-gradient-to-r from-accent-purple to-accent-pink text-white shadow-lg hover:shadow-accent/50 hover:shadow-2xl',
  };

  return (
    <button
      disabled={disabled}
      className={cn(
        "rounded-full font-semibold relative overflow-hidden group",
        "transition-all duration-300 hover:scale-105 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[200%] group-hover:animate-shine pointer-events-none" />
    </button>
  );
};
