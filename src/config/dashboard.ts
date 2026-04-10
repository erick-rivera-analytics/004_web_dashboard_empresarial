import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  ClipboardList,
  Crosshair,
  DatabaseZap,
  DollarSign,
  Factory,
  FileBarChart,
  FileText,
  Gauge,
  GitCompareArrows,
  HelpCircle,
  Home,
  Lock,
  Map,
  PackageCheck,
  Scale,
  Settings,
  Settings2,
  Shield,
  Sprout,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

type DashboardView = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  href: string;
  icon: LucideIcon;
  category: "campo" | "poscosecha";
  home?: boolean;
  mobile?: boolean;
};

export type SidebarNode = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  items?: SidebarNode[];
  comingSoon?: boolean;
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
    href: "/dashboard/poscosecha/balanzas",
    icon: Scale,
    category: "poscosecha",
  },
  {
    slug: "poscosecha-registros",
    title: "Registros",
    eyebrow: "Gestion / Poscosecha / Registros",
    summary: "Espacio reservado para los registros operativos de poscosecha.",
    href: "/dashboard/poscosecha/registros",
    icon: ClipboardList,
    category: "poscosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "poscosecha-administrar-skus",
    title: "Administrar SKU's",
    eyebrow: "Gestion / Poscosecha / Administrar Maestros",
    summary: "Maestro transaccional de SKU para alimentar el solver de clasificacion en blanco.",
    href: "/dashboard/poscosecha/administrar-maestros/skus",
    icon: DatabaseZap,
    category: "poscosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "poscosecha-programaciones",
    title: "Programaciones",
    eyebrow: "Gestion / Poscosecha / Planificacion",
    summary: "Punto de entrada para la programacion operativa de poscosecha.",
    href: "/dashboard/poscosecha/planificacion/programaciones",
    icon: CalendarClock,
    category: "poscosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "poscosecha-plan-de-trabajo",
    title: "Plan de trabajo",
    eyebrow: "Gestion / Poscosecha / Planificacion",
    summary: "Vista reservada para consolidar el plan de trabajo de poscosecha.",
    href: "/dashboard/poscosecha/planificacion/plan-de-trabajo",
    icon: CalendarDays,
    category: "poscosecha",
    home: false,
    mobile: false,
  },
  {
    slug: "poscosecha-clasificacion-en-blanco",
    title: "Clasificacion en blanco",
    eyebrow: "Gestion / Poscosecha / Planificacion / Solver",
    summary: "Espacio inicial para migrar el solver de clasificacion en blanco desde Streamlit.",
    href: "/dashboard/poscosecha/planificacion/solver/clasificacion-en-blanco",
    icon: Scale,
    category: "poscosecha",
    home: false,
    mobile: false,
  },
];

