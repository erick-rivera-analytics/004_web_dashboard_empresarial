import type { LucideIcon } from "lucide-react";
import {
  CalendarRange,
  Factory,
  Gauge,
  GitCompareArrows,
  LayoutDashboard,
  Map,
  Sprout,
} from "lucide-react";

export type DashboardView = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  href: string;
  icon: LucideIcon;
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
    title: "Mapa de bloques",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Historial espacial de bloques con apertura por parent_block.",
    href: "/dashboard/campo",
    icon: Map,
  },
  {
    slug: "fenograma",
    title: "Fenograma",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Pivot semanal de corte y desviacion por ciclo.",
    href: "/dashboard/fenograma",
    icon: CalendarRange,
  },
  {
    slug: "comparacion",
    title: "Comparacion",
    eyebrow: "Indicadores / Produccion / Campo",
    summary: "Cruce uno a uno entre ciclos activos.",
    href: "/dashboard/comparacion",
    icon: GitCompareArrows,
  },
];

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
            items: dashboardViews.map((view) => ({
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

export function getDashboardView(slug: string) {
  return dashboardViews.find((view) => view.slug === slug);
}

export function isPathActive(pathname: string, href: string) {
  return pathname === href;
}

export function getPageContext(pathname: string) {
  if (pathname === "/dashboard") {
    return {
      eyebrow: "Indicadores / Produccion / Campo",
      title: "Indicadores",
    };
  }

  const slug = pathname.split("/").filter(Boolean)[1];
  const view = slug ? getDashboardView(slug) : null;

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
