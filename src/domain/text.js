// Tekst- en HTML-hulpjes zonder DOM, zodat ze ook in Node getest kunnen worden.

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Opmaak uit de bronkaarten (vet, cursief, regeleinde, lijst) blijft staan; al het andere wordt tekst.
// Staat er toch nog een entiteit in de data (&eacute;, &rarr;), laat de browser die alsnog
// omzetten. Veilig: er komt geen "<" bij, dus er kan geen tag ontstaan.
const ents = s => s.replace(/&amp;(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, "&$1;");
export const rich = s => ents(esc(s)).replace(/&lt;(\/?)(b|i|u|em|strong|br|sup|sub|ul|ol|li|p)&gt;/g, "<$1$2>");

const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", egrave: "è", euml: "ë",
  iuml: "ï", ouml: "ö", uuml: "ü", aacute: "á", oacute: "ó", rarr: "→", larr: "←", harr: "↔", rArr: "⇒",
  deg: "°", micro: "µ", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", lambda: "λ", mu: "μ",
  mdash: "—", ndash: "–", hellip: "…", times: "×", plusmn: "±", le: "≤", ge: "≥", ne: "≠", asymp: "≈",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", bull: "•", middot: "·", sup2: "²", sup3: "³"
};
function named(name) {
  if (name in NAMED) return NAMED[name];
  if (typeof document !== "undefined") { const e = document.createElement("textarea"); e.innerHTML = `&${name};`; return e.value; }
  return `&${name};`;
}
export const deEnt = s => String(s ?? "").replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, e) => {
  if (e[0] !== "#") return named(e);
  const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
  return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
});

export const plain = s => deEnt(String(s ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

// Korte versie van een tekst, afgekapt op een woordgrens.
export const kort = (s, n = 150) => { const t = plain(s); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };

export const shuffle = (a, random = Math.random) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Cijfer zoals in de toets: 1 + 9 × (punten / maximum), minimaal 1.
export const cijfer = (p, m) => Math.max(1, 1 + 9 * (p / (m || 1)));
export const cijferTekst = c => c.toFixed(1).replace(".", ",");

// ---------- normering (#22) ----------
// lineair: 1 + 9 × score.  cesuur: bij de cesuur (bijv. 55%) precies een 5,5; daarboven en
// daaronder lineair naar 10 en 1, zoals de meeste Avans-toetsen.
export function cijferMetNorm(p, m, norm = {}) {
  const s = m ? Math.min(1, Math.max(0, p / m)) : 0;
  if (norm.soort !== "cesuur") return cijfer(p, m);
  const c = Math.min(0.95, Math.max(0.05, (norm.cesuur ?? 55) / 100));
  return s >= c ? 5.5 + 4.5 * (s - c) / (1 - c) : 1 + 4.5 * s / c;
}
// Gokcorrectie: haal de verwachte punten van gokken af (1/k per meerkeuzevraag met k opties).
export const gokScore = (p, m, gok) => m - gok > 0 ? Math.max(0, (p - gok) / (m - gok)) * m : p;

// ---------- tekst vergelijken (#3, #21) ----------
export const normaliseer = s => plain(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9αβγδµ]+/g, " ").trim();

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length; if (!b.length) return a.length;
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const rij = [i];
    for (let j = 1; j <= b.length; j++) rij[j] = Math.min(vorige[j] + 1, rij[j - 1] + 1, vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    vorige = rij;
  }
  return vorige[b.length];
}
// 0–1: hoe dicht een getypt antwoord bij het juiste ligt (hoofdletters, accenten en leestekens tellen niet).
export function gelijkenis(getypt, juist) {
  const a = normaliseer(getypt), b = normaliseer(juist);
  if (!a || !b) return 0;
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
// Een begrip als "Ribosoom (70S)" of "PCR / polymerasekettingreactie" heeft meerdere goede antwoorden.
export function antwoordVarianten(begrip) {
  const t = plain(begrip);
  const delen = [t, t.replace(/\s*\([^)]*\)/g, ""), ...(t.match(/\(([^)]+)\)/g) || []).map(x => x.slice(1, -1)), ...t.split(/\s*[\/=]\s*/)];
  return [...new Set(delen.map(x => x.trim()).filter(x => x.length >= 2))];
}
export const besteGelijkenis = (getypt, begrip) => Math.max(0, ...antwoordVarianten(begrip).map(v => gelijkenis(getypt, v)));

const STOP = new Set(("de het een en of van in op te met voor door bij aan als dat die dit is zijn wordt worden kan kunnen naar " +
  "om ook niet geen wel uit over tot dan maar er hun hij zij ze we je wat welke waar hoe meer veel deze zo per na " +
  "the of and or to in on for with by is are be as an at from that this which it its not").split(" "));
// Inhoudswoorden (≥ 4 tekens, geen stopwoorden), voor overlap tussen kaarten en kernpunten.
export const woorden = s => normaliseer(s).split(" ").filter(w => w.length >= 4 && !STOP.has(w));

// ---------- voorspelbaar toeval (#19) ----------
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
