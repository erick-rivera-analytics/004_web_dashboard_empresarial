"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";

import { sidebarGroups, getInitialOpenSections, filterSidebarGroupsByAccess } from "@/config/sidebar-data";
import { SidebarBrand } from "@/components/sidebar/sidebar-brand";
import { NavGroupSection } from "@/components/sidebar/nav-group";
import { SidebarFooter } from "@/components/sidebar/sidebar-footer";
import { useCurrentUserAccess } from "@/hooks/use-current-user-access";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: access } = useCurrentUserAccess();
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => getInitialOpenSections(sidebarGroups, pathname),
  );
  const resolvedGroups = access
    ? filterSidebarGroupsByAccess(sidebarGroups, access.allowedResources, access.isSuperadmin)
    : null;

  const toggleSection = useCallback((nodeKey: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  }, []);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-y-auto transition-all",
        collapsed ? "px-2 py-5" : "px-3 py-5",
      )}
    >
      <SidebarBrand collapsed={collapsed} onCollapsedChange={onCollapsedChange} />

      <nav className="flex flex-1 flex-col">
        {resolvedGroups === null ? (
          <div className={cn("space-y-4 py-2", collapsed ? "px-0" : "px-1")}>
            {[5, 3, 4, 2].map((count, i) => (
              <div key={i} className="space-y-1.5">
                {!collapsed && (
                  <div className="mb-2 h-2.5 w-16 rounded bg-muted/70 animate-pulse" />
                )}
                {Array.from({ length: count }).map((_, j) => (
                  <div
                    key={j}
                    className={cn(
                      "h-8 rounded-xl bg-muted/50 animate-pulse",
                      collapsed ? "w-9 mx-auto" : "w-full",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          resolvedGroups.map((group, idx) => (
            <NavGroupSection
              key={group.title}
              group={group}
              pathname={pathname}
              collapsed={collapsed}
              openSections={openSections}
              onToggle={toggleSection}
              showSeparator={idx > 0}
            />
          ))
        )}
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </div>
  );
}
