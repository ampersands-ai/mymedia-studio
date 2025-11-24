import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="minimal-label">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full px-4 py-3 rounded-xl appearance-none text-base",
              "bg-gray-800 border border-gray-700",
              "text-white",
              "focus:outline-none focus:border-gray-600 focus:bg-gray-750",
              "transition-all duration-200 cursor-pointer",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>
    );
  }
);

GlassSelect.displayName = "GlassSelect";
