import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarRange,
  Factory,
  Gauge,
  GitCompareArrows,
  LayoutDashboard,
  Map,
  Scale,
  Sprout,
} from "lucide-react";

type DashboardView = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  category: "campo" | "poscosecha";
};

export type SidebarNode = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  items?: SidebarNode[];
};

export const starterName = "Atlas Empresarial";

export const dashboardViews: DashboardView[] = [
  {
    slug: "campo",
    title: "Mapa",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Historial espacial de bloques con apertura por parent_block.",
    href: "/dashboard/campo",
    icon: Map,
    category: "campo",
  },
  {
    slug: "mortality",
    title: "Mortandades",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Mortandad por ciclo con curva ponderada y apertura al historial completo del bloque.",
    href: "/dashboard/mortality",
    icon: Activity,
    category: "campo",
  },
  {
    slug: "fenograma",
    title: "Fenograma",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Pivot semanal de corte y desviacion por ciclo.",
    href: "/dashboard/fenograma",
    icon: CalendarRange,
    category: "campo",
  },
  {
    slug: "comparacion",
    title: "Comparacion",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Cruce uno a uno entre ciclos activos.",
    href: "/dashboard/comparacion",
    icon: GitCompareArrows,
    category: "campo",
  },
  {
    slug: "balanzas",
    title: "Indicadores Balanzas",
    eyebrow: "Indicadores / Produccion / Poscosecha",
    summary: "Apertura B1 vs B1C sobre el flujo de postcosecha para peso y tallos.",
    href: "/dashboard/poscosecha/balanzas",
    icon: Scale,
    category: "poscosecha",
  },
];

const campoViews = dashboardViews.filter((view) => view.category === "campo");
const poscosechaViews = dashboardViews.filter((view) => view.category === "poscosecha");

export const sidebarTree: SidebarNode[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Indicadores",
    icon: Gauge,
    items: [
      {
        label: "Produccion",
        icon: Factory,
        items: [
          {
            label: "Campo",
            icon: Sprout,
            items: campoViews.map((view) => ({
              label: view.title,
              href: view.href,
              icon: view.icon,
            })),
          },
          {
            label: "Poscosecha",
            icon: Scale,
            items: poscosechaViews.map((view) => ({
              label: view.title,
              href: view.href,
              icon: view.icon,
            })),
          },
        ],
      },
    ],
  },
];

export const mobileNavigation = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  ...dashboardViews.map((view) => ({
    label: view.title,
    href: view.href,
    icon: view.icon,
  })),
];

export function isPathActive(pathname: string, href: string) {
  return pathname === href;
}

export function getPageContext(pathname: string) {
  if (pathname === "/dashboard") {
    return {
      eyebrow: "Indicadores / Produccion",
      title: "Indicadores",
    };
  }

  const view = dashboardViews.find((entry) => (
    pathname === entry.href || pathname.startsWith(`${entry.href}/`)
  ));

  if (!view) {
    return {
      eyebrow: starterName,
      title: "Panel",
    };
  }

  return {
    eyebrow: view.eyebrow,
    title: view.title,
  };
}
