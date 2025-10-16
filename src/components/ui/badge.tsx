import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-secondary-600 text-white border-2 border-secondary-700",
        value: "bg-accent-500 text-white border-2 border-accent-600 shadow-lg shadow-accent-500/30",
        category: "bg-primary-500 text-neutral-900 border border-primary-600 font-bold uppercase tracking-wide",
        secondary: "bg-secondary-50 text-secondary-700 border-2 border-secondary-200",
        outline: "border-2 border-neutral-300 text-neutral-700",
        success: "bg-success text-white",
        destructive: "bg-error text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
