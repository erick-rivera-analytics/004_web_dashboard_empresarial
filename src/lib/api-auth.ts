import { type NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * Check authentication on an API route.
 * Returns a 401 NextResponse if unauthorized, or null if the request is valid.
 *
 * Usage (add 2 lines at the top of any GET/POST handler):
 *   const authError = requireAuth(request);
 *   if (authError) return authError;
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const token = request.cookies.get("wh-session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "Missing authentication token" },
      { status: 401 },
    );
  }

  const username = verifyToken(token);
  if (!username) {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 },
    );
  }

  // Valid session — proceed
  return null;
}
