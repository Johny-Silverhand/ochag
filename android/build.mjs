/**
 * Build the Ochag Android WebView APK and copy it to public/downloads/test-v1.0.apk.
 *
 * Required environment:
 *   JAVA_HOME    — JDK 17+ (JDK 21 works; box: /usr/lib/jvm/java-21-openjdk-amd64)
 *   ANDROID_HOME — Android SDK with platforms;android-34 and build-tools;34.0.0
 *                  (box: /workspace/android-sdk)
 *
 * Usage (from repo root): npm run build:android
 *
 * Prefers ./gradlew when present (with gradle-wrapper.jar). Otherwise downloads
 * Gradle 8.7 to a cache dir and runs :app:assembleDebug.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  statSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const androidDir = __dirname;
const GRADLE_VER = "8.7";

const javaHome =
  process.env.JAVA_HOME ||
  (existsSync("/usr/lib/jvm/java-21-openjdk-amd64")
    ? "/usr/lib/jvm/java-21-openjdk-amd64"
    : existsSync("/usr/lib/jvm/java-17-openjdk-amd64")
      ? "/usr/lib/jvm/java-17-openjdk-amd64"
      : "");
const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  (existsSync("/workspace/android-sdk") ? "/workspace/android-sdk" : "");

function fail(msg) {
  console.error(`[android] ${msg}`);
  console.error(
    "[android] Need JAVA_HOME (JDK 17+) and ANDROID_HOME with platforms;android-34 and build-tools;34.0.0",
  );
  console.error(
    "[android] Box: JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 ANDROID_HOME=/workspace/android-sdk",
  );
  process.exit(1);
}

if (!javaHome || !existsSync(path.join(javaHome, "bin", "java"))) {
  fail(`JAVA_HOME invalid (${javaHome || "unset"})`);
}
if (!androidHome || !existsSync(androidHome)) {
  fail(`ANDROID_HOME invalid (${androidHome || "unset"})`);
}
if (!existsSync(path.join(androidHome, "platforms", "android-34", "android.jar"))) {
  fail("SDK platform android-34 missing");
}
if (!existsSync(path.join(androidHome, "build-tools", "34.0.0"))) {
  fail("build-tools 34.0.0 missing");
}

writeFileSync(
  path.join(androidDir, "local.properties"),
  `sdk.dir=${androidHome.replace(/\\/g, "/")}\n`,
);

function resolveGradle() {
  const gradlew = path.join(
    androidDir,
    process.platform === "win32" ? "gradlew.bat" : "gradlew",
  );
  const jar = path.join(androidDir, "gradle/wrapper/gradle-wrapper.jar");
  if (existsSync(gradlew) && existsSync(jar) && statSync(jar).size > 1000) {
    try {
      chmodSync(gradlew, 0o755);
    } catch {
      /* ignore */
    }
    return { cmd: gradlew, args: [":app:assembleDebug", "--no-daemon"] };
  }

  const cacheRoot = path.join(os.homedir(), ".cache", "ochag-gradle");
  const distDir = path.join(cacheRoot, `gradle-${GRADLE_VER}`);
  const gradleBin = path.join(
    distDir,
    `gradle-${GRADLE_VER}`,
    "bin",
    process.platform === "win32" ? "gradle.bat" : "gradle",
  );
  if (!existsSync(gradleBin)) {
    mkdirSync(cacheRoot, { recursive: true });
    const zip = path.join(cacheRoot, `gradle-${GRADLE_VER}-bin.zip`);
    if (!existsSync(zip)) {
      console.log(`[android] downloading Gradle ${GRADLE_VER}…`);
      const url = `https://services.gradle.org/distributions/gradle-${GRADLE_VER}-bin.zip`;
      const dl = spawnSync("curl", ["-fsSL", "-o", zip, url], { stdio: "inherit" });
      if (dl.status !== 0) fail("Failed to download Gradle distribution");
    }
    rmSync(distDir, { recursive: true, force: true });
    mkdirSync(distDir, { recursive: true });
    const unzip = spawnSync("unzip", ["-q", zip, "-d", distDir], { stdio: "inherit" });
    if (unzip.status !== 0) fail("Failed to unzip Gradle distribution");
  }
  try {
    chmodSync(gradleBin, 0o755);
  } catch {
    /* ignore */
  }
  return { cmd: gradleBin, args: [":app:assembleDebug", "--no-daemon"] };
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`,
};

console.log(`[android] JAVA_HOME=${javaHome}`);
console.log(`[android] ANDROID_HOME=${androidHome}`);
console.log("[android] assembling debug APK…");

const { cmd, args } = resolveGradle();
const assemble = spawnSync(cmd, args, {
  cwd: androidDir,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});
if (assemble.status !== 0) process.exit(assemble.status ?? 1);

const apkSrc = path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
if (!existsSync(apkSrc)) fail(`APK not produced at ${apkSrc}`);

const outDir = path.join(root, "public/downloads");
mkdirSync(outDir, { recursive: true });
const apkDest = path.join(outDir, "test-v1.0.apk");
copyFileSync(apkSrc, apkDest);
console.log(
  `[android] wrote ${apkDest} (${(statSync(apkDest).size / (1024 * 1024)).toFixed(2)} MiB)`,
);
