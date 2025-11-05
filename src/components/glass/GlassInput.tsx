import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-light text-gray-400">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-2xl",
            "backdrop-blur-xl bg-white/5 border border-white/10",
            "text-gray-200 placeholder:text-gray-500",
            "focus:outline-none focus:border-white/20 focus:bg-white/10",
            "transition-all duration-300",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
