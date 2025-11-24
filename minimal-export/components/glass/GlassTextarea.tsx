import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const GlassTextarea = forwardRef<HTMLTextAreaElement, GlassTextareaProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="minimal-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full px-4 py-3 rounded-xl text-base",
            "bg-gray-800 border border-gray-700",
            "text-white placeholder:text-gray-500",
            "focus:outline-none focus:border-gray-600 focus:bg-gray-750",
            "transition-all duration-200 resize-none",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

GlassTextarea.displayName = "GlassTextarea";
