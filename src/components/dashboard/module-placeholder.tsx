import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModulePlaceholderProps = {
  badge: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  highlights: string[];
};

export function ModulePlaceholder({
  badge,
  title,
  summary,
  icon: Icon,
  highlights,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-4">
      <Card className="starter-panel border-border/70 bg-card/84">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-3">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {badge}
              </Badge>
              <div className="space-y-2">
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-relaxed">
                  {summary}
                </CardDescription>
              </div>
            </div>
            <div className="rounded-full bg-slate-900/10 p-4 text-slate-700 dark:bg-slate-900/20 dark:text-white">
              <Icon className="size-6" aria-hidden="true" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {highlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-[24px] border border-border/70 bg-background/72 px-4 py-4 text-sm text-muted-foreground"
              >
                {highlight}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
