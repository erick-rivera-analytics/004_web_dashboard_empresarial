import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  Settings2,
} from "lucide-react";

import { filterDashboardViewsByAccess, dashboardViews } from "@/config/dashboard";
import { getCurrentUserAccess } from "@/lib/api-auth";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const access = await getCurrentUserAccess();
  const visibleViews = access
    ? filterDashboardViewsByAccess(dashboardViews, access.allowedResources, access.isSuperadmin)
    : [];
  const indicadorViews = visibleViews.filter(
    (view) => view.home !== false && view.homeSection !== "gestion",
  );
  const gestionViews = visibleViews.filter(
    (view) => view.homeSection === "gestion",
  );

  return (
    <div className="space-y-10">
      {/* ── Indicadores ──────────────────────────────────────────────────── */}
      <section>
        <SectionHeader
          icon={<LayoutDashboard className="size-4" />}
          title="Indicadores"
          description="Métricas operativas de campo y postcosecha en tiempo real."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {indicadorViews.map((view) => {
            const Icon = view.icon;
            return (
              <NavCard
                key={view.slug}
                href={view.href}
                icon={<Icon className="size-4" />}
                title={view.title}
                description={view.summary}
                eyebrow={view.eyebrow}
              />
            );
          })}
        </div>
      </section>

      {/* ── Gestion ──────────────────────────────────────────────────────── */}
      {gestionViews.length > 0 ? (
        <section>
          <SectionHeader
            icon={<Settings2 className="size-4" />}
            title="Gestión"
            description="Herramientas operativas y configuración."
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {gestionViews.map((view) => {
              const Icon = view.icon;
              return (
                <NavCard
                  key={view.slug}
                  href={view.href}
                  icon={<Icon className="size-4" />}
                  title={view.title}
                  description={view.summary}
                  eyebrow={view.eyebrow}
                  compact
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted text-foreground">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-semibold leading-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function NavCard({
  href,
  icon,
  title,
  description,
  eyebrow,
  compact = false,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  eyebrow: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/80 p-5 transition-all hover:border-border hover:bg-card hover:shadow-sm",
        compact && "flex-row items-center gap-4 py-4",
      )}
    >
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        {!compact ? (
          <ArrowRight className="size-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
        ) : null}
      </div>
      <div className={cn("min-w-0 flex-1", !compact && "space-y-1")}>
        {!compact ? (
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
            {eyebrow.split(" / ").slice(-1)[0]}
          </p>
        ) : null}
        <p className={cn("font-semibold leading-tight", compact ? "text-sm" : "text-base")}>
          {title}
        </p>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
      {compact ? (
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      ) : null}
    </Link>
  );
}
