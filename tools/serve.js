// Kleine statische server voor tests en lokaal bekijken.  Gebruik: node tools/serve.js [map] [poort]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const map = process.argv[2] || "_site", poort = +(process.argv[3] || 4173);
const TYPE = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8" };

createServer(async (req, res) => {
  try {
    let pad = decodeURIComponent(new URL(req.url, "http://x").pathname);
    pad = normalize(join(map, pad)).replace(/\\/g, "/");
    if (!pad.startsWith(normalize(map).replace(/\\/g, "/"))) { res.writeHead(403); return res.end(); }
    if ((await stat(pad).catch(() => null))?.isDirectory()) pad = join(pad, "index.html");
    const data = await readFile(pad);
    res.writeHead(200, { "Content-Type": TYPE[extname(pad)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }); res.end("Niet gevonden");
  }
}).listen(poort, () => console.log(`http://localhost:${poort} (${map})`));
