import { cookies } from "next/headers";
import crypto from "crypto";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "atlas2026";
const SECRET = "wh-dashboard-secret-key-2026";
const COOKIE_NAME = "wh-session";

/** Validate credentials. Returns true if valid. */
export function validateCredentials(username: string, password: string) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/** Create a signed session token. */
export function createToken(username: string): string {
  const payload = JSON.stringify({ sub: username, iat: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

/** Verify a token. Returns the username or null. */
export function verifyToken(token: string): string | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");

    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Set the session cookie. */
export async function setSessionCookie(username: string) {
  const token = createToken(username);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/** Remove the session cookie. */
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/** Read session from cookie. Returns username or null. */
export async function getSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Cookie name export for middleware (which can't use next/headers). */
export const SESSION_COOKIE_NAME = COOKIE_NAME;
