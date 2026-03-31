import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { getComparisonPair } from "@/lib/comparacion";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const left = request.nextUrl.searchParams.get("left");
    const right = request.nextUrl.searchParams.get("right");

    if (!left || !right) {
      return NextResponse.json(
        { message: "Debes enviar left y right para comparar." },
        { status: 400 },
      );
    }

    const data = await getComparisonPair(
      decodeURIComponent(left),
      decodeURIComponent(right),
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar la comparacion.");
  }
}
