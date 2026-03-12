import { NextResponse } from "next/server";

import { getCycleProfilesByBlock } from "@/lib/fenograma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ parentBlock: string }> },
) {
  try {
    const { parentBlock } = await context.params;
    const data = await getCycleProfilesByBlock(decodeURIComponent(parentBlock));

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
            : "No se pudo cargar el cycle profile del bloque.",
      },
      { status: 500 },
    );
  }
}
