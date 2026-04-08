import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type BadgeProps = React.ComponentProps<"span"> & {
  asChild?: boolean;
  variant?: "default" | "secondary" | "outline";
};

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-slate-900 dark:bg-slate-700 text-white",
  secondary: "border-transparent bg-slate-900/20 dark:bg-slate-900/30 text-slate-700 dark:text-white",
  outline: "border-border text-foreground",
};

function Badge({
  asChild = false,
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
