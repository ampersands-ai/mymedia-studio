import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-secondary-500/20 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-neutral-900 font-semibold border-2 border-primary-600 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200",
        secondary: "bg-white hover:bg-secondary-50 active:bg-secondary-100 text-secondary-600 hover:text-secondary-700 font-semibold border-2 border-secondary-600 hover:border-secondary-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        outline: "bg-white hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900 font-medium border-2 border-neutral-300 hover:border-neutral-400 transition-all duration-200",
        ghost: "bg-transparent hover:bg-secondary-50 text-secondary-600 hover:text-secondary-700 font-medium transition-colors duration-200",
        destructive: "bg-error hover:bg-error/90 text-white font-semibold border-2 border-error shadow-md hover:shadow-lg transition-all",
        link: "text-secondary-600 hover:text-secondary-700 underline-offset-4 hover:underline transition-colors",
        neon: "bg-primary-500 hover:bg-primary-600 text-neutral-900 font-bold border-2 border-primary-600 shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all",
        pink: "bg-secondary-600 hover:bg-secondary-700 text-white font-bold border-2 border-secondary-700 shadow-md transition-all",
        blue: "bg-accent-500 hover:bg-accent-600 text-white font-bold border-2 border-accent-600 shadow-md transition-all",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-14 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
