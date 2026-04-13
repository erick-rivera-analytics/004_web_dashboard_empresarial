export type RoleCode = "superadmin" | "viewer" | "custom";

export type PermissionOverride = {
  resourceKey: string;
  canView: boolean;
};

export type AccessResource = {
  resourceKey: string;
  label: string;
  section: "Dashboard / Indicadores" | "Gestion" | "Administracion";
};

export const ACCESS_RESOURCES: AccessResource[] = [
  { resourceKey: "/dashboard/campo", label: "Campo / Mapa", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/fenograma", label: "Campo / Fenograma", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/mortality", label: "Campo / Mortandades", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/comparacion", label: "Campo / Comparacion", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/productividad", label: "Campo / Productividad", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/programaciones", label: "Gestion / Campo / Programaciones", section: "Gestion" },
  { resourceKey: "/dashboard/postcosecha/balanzas", label: "Poscosecha / Balanzas", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/postcosecha/registros", label: "Poscosecha / Registros", section: "Gestion" },
  { resourceKey: "/dashboard/postcosecha/administrar-maestros/skus", label: "Poscosecha / Administrar SKU's", section: "Gestion" },
  { resourceKey: "/dashboard/postcosecha/planificacion/programaciones", label: "Poscosecha / Programaciones", section: "Gestion" },
  { resourceKey: "/dashboard/postcosecha/planificacion/plan-de-trabajo", label: "Poscosecha / Plan de trabajo", section: "Gestion" },
  { resourceKey: "/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco", label: "Poscosecha / Solver clasificacion en blanco", section: "Gestion" },
  { resourceKey: "/dashboard/talento-humano/composicion-laboral", label: "Talento Humano / Composicion Laboral", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/talento-humano/demografia-personal", label: "Talento Humano / Demografia Personal", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/talento-humano/rotacion-laboral", label: "Talento Humano / Rotacion Laboral", section: "Dashboard / Indicadores" },
  { resourceKey: "/dashboard/admin/seguridad/usuarios", label: "Seguridad / Usuarios", section: "Administracion" },
];

export const ACCESS_RESOURCES_BY_SECTION = ACCESS_RESOURCES.reduce<Record<string, AccessResource[]>>((groups, resource) => {
  const items = groups[resource.section] ?? [];
  items.push(resource);
  groups[resource.section] = items;
  return groups;
}, {});

export const ACCESS_RESOURCE_KEYS = new Set(ACCESS_RESOURCES.map((resource) => resource.resourceKey));

export const ADMIN_RESOURCE_KEYS = new Set<string>([
  "/dashboard/admin/seguridad/usuarios",
]);

export const ROLE_OPTIONS: Array<{ value: RoleCode; label: string; description: string }> = [
  { value: "superadmin", label: "Superadmin", description: "Acceso total fijo." },
  { value: "viewer", label: "Viewer", description: "Todas las pantallas reales no administrativas." },
  { value: "custom", label: "Custom", description: "Accesos definidos manualmente." },
];

export function isRoleCode(value: unknown): value is RoleCode {
  return value === "superadmin" || value === "viewer" || value === "custom";
}

export function normalizeRoleCode(value: string | null | undefined): RoleCode {
  return isRoleCode(value)
    ? value
    : "custom";
}

export function getBaseAllowedResources(roleCode: RoleCode): string[] {
  if (roleCode === "superadmin") {
    return ACCESS_RESOURCES.map((resource) => resource.resourceKey);
  }

  if (roleCode === "viewer") {
    return ACCESS_RESOURCES
      .filter((resource) => !ADMIN_RESOURCE_KEYS.has(resource.resourceKey))
      .map((resource) => resource.resourceKey);
  }

  return [];
}

export function resolveAllowedResources(
  roleCode: RoleCode,
  overrides: PermissionOverride[] = [],
): string[] {
  if (roleCode === "superadmin") {
    return getBaseAllowedResources(roleCode);
  }

  const allowed = new Set(getBaseAllowedResources(roleCode));

  for (const override of overrides) {
    if (!ACCESS_RESOURCE_KEYS.has(override.resourceKey)) continue;

    if (override.canView) {
      allowed.add(override.resourceKey);
    } else {
      allowed.delete(override.resourceKey);
    }
  }

  return ACCESS_RESOURCES
    .map((resource) => resource.resourceKey)
    .filter((resourceKey) => allowed.has(resourceKey));
}

export function canAccessResource(resourceKey: string, allowedResources: string[], isSuperadmin = false) {
  if (isSuperadmin) return true;
  return allowedResources.includes(resourceKey);
}

export function sanitizePermissionOverrides(overrides: PermissionOverride[] = []) {
  const byKey = new Map<string, boolean>();

  for (const override of overrides) {
    if (!ACCESS_RESOURCE_KEYS.has(override.resourceKey)) continue;
    byKey.set(override.resourceKey, Boolean(override.canView));
  }

  return Array.from(byKey.entries()).map(([resourceKey, canView]) => ({ resourceKey, canView }));
}

export function parsePermissionOverridesInput(value: unknown): PermissionOverride[] | null {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: PermissionOverride[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const resourceKey = "resourceKey" in entry ? entry.resourceKey : undefined;
    const canView = "canView" in entry ? entry.canView : undefined;

    if (typeof resourceKey !== "string" || !ACCESS_RESOURCE_KEYS.has(resourceKey) || typeof canView !== "boolean") {
      return null;
    }

    parsed.push({ resourceKey, canView });
  }

  return sanitizePermissionOverrides(parsed);
}

export function getResourceKeysForApiPath(pathname: string): string[] | null {
  if (pathname.startsWith("/api/admin/users")) {
    return ["/dashboard/admin/seguridad/usuarios"];
  }
  if (pathname.startsWith("/api/productividad")) {
    return ["/dashboard/productividad"];
  }
  if (pathname.startsWith("/api/programaciones")) {
    return ["/dashboard/programaciones"];
  }
  if (pathname.startsWith("/api/fenograma")) {
    return ["/dashboard/fenograma"];
  }
  if (pathname.startsWith("/api/mortality")) {
    return ["/dashboard/mortality"];
  }
  if (pathname.startsWith("/api/medical/person")) {
    return [
      "/dashboard/fenograma",
      "/dashboard/mortality",
      "/dashboard/productividad",
    ];
  }
  if (pathname.startsWith("/api/comparacion")) {
    return ["/dashboard/comparacion"];
  }
  if (pathname.startsWith("/api/postcosecha/balanzas")) {
    return ["/dashboard/postcosecha/balanzas"];
  }
  if (pathname.startsWith("/api/postcosecha/administrar-maestros/skus")) {
    return ["/dashboard/postcosecha/administrar-maestros/skus"];
  }
  if (pathname.startsWith("/api/postcosecha/planificacion/solver/clasificacion-en-blanco")) {
    return ["/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco"];
  }
  if (pathname.startsWith("/api/talento-humano/activos")) {
    return [
      "/dashboard/talento-humano/composicion-laboral",
      "/dashboard/talento-humano/demografia-personal",
    ];
  }
  if (pathname.startsWith("/api/talento-humano/rotacion")) {
    return ["/dashboard/talento-humano/rotacion-laboral"];
  }
  if (pathname.startsWith("/api/talento-humano/persona")) {
    return [
      "/dashboard/talento-humano/composicion-laboral",
      "/dashboard/talento-humano/demografia-personal",
      "/dashboard/talento-humano/rotacion-laboral",
    ];
  }

  return null;
}
