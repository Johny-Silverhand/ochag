import { spawnSync } from "node:child_process";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function run(cmd, args, extra = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, ...extra });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("npx", ["vite", "build", "--config", "ios/vite.config.ts"]);

run("python3", [
  "-c",
  `
from pathlib import Path
from PIL import Image, ImageDraw
out = Path("/workspace/ios/Ochag/Assets.xcassets/AppIcon.appiconset/icon-1024.png")
out.parent.mkdir(parents=True, exist_ok=True)
src = Path("/workspace/public/apple-touch-icon.png")
img = Image.open(src).convert("RGBA").resize((1024, 1024), Image.Resampling.LANCZOS)
bg = Image.new("RGBA", (1024, 1024), (23, 53, 43, 255))
bg.paste(img, (0, 0), img)
bg.save(out)
print("icon", out, out.stat().st_size)
`,
]);

mkdirSync(path.join(root, "public/downloads"), { recursive: true });
const zip = path.join(root, "public/downloads/Ochag-iOS-Xcode.zip");
run("python3", [
  "-c",
  `
import zipfile
from pathlib import Path
root = Path("/workspace/ios")
out = Path("/workspace/public/downloads/Ochag-iOS-Xcode.zip")
skip = {"node_modules", ".DS_Store"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for p in root.rglob("*"):
        if any(part in skip for part in p.parts):
            continue
        if p.is_file():
            z.write(p, Path("Ochag-iOS") / p.relative_to(root))
print("zip", out, out.stat().st_size)
`,
]);
console.log("iOS project packed", zip);
