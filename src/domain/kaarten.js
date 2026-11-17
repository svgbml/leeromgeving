// Kaartvarianten voor de flashcards (#2 omgekeerd, #4 cloze), volgorde (#10),
// verwante kaarten (#11) en begriplinks (#12). Pure functies.
import { plain, woorden } from "./text.js";
import { toetsbaar } from "./quiz.js";

// ---------- sleutels ----------
// Een kaart in de flashcards heeft een sleutel: "<id>" (voorkant → achterkant), "<id>~r" (omgekeerd:
// uitleg → begrip) of "<id>~c<n>" (invulkaart n). Voortgang wordt per sleutel bewaard.
export const basisId = k => k.split("~")[0];
export const soortVan = k => k.includes("~r") ? "omgekeerd" : k.includes("~c") ? "cloze" : "normaal";
export const clozeNr = k => +(k.split("~c")[1] || 0);

// ---------- cloze (#4) ----------
// Expliciet: {{c1::tekst}} of {{c1::tekst::hint}} in de uitleg. Anders automatisch: vetgedrukte woorden.
const EXPLICIET = /\{\{c(\d+)::(.+?)(?:::(.+?))?\}\}/g;
export function clozes(b) {
  const u = b.uitleg || "";
  if (EXPLICIET.test(u)) {
    EXPLICIET.lastIndex = 0;
    const nrs = [...new Set([...u.matchAll(EXPLICIET)].map(m => +m[1]))].sort((a, c) => a - c);
    return nrs.map(nr => ({
      nr,
      vraag: u.replace(EXPLICIET, (m, n, t, hint) => +n === nr ? `<span class="gat">[${hint || "…"}]</span>` : t),
      antwoord: [...u.matchAll(EXPLICIET)].filter(m => +m[1] === nr).map(m => plain(m[2])).join(" … "),
      vol: u.replace(EXPLICIET, (m, n, t) => +n === nr ? `<mark>${t}</mark>` : t)
    }));
  }
  const vet = [...u.matchAll(/<(b|strong)>(.+?)<\/\1>/gi)]
    .map(m => ({ html: m[0], t: plain(m[2]) }))
    .filter(x => x.t.length >= 2 && x.t.length <= 40 && !/^[\d\s.,:;–-]+$/.test(x.t));
  const uniek = [...new Map(vet.map(x => [x.t.toLowerCase(), x])).values()].slice(0, 2);
  return uniek.map((x, i) => ({
    nr: i + 1,
    vraag: u.replace(x.html, `<span class="gat">[…]</span>`),
    antwoord: x.t,
    vol: u.replace(x.html, `<mark>${x.html}</mark>`)
  }));
}

// Alle flashcard-sleutels van een kaart, afhankelijk van de instellingen.
export function sleutels(b, { richting = "voor", cloze = true, kaarttype = "begrip" } = {}) {
  const uit = [];
  const omkeerbaar = kaarttype !== "vraag";
  if (richting !== "achter" || !omkeerbaar) uit.push(b.id);
  if (omkeerbaar && (richting === "achter" || richting === "beide")) uit.push(`${b.id}~r`);
  if (cloze) for (const c of clozes(b)) uit.push(`${b.id}~c${c.nr}`);
  return uit;
}

// ---------- volgorde (#10) ----------
// Nieuwe kaarten in de volgorde van de lessen en slides.
export function slideVolgorde(kaarten) {
  const pos = new Map(kaarten.map((b, i) => [b.id, i]));
  const lesNr = b => b.les_nr ?? (+(b.les || "").match(/^Les\s*(\d+)/)?.[1] || 0);
  return kaarten.slice().sort((a, b) => (lesNr(a) - lesNr(b)) || ((a.bron_slides?.[0] ?? 0) - (b.bron_slides?.[0] ?? 0)) || (pos.get(a.id) - pos.get(b.id)));
}

// ---------- begrippen, links en verwante kaarten (#11, #12) ----------
const termVan = b => plain(b.begrip).replace(/\s*\([^)]*\)\s*/g, " ").replace(/[:?!.]+$/, "").trim();
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Index per module, één keer berekend.
const cache = new WeakMap();
export function index(data) {
  if (cache.has(data)) return cache.get(data);
  const kaarten = data.begrippen.filter(toetsbaar);
  const isVraag = data.kaarttype === "vraag";
  // Alleen begripkaarten leveren termen: een vraag is geen begrip.
  const termen = isVraag ? [] : kaarten
    .map(b => ({ id: b.id, term: termVan(b) }))
    .filter(t => t.term.length >= 4 && t.term.length <= 40 && t.term.split(" ").length <= 4)
    .sort((a, b) => b.term.length - a.term.length);
  for (const t of termen) t.re = new RegExp(`(?<![\\p{L}\\p{N}])${escRe(t.term)}(?![\\p{L}\\p{N}])`, "iu");
  const sets = new Map(kaarten.map(b => [b.id, new Set(woorden(`${b.begrip} ${b.uitleg}`))]));
  const tekst = new Map(kaarten.map(b => [b.id, plain(b.uitleg)]));
  const idx = { kaarten, termen, sets, tekst, byId: new Map(kaarten.map(b => [b.id, b])) };
  cache.set(data, idx);
  return idx;
}

// Welke andere begrippen komen in deze tekst voor? (max n, langste eerst, geen overlap)
export function termenIn(idx, tekst, eigenId, n = 6) {
  const gevonden = [], bezet = [];
  for (const t of idx.termen) {
    if (t.id === eigenId) continue;
    const m = t.re.exec(tekst);
    if (!m) continue;
    const van = m.index, tot = van + m[0].length;
    if (bezet.some(([a, b]) => van < b && tot > a)) continue;
    bezet.push([van, tot]); gevonden.push({ id: t.id, term: m[0], van });
    if (gevonden.length >= n) break;
  }
  return gevonden;
}

// Verwante kaarten: noemen elkaar, delen inhoudswoorden, of hebben hetzelfde onderwerp.
export function verwant(idx, id, n = 4) {
  const b = idx.byId.get(id); if (!b) return [];
  const mijn = idx.sets.get(id), mijnTekst = idx.tekst.get(id).toLowerCase();
  const mijnTerm = termVan(b).toLowerCase();
  const scores = [];
  for (const x of idx.kaarten) {
    if (x.id === id) continue;
    const ander = idx.sets.get(x.id);
    let gedeeld = 0; for (const w of mijn) if (ander.has(w)) gedeeld++;
    const jaccard = gedeeld / (mijn.size + ander.size - gedeeld || 1);
    let s = jaccard * 10;
    const t = termVan(x).toLowerCase();
    if (t.length >= 4 && mijnTekst.includes(t)) s += 3;
    if (mijnTerm.length >= 4 && idx.tekst.get(x.id).toLowerCase().includes(mijnTerm)) s += 3;
    if (x.onderwerp === b.onderwerp) s += 0.8;
    if (s >= 1.2) scores.push([s, x]);
  }
  return scores.sort((a, c) => c[0] - a[0]).slice(0, n).map(([, x]) => x);
}

// ---------- woordenlijst Engels ↔ Nederlands (#37) ----------
export function vertaling(lijst, b) {
  if (!lijst) return null;
  const t = termVan(b).toLowerCase();
  return lijst.find(([nl, en]) => nl.toLowerCase() === t || en.toLowerCase() === t)
    || lijst.find(([nl]) => nl.length >= 5 && t.startsWith(nl.toLowerCase())) || null;
}
