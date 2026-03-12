import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const legacyRoutes = new Set([
  "/auth/sign-in",
  "/sign-in",
  "/register",
  "/auth/sign-up",
  "/landing",
  "/home",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (legacyRoutes.has(pathname)) {
    const destination = pathname === "/home" ? "/dashboard" : "/login";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
