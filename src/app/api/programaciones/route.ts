import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { getProgramaciones } from "@/lib/programaciones";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = request.nextUrl;
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { message: "Se requieren dateFrom y dateTo" },
        { status: 400 },
      );
    }

    const data = await getProgramaciones(dateFrom, dateTo);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar las programaciones.");
  }
}
