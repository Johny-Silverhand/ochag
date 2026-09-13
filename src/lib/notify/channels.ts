/** Telegram / Web Push are stubbed until tokens and VAPID keys exist. */

export interface NotifyResult {
  ok: true;
  channel: "telegram" | "webpush";
  stub: true;
  at: string;
  preview: string;
}

export function stubTelegram(text: string): NotifyResult {
  return {
    ok: true,
    channel: "telegram",
    stub: true,
    at: new Date().toISOString(),
    preview: text.slice(0, 240),
  };
}

export function stubWebPush(title: string, body: string): NotifyResult {
  return {
    ok: true,
    channel: "webpush",
    stub: true,
    at: new Date().toISOString(),
    preview: `${title}: ${body}`.slice(0, 240),
  };
}
