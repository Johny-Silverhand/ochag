import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Static URL so Vite/Nitro traces the TTF into the serverless bundle. */
const BUNDLED = new URL("./fonts/DejaVuSans.ttf", import.meta.url);

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

/** Cyrillic-capable TTF bytes, or null if the font is missing from the image. */
export function cyrillicFontBytes(): Buffer | null {
  try {
    return readFileSync(BUNDLED);
  } catch {
    /* not next to the bundled module — try known install paths */
  }
  for (const p of extraFontPaths()) {
    try {
      if (existsSync(p)) return readFileSync(p);
    } catch {
      /* next */
    }
  }
  return null;
}
