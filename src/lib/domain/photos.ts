import type { DocumentPhoto } from "./types.ts";
import { uid } from "../utils.ts";
import { AuthzError } from "../authz/error.ts";

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_CHARS = 900_000;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function sanitizePhotos(input: unknown, at = new Date().toISOString()): DocumentPhoto[] {
  if (!Array.isArray(input)) return [];
  const out: DocumentPhoto[] = [];
  for (const raw of input.slice(0, MAX_PHOTOS)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Partial<DocumentPhoto>;
    const dataUrl = String(row.dataUrl ?? "").trim();
    const mime = String(row.mime ?? guessMime(dataUrl)).toLowerCase();
    if (!dataUrl.startsWith("data:image/") || !ALLOWED.has(mime)) {
      throw new AuthzError("Фото: только JPEG, PNG, WebP или GIF", 400);
    }
    if (dataUrl.length > MAX_PHOTO_CHARS) {
      throw new AuthzError("Фото слишком большое — сожмите снимок (до ~160 КБ)", 400);
    }
    out.push({
      id: row.id && String(row.id).startsWith("ph_") ? String(row.id) : uid("ph"),
      name: sanitizePhotoName(row.name),
      mime,
      dataUrl,
      at: row.at && typeof row.at === "string" ? row.at : at,
    });
  }
  return out;
}

function sanitizePhotoName(raw: unknown) {
  const s = String(raw ?? "фото").replace(/\\/g, "/");
  const base = (s.split("/").pop() ?? "фото").replace(/\0/g, "");
  const cleaned = base.replace(/\.\./g, "").replace(/[^\p{L}\p{N}._\-\s]/gu, "").trim().slice(0, 80);
  return cleaned || "фото";
}

function guessMime(dataUrl: string) {
  const m = /^data:(image\/[a-z0-9.+-]+);/i.exec(dataUrl);
  return m?.[1] ?? "image/jpeg";
}
