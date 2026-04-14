"use client";

import { useState, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ChatbotModal } from "@/components/dashboard/chatbot-modal";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <SWRConfig
      value={{
        onError: (error) => console.error("[SWR]", error),
        revalidateOnFocus: false,
        dedupingInterval: 30_000,
      }}
    >
      <div className="starter-shell min-h-screen">
        <div className="dashboard-scale-shell flex min-h-screen w-full">
          <aside
            className={cn(
              "hidden shrink-0 border-r border-border/60 bg-card transition-[width] duration-300 lg:block",
              sidebarCollapsed ? "w-[5.75rem]" : "w-[18.5rem]",
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
        <ChatbotModal />
        <Toaster richColors position="top-right" />
      </div>
    </SWRConfig>
  );
}
