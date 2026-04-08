import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET ?? "wh-dashboard-secret-key-2026";
const COOKIE_NAME = "wh-session";

const legacyRoutes = new Set([
  "/auth/sign-in",
  "/sign-in",
  "/register",
  "/auth/sign-up",
  "/landing",
  "/home",
]);

function verifyToken(token: string): boolean {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return false;
    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");
    return sig === expectedSig;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy route redirects
  if (legacyRoutes.has(pathname)) {
    const destination = pathname === "/home" ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAuthenticated = token ? verifyToken(token) : false;

  // If on login page and already authenticated, redirect to dashboard
  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If accessing dashboard routes without auth, redirect to login
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
