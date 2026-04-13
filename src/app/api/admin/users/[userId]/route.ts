import { NextRequest, NextResponse } from "next/server";

import { isRoleCode, parsePermissionOverridesInput } from "@/lib/access-control";
import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { deleteUser, getUserById, getUserByUsername, updateUser } from "@/lib/users";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { userId } = await context.params;
    const id = Number.parseInt(userId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: "ID inválido." }, { status: 400 });
    }

    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error, "No se pudo obtener el usuario.");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { userId } = await context.params;
    const id = Number.parseInt(userId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: "ID inválido." }, { status: 400 });
    }

    const body = await request.json();
    const { username, password, isActive, roleCode, permissionOverrides } = body;

    if (username !== undefined) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return NextResponse.json(
          { message: "El nombre de usuario debe tener al menos 3 caracteres." },
          { status: 400 },
        );
      }

      const existing = await getUserByUsername(username.trim().toLowerCase());
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { message: "El nombre de usuario ya existe." },
          { status: 409 },
        );
      }
    }

    if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
      return NextResponse.json(
        { message: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 },
      );
    }

    if (roleCode !== undefined && !isRoleCode(roleCode)) {
      return NextResponse.json(
        { message: "El rol seleccionado no es válido." },
        { status: 400 },
      );
    }

    const parsedPermissionOverrides =
      permissionOverrides === undefined
        ? undefined
        : parsePermissionOverridesInput(permissionOverrides);

    if (parsedPermissionOverrides === null) {
      return NextResponse.json(
        { message: "Los accesos enviados no son válidos." },
        { status: 400 },
      );
    }

    const user = await updateUser(id, {
      username,
      password,
      isActive,
      roleCode,
      permissionOverrides: parsedPermissionOverrides,
    });

    if (!user) {
      return NextResponse.json({ message: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error, "No se pudo actualizar el usuario.");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { userId } = await context.params;
    const id = Number.parseInt(userId, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: "ID inválido." }, { status: 400 });
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ message: "Usuario no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "No se pudo eliminar el usuario.");
  }
}
