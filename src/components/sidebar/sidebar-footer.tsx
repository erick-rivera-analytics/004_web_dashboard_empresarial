"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatabaseZap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarFooterProps = {
  collapsed: boolean;
};

export function SidebarFooter({ collapsed }: SidebarFooterProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
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
  );
}
