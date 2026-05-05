import { appendParagraphs, getPage, readConfig } from "./notion.ts";

const cfg = readConfig();
const page = (await getPage(cfg)) as {
  url?: string;
  properties?: Record<string, { title?: { plain_text: string }[] }>;
};

const titleProp = Object.values(page.properties ?? {}).find((p) => p.title);
const title = titleProp?.title?.map((t) => t.plain_text).join("") ?? "(untitled)";

console.log(`OK — connected to "${title}"`);
console.log(`   ${page.url ?? ""}`);

await appendParagraphs(cfg, "Cesca · setup check", [
  `Token & page id verified at ${new Date().toISOString()}.`,
]);
console.log("Appended a verification block to the page.");
