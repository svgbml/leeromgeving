// Controleert data/modules.json en alle moduledata (zie data/schema/module.schema.json).
// Geen afhankelijkheden; draait in CI vóór de deploy.  Gebruik: node tools/validate-data.js
import { readFileSync, existsSync } from "node:fs";
import { metOverrides, overridesPad } from "./lib.js";
import { VLEUGELS, STANDAARD_VLEUGEL, vleugelBestand } from "../src/domain/vleugels.js";

const fouten = [], waarschuwingen = [];
const fout = (waar, msg) => fouten.push(`${waar}: ${msg}`);
const let_op = (waar, msg) => waarschuwingen.push(`${waar}: ${msg}`);
const lees = pad => JSON.parse(readFileSync(pad, "utf8"));
const isStr = x => typeof x === "string" && x.trim().length > 0;
const isInt = x => Number.isInteger(x);
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const TAGS = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
const TOEGESTAAN = new Set(["b", "i", "u", "em", "strong", "br", "sup", "sub", "ul", "ol", "li", "p"]);

let lijst;
try { lijst = lees("data/modules.json").modules; }
catch (e) { console.error(`data/modules.json: ${e.message}`); process.exit(1); }

const modIds = new Set();
// De voorbeeldmodule voor bijdragers (#82) wordt ook gecontroleerd, zodat hij een geldig voorbeeld blijft.
const voorbeeld = existsSync("data/voorbeeld/voorbeeld.json") ? [{ id: "voorbeeld", titel: "Voorbeeldmodule", periode: "Voorbeeld", jaar: 1, periode_nr: 1, bestand: "data/voorbeeld/voorbeeld.json", voorbeeld: true }] : [];
for (const m of [...lijst, ...voorbeeld]) {
  const waar = `modules.json › ${m.id ?? "?"}`;
  for (const k of ["id", "titel", "periode", "bestand"]) if (!isStr(m[k])) fout(waar, `"${k}" ontbreekt`);
  for (const k of ["jaar", "periode_nr"]) if (!isInt(m[k])) fout(waar, `"${k}" moet een geheel getal zijn`);
  if (modIds.has(m.id)) fout(waar, "dubbele module-id"); modIds.add(m.id);
  if (!isStr(m.bestand) || !existsSync(m.bestand)) { fout(waar, `bestand ${m.bestand} bestaat niet`); continue; }
  // Verslag (Markdown) is optioneel, maar moet dan bestaan en op de vaste plek staan.
  if (m.verslag !== undefined) {
    if (m.verslag !== `data/verslagen/${m.id}.md`) fout(waar, `"verslag" moet data/verslagen/${m.id}.md zijn`);
    else if (!existsSync(m.verslag)) fout(waar, `verslag ${m.verslag} bestaat niet`);
    else if (EMAIL.test(readFileSync(m.verslag, "utf8"))) fout(m.verslag, "bevat een e-mailadres; haal persoonsgegevens weg");
  }
  const verwacht = `data/jaar-${m.jaar}/periode-${m.periode_nr}/${m.id}.json`;
  if (m.bestand !== verwacht && !m.voorbeeld) let_op(waar, `bestand staat niet op de vaste plek (${verwacht})`);

  let d;
  try { d = metOverrides(m.bestand).data; } catch (e) { fout(m.bestand, `geen geldige JSON (${e.message})`); continue; }
  if (existsSync(overridesPad(m.bestand))) {
    const o = lees(overridesPad(m.bestand)), ids0 = new Set(lees(m.bestand).begrippen.map(b => b.id));
    for (const id of [...Object.keys(o.kaarten || {}), ...(o.verwijderd || [])]) if (!ids0.has(id)) fout(overridesPad(m.bestand), `correctie voor onbekende kaart ${id}`);
  }
  const w = m.bestand;
  if (d.id !== m.id) fout(w, `id "${d.id}" ≠ "${m.id}" in modules.json`);
  if (d.titel !== m.titel) let_op(w, `titel wijkt af van modules.json`);
  if (d.jaar !== m.jaar || d.periode_nr !== m.periode_nr) fout(w, "jaar/periode_nr wijken af van modules.json");
  if (!["begrip", "vraag"].includes(d.kaarttype)) fout(w, `kaarttype moet "begrip" of "vraag" zijn (is ${JSON.stringify(d.kaarttype)})`);
  // Slides alleen als Drive-voorbeeldlink: een /view-link opent de Drive-pagina met de eigenaar erop.
  if (d.slides !== undefined) for (const [f, u] of Object.entries(d.slides)) if (!/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/preview$/.test(u)) fout(w, `slides["${f}"] moet https://drive.google.com/file/d/<id>/preview zijn`);
  if (!Array.isArray(d.begrippen) || !d.begrippen.length) { fout(w, "begrippen ontbreekt of is leeg"); continue; }

  const lesLabels = new Map();
  for (const l of d.lessen || []) {
    if (!isInt(l.nr) || !isStr(l.titel)) fout(w, `les ${JSON.stringify(l)} mist nr of titel`);
    lesLabels.set(`Les ${l.nr} – ${l.titel}`, l);
  }

  const ids = new Set(), perLes = new Map();
  d.begrippen.forEach((b, i) => {
    const kw = `${w} › ${b.id ?? `#${i}`}`;
    for (const k of ["id", "onderwerp", "begrip", "uitleg"]) if (!isStr(b[k])) fout(kw, `"${k}" ontbreekt of is leeg`);
    if (ids.has(b.id)) fout(kw, "dubbele kaart-id"); ids.add(b.id);
    if (b.bron_slides !== undefined && !(Array.isArray(b.bron_slides) && b.bron_slides.every(isInt))) fout(kw, "bron_slides moet een lijst met getallen zijn");
    if (b.lesinfo !== undefined && b.lesinfo !== true) fout(kw, "lesinfo is alleen true of afwezig");
    if (b.les !== undefined) {
      if (lesLabels.size && !lesLabels.has(b.les)) fout(kw, `les "${b.les}" staat niet in lessen[]`);
      perLes.set(b.les, (perLes.get(b.les) || 0) + 1);
    }
    // Persoonsgegevens uit de slides (bijvoorbeeld een e-mailadres van een docent) horen niet in de openbare data.
    for (const veld of ["begrip", "uitleg", "aanvulling"]) if (EMAIL.test(String(b[veld] ?? ""))) fout(kw, `"${veld}" bevat een e-mailadres; haal persoonsgegevens weg`);
    for (const veld of ["begrip", "uitleg", "aanvulling"]) {
      for (const [, tag] of String(b[veld] ?? "").matchAll(TAGS)) {
        if (!TOEGESTAAN.has(tag.toLowerCase())) { let_op(kw, `<${tag}> in ${veld} wordt als tekst getoond`); break; }
      }
    }
  });
  for (const [label, l] of lesLabels) {
    const n = perLes.get(label) || 0;
    if (l.aantal !== undefined && l.aantal !== n) let_op(w, `lessen[] "${label}": aantal ${l.aantal}, maar ${n} kaarten`);
  }
  for (const c of d.casussen || []) {
    if (!isStr(c.titel) || !isStr(c.tekst) || !Array.isArray(c.vragen)) { fout(w, `casus "${c.titel}" mist titel, tekst of vragen`); continue; }
    for (const id of c.vragen) if (!ids.has(id)) fout(w, `casus "${c.titel}" verwijst naar onbekende kaart ${id}`);
    if (c.afbeelding && !existsSync(c.afbeelding.src)) fout(w, `casus "${c.titel}": afbeelding ${c.afbeelding.src} bestaat niet`);
  }
  for (const f of d.figuren || []) {
    const fw = `${w} › figuur ${f.id}`;
    if (!isStr(f.id) || !isStr(f.src) || !isStr(f.alt)) fout(fw, "id, src en alt zijn verplicht");
    else if (!existsSync(f.src)) fout(fw, `${f.src} bestaat niet`);
    const vids = new Set();
    for (const v of f.vlakken || []) {
      if (vids.has(v.id)) fout(fw, `dubbel vlak ${v.id}`); vids.add(v.id);
      if (!isStr(v.label)) fout(fw, `vlak ${v.id} mist een label`);
      for (const k of ["x", "y", "w", "h"]) if (typeof v[k] !== "number" || v[k] < 0 || v[k] > 100) fout(fw, `vlak ${v.id}: ${k} moet 0–100 zijn`);
      if (v.x + v.w > 100.01 || v.y + v.h > 100.01) fout(fw, `vlak ${v.id} valt buiten de figuur`);
    }
  }
  const toetsbaar = d.begrippen.filter(b => !b.lesinfo).length;
  console.log(`✓ ${m.id}: ${d.begrippen.length} kaarten (${toetsbaar} toetsbaar, ${d.begrippen.length - toetsbaar} lesinfo)`);
}

