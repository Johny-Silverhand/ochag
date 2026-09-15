import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import embedded from "./fonts/DejaVuSans.ttf?inline";

function fromDataUrl(raw: string): Buffer | null {
  const text = String(raw ?? "");
  const marker = "base64,";
  const at = text.indexOf(marker);
  const b64 = at >= 0 ? text.slice(at + marker.length) : text;
  if (b64.length < 200) return null;
  try {
    const buf = Buffer.from(b64, "base64");
    return buf.length > 1000 ? buf : null;
  } catch {
    return null;
  }
}

function extraFontPaths() {
  const here = dirname(fileURLToPath(import.meta.url));
  return [
    join(here, "fonts/DejaVuSans.ttf"),
    join(process.cwd(), "src/lib/reports/fonts/DejaVuSans.ttf"),
    join(process.cwd(), "public/fonts/DejaVuSans.ttf"),
    join(process.cwd(), "fonts/DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
  ];
}

/** Cyrillic TTF bytes. Vite inlines the file so Vercel does not depend on the lambda FS. */
export function cyrillicFontBytes(): Buffer | null {
  const embeddedBuf = fromDataUrl(embedded);
  if (embeddedBuf) return embeddedBuf;
  for (const p of extraFontPaths()) {
    try {
      if (existsSync(p)) return readFileSync(p);
    } catch {
      /* next */
    }
  }
  return null;
}
