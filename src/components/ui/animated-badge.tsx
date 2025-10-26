import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AnimatedBadgeProps {
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const AnimatedBadge = ({ 
  children, 
  icon: Icon, 
  className = '' 
}: AnimatedBadgeProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center space-x-2 px-4 py-2 rounded-full",
        "bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm",
        "border border-white/20 shadow-lg",
        "animate-float",
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 text-primary-orange" />}
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
};
