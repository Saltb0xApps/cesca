import { config } from "../src/config";

async function main() {
  const token = config.telegram.botToken;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN not set in .env");
  }

  console.log("Send any message to your bot, then press Enter to fetch chat ID...");
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  if (!res.ok) throw new Error(`getUpdates failed: ${await res.text()}`);

  const json = (await res.json()) as {
    ok: boolean;
    result: Array<{ message?: { chat: { id: number; type: string; title?: string; username?: string } } }>;
  };

  if (!json.result.length) {
    console.log("No messages found. Message the bot first, then re-run.");
    return;
  }

  const chats = new Map<number, { id: number; label: string }>();
  for (const u of json.result) {
    const c = u.message?.chat;
    if (!c) continue;
    const label = c.title || c.username || c.type;
    chats.set(c.id, { id: c.id, label });
  }

  console.log("\nFound chats:");
  for (const c of chats.values()) {
    console.log(`  ${c.id}  (${c.label})`);
  }

  if (chats.size === 1) {
    const only = Array.from(chats.values())[0];
    console.log("\nAdd to .env:");
    console.log(`TELEGRAM_CHAT_ID=${only.id}`);
  } else {
    console.log("\nPick the chat ID for your DM and add as TELEGRAM_CHAT_ID in .env");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
