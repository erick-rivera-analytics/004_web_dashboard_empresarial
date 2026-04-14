"use client";

import { useRef, useState, useEffect } from "react";

import { cn } from "@/lib/utils";

export function ScrollFadeTable({
  children,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setFaded(
        el.scrollWidth > el.clientWidth + 2 &&
          el.scrollLeft < el.scrollWidth - el.clientWidth - 2,
      );
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });

    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div ref={ref} className={cn("overflow-x-auto show-scrollbar", innerClassName)}>
        {children}
      </div>
      {faded && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
      )}
    </div>
  );
}
