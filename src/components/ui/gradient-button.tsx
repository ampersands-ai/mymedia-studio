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
    primary: 'bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 hover:from-yellow-500 hover:via-orange-500 hover:to-orange-600 text-neutral-900 font-black shadow-[0_0_30px_rgba(251,146,60,0.5)] hover:shadow-[0_0_40px_rgba(251,146,60,0.7)]',
    secondary: 'bg-gradient-to-r from-accent-purple to-accent-pink text-white shadow-secondary hover:shadow-lg',
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
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
    </button>
  );
};
