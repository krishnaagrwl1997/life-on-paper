"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-interface text-[0.72rem] font-medium uppercase tracking-[0.11em] transition-[color,background-color,border-color,box-shadow,transform] duration-500 ease-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "rounded-book bg-action px-5 py-3.5 text-paper shadow-paper-sm hover:bg-action-deep hover:shadow-paper-md active:translate-y-px",
        secondary:
          "rounded-book border border-ink/55 bg-transparent px-5 py-[0.82rem] text-ink hover:border-ink hover:bg-sheet",
        text: "border-b border-ink/60 px-0 py-1 text-ink hover:border-action hover:text-action",
      },
      size: {
        default: "min-h-11",
        compact: "min-h-9 px-4 py-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
