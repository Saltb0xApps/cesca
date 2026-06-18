import sharp from "sharp";
import { readFileSync } from "node:fs";

// Rasterize the brand SVG into the PNG sizes a PWA / iOS home-screen icon needs.
const svg = readFileSync(new URL("../public/icon.svg", import.meta.url));
const sizes = { "icon-192.png": 192, "icon-512.png": 512, "apple-touch-icon.png": 180 };

for (const [name, size] of Object.entries(sizes)) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(new URL(`../public/${name}`, import.meta.url).pathname);
  console.log("wrote public/" + name);
}
