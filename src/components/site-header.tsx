"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DashboardScaleToggle } from "@/components/dashboard-scale-toggle";
import { getPageContext, isPathActive, mobileNavigation } from "@/config/dashboard";
import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const page = getPageContext(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/82 backdrop-blur-xl">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {page.eyebrow}
            </Badge>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{page.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <DashboardScaleToggle />
            <ModeToggle />
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {mobileNavigation.map((item) => {
            const Icon = item.icon;
            const active = isPathActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border/70 bg-background/82 text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
