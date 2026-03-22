import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { getCycleProfilesByBlock } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ parentBlock: string }> },
) {
  try {
    const { parentBlock } = await context.params;
    const url = new URL(request.url);
    const cycleKey = url.searchParams.get("cycleKey");
    const data = await getCycleProfilesByBlock(decodeURIComponent(parentBlock), {
      cycleKey: cycleKey ? decodeURIComponent(cycleKey) : null,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el cycle profile del bloque.");
  }
}
