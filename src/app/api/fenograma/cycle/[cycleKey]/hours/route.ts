import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getCycleLaborHoursByCycleKey } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cycleKey: string }> },
) {
  try {
    const { cycleKey } = await context.params;
    const data = await getCycleLaborHoursByCycleKey(decodeURIComponent(cycleKey));

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el detalle de horas del ciclo.");
  }
}
