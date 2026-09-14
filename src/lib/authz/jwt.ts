import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import type { Role } from "../domain/types";
import type { Actor } from "./actor";

const DEV_SECRET = "ochag-dev-jwt-not-for-production";
/** Hall shift length. Rotate with OCHAG_JWT_SECRET + OCHAG_JWT_SECRET_PREVIOUS. */
export const JWT_TTL = "12h";

export function isProductionRuntime() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return env?.OCHAG_ENV === "production" || env?.NODE_ENV === "production" || env?.VERCEL_ENV === "production";
}

function secretFrom(raw: string | undefined, label: string) {
  const value = raw?.trim();
  if (isProductionRuntime() && label === "OCHAG_JWT_SECRET" && !value) {
    throw new Error("OCHAG_JWT_SECRET обязателен в production");
  }
  return new TextEncoder().encode(value || DEV_SECRET);
}

function currentSecret() {
  return secretFrom(typeof process !== "undefined" ? process.env.OCHAG_JWT_SECRET : undefined, "OCHAG_JWT_SECRET");
}

function previousSecret() {
  const raw = (typeof process !== "undefined" ? process.env.OCHAG_JWT_SECRET_PREVIOUS : undefined)?.trim();
  if (!raw) return null;
  const current = (typeof process !== "undefined" ? process.env.OCHAG_JWT_SECRET : undefined)?.trim();
  if (current && raw === current) return null;
  return new TextEncoder().encode(raw);
}

export interface TokenPayload {
  sub: string;
  role: Role;
  branch: string | null;
  name: string;
  sb: string;
  ao?: string | null;
  oid?: string | null;
}

function actorFromPayload(payload: JWTPayload): Actor {
  return {
    userId: String(payload.sub ?? ""),
    role: payload.role as Role,
    homeBranchId: (payload.branch as string | null) ?? null,
    sessionBranchId: String(payload.sb ?? payload.branch ?? "all"),
    name: String(payload.name ?? ""),
    actingOwnerId: (payload.ao as string | null | undefined) ?? null,
    ownerId: (payload.oid as string | null | undefined) ?? null,
    sessionId: typeof payload.jti === "string" ? payload.jti : undefined,
  };
}

export async function signActor(actor: Actor, ttl = JWT_TTL) {
  return new SignJWT({
    role: actor.role,
    branch: actor.homeBranchId,
    name: actor.name,
    sb: actor.sessionBranchId,
    ao: actor.actingOwnerId ?? null,
    oid: actor.ownerId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(actor.userId)
    .setJti(actor.sessionId || `${actor.userId}-legacy`)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(currentSecret());
}

export async function verifyActor(token: string): Promise<Actor> {
  try {
    const { payload } = await jwtVerify(token, currentSecret());
    return actorFromPayload(payload);
  } catch (err) {
    const prev = previousSecret();
    if (!prev) throw err;
    const { payload } = await jwtVerify(token, prev);
    return actorFromPayload(payload);
  }
}

/** JWT is sent as `Authorization: Bearer`. Cookie is not accepted (CSRF). */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return null;
}
