import { NextResponse } from "next/server";

import { getValveMortalityCurveByCycleAndValve } from "@/lib/mortality";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cycleKey: string; valveId: string }> },
) {
  try {
    const { cycleKey, valveId } = await context.params;
    const data = await getValveMortalityCurveByCycleAndValve(
      decodeURIComponent(cycleKey),
      decodeURIComponent(valveId),
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
            : "No se pudo cargar la curva de mortandad de la valvula.",
      },
      { status: 500 },
    );
  }
}
