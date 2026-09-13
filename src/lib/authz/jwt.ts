import { SignJWT, jwtVerify } from "jose";
import type { Role } from "../domain/types";
import type { Actor } from "./actor";

const DEV_SECRET = "ochag-dev-jwt-not-for-production";

export function isProductionRuntime() {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return env?.OCHAG_ENV === "production" || env?.NODE_ENV === "production" || env?.VERCEL_ENV === "production";
}

function secretBytes() {
  const raw = (typeof process !== "undefined" ? process.env.OCHAG_JWT_SECRET : undefined)?.trim();
  if (isProductionRuntime() && !raw) {
    throw new Error("OCHAG_JWT_SECRET обязателен в production");
  }
  return new TextEncoder().encode(raw || DEV_SECRET);
}

export interface TokenPayload {
  sub: string;
  role: Role;
  branch: string | null;
  name: string;
  sb: string;
}

export async function signActor(actor: Actor, ttl = "12h") {
  return new SignJWT({
    role: actor.role,
    branch: actor.homeBranchId,
    name: actor.name,
    sb: actor.sessionBranchId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(actor.userId)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secretBytes());
}

export async function verifyActor(token: string): Promise<Actor> {
  const { payload } = await jwtVerify(token, secretBytes());
  return {
    userId: String(payload.sub ?? ""),
    role: payload.role as Role,
    homeBranchId: (payload.branch as string | null) ?? null,
    sessionBranchId: String(payload.sb ?? payload.branch ?? "all"),
    name: String(payload.name ?? ""),
  };
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ochag_token=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
