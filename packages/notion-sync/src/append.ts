import { appendParagraphs, readConfig } from "./notion.ts";

const cfg = readConfig();

const chunks: Buffer[] = [];
for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
const text = Buffer.concat(chunks).toString("utf8").trim();

if (!text) {
  console.error("Pipe text into stdin.");
  process.exit(1);
}

const header = process.argv[2] ?? `Cesca · ${new Date().toISOString()}`;
await appendParagraphs(cfg, header, text.split(/\n+/));
console.log("Appended.");
