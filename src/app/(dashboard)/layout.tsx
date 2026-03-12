"use client";

import { useState, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="starter-shell min-h-screen">
      <div className="mx-auto min-h-screen w-full max-w-[1600px] overflow-x-hidden">
        <div className="dashboard-scale-shell flex min-h-screen">
          <aside
            className={cn(
              "hidden shrink-0 border-r border-border/50 bg-card/62 backdrop-blur-xl transition-[width] duration-300 lg:block",
              sidebarCollapsed ? "w-[92px]" : "w-[296px]",
            )}
          >
            <div className="sticky top-0 h-screen">
              <AppSidebar
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
              />
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
                {children}
              </main>
              <SiteFooter />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
