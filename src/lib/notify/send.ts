import type { OutboxItem, Snapshot } from "../domain/types";
import { markOutbox } from "../domain/mutations";

export interface SendConfig {
  telegramBot?: string;
  telegramChat?: string;
  emailWebhook?: string;
}

export function notifyConfig(): SendConfig {
  const env = typeof process !== "undefined" ? process.env : {};
  return {
    telegramBot: env.OCHAG_TELEGRAM_BOT_TOKEN?.trim(),
    telegramChat: env.OCHAG_TELEGRAM_CHAT_ID?.trim(),
    emailWebhook: env.OCHAG_EMAIL_WEBHOOK?.trim(),
  };
}

export function notifyReady(cfg = notifyConfig()) {
  return {
    telegram: Boolean(cfg.telegramBot && cfg.telegramChat),
    email: Boolean(cfg.emailWebhook),
    webpush: Boolean(process.env.OCHAG_VAPID_PUBLIC && process.env.OCHAG_VAPID_PRIVATE),
  };
}

async function sendTelegram(cfg: SendConfig, text: string, to?: string) {
  if (!cfg.telegramBot) throw new Error("Нет OCHAG_TELEGRAM_BOT_TOKEN");
  const chat = to && /^\-?\d+$/.test(to) ? to : cfg.telegramChat;
  if (!chat) throw new Error("Нет OCHAG_TELEGRAM_CHAT_ID");
  const res = await fetch(`https://api.telegram.org/bot${cfg.telegramBot}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 3900) }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

async function sendEmail(cfg: SendConfig, item: OutboxItem) {
  if (!cfg.emailWebhook) throw new Error("Нет OCHAG_EMAIL_WEBHOOK");
  const res = await fetch(cfg.emailWebhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: item.to, subject: item.title, text: item.body }),
  });
  if (!res.ok) throw new Error(`Email webhook ${res.status}`);
}

export async function flushOutbox(snap: Snapshot): Promise<Snapshot> {
  const cfg = notifyConfig();
  let next = snap;
  for (const item of snap.outbox.filter((o) => o.status === "queued")) {
    try {
      if (item.channel === "telegram") await sendTelegram(cfg, `${item.title}\n${item.body}`, item.to);
      else if (item.channel === "email") await sendEmail(cfg, item);
      else if (item.channel === "webpush") {
        if (!notifyReady(cfg).webpush) {
          throw new Error("Нет OCHAG_VAPID_PUBLIC / OCHAG_VAPID_PRIVATE — подписка в журнале, отправка ждёт ключи");
        }
        throw new Error("Web Push ключи заданы, но отправка ждёт адаптер VAPID (очередь сохранена)");
      }
      next = markOutbox(next, item.id, "sent");
    } catch (err) {
      next = markOutbox(next, item.id, "failed", err instanceof Error ? err.message : "ошибка канала");
    }
  }
  return next;
}
