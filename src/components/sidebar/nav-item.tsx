"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  type NavItem,
  getNavItemKey,
  isPathActive,
  itemContainsActive,
} from "@/config/sidebar-data";
import { cn } from "@/lib/utils";

// ── Leaf item (link or coming-soon) ──────────────────────────────────────────
function NavLeaf({
  item,
  pathname,
  depth,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  depth: number;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const active = item.href ? isPathActive(pathname, item.href) : false;
  const indent = depth > 0 ? depth * 12 : 0;

  if (item.comingSoon || !item.href) {
    return (
      <div
        title={collapsed ? item.label : undefined}
        aria-disabled="true"
        style={!collapsed && depth > 0 ? { paddingLeft: `${indent}px` } : undefined}
        className={cn(
          "flex h-8 w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground/50",
          collapsed && "justify-center px-2",
        )}
      >
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
        {!collapsed ? (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/30">
              Próximo
            </span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      style={!collapsed && depth > 0 ? { paddingLeft: `${indent}px` } : undefined}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        collapsed && "justify-center px-2",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

// ── Collapsible section ──────────────────────────────────────────────────────
function NavCollapsible({
  item,
  pathname,
  depth,
  collapsed,
  openSections,
  onToggle,
  parentKey,
}: {
  item: NavItem;
  pathname: string;
  depth: number;
  collapsed: boolean;
  openSections: Set<string>;
  onToggle: (key: string) => void;
  parentKey: string;
}) {
  const Icon = item.icon;
  const nodeKey = getNavItemKey(item, parentKey);
  const isOpen = openSections.has(nodeKey);
  const hasActiveChild = itemContainsActive(item, pathname);
  const indent = depth > 0 ? depth * 12 : 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => !collapsed && onToggle(nodeKey)}
        title={collapsed ? item.label : undefined}
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
            <span className="flex-1 truncate text-left">{item.label}</span>
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
              ? "ml-3 border-l border-border/50 pl-2"
              : "ml-2 border-l border-border/50 pl-1.5",
          )}
        >
          {item.items!.map((child) => (
            <NavItemRenderer
              key={child.label}
              item={child}
              pathname={pathname}
              depth={depth + 1}
              collapsed={collapsed}
              openSections={openSections}
              onToggle={onToggle}
              parentKey={nodeKey}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Recursive dispatcher ─────────────────────────────────────────────────────
export function NavItemRenderer({
  item,
  pathname,
  depth,
  collapsed,
  openSections,
  onToggle,
  parentKey,
}: {
  item: NavItem;
  pathname: string;
  depth: number;
  collapsed: boolean;
  openSections: Set<string>;
  onToggle: (key: string) => void;
  parentKey: string;
}) {
  if (item.items?.length) {
    return (
      <NavCollapsible
        item={item}
        pathname={pathname}
        depth={depth}
        collapsed={collapsed}
        openSections={openSections}
        onToggle={onToggle}
        parentKey={parentKey}
      />
    );
  }

  return (
    <NavLeaf
      item={item}
      pathname={pathname}
      depth={0}
      collapsed={collapsed}
    />
  );
}
