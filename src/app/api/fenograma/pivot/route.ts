import { NextRequest, NextResponse } from "next/server";

import { getFenogramaDashboardData, normalizeFenogramaFilters } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const filters = normalizeFenogramaFilters({
      includeActive: request.nextUrl.searchParams.get("includeActive") ?? undefined,
      includePlanned: request.nextUrl.searchParams.get("includePlanned") ?? undefined,
      includeHistory: request.nextUrl.searchParams.get("includeHistory") ?? undefined,
      area: request.nextUrl.searchParams.get("area") ?? undefined,
      variety: request.nextUrl.searchParams.get("variety") ?? undefined,
      spType: request.nextUrl.searchParams.get("spType") ?? undefined,
      visibleWeeks: request.nextUrl.searchParams.get("visibleWeeks") ?? undefined,
    });
    const data = await getFenogramaDashboardData(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "No se pudo cargar el fenograma.",
      },
      { status: 500 },
    );
  }
}
