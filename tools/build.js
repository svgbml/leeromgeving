// Bouwt de site in _site/ (wordt gedeployd door GitHub Actions). De bronmap zelf blijft ook
// direct bruikbaar zonder build; dit maakt hem alleen kleiner en sneller.
//   #31 handmatige correcties samenvoegen      #63 kleine index voor Vandaag
//   #64 data zonder inspringing en zonder het herhaalde "module"-veld
//   #71 afleiders per kaart vooraf berekend     #72/#73 service worker: shell vooraf, data bij gebruik
//   #77 modulepreload-lijst in index.html bijgewerkt
// Gebruik: node tools/build.js
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { modules, metOverrides } from "./lib.js";
import { toetsbaar, rangschikAfleiders } from "../src/domain/quiz.js";
import { STANDAARD_VLEUGEL, vleugelBestand } from "../src/domain/vleugels.js";
import { woorden } from "../src/domain/text.js";

const UIT = "_site";
rmSync(UIT, { recursive: true, force: true });
mkdirSync(UIT, { recursive: true });

const kopieer = pad => { if (existsSync(pad)) cpSync(pad, join(UIT, pad), { recursive: true }); };
const schrijf = (pad, inhoud) => { mkdirSync(dirname(join(UIT, pad)), { recursive: true }); writeFileSync(join(UIT, pad), inhoud); };
function bestanden(map, ext) {
  if (!existsSync(map)) return [];
  return readdirSync(map).sort().flatMap(n => {
    const p = join(map, n).replace(/\\/g, "/");
    return statSync(p).isDirectory() ? bestanden(p, ext) : ext.some(e => n.endsWith(e)) ? [p] : [];
  });
}

// Statische bestanden.
// data/rubrics hoort erbij sinds B3 en data/ppo sinds B4: beide worden los opgehaald door één
// scherm. Niet in de shell, juist omdat maar één scherm ze gebruikt.
for (const p of ["style.css", "app.js", "manifest.webmanifest", "icon.svg", ".nojekyll", "src", "fonts", "img", "data/verslagen", "data/rubrics", "data/ppo", "data/protocollen"]) kopieer(p);
for (const p of ["data/modules.json", "data/woordenlijst.json", "data/videos.json", "data/stoffen.json", "data/analyse-recepten.json"]) if (existsSync(p)) schrijf(p, JSON.stringify(JSON.parse(readFileSync(p, "utf8"))));

// Moduledata + index.
const index = { versie: 1, modules: {} };
let ruw = 0, klein = 0;
for (const m of modules()) {
  const { data } = metOverrides(m.bestand);
  ruw += readFileSync(m.bestand).length;
  for (const b of data.begrippen) delete b.module;
  data.volgordes = (existsSync("data/volgordes.json") ? JSON.parse(readFileSync("data/volgordes.json", "utf8")).volgordes : []).filter(v => v.modules.includes(m.id));
  // Afleiders vooraf (#71): per toetsbare kaart de 12 beste kandidaten.
  const alle = data.begrippen.filter(toetsbaar);
  const sets = new Map(alle.map(b => [b.id, new Set(woorden(`${b.begrip} ${b.uitleg}`))]));
  // Compact: per kaart (in volgorde van begrippen) de volgnummers van de 8 beste kandidaten.
  const pos = new Map(data.begrippen.map((b, i) => [b.id, i]));
  const best = new Map(alle.map(b => [b.id, rangschikAfleiders(alle, b, 8, sets).map(id => pos.get(id))]));
  data.afl = data.begrippen.map(b => best.get(b.id) || 0);
  const tekst = JSON.stringify(data);
  klein += tekst.length;
  schrijf(m.bestand, tekst);
  // Index (#63): per toetsbare kaart id + groep (les of onderwerp), genoeg voor de samenvatting op Vandaag.
  const groepVan = b => b.les || b.onderwerp;
  const groepen = [...new Set(alle.map(groepVan))];
  index.modules[m.id] = { g: groepen, k: alle.map(b => [b.id, groepen.indexOf(groepVan(b))]) };
  // Lab- en projectdata van deze module (B0/B2); de vleugel bepaalt het bestand.
  for (const v of m.vleugels || []) {
    const pad = vleugelBestand(m.bestand, v);
    if (v !== STANDAARD_VLEUGEL && existsSync(pad)) schrijf(pad, JSON.stringify(JSON.parse(readFileSync(pad, "utf8"))));
  }
  // De inlever- en toetsmomenten van deze module (B5-correctie). Hoort bij geen enkele vleugel:
  // de tabel van de opleiding loopt over LU1, LU2 en LU3 heen.
  const dl = m.bestand.replace(".json", ".deadlines.json");
  if (existsSync(dl)) schrijf(dl, JSON.stringify(JSON.parse(readFileSync(dl, "utf8"))));
}
schrijf("data/index.json", JSON.stringify(index));

