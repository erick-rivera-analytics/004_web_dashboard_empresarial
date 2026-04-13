import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Clock,
  DatabaseZap,
  GitCompareArrows,
  Map,
  Scale,
} from "lucide-react";

type DashboardView = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  category: "campo" | "postcosecha";
  homeSection?: "indicadores" | "gestion";
  home?: boolean;
  mobile?: boolean;
};

export const starterName = "CoreX";
export const starterSubtitle = "Centro de Inteligencia Empresarial";

export const dashboardViews: DashboardView[] = [
  {
    slug: "campo",
    title: "Mapa",
    eyebrow: "Dashboard / Indicadores / Campo",
    summary: "Historial espacial de bloques con apertura por parent_block.",
    href: "/dashboard/campo",
    icon: Map,
    category: "campo",
  },
  {
    slug: "mortality",
    title: "Mortandades",
    eyebrow: "Dashboard / Indicadores / Campo",
    summary: "Mortandad por ciclo con curva ponderada y apertura al historial completo del bloque.",
    href: "/dashboard/mortality",
    icon: Activity,
    category: "campo",
  },
  {
    slug: "productividad",
    title: "Productividad",
    eyebrow: "Dashboard / Indicadores / Campo",
    summary: "Productividad de mano de obra: hora por caja por ciclo y etapa operativa.",
    href: "/dashboard/productividad",
    icon: Clock,
    category: "campo",
  },
  {
    slug: "fenograma",
    title: "Fenograma",
    eyebrow: "Dashboard / Indicadores / Campo",
    summary: "Pivot semanal de corte y desviacion por ciclo.",
    href: "/dashboard/fenograma",
    icon: CalendarRange,
    category: "campo",
  },
  {
    slug: "comparacion",
    title: "Comparacion",
    eyebrow: "Dashboard / Indicadores / Campo",
    summary: "Cruce uno a uno entre ciclos activos.",
    href: "/dashboard/comparacion",
    icon: GitCompareArrows,
    category: "campo",
  },
  {
    slug: "programaciones",
    title: "Programaciones",
    eyebrow: "Gestion / Campo / Planificacion",
    summary: "Calendario de programaciones de campo: plantas muertas, iluminacion y riego.",
    href: "/dashboard/programaciones",
    icon: CalendarClock,
    category: "campo",
  },
  {
    slug: "balanzas",
    title: "Indicadores Balanzas",
    eyebrow: "Dashboard / Indicadores / Poscosecha",
    summary: "Apertura B1 vs B1C sobre el flujo de postcosecha para peso y tallos.",
    href: "/dashboard/postcosecha/balanzas",
    icon: Scale,
    category: "postcosecha",
  },
  {
    slug: "postcosecha-registros",
    title: "Registros",
    eyebrow: "Gestion / Poscosecha / Registros",
    summary: "Espacio reservado para los registros operativos de postcosecha.",
    href: "/dashboard/postcosecha/registros",
    icon: ClipboardList,
    category: "postcosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "postcosecha-administrar-skus",
    title: "Administrar SKU's",
    eyebrow: "Gestion / Poscosecha / Administrar Maestros",
    summary: "Maestro transaccional de SKU para alimentar el solver de clasificacion en blanco.",
    href: "/dashboard/postcosecha/administrar-maestros/skus",
    icon: DatabaseZap,
    category: "postcosecha",
    homeSection: "gestion",
    mobile: false,
  },
  {
    slug: "postcosecha-programaciones",
    title: "Programaciones",
    eyebrow: "Gestion / Poscosecha / Planificacion",
    summary: "Punto de entrada para la programacion operativa de postcosecha.",
    href: "/dashboard/postcosecha/planificacion/programaciones",
    icon: CalendarClock,
    category: "postcosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "postcosecha-plan-de-trabajo",
    title: "Plan de trabajo",
    eyebrow: "Gestion / Poscosecha / Planificacion",
    summary: "Vista reservada para consolidar el plan de trabajo de postcosecha.",
    href: "/dashboard/postcosecha/planificacion/plan-de-trabajo",
    icon: CalendarDays,
    category: "postcosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "postcosecha-clasificacion-en-blanco",
    title: "Clasificacion en blanco",
    eyebrow: "Gestion / Poscosecha / Planificacion / Solver",
    summary: "Espacio inicial para migrar el solver de clasificacion en blanco desde Streamlit.",
    href: "/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco",
    icon: Scale,
    category: "postcosecha",
    homeSection: "gestion",
    mobile: false,
  },
];

export const mobileNavigation = dashboardViews
  .filter((view) => view.mobile !== false)
  .map((view) => ({
    label: view.title,
    href: view.href,
    icon: view.icon,
  }));

export function isPathActive(pathname: string, href: string) {
  return pathname === href;
}

const adminPages: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard/admin/seguridad/usuarios": {
    eyebrow: "Administracion / Seguridad",
    title: "Usuarios",
  },
};

export function getPageContext(pathname: string) {
  if (pathname === "/dashboard") {
    return { eyebrow: "CoreX", title: "Inicio" };
  }

  const adminPage = adminPages[pathname] ?? Object.entries(adminPages).find(([href]) => pathname.startsWith(`${href}/`))?.[1];
  if (adminPage) return adminPage;

  const view = dashboardViews.find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );

  if (!view) {
    return { eyebrow: starterName, title: "Panel" };
  }

  return { eyebrow: view.eyebrow, title: view.title };
}
