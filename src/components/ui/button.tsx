import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-slate-900 dark:bg-slate-900 text-white hover:bg-slate-900/90",
  outline: "border border-border bg-background hover:bg-muted/70",
  secondary: "bg-slate-200 dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600",
  ghost: "hover:bg-muted/70",
  link: "text-slate-700 dark:text-white underline-offset-4 hover:underline",
  destructive: "bg-destructive text-white hover:bg-destructive/92",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "size-10",
};

function Button({
  asChild = false,
  className,
  size = "default",
  variant = "default",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export { Button };
