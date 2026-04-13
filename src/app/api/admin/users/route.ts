import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { listUsers, createUser, getUserByUsername } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const users = await listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return handleApiError(error, "No se pudo obtener la lista de usuarios.");
  }
}

export async function POST(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { username, password, isActive } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ message: "El nombre de usuario debe tener al menos 3 caracteres." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ message: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }

    const existing = await getUserByUsername(username.trim().toLowerCase());
    if (existing) {
      return NextResponse.json({ message: "El nombre de usuario ya existe." }, { status: 409 });
    }

    const user = await createUser({ username, password, isActive });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "No se pudo crear el usuario.");
  }
}