// index.html met bijgewerkte modulepreload-lijst (#77): alles wat het eerste scherm nodig heeft.
const voorladen = [...bestanden("src/core", [".js"]), ...bestanden("src/domain", [".js"]), ...bestanden("src/ui", [".js"]), "src/views/vandaag.js"]
  .filter(p => !/sync|pwa|sneltoetsen|swipe|mindmap|toetsmaker/.test(p));
let html = readFileSync("index.html", "utf8");
html = html.replace(/<!-- modulepreload:start -->[\s\S]*?<!-- modulepreload:eind -->/,
  `<!-- modulepreload:start -->\n${voorladen.map(p => `<link rel="modulepreload" href="${p}">`).join("\n")}\n<!-- modulepreload:eind -->`);
// Versie in de adressen van style.css en app.js: GitHub Pages laat browsers bestanden 10 minuten bewaren,
// zonder dit kan een nieuwe index.html met de oude CSS/JS uit de browsercache laden.
const assets = createHash("sha256");
for (const p of [join(UIT, "style.css"), join(UIT, "app.js"), ...bestanden(join(UIT, "src"), [".js"])]) assets.update(readFileSync(p));
const av = assets.digest("hex").slice(0, 8);
html = html.replace('href="style.css"', `href="style.css?v=${av}"`).replace('src="app.js"', `src="app.js?v=${av}"`);
if (!html.includes(`style.css?v=${av}`) || !html.includes(`app.js?v=${av}`)) throw new Error("index.html: style.css/app.js niet gevonden voor versienummer");
schrijf("index.html", html);

// Service worker (#72, #73).
const shell = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "icon.svg",
  ...bestanden("src", [".js"]), "fonts/ibm-plex-sans-var.woff2", ...bestanden("img", [".png"]).filter(p => /icon/.test(p)),
  "data/modules.json", "data/index.json", "data/woordenlijst.json", "data/videos.json",
  // Stoffen horen offline beschikbaar te zijn: in een labkelder heb je geen bereik.
  "data/stoffen.json"].filter(p => p === "./" || existsSync(join(UIT, p)));
const hash = createHash("sha256");
for (const p of bestanden(UIT, [".js", ".css", ".html", ".json", ".woff2", ".svg", ".png", ".webmanifest"])) hash.update(p).update(readFileSync(p));
const versie = hash.digest("hex").slice(0, 10);
schrijf("sw.js", `// GEGENEREERD door tools/build.js — niet met de hand aanpassen.
// Shell vooraf in de cache; moduledata pas als je hem opent (#73).
// Pagina's: eerst netwerk. Data: direct uit de cache en op de achtergrond verversen (#72).
// Overige bestanden: uit de cache (de cachenaam verandert bij elke nieuwe versie).
const C = "leeromgeving-${versie}", DATA = "leeromgeving-data";
const SHELL = ${JSON.stringify(shell)};
// cache: "reload" haalt de shell vers op, niet uit de HTTP-cache van de browser (anders kan een nieuwe versie oude bestanden bewaren).
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: "reload" }))))); });
self.addEventListener("message", e => { if (e.data === "activeer") self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const bewaar = (cache, req, r) => { if (r.ok) { const kopie = r.clone(); caches.open(cache).then(c => c.put(req, kopie)); } return r; };
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r => bewaar(C, "index.html", r)).catch(() => caches.match("index.html")));
    return;
  }
  if (url.pathname.includes("/data/")) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(oud => {
      const nieuw = fetch(req).then(r => bewaar(url.pathname.endsWith("modules.json") || url.pathname.endsWith("index.json") ? C : DATA, req, r));
      if (oud) { e.waitUntil(nieuw.catch(() => {})); return oud; }
      return nieuw;
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req).then(x => bewaar(C, req, x))));
});
`);
console.log(`_site gebouwd: ${shell.length} shellbestanden, data ${(ruw / 1024).toFixed(0)} kB → ${(klein / 1024).toFixed(0)} kB, index ${(JSON.stringify(index).length / 1024).toFixed(1)} kB, versie ${versie}`);
