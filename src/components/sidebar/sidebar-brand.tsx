"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/logo";
import { starterName } from "@/config/dashboard";
import { cn } from "@/lib/utils";

type SidebarBrandProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export function SidebarBrand({ collapsed, onCollapsedChange }: SidebarBrandProps) {
  return (
    <div
      className={cn(
        "mb-5 flex items-center",
        collapsed ? "justify-center" : "justify-between gap-2",
      )}
    >
      <Link
        href="/dashboard"
        className={cn(
          "flex min-w-0 items-center gap-2.5 overflow-hidden",
          collapsed && "justify-center",
        )}
        title={starterName}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Logo size={16} />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{starterName}</p>
            <p className="text-[11px] text-muted-foreground">Centro de Inteligencia</p>
          </div>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={() => onCollapsedChange(!collapsed)}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
        title={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" aria-hidden="true" />
        ) : (
          <PanelLeftClose className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
