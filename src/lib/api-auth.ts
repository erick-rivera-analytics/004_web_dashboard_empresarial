import { redirect } from "next/navigation";
import { type NextRequest, NextResponse } from "next/server";

import { canAccessResource, getResourceKeysForApiPath } from "@/lib/access-control";
import { getSessionUser } from "@/lib/auth";

export async function getCurrentUserAccess() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    roleCode: user.roleCode,
    isSuperadmin: user.roleCode === "superadmin",
    allowedResources: user.allowedResources,
    permissionOverrides: user.permissionOverrides,
    isActive: user.isActive,
  };
}

export async function requirePageAccess(resourceKey: string) {
  const access = await getCurrentUserAccess();

  if (!access || !access.isActive) {
    redirect("/login");
  }

  if (!canAccessResource(resourceKey, access.allowedResources, access.isSuperadmin)) {
    redirect("/dashboard");
  }

  return access;
}

export async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const access = await getCurrentUserAccess();

  if (!access || !access.isActive) {
    return NextResponse.json(
      { error: "Missing authentication token" },
      { status: 401 },
    );
  }

  const resourceKeys = getResourceKeysForApiPath(request.nextUrl.pathname);
  if (!resourceKeys?.length) {
    return null;
  }

  const canView = resourceKeys.some((resourceKey) =>
    canAccessResource(resourceKey, access.allowedResources, access.isSuperadmin),
  );

  if (!canView) {
    return NextResponse.json(
      { message: "No tienes acceso a este recurso." },
      { status: 403 },
    );
  }

  return null;
}
