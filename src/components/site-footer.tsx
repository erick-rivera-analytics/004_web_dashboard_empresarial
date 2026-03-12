import { starterName } from "@/config/dashboard";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/76">
      <div className="px-4 py-4 text-xs uppercase tracking-[0.24em] text-muted-foreground sm:px-6 lg:px-8">
        {starterName} / Indicadores
      </div>
    </footer>
  );
}
