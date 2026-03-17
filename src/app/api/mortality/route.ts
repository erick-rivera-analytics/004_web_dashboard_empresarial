import { NextRequest, NextResponse } from "next/server";

import { getMortalityDashboardData, normalizeMortalityFilters } from "@/lib/mortality";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const filters = normalizeMortalityFilters({
      area: request.nextUrl.searchParams.get("area") ?? undefined,
      spType: request.nextUrl.searchParams.get("spType") ?? undefined,
      variety: request.nextUrl.searchParams.get("variety") ?? undefined,
      parentBlock: request.nextUrl.searchParams.get("parentBlock") ?? undefined,
      block: request.nextUrl.searchParams.get("block") ?? undefined,
    });
    const data = await getMortalityDashboardData(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el dashboard de mortandades.",
      },
      { status: 500 },
    );
  }
}
