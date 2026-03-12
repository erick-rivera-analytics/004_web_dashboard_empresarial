import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
  icon: ReactNode;
};

export function MetricCard({ label, value, description, icon }: MetricCardProps) {
  return (
    <Card className="starter-panel h-full border-border/70 bg-card/78">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <CardTitle className="text-3xl font-semibold tracking-tight">{value}</CardTitle>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/80 p-3 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
