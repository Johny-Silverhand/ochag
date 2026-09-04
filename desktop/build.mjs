import { cpSync, mkdirSync, existsSync, rmSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const goBin = path.join(root, "tools/go/bin/go");
const winres = path.join(root, "tools/gopath/bin/go-winres");
const win = path.join(root, "desktop/win");
const web = path.join(win, "web");

rmSync(web, { recursive: true, force: true });
mkdirSync(path.join(web, "setup"), { recursive: true });
cpSync(path.join(root, "public/setup"), path.join(web, "setup"), { recursive: true });
const winSetup = path.join(root, "public/win-setup");
rmSync(winSetup, { recursive: true, force: true });
mkdirSync(winSetup, { recursive: true });
cpSync(path.join(root, "public/setup"), winSetup, { recursive: true });
mkdirSync(path.join(win, "winres"), { recursive: true });
if (existsSync(path.join(root, "public/setup/media/icon-256.png"))) {
  copyFileSync(path.join(root, "public/setup/media/icon-256.png"), path.join(win, "winres/icon.png"));
}

const spa = spawnSync("npx", ["vite", "build", "--config", "desktop/vite.config.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
});
if (spa.status !== 0) {
  console.warn("[desktop] SPA build skipped or failed — installer will still ship");
}

if (existsSync(winres)) {
  const wr = spawnSync(winres, ["make", "--in", "winres/winres.json", "--out", "rsrc"], {
    cwd: win,
    stdio: "inherit",
  });
  if (wr.status !== 0) console.warn("[desktop] winres skipped");
}

mkdirSync(path.join(root, "dist-win"), { recursive: true });
mkdirSync(path.join(root, "public/downloads"), { recursive: true });

const ldflags = "-s -w -H windowsgui";
const outExe = path.join(root, "dist-win", "test v1.0 Setup.exe");
const env = {
  ...process.env,
  CGO_ENABLED: "0",
  GOOS: "windows",
  GOARCH: "amd64",
  GOTOOLCHAIN: "local",
  GOPATH: path.join(root, "tools/gopath"),
  PATH: `${path.join(root, "tools/go/bin")}:${process.env.PATH || ""}`,
};
const build = spawnSync(goBin, ["build", "-trimpath", "-ldflags", ldflags, "-o", outExe, "."], {
  cwd: win,
  stdio: "inherit",
  env,
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const downloadName = path.join(root, "public/downloads/test-v1.0-Setup.exe");
copyFileSync(outExe, downloadName);
console.log("wrote", outExe);
console.log("wrote", downloadName);
