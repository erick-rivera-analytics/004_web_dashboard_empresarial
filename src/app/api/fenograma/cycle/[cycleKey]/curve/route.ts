import { NextResponse } from "next/server";

import { getHarvestCurveByCycleKey } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cycleKey: string }> },
) {
  try {
    const { cycleKey } = await context.params;
    const data = await getHarvestCurveByCycleKey(decodeURIComponent(cycleKey));

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
            : "No se pudo cargar la curva de cosecha del ciclo.",
      },
      { status: 500 },
    );
  }
}
