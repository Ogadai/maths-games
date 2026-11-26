// Renders the Divvy icon (src/app/icon.svg) to the PNG/ICO files browsers and
// home screens need. Run after changing the SVG:  npm run icons
import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const root = new URL("../", import.meta.url);
const svg = await readFile(new URL("src/app/icon.svg", root), "utf8");
const SKY = "#E8F4FF";

/**
 * @param size output width/height in px
 * @param scale how much of the square Divvy fills (1 = edge to edge)
 * @param background CSS colour, or null for transparent
 */
async function render(page, size, scale, background) {
  const inner = Math.round(size * scale);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${background ?? "transparent"}">
    <div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div>
  </body></html>`);
  return page.screenshot({ omitBackground: background === null, type: "png" });
}

/** An .ico file whose entries are PNGs (supported by every current browser). */
function toIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // colour planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const out = (path) => new URL(path, root);

// Browser tab: transparent, Divvy fills the square.
const ico = [];
for (const size of [16, 32, 48]) ico.push({ size, data: await render(page, size, 1, null) });
await writeFile(out("src/app/favicon.ico"), toIco(ico));

// iOS / iPadOS home screen: must be opaque; iOS rounds the corners itself.
await writeFile(out("src/app/apple-icon.png"), await render(page, 180, 0.8, SKY));

// Android / PWA install icons (referenced from src/app/manifest.ts).
await writeFile(out("public/icons/icon-192.png"), await render(page, 192, 0.86, SKY));
await writeFile(out("public/icons/icon-512.png"), await render(page, 512, 0.86, SKY));
// Maskable: Android may crop to a circle, so keep Divvy inside the central safe zone.
await writeFile(out("public/icons/icon-maskable-512.png"), await render(page, 512, 0.62, SKY));

await browser.close();
console.log("Icons written.");
