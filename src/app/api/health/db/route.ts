import { NextResponse } from "next/server";

import { getDatabaseHealth } from "@/lib/db";

export async function GET() {
  const health = await getDatabaseHealth();

  return NextResponse.json(health, {
    status: health.connected ? 200 : health.configured ? 503 : 200,
  });
}
