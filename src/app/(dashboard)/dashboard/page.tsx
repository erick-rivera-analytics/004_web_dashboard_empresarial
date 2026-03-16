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

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="starter-panel border-border/70 bg-card/80">
        <CardContent className="flex h-full flex-col justify-between p-8">
          <div className="space-y-4">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Indicadores / Produccion
            </Badge>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">
                Indicadores operativos
              </h1>
              <p className="text-sm text-muted-foreground">
                Campo y poscosecha sobre datos reales.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-8">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {dashboardViews.length} vistas
            </Badge>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              DB {db.configured ? "lista" : "pendiente"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {dashboardViews.map((view) => {
          const Icon = view.icon;

          return (
            <Card key={view.slug} className="starter-panel border-border/70 bg-card/80">
              <CardHeader className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/85 p-3 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle>{view.title}</CardTitle>
                  <CardDescription>{view.summary}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full justify-between rounded-xl">
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
  );
}
