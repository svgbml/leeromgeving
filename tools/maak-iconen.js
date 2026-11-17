// Maakt de PNG-iconen uit het SVG-ontwerp (#59): iOS en Android gebruiken geen SVG-icoon.
// maskable: volle achtergrond zonder ronde hoeken, logo binnen de veilige zone (80%).
// Gebruik: node tools/maak-iconen.js
import { writeFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = (rond, schaal) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="${rond}" fill="#0b6e74"/>
<g transform="translate(32 32) scale(${schaal}) translate(-32 -32)"><ellipse cx="32" cy="32" rx="20" ry="12" fill="none" stroke="#fff" stroke-width="4"/>
<circle cx="26" cy="30" r="3.5" fill="#fff"/><circle cx="38" cy="34" r="3.5" fill="#fff"/></g></svg>`;
const doelen = [
  ["img/icon-192.png", svg(14, 1), 192],
  ["img/icon-512.png", svg(14, 1), 512],
  ["img/icon-maskable-512.png", svg(0, 0.78), 512],
  ["img/apple-touch-icon.png", svg(0, 0.9), 180]
];
mkdirSync("img", { recursive: true });
for (const [pad, bron, maat] of doelen) {
  const png = new Resvg(bron, { fitTo: { mode: "width", value: maat } }).render().asPng();
  writeFileSync(pad, png);
  console.log(`${pad}: ${maat}×${maat}, ${(png.length / 1024).toFixed(1)} kB`);
}
