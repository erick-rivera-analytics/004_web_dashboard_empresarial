import { NextRequest, NextResponse } from "next/server";

import { getComparisonPair } from "@/lib/comparacion";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const left = request.nextUrl.searchParams.get("left");
    const right = request.nextUrl.searchParams.get("right");

    if (!left || !right) {
      return NextResponse.json(
        { message: "Debes enviar left y right para comparar." },
        { status: 400 },
      );
    }

    const data = await getComparisonPair(
      decodeURIComponent(left),
      decodeURIComponent(right),
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
          error instanceof Error ? error.message : "No se pudo cargar la comparacion.",
      },
      { status: 500 },
    );
  }
}
