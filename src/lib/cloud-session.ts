import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "coachbuilder_cloud_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 45; // 45 dias

export type SessionClaims = {
  sub: string;
  email: string;
  /** `iat` do JWT em milissegundos; compara-se com `User.sessionInvalidatedAt`. */
  issuedAtMs: number;
};

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET em falta ou demasiado curto (mín. 16 caracteres).");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + MAX_AGE_SEC * 1000))
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!sub || !email) return null;
    const iat = payload.iat;
    const issuedAtMs = typeof iat === "number" && Number.isFinite(iat) ? iat * 1000 : 0;
    return { sub, email, issuedAtMs };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function readSessionFromCookies(): Promise<SessionClaims | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
