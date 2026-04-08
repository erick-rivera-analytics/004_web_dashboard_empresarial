"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, DatabaseZap, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import {
  getInitialOpenSections,
  isPathActive,
  nodeContainsActive,
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

function NavLeaf({
  node,
  pathname,
  depth,
  collapsed,
}: {
  node: SidebarNode;
  pathname: string;
  depth: number;
  collapsed: boolean;
}) {
  const Icon = node.icon;
  const active = node.href ? isPathActive(pathname, node.href) : false;
  const indent = depth > 0 ? depth * 12 : 0;

  if (node.comingSoon || !node.href) {
    return (
      <div
        title={collapsed ? node.label : undefined}
        style={!collapsed && depth > 0 ? { paddingLeft: `${indent}px` } : undefined}
        className={cn(
          "flex h-8 w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground/35",
          collapsed && "justify-center px-2",
        )}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        {!collapsed ? (
          <>
            <span className="flex-1 truncate">{node.label}</span>
            <span className="shrink-0 rounded-full border border-border/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">
              Próximo
            </span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={node.href}
      title={collapsed ? node.label : undefined}
      style={!collapsed && depth > 0 ? { paddingLeft: `${indent}px` } : undefined}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-slate-900 text-slate-100 shadow-sm shadow-slate-900/40 dark:bg-white dark:text-slate-900 dark:shadow-white/20"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {!collapsed ? <span className="truncate">{node.label}</span> : null}
    </Link>
  );
}

function NavSection({
  node,
  pathname,
  depth,
  collapsed,
  openSections,
  onToggle,
}: {
  node: SidebarNode;
  pathname: string;
  depth: number;
  collapsed: boolean;
  openSections: Set<string>;
  onToggle: (label: string) => void;
}) {
  const Icon = node.icon;
  const isOpen = openSections.has(node.label);
  const hasActiveChild = nodeContainsActive(node, pathname);
  const indent = depth > 0 ? depth * 12 : 0;

  if (!node.items?.length) {
    return (
      <NavLeaf
        node={node}
        pathname={pathname}
        depth={depth}
        collapsed={collapsed}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onToggle(node.label)}
        title={collapsed ? node.label : undefined}
        style={!collapsed && depth > 0 ? { paddingLeft: `${indent}px` } : undefined}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted/60 hover:text-foreground",
          collapsed && "justify-center px-2",
          hasActiveChild && !collapsed
            ? "text-foreground"
            : depth === 0
              ? "text-foreground/80"
              : "text-muted-foreground",
        )}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        {!collapsed ? (
          <>
            <span className="flex-1 truncate text-left">{node.label}</span>
            <ChevronRight
              className={cn(
                "size-3 shrink-0 text-muted-foreground/50 transition-transform duration-150",
                isOpen && "rotate-90",
              )}
              aria-hidden="true"
            />
          </>
        ) : null}
      </button>

      {isOpen && !collapsed ? (
        <div
          className={cn(
            "mt-0.5 space-y-0.5",
            depth === 0
              ? "ml-3 border-l border-border/40 pl-2"
              : "ml-2 border-l border-border/30 pl-1.5",
          )}
        >
          {node.items.map((child) =>
            child.items?.length ? (
              <NavSection
                key={child.label}
                node={child}
                pathname={pathname}
                depth={depth + 1}
                collapsed={collapsed}
                openSections={openSections}
                onToggle={onToggle}
              />
            ) : (
              <NavLeaf
                key={child.label}
                node={child}
                pathname={pathname}
                depth={0}
                collapsed={collapsed}
              />
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => getInitialOpenSections(sidebarTree, pathname),
  );

  const toggleSection = useCallback((label: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-y-auto transition-all",
        collapsed ? "px-2 py-5" : "px-3 py-5",
      )}
    >
      {/* ── Brand ────────────────────────────────────────────────────────── */}
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
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-slate-100 dark:bg-white dark:text-slate-900">
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

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav className="flex flex-1 flex-col gap-0.5">
        {sidebarTree.map((node) =>
          node.items?.length ? (
            <NavSection
              key={node.label}
              node={node}
              pathname={pathname}
              depth={0}
              collapsed={collapsed}
              openSections={openSections}
              onToggle={toggleSection}
            />
          ) : (
            <NavLeaf
              key={node.label}
              node={node}
              pathname={pathname}
              depth={0}
              collapsed={collapsed}
            />
          ),
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
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