// ---------- vleugels (B0): lab- en projectdata per module ----------
for (const m of lijst) {
  const waar = `modules.json › ${m.id}`;
  if (!Array.isArray(m.vleugels) || !m.vleugels.length) { fout(waar, '"vleugels" ontbreekt'); continue; }
  if (!m.vleugels.includes(STANDAARD_VLEUGEL)) fout(waar, `"vleugels" moet "${STANDAARD_VLEUGEL}" bevatten`);
  if (new Set(m.vleugels).size !== m.vleugels.length) fout(waar, '"vleugels" bevat een dubbele waarde');
  for (const v of m.vleugels) {
    const def = VLEUGELS[v];
    if (!def) { fout(waar, `onbekende vleugel "${v}"`); continue; }
    if (def.modulevrij) { fout(waar, `"${v}" is modulevrij en hoort niet bij een module`); continue; }
    if (v === STANDAARD_VLEUGEL) continue;
    const pad = vleugelBestand(m.bestand, v);
    if (!existsSync(pad)) { fout(waar, `${pad} bestaat niet`); continue; }
    let d;
    try { d = lees(pad); } catch (e) { fout(pad, `geen geldige JSON (${e.message})`); continue; }
    if (d.id !== m.id) fout(pad, `id "${d.id}" ≠ "${m.id}" in modules.json`);
    if (d.vleugel !== v) fout(pad, `"vleugel" moet "${v}" zijn (is ${JSON.stringify(d.vleugel)})`);
    if (!Array.isArray(d[def.lijst])) fout(pad, `"${def.lijst}" moet een lijst zijn`);
  }
}

