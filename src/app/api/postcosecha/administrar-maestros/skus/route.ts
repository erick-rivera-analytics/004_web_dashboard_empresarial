import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type {
  PoscosechaSkuInput,
  PoscosechaSkuPayload,
} from "@/lib/postcosecha-sku-types";
import {
  createPostharvestSku,
  listCurrentPostharvestSkus,
} from "@/lib/postcosecha-skus";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await listCurrentPostharvestSkus();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el maestro de SKU de postcosecha.");
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const payload = (await request.json()) as PoscosechaSkuInput;
    const actorId = (await getSession()) ?? "corex_postcosecha_ui";
    const data = await createPostharvestSku(payload, actorId);

    return NextResponse.json<PoscosechaSkuPayload>(
      { data: data! },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return handleApiError(error, "No se pudo crear el SKU de postcosecha.");
  }
}

