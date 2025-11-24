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
          <label className="minimal-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-base",
            "bg-gray-800 border border-gray-700",
            "text-white placeholder:text-gray-500",
            "focus:outline-none focus:border-gray-600 focus:bg-gray-750",
            "transition-all duration-200",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