// ---------- gedeelde bestanden ----------
const lesVan = new Map();
for (const m of lijst) { try { lesVan.set(m.id, new Set((lees(m.bestand).lessen || []).map(l => `Les ${l.nr} – ${l.titel}`))); } catch {} }
if (existsSync("data/volgordes.json")) {
  const ids = new Set();
  for (const v of lees("data/volgordes.json").volgordes || []) {
    const w = `volgordes.json › ${v.id}`;
    if (ids.has(v.id)) fout(w, "dubbele id"); ids.add(v.id);
    if (!isStr(v.titel) || !Array.isArray(v.stappen) || v.stappen.length < 3 || v.stappen.length > 7) fout(w, "titel en 3–7 stappen nodig");
    for (const mid of v.modules || []) if (!modIds.has(mid)) fout(w, `onbekende module ${mid}`);
  }
}
if (existsSync("data/videos.json")) {
  const v = lees("data/videos.json");
  for (const [mid, lessen] of Object.entries(v)) {
    if (mid.startsWith("_")) continue;
    if (!modIds.has(mid)) { fout("videos.json", `onbekende module ${mid}`); continue; }
    for (const [les, lijstV] of Object.entries(lessen)) {
      if (!lesVan.get(mid)?.has(les)) fout("videos.json", `${mid}: onbekende les "${les}"`);
      for (const x of lijstV) if (!/^[\w-]{11}$/.test(x.id) || !isStr(x.titel)) fout("videos.json", `${mid} › ${les}: ongeldige video ${JSON.stringify(x).slice(0, 80)}`);
    }
  }
}
if (existsSync("data/woordenlijst.json")) {
  const t = lees("data/woordenlijst.json").termen || [];
  const nl = new Set();
  for (const p of t) { if (!Array.isArray(p) || p.length !== 2 || !p.every(isStr)) fout("woordenlijst.json", `ongeldig paar ${JSON.stringify(p)}`); else if (nl.has(p[0].toLowerCase())) let_op("woordenlijst.json", `dubbel: ${p[0]}`); else nl.add(p[0].toLowerCase()); }
}

if (waarschuwingen.length) {
  console.log(`\n${waarschuwingen.length} waarschuwing(en):`);
  for (const x of waarschuwingen.slice(0, 40)) console.log(`  ! ${x}`);
  if (waarschuwingen.length > 40) console.log(`  … en ${waarschuwingen.length - 40} meer`);
}
if (fouten.length) {
  console.error(`\n${fouten.length} fout(en):`);
  for (const x of fouten) console.error(`  ✗ ${x}`);
  process.exit(1);
}
console.log("\nData is in orde.");
