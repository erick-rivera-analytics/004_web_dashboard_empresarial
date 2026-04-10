import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { dashboardViews } from "@/config/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDatabaseConfigSummary } from "@/lib/db";

export default function DashboardPage() {
  const db = getDatabaseConfigSummary();
  const indicadorViews = dashboardViews.filter(
    (view) => view.home !== false && view.homeSection !== "gestion",
  );
  const gestionViews = dashboardViews.filter(
    (view) => view.homeSection === "gestion",
  );

  return (
    <div className="space-y-6">
      {/* ── Indicadores ──────────────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-2xl border-border/60 bg-card">
          <CardContent className="flex h-full flex-col justify-between p-8">
            <div className="space-y-4">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                Indicadores / Produccion
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">
                  Indicadores operativos
                </h1>
                <p className="text-sm text-muted-foreground">
                  Campo y postcosecha sobre datos reales.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-8">
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {indicadorViews.length} vistas
              </Badge>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                DB {db.configured ? "lista" : "pendiente"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {indicadorViews.map((view) => {
            const Icon = view.icon;

            return (
              <Card key={view.slug} className="rounded-2xl border-border/60 bg-card">
                <CardHeader className="space-y-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-border/60 bg-muted text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base">{view.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed">{view.summary}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full justify-between rounded-lg text-sm font-medium hover:bg-foreground hover:text-background">
                    <Link href={view.href}>
                      Abrir
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Gestion ──────────────────────────────────────────────────────── */}
      {gestionViews.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Gestion</h2>
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px]">
              Poscosecha
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gestionViews.map((view) => {
              const Icon = view.icon;

              return (
                <Card key={view.slug} className="rounded-2xl border-border/60 bg-card">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted text-foreground">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{view.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{view.summary}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg text-xs hover:bg-foreground hover:text-background">
                      <Link href={view.href}>
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
