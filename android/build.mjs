/**
 * Build the Ochag Android WebView APK and copy it to public/downloads/test-v1.0.apk.
 *
 * Required environment:
 *   JAVA_HOME    — JDK 17+ (JDK 21 works; box: /usr/lib/jvm/java-21-openjdk-amd64)
 *   ANDROID_HOME — Android SDK with platforms;android-34 and build-tools;34.0.0
 *                  (box: /workspace/android-sdk)
 *
 * Usage (from repo root): npm run build:android
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  chmodSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const androidDir = __dirname;

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

const wrapperJar = path.join(androidDir, "gradle/wrapper/gradle-wrapper.jar");
if (!existsSync(wrapperJar) || statSync(wrapperJar).size < 1000) {
  mkdirSync(path.dirname(wrapperJar), { recursive: true });
  console.log("[android] downloading gradle-wrapper.jar…");
  const dl = spawnSync(
    "curl",
    [
      "-fsSL",
      "-o",
      wrapperJar,
      "https://github.com/gradle/gradle/raw/v8.7.0/gradle/wrapper/gradle-wrapper.jar",
    ],
    { stdio: "inherit" },
  );
  if (dl.status !== 0 || !existsSync(wrapperJar)) {
    fail("Could not download gradle-wrapper.jar");
  }
}

const gradlew = path.join(
  androidDir,
  process.platform === "win32" ? "gradlew.bat" : "gradlew",
);
if (!existsSync(gradlew)) fail(`gradlew missing at ${gradlew}`);
try {
  chmodSync(gradlew, 0o755);
} catch {
  /* ignore */
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

const assemble = spawnSync(gradlew, [":app:assembleDebug", "--no-daemon"], {
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
