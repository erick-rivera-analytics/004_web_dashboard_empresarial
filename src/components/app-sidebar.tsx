"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  DatabaseZap,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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

type SidebarBranchProps = {
  node: SidebarNode;
  pathname: string;
  lineage?: string[];
  depth?: number;
  collapsed: boolean;
  openBranches: Record<string, boolean>;
  onBranchToggle: (key: string) => void;
};

const EMPTY_LINEAGE: string[] = [];

function getNodeKey(lineage: string[], label: string) {
  return [...lineage, label].join("/");
}

function treeIsActive(node: SidebarNode, pathname: string): boolean {
  if (node.href && isPathActive(pathname, node.href)) {
    return true;
  }

  return node.items?.some((item) => treeIsActive(item, pathname)) ?? false;
}

function buildOpenState(
  nodes: SidebarNode[],
  lineage: string[] = EMPTY_LINEAGE,
  initialState: Record<string, boolean> = {},
) {
  for (const node of nodes) {
    const nodeKey = getNodeKey(lineage, node.label);

    if (node.items?.length) {
      initialState[nodeKey] = true;
      buildOpenState(node.items, [...lineage, node.label], initialState);
    }
  }

  return initialState;
}

function SidebarItem({
  node,
  pathname,
  depth = 0,
}: {
  node: SidebarNode;
  pathname: string;
  depth?: number;
}) {
  const Icon = node.icon;
  const active = node.href ? isPathActive(pathname, node.href) : false;

  if (!node.href) {
    return null;
  }

  return (
    <Link
      href={node.href}
      className={cn(
        "group flex items-center gap-3 rounded-3xl px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:text-foreground",
        depth > 0 && "ml-2",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
            active
              ? "bg-primary/14 text-primary"
              : "bg-background/52 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
      <span className="truncate">{node.label}</span>
    </Link>
  );
}

function SidebarBranch({
  node,
  pathname,
  lineage = EMPTY_LINEAGE,
  depth = 0,
  collapsed,
  openBranches,
  onBranchToggle,
}: SidebarBranchProps) {
  const Icon = node.icon;
  const nodeKey = getNodeKey(lineage, node.label);
  const active = treeIsActive(node, pathname);
  const open = openBranches[nodeKey] ?? true;

  if (node.href && !node.items?.length) {
    return <SidebarItem node={node} pathname={pathname} depth={depth} />;
  }

  return (
    <div className={cn("space-y-1", depth > 0 && "pl-4")}>
      <button
        type="button"
        onClick={() => onBranchToggle(nodeKey)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-3xl px-2 py-1.5 text-left transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
        aria-expanded={open}
      >
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-primary/14 text-primary"
                : "bg-background/52 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}

        {!collapsed ? (
          <>
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                depth === 0
                  ? "text-[11px] font-semibold uppercase tracking-[0.28em]"
                  : "text-sm font-medium",
              )}
            >
              {node.label}
            </span>
            {open ? (
              <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            )}
          </>
        ) : null}
      </button>

      {!collapsed && open ? (
        <div className="space-y-1">
          {node.items?.map((item) => (
            <SidebarBranch
              key={`${nodeKey}-${item.label}`}
              node={item}
              pathname={pathname}
              lineage={[...lineage, node.label]}
              depth={depth + 1}
              collapsed={collapsed}
              openBranches={openBranches}
              onBranchToggle={onBranchToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CollapsedNodeButton({
  node,
  pathname,
  onOpenSidebar,
}: {
  node: SidebarNode;
  pathname: string;
  onOpenSidebar: () => void;
}) {
  const Icon = node.icon;
  const active = treeIsActive(node, pathname);

  if (!Icon) {
    return null;
  }

  if (node.href) {
    return (
      <Link
        href={node.href}
        title={node.label}
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-colors",
          active
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      title={node.label}
      onClick={onOpenSidebar}
      className={cn(
        "flex size-11 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

export function AppSidebar({
  collapsed,
  onCollapsedChange,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openBranches, setOpenBranches] = useState(() =>
    buildOpenState(sidebarTree),
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function toggleBranch(key: string) {
    setOpenBranches((current) => ({
      ...current,
      [key]: !(current[key] ?? true),
    }));
  }

  function openSidebarWithBranch(key: string) {
    setOpenBranches((current) => ({
      ...current,
      [key]: true,
    }));
    onCollapsedChange(false);
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-8 transition-all",
        collapsed ? "items-center px-3 py-5" : "px-5 py-6",
      )}
    >
      <div
        className={cn(
          "flex w-full",
          collapsed
            ? "flex-col items-center gap-3"
            : "items-center justify-between gap-3",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 overflow-hidden",
            collapsed && "justify-center",
          )}
          title={starterName}
        >
          <div className="rounded-full bg-primary/12 p-3 text-primary">
            <Logo size={20} />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{starterName}</p>
              <p className="text-xs text-muted-foreground">Indicadores</p>
            </div>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

      {collapsed ? (
        <nav className="flex flex-col items-center gap-3 pt-1">
          {sidebarTree.map((node) => {
            const nodeKey = getNodeKey([], node.label);

            return (
              <CollapsedNodeButton
                key={nodeKey}
                node={node}
                pathname={pathname}
                onOpenSidebar={() => openSidebarWithBranch(nodeKey)}
              />
            );
          })}
        </nav>
      ) : (
        <nav className="w-full space-y-4">
          {sidebarTree.map((node) => (
            <SidebarBranch
              key={node.label}
              node={node}
              pathname={pathname}
              collapsed={collapsed}
              openBranches={openBranches}
              onBranchToggle={toggleBranch}
            />
          ))}
        </nav>
      )}

      <div
        className={cn(
          "mt-auto flex w-full gap-2",
          collapsed ? "flex-col items-center" : "flex-col",
        )}
      >
        <Link
          href="/api/health/db"
          title="Estado DB"
          className={cn(
            "flex items-center transition-colors",
            collapsed
              ? "size-11 justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              : "gap-3 rounded-3xl px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/52">
            <DatabaseZap className="size-4" />
          </span>
          {!collapsed ? <span>Estado DB</span> : null}
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          title="Salir"
          className={cn(
            "flex items-center transition-colors",
            collapsed
              ? "size-11 justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              : "gap-3 rounded-3xl px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background/52">
            <LogOut className="size-4" />
          </span>
          {!collapsed ? <span>Salir</span> : null}
        </button>
      </div>
    </div>
  );
}
