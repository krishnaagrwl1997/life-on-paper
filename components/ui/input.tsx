import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-book border border-ink/20 bg-paper px-3.5 font-interface text-sm text-ink shadow-none outline-none transition-[border-color,box-shadow,background-color] duration-500 ease-paper placeholder:text-ink-muted/65 focus:border-action focus:ring-2 focus:ring-action/15 disabled:cursor-not-allowed disabled:bg-sheet disabled:text-ink-muted",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
