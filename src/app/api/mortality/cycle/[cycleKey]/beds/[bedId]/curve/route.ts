import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
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
    return handleApiError(error, "No se pudo cargar la curva de mortandad de la cama.");
  }
}
