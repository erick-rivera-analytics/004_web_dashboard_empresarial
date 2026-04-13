import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckSquare,
  ClipboardList,
  Clock,
  Crosshair,
  DatabaseZap,
  DollarSign,
  Factory,
  FileBarChart,
  FileText,
  Gauge,
  GitCompareArrows,
  Home,
  Lock,
  Map,
  PackageCheck,
  PieChart,
  Scale,
  Settings,
  Sprout,
  Target,
  TrendingDown,
  TrendingUp,
  UserCog,
  UserCircle2,
  Users,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
export type NavItem = {
  label: string;
  href?: string;
  resourceKey?: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  items?: NavItem[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

// ── Sidebar navigation groups ────────────────────────────────────────────────
export const sidebarGroups: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { label: "Inicio", href: "/dashboard", icon: Home },
    ],
  },
  {
    title: "Dashboard",
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
              { label: "Productividad", href: "/dashboard/productividad", icon: Clock },
              { label: "Avance de labores", icon: ClipboardList, comingSoon: true },
              { label: "Rendimiento", icon: Gauge, comingSoon: true },
            ],
          },
          {
            label: "Poscosecha",
            icon: Factory,
            items: [
              { label: "Balanzas", href: "/dashboard/postcosecha/balanzas", icon: Scale },
            ],
          },
          { label: "Produccion", icon: Factory, comingSoon: true },
          {
            label: "Talento Humano",
            icon: Users,
            items: [
              { label: "Composicion Laboral", href: "/dashboard/talento-humano/composicion-laboral", icon: PieChart },
              { label: "Demografia Personal", href: "/dashboard/talento-humano/demografia-personal", icon: UserCircle2 },
              { label: "Rotacion Laboral", href: "/dashboard/talento-humano/rotacion-laboral", icon: TrendingDown },
            ],
          },
          { label: "Calidad", icon: CheckSquare, comingSoon: true },
          { label: "Finanzas", icon: DollarSign, comingSoon: true },
        ],
      },
      { label: "KPI", icon: Target, comingSoon: true },
      { label: "OKR", icon: Crosshair, comingSoon: true },
      { label: "Reportes", icon: FileBarChart, comingSoon: true },
    ],
  },
  {
    title: "Gestion",
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
            ],
          },
        ],
      },
      {
        label: "Poscosecha",
        icon: Factory,
        items: [
          {
            label: "Registros",
            href: "/dashboard/postcosecha/registros",
            icon: ClipboardList,
          },
          {
            label: "Administrar Maestros",
            icon: DatabaseZap,
            items: [
              {
                label: "Administrar SKU's",
                href: "/dashboard/postcosecha/administrar-maestros/skus",
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
                href: "/dashboard/postcosecha/planificacion/programaciones",
                icon: CalendarClock,
              },
              {
                label: "Plan de trabajo",
                href: "/dashboard/postcosecha/planificacion/plan-de-trabajo",
                icon: CalendarRange,
              },
              {
                label: "Solver",
                icon: Settings,
                items: [
                  {
                    label: "Clasificacion en blanco",
                    href: "/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco",
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
    title: "Administracion",
    items: [
      {
        label: "Seguridad",
        icon: Lock,
        items: [
          {
            label: "Usuarios",
            href: "/dashboard/admin/seguridad/usuarios",
            icon: UserCog,
          },
        ],
      },
      { label: "Organizacion", icon: Building2, comingSoon: true },
      { label: "Maestros", icon: DatabaseZap, comingSoon: true },
      { label: "Integraciones", icon: Settings, comingSoon: true },
      { label: "Auditoria", icon: FileText, comingSoon: true },
    ],
  },
  {
    title: "Ayuda",
    items: [
      { label: "Documentacion", icon: BookOpen, comingSoon: true },
      { label: "Soporte", icon: Users, comingSoon: true },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
export function getNavItemKey(item: NavItem, parentKey = ""): string {
  return parentKey ? `${parentKey}/${item.label}` : item.label;
}

export function isPathActive(pathname: string, href: string): boolean {
  return pathname === href;
}

export function itemContainsActive(item: NavItem, pathname: string): boolean {
  if (item.href && isPathActive(pathname, item.href)) return true;
  return item.items?.some((child) => itemContainsActive(child, pathname)) ?? false;
}

export function getInitialOpenSections(groups: NavGroup[], pathname: string): Set<string> {
  const open = new Set<string>();

  function walkItems(items: NavItem[], parentKey: string) {
    for (const item of items) {
      const key = getNavItemKey(item, parentKey);
      if (item.items && itemContainsActive(item, pathname)) {
        open.add(key);
        walkItems(item.items, key);
      }
    }
  }

  for (const group of groups) {
    walkItems(group.items, group.title);
  }

  return open;
}

export function filterSidebarGroupsByAccess(
  groups: NavGroup[],
  allowedResources: string[],
  isSuperadmin: boolean,
): NavGroup[] {
  function filterItems(items: NavItem[]): NavItem[] {
    return items
      .map((item) => {
        if (item.items?.length) {
          const filteredChildren = filterItems(item.items);
          if (!filteredChildren.length) return null;
          return { ...item, items: filteredChildren };
        }

        if (item.comingSoon || !item.href) {
          return item;
        }

        if (item.href === "/dashboard") {
          return item;
        }

        const resourceKey = item.resourceKey ?? item.href;
        if (isSuperadmin || allowedResources.includes(resourceKey)) {
          return item;
        }

        return null;
      })
      .filter((item): item is NavItem => item !== null);
  }

  return groups
    .map((group) => ({ ...group, items: filterItems(group.items) }))
    .filter((group) => group.items.length > 0);
}
