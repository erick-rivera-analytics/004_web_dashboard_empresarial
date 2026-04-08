"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatabaseZap, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  isPathActive,
  sidebarTree,
  starterName,
  type SidebarNode,
} from "@/config/dashboard";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function NavItem({
  node,
  pathname,
  collapsed,
}: {
  node: SidebarNode;
  pathname: string;
  collapsed: boolean;
}) {
  const Icon = node.icon;
  const active = node.href ? isPathActive(pathname, node.href) : false;

  if (!node.href) return null;

  return (
    <Link
      href={node.href}
      title={collapsed ? node.label : undefined}
      className={cn(
        "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-slate-900 text-slate-100 shadow-sm shadow-slate-900/40 dark:bg-white dark:text-slate-900 dark:shadow-white/20"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
      {!collapsed ? <span className="truncate">{node.label}</span> : null}
    </Link>
  );
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-y-auto transition-all",
        collapsed ? "px-3 py-5" : "px-4 py-5",
      )}
    >
      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "mb-4 flex items-center",
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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-slate-100 dark:bg-white dark:text-slate-900">
            <Logo size={16} />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{starterName}</p>
              <p className="text-[11px] text-muted-foreground">Indicadores</p>
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

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {sidebarTree.map((node) => {
          // Direct link (e.g., Inicio)
          if (node.href) {
            return (
              <NavItem
                key={node.label}
                node={node}
                pathname={pathname}
                collapsed={collapsed}
              />
            );
          }

          // Section group
          if (node.items?.length) {
            return (
              <div key={node.label} className="pt-4">
                {!collapsed ? (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/55">
                    {node.label}
                  </p>
                ) : (
                  <div className="mb-2 border-t border-border/50" />
                )}
                <div className="space-y-0.5">
                  {node.items.map((item) => (
                    <NavItem
                      key={item.label}
                      node={item}
                      pathname={pathname}
                      collapsed={collapsed}
                    />
                  ))}
                </div>
              </div>
            );
          }

          return null;
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="mt-auto space-y-0.5 border-t border-border/50 pt-3">
        <Link
          href="/api/health/db"
          title="Estado DB"
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
        >
          <DatabaseZap className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>Estado DB</span> : null}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          title="Salir"
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
            collapsed && "justify-center px-2",
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>Salir</span> : null}
        </button>
      </div>
    </div>
  );
}
