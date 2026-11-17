// Bouwt per module een verslag (data/verslagen/<id>.md) uit de kaarten die al in de moduledata staan.
// Zo kun je de stof achter elkaar doorlezen in plaats van kaart voor kaart, zonder dat er nieuwe
// inhoud bij verzonnen wordt: alle tekst komt uit de kaarten zelf.
//
// Een handgeschreven verslag wordt nooit overschreven: zet het bestand in HANDWERK.
// Gebruik: node tools/maak-verslag.js [module-id ...]
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { modules, metOverrides } from "./lib.js";
import { toetsbaar } from "../src/domain/quiz.js";

// Verslagen die met de hand zijn geschreven of aangeleverd; die laat dit script met rust.
const HANDWERK = new Set(["dna-kraak-de-code"]);

// De kaarttekst gebruikt een klein stukje HTML (<b>, <ul>, <br>…). Hier terug naar Markdown.
function naarMarkdown(html) {
  let t = String(html ?? "");
  t = t.replace(/<\/?(p|div)>/gi, "\n\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/li>/gi, "\n").replace(/<li>/gi, "- ");
  t = t.replace(/<\/?(ul|ol)>/gi, "\n");
  t = t.replace(/<\/?(b|strong)>/gi, "**").replace(/<\/?(i|em)>/gi, "*");
  t = t.replace(/<sub>(.*?)<\/sub>/gi, "$1").replace(/<sup>(.*?)<\/sup>/gi, "$1");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Tekens die in Markdown opmaak zouden worden, maar hier gewoon tekst zijn.
  t = t.replace(/^(\s*)#/gm, "$1\\#").replace(/^(\s*)\|/gm, "$1\\|");
  t = t.replace(/\*\*\s*\*\*/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Lege regel tussen een alinea en een lijst, anders loopt de lijst niet goed.
const blok = s => s.replace(/([^\n])\n- /g, "$1\n\n- ");

function verslagVoor(m, data) {
  const kaarten = data.begrippen.filter(toetsbaar);
  const lessen = (data.lessen || []).filter(l => l.aantal > 0);
  const uit = [];
  uit.push(`# ${data.titel}`);
  uit.push("");
  uit.push(`${m.periode} · ${kaarten.length} onderwerpen uit de collegeslides.`);
  uit.push("");
  uit.push("*Dit verslag is samengesteld uit de kaarten van deze module, zodat je de stof achter elkaar kunt doorlezen. De bron staat bij elk onderdeel. Kaarten over de organisatie van de module (lesinfo) staan er niet in.*");
  uit.push("");

  const perLes = new Map();
  const zonderLes = [];
  for (const b of kaarten) {
    const l = lessen.find(x => b.les === `Les ${x.nr} – ${x.titel}`);
    if (l) { if (!perLes.has(l.nr)) perLes.set(l.nr, []); perLes.get(l.nr).push(b); }
    else zonderLes.push(b);
  }

  const schrijfGroep = (lijst) => {
    let onderwerp = null;
    for (const b of lijst) {
      if (b.onderwerp && b.onderwerp !== onderwerp) { onderwerp = b.onderwerp; uit.push(`### ${onderwerp}`, ""); }
      const tekst = naarMarkdown(b.uitleg);
      const extra = b.aanvulling ? naarMarkdown(b.aanvulling) : "";
      const titel = naarMarkdown(b.begrip).replace(/\n+/g, " ").trim();
      // Een kop die gelijk is aan het onderwerp voegt niets toe; een heel lange kop leest slecht.
      if (titel && titel !== onderwerp) uit.push(titel.length > 110 ? `**${titel}**` : `#### ${titel}`, "");
      if (tekst) uit.push(blok(tekst), "");
      if (extra) uit.push(`> **Aanvulling.** ${blok(extra).replace(/\n/g, "\n> ")}`, "");
      const slides = (b.bron_slides || []).length ? `, slide ${b.bron_slides.join(", ")}` : "";
      if (b.bron_bestand) uit.push(`*Bron: ${b.bron_bestand}${slides}.*`, "");
    }
  };

  for (const l of lessen) {
    const lijst = perLes.get(l.nr);
    if (!lijst?.length) continue;
    uit.push(`## Les ${l.nr} – ${l.titel}`, "");
    uit.push(`${lijst.length} ${lijst.length === 1 ? "onderdeel" : "onderdelen"}${l.toets ? ` · ${l.toets}` : ""}.`, "");
    schrijfGroep(lijst);
  }
  if (zonderLes.length) { uit.push("## Overige onderwerpen", ""); schrijfGroep(zonderLes); }

  return uit.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

const wil = process.argv.slice(2);
mkdirSync("data/verslagen", { recursive: true });
const lijst = modules();
let n = 0;
for (const m of lijst) {
  if (wil.length && !wil.includes(m.id)) continue;
  if (HANDWERK.has(m.id)) { console.log(`– ${m.id}: handgeschreven verslag, overgeslagen`); continue; }
  const { data } = metOverrides(m.bestand);
  const pad = `data/verslagen/${m.id}.md`;
  const tekst = verslagVoor(m, data);
  const oud = existsSync(pad) ? readFileSync(pad, "utf8") : "";
  if (oud === tekst) { console.log(`= ${m.id}: ongewijzigd`); continue; }
  writeFileSync(pad, tekst);
  n++;
  console.log(`✓ ${m.id}: ${(tekst.length / 1024).toFixed(0)} kB`);
}
console.log(`${n} verslag(en) geschreven.`);
