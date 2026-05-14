import { config } from "../config";

const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(text: string): Promise<void> {
  const { botToken, chatId } = config.telegram;
  if (!botToken || !chatId) return;

  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });

  if (!res.ok) {
    console.error(`Telegram send failed: ${res.status} ${await res.text()}`);
  }
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatPublishSuccess(
  name: string,
  urls: Record<string, string>,
): string {
  const list = Object.entries(urls)
    .map(([p, u]) => `• <b>${p}</b>: <a href="${escape(u)}">${escape(u)}</a>`)
    .join("\n");
  return `✅ <b>Published</b>: ${escape(name)}\n${list}`;
}

export function formatPublishFailure(
  name: string,
  errors: Record<string, string>,
): string {
  const list = Object.entries(errors)
    .map(([p, e]) => `• <b>${p}</b>: ${escape(e)}`)
    .join("\n");
  return `❌ <b>Publish failed</b>: ${escape(name)}\n${list}`;
}

export function formatPartial(
  name: string,
  urls: Record<string, string>,
  errors: Record<string, string>,
): string {
  const ok = Object.entries(urls)
    .map(([p, u]) => `• ✅ <b>${p}</b>: <a href="${escape(u)}">${escape(u)}</a>`)
    .join("\n");
  const bad = Object.entries(errors)
    .map(([p, e]) => `• ❌ <b>${p}</b>: ${escape(e)}`)
    .join("\n");
  return `⚠️ <b>Partial publish</b>: ${escape(name)}\n${[ok, bad]
    .filter(Boolean)
    .join("\n")}`;
}

export function formatHeadsUp(name: string, minutesAway: number): string {
  return `⏰ <b>Heads up</b>: "${escape(name)}" publishes in ~${minutesAway} min.`;
}
