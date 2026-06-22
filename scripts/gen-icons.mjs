// One-off icon generator for the PWA. Run: node scripts/gen-icons.mjs
// Renders monochrome "M" icons (no font dependency — the M is a stroked path).
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

const mPath = `<path d="M160 360 L160 172 L256 286 L352 172 L352 360"
  fill="none" stroke="#fff" stroke-width="42"
  stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="178" y="384" width="156" height="16" rx="8" fill="#fff"/>`;

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#111111"/>${mPath}</svg>`;

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#111111"/>${mPath}</svg>`;

async function png(svg, size, file) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(out, file));
  console.log("wrote", file);
}

await png(rounded, 192, "icon-192.png");
await png(rounded, 512, "icon-512.png");
await png(square, 512, "icon-maskable-512.png");
await png(square, 180, "apple-touch-icon.png");
await png(rounded, 32, "favicon-32.png");
console.log("done");
