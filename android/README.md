# Ochag — Android WebView shell

Single-activity Android app (`labs.victimok.ochag`) that loads
`https://ochag-theta.vercel.app` in a WebView. Display name: **Очаг**.

## Build

From the repository root:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64   # JDK 17+ required
export ANDROID_HOME=/workspace/android-sdk           # or your SDK path
npm run build:android
```

Output: `public/downloads/test-v1.0.apk`

### SDK packages

- `platforms;android-34`
- `build-tools;34.0.0`

JDK 17+ required (JDK 21 works).
`local.properties` is gitignored; `android/build.mjs` writes `sdk.dir` from `ANDROID_HOME`.
If `gradle-wrapper.jar` is missing, the build script downloads it automatically.

## Install

```bash
adb install -r public/downloads/test-v1.0.apk
```

The debug APK is signed with the Android debug keystore (fine for sideload testing).
