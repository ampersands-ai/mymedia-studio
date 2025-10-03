import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-4 border-black brutal-shadow hover-lift",
        destructive: "bg-destructive text-destructive-foreground border-4 border-black brutal-shadow hover-lift",
        outline: "border-4 border-black bg-background brutal-shadow hover-lift hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground border-4 border-black brutal-shadow hover-lift",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        neon: "bg-neon-yellow text-black border-4 border-black brutal-shadow hover-lift font-black",
        pink: "bg-neon-pink text-white border-4 border-black brutal-shadow hover-lift font-black",
        blue: "bg-neon-blue text-white border-4 border-black brutal-shadow hover-lift font-black",
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
