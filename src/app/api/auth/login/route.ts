import { NextResponse } from "next/server";
import { validateCredentials, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  const isValid = await validateCredentials(username, password);
  if (!isValid) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 },
    );
  }

  await setSessionCookie(username);
  return NextResponse.json({ ok: true });
}
