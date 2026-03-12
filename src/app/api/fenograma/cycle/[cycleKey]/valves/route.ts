import { NextResponse } from "next/server";

import { getValveProfilesByCycleKey } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cycleKey: string }> },
) {
  try {
    const { cycleKey } = await context.params;
    const data = await getValveProfilesByCycleKey(decodeURIComponent(cycleKey));

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
            : "No se pudo cargar el listado de valvulas del ciclo.",
      },
      { status: 500 },
    );
  }
}
