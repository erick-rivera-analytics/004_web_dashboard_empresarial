"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";

import { sidebarGroups, getInitialOpenSections } from "@/config/sidebar-data";
import { SidebarBrand } from "@/components/sidebar/sidebar-brand";
import { NavGroupSection } from "@/components/sidebar/nav-group";
import { SidebarFooter } from "@/components/sidebar/sidebar-footer";
import { cn } from "@/lib/utils";

type AppSidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export function AppSidebar({ collapsed, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => getInitialOpenSections(sidebarGroups, pathname),
  );

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
        {sidebarGroups.map((group, idx) => (
          <NavGroupSection
            key={group.title}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
            openSections={openSections}
            onToggle={toggleSection}
            showSeparator={idx > 0}
          />
        ))}
      </nav>

      <SidebarFooter collapsed={collapsed} />
    </div>
  );
}
