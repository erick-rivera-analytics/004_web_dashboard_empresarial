import { NextRequest, NextResponse } from "next/server";

import { normalizeComparisonFilters, searchComparisonCycles } from "@/lib/comparacion";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const filters = normalizeComparisonFilters({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      area: request.nextUrl.searchParams.get("area") ?? undefined,
      block: request.nextUrl.searchParams.get("block") ?? undefined,
      variety: request.nextUrl.searchParams.get("variety") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    const data = await searchComparisonCycles(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "No se pudo cargar la busqueda de ciclos.",
      },
      { status: 500 },
    );
  }
}