export const sidebarTree: SidebarNode[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Dashboard",
    icon: BarChart3,
    items: [
      {
        label: "Indicadores",
        icon: TrendingUp,
        items: [
          {
            label: "Campo",
            icon: Sprout,
            items: [
              { label: "Mapa", href: "/dashboard/campo", icon: Map },
              { label: "Fenograma", href: "/dashboard/fenograma", icon: CalendarRange },
              { label: "Mortandades", href: "/dashboard/mortality", icon: Activity },
              { label: "Comparacion", href: "/dashboard/comparacion", icon: GitCompareArrows },
              { label: "Avance de labores", icon: ClipboardList, comingSoon: true },
              { label: "Rendimiento", icon: Gauge, comingSoon: true },
            ],
          },
          {
            label: "Poscosecha",
            icon: Factory,
            items: [
              { label: "Balanzas", href: "/dashboard/poscosecha/balanzas", icon: Scale },
              { label: "Recepcion", icon: PackageCheck, comingSoon: true },
              { label: "Calidad", icon: CheckSquare, comingSoon: true },
              { label: "Productividad", icon: Gauge, comingSoon: true },
            ],
          },
          { label: "Produccion", icon: Factory, comingSoon: true },
          { label: "Talento Humano", icon: Users, comingSoon: true },
          { label: "Calidad", icon: CheckSquare, comingSoon: true },
          { label: "Finanzas", icon: DollarSign, comingSoon: true },
        ],
      },
      {
        label: "KPI",
        icon: Target,
        comingSoon: true,
      },
      {
        label: "OKR",
        icon: Crosshair,
        comingSoon: true,
      },
      {
        label: "Reportes",
        icon: FileBarChart,
        comingSoon: true,
      },
    ],
  },
  {
    label: "Gestion",
    icon: Settings2,
    items: [
      {
        label: "Campo",
        icon: Sprout,
        items: [
          {
            label: "Planificacion",
            icon: CalendarDays,
            items: [
              { label: "Programaciones", href: "/dashboard/programaciones", icon: CalendarClock },
              { label: "Plan semanal", icon: CalendarRange, comingSoon: true },
              { label: "Asignacion de personal", icon: Users, comingSoon: true },
            ],
          },
          { label: "Ejecucion", icon: ClipboardList, comingSoon: true },
          { label: "Trazabilidad", icon: Activity, comingSoon: true },
        ],
      },
      {
        label: "Poscosecha",
        icon: Factory,
        items: [
          {
            label: "Registros",
            href: "/dashboard/poscosecha/registros",
            icon: ClipboardList,
          },
          {
            label: "Administrar Maestros",
            icon: DatabaseZap,
            items: [
              {
                label: "Administrar SKU's",
                href: "/dashboard/poscosecha/administrar-maestros/skus",
                icon: PackageCheck,
              },
            ],
          },
          {
            label: "Planificacion",
            icon: CalendarDays,
            items: [
              {
                label: "Programaciones",
                href: "/dashboard/poscosecha/planificacion/programaciones",
                icon: CalendarClock,
              },
              {
                label: "Plan de trabajo",
                href: "/dashboard/poscosecha/planificacion/plan-de-trabajo",
                icon: CalendarRange,
              },
              {
                label: "Solver",
                icon: Settings,
                items: [
                  {
                    label: "Clasificacion en blanco",
                    href: "/dashboard/poscosecha/planificacion/solver/clasificacion-en-blanco",
                    icon: Scale,
                  },
                ],
              },
            ],
          },
        ],
      },
      { label: "Inventario", icon: PackageCheck, comingSoon: true },
      { label: "Talento Humano", icon: Users, comingSoon: true },
      { label: "Calidad", icon: CheckSquare, comingSoon: true },
    ],
  },
  {
    label: "Administracion",
    icon: Shield,
    items: [
      { label: "Seguridad", icon: Lock, comingSoon: true },
      { label: "Organizacion", icon: Building2, comingSoon: true },
      { label: "Maestros", icon: DatabaseZap, comingSoon: true },
      { label: "Integraciones", icon: Settings, comingSoon: true },
      { label: "Auditoria", icon: FileText, comingSoon: true },
    ],
  },
  {
    label: "Ayuda",
    icon: HelpCircle,
    items: [
      { label: "Documentacion", icon: BookOpen, comingSoon: true },
      { label: "Soporte", icon: Users, comingSoon: true },
    ],
  },
];

export const mobileNavigation = dashboardViews
  .filter((view) => view.mobile !== false)
  .map((view) => ({
    label: view.title,
    href: view.href,
    icon: view.icon,
  }));

export function getSidebarNodeKey(node: SidebarNode, parentKey = "") {
  return parentKey ? `${parentKey}/${node.label}` : node.label;
}

export function isPathActive(pathname: string, href: string) {
  return pathname === href;
}

export function nodeContainsActive(node: SidebarNode, pathname: string): boolean {
  if (node.href && isPathActive(pathname, node.href)) return true;
  return node.items?.some((child) => nodeContainsActive(child, pathname)) ?? false;
}

export function getInitialOpenSections(nodes: SidebarNode[], pathname: string): Set<string> {
  const open = new Set<string>();

  function walk(nodesToVisit: SidebarNode[], parentKey = "") {
    for (const node of nodesToVisit) {
      const nodeKey = getSidebarNodeKey(node, parentKey);
      if (node.items && nodeContainsActive(node, pathname)) {
        open.add(nodeKey);
        walk(node.items, nodeKey);
      }
    }
  }

  walk(nodes);
  return open;
}

export function getPageContext(pathname: string) {
  if (pathname === "/dashboard") {
    return { eyebrow: "CoreX", title: "Inicio" };
  }

  const view = dashboardViews.find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );

  if (!view) {
    return { eyebrow: starterName, title: "Panel" };
  }

  return { eyebrow: view.eyebrow, title: view.title };
}
