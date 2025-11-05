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
          <label className="text-sm font-light text-gray-400">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full px-4 py-3 rounded-2xl appearance-none",
              "backdrop-blur-xl bg-white/5 border border-white/10",
              "text-gray-200",
              "focus:outline-none focus:border-white/20 focus:bg-white/10",
              "transition-all duration-300 cursor-pointer",
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
