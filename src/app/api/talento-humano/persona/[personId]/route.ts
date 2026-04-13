import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getPersonProfile } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ personId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { personId } = await context.params;
    if (!personId) {
      return NextResponse.json({ message: "personId requerido." }, { status: 400 });
    }

    const profile = await getPersonProfile(decodeURIComponent(personId));
    if (!profile) {
      return NextResponse.json({ message: "Persona no encontrada." }, { status: 404 });
    }

    return NextResponse.json(profile, {
      headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el perfil de la persona.");
  }
}

