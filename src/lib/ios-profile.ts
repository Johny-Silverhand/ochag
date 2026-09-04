function xml(value: string) {
  const amp = String.fromCharCode(38);
  return Array.from(value)
    .map((ch) => {
      if (ch === "&") return `${amp}amp;`;
      if (ch === "<") return `${amp}lt;`;
      if (ch === ">") return `${amp}gt;`;
      if (ch === '"') return `${amp}quot;`;
      return ch;
    })
    .join("");
}

export function buildWebClipProfile(opts: { url: string; iconPngBase64: string; label?: string }) {
  const label = opts.label ?? "Очаг";
  const uuid1 = "A3E1C0B2-7D44-4F1A-9B11-0C8A6E2F4D70";
  const uuid2 = "B4F2D1C3-8E55-402B-8C22-1D9B7F3E5E81";
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    "<dict>",
    "  <key>PayloadContent</key>",
    "  <array>",
    "    <dict>",
    "      <key>FullScreen</key>",
    "      <true/>",
    "      <key>Icon</key>",
    `      <data>${opts.iconPngBase64}</data>`,
    "      <key>IsRemovable</key>",
    "      <true/>",
    "      <key>Label</key>",
    `      <string>${xml(label)}</string>`,
    "      <key>PayloadDescription</key>",
    "      <string>Иконка контура Очаг на экране Домой</string>",
    "      <key>PayloadDisplayName</key>",
    `      <string>${xml(label)}</string>`,
    "      <key>PayloadIdentifier</key>",
    "      <string>labs.victimok.ochag.webclip</string>",
    "      <key>PayloadType</key>",
    "      <string>com.apple.webClip.managed</string>",
    "      <key>PayloadUUID</key>",
    `      <string>${uuid1}</string>`,
    "      <key>PayloadVersion</key>",
    "      <integer>1</integer>",
    "      <key>Precomposed</key>",
    "      <true/>",
    "      <key>URL</key>",
    `      <string>${xml(opts.url)}</string>`,
    "    </dict>",
    "  </array>",
    "  <key>PayloadDescription</key>",
    "  <string>Ставит Очаг на экран Домой. Victimok Labs.</string>",
    "  <key>PayloadDisplayName</key>",
    "  <string>Очаг — Victimok Labs</string>",
    "  <key>PayloadIdentifier</key>",
    "  <string>labs.victimok.ochag</string>",
    "  <key>PayloadOrganization</key>",
    "  <string>Victimok Labs</string>",
    "  <key>PayloadRemovalDisallowed</key>",
    "  <false/>",
    "  <key>PayloadType</key>",
    "  <string>Configuration</string>",
    "  <key>PayloadUUID</key>",
    `  <string>${uuid2}</string>`,
    "  <key>PayloadVersion</key>",
    "  <integer>1</integer>",
    "</dict>",
    "</plist>",
    "",
  ].join("\n");
}

export async function downloadWebClip(origin = window.location.origin) {
  const iconRes = await fetch("/apple-touch-icon.png");
  const buf = await iconRes.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  const xmlDoc = buildWebClipProfile({
    url: origin,
    iconPngBase64: btoa(binary),
  });
  const blob = new Blob([xmlDoc], { type: "application/x-apple-aspen-config" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "Ochag.mobileconfig";
  a.click();
  URL.revokeObjectURL(href);
}
