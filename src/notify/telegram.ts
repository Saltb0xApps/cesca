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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function header(emoji: string, label: string, account: string, name: string) {
  return `${emoji} <b>${label}</b> · <i>${esc(account)}</i>\n${esc(name)}`;
}

export function formatPublishSuccess(
  account: string,
  name: string,
  urls: Record<string, string>,
): string {
  const list = Object.entries(urls)
    .map(([p, u]) => `• <b>${p}</b>: <a href="${esc(u)}">${esc(u)}</a>`)
    .join("\n");
  return `${header("✅", "Published", account, name)}\n${list}`;
}

export function formatPublishFailure(
  account: string,
  name: string,
  errors: Record<string, string>,
): string {
  const list = Object.entries(errors)
    .map(([p, e]) => `• <b>${p}</b>: ${esc(e)}`)
    .join("\n");
  return `${header("❌", "Publish failed", account, name)}\n${list}`;
}

export function formatPartial(
  account: string,
  name: string,
  urls: Record<string, string>,
  errors: Record<string, string>,
): string {
  const ok = Object.entries(urls)
    .map(([p, u]) => `• ✅ <b>${p}</b>: <a href="${esc(u)}">${esc(u)}</a>`)
    .join("\n");
  const bad = Object.entries(errors)
    .map(([p, e]) => `• ❌ <b>${p}</b>: ${esc(e)}`)
    .join("\n");
  return `${header("⚠️", "Partial publish", account, name)}\n${[ok, bad]
    .filter(Boolean)
    .join("\n")}`;
}

export function formatHeadsUp(
  account: string,
  name: string,
  minutesAway: number,
): string {
  return `⏰ <b>Heads up</b> · <i>${esc(account)}</i>\n"${esc(name)}" publishes in ~${minutesAway} min.`;
}
