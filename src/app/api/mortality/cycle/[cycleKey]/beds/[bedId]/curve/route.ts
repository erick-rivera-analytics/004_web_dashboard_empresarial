import { NextResponse } from "next/server";

import { getBedMortalityCurveByCycleAndBed } from "@/lib/mortality";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cycleKey: string; bedId: string }> },
) {
  try {
    const { cycleKey, bedId } = await context.params;
    const data = await getBedMortalityCurveByCycleAndBed(
      decodeURIComponent(cycleKey),
      decodeURIComponent(bedId),
    );

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la curva de mortandad de la cama.",
      },
      { status: 500 },
    );
  }
}
