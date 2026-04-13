import { NextResponse } from "next/server";
import { getCurrentUserAccess } from "@/lib/api-auth";

/**
 * GET /api/auth/me
 * Returns the current authenticated user's username.
 * Returns 401 if not authenticated.
 */
export async function GET() {
  try {
    const access = await getCurrentUserAccess();

    if (!access) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      userId: access.userId,
      username: access.username,
      roleCode: access.roleCode,
      isSuperadmin: access.isSuperadmin,
      allowedResources: access.allowedResources,
      permissionOverrides: access.permissionOverrides,
      authenticatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AUTH_ME_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to get session" },
      { status: 500 }
    );
  }
}
