// Samenvattingen van de voortgang, voor het dashboard en de voortgangspagina.
// Werkt met volledige kaarten én met de kleine index uit data/index.json ({ id, les }).
import { isDue, isKnown, isLeech, localDay } from "./srs.js";
import { cijfer } from "./text.js";
import { toetsbaar } from "./quiz.js";

export const STD_LIMIET = 15;
const basis = k => k.split("~")[0];

/**
 * Overzicht van één module voor vandaag.
 * @param {object[]} alleKaarten  begrippen uit de moduledata of uit de index
 * @param {object} prog           genormaliseerde voortgang
 */
export function moduleSummary(alleKaarten, prog, now = Date.now(), dag = localDay(new Date(now))) {
  const kaarten = alleKaarten.filter(toetsbaar);
  const ids = new Set(kaarten.map(b => b.id));
  let gezien = 0, beheerst = 0, moeilijk = 0;
  for (const b of kaarten) {
    const c = prog.cards[b.id];
    if (!c) continue;
    gezien++;
    if (isKnown(c)) beheerst++;
    if (isLeech(c)) moeilijk++;
  }
  // Klaar om te herhalen: ook omgekeerde kaarten en invulkaarten ("<id>~r", "<id>~c1").
  let due = 0;
  for (const [k, c] of Object.entries(prog.cards)) if (ids.has(basis(k)) && isDue(c, now)) due++;
  const limiet = prog.limiet ?? STD_LIMIET;
  const alGedaan = prog.newDay && prog.newDay.day === dag ? prog.newDay.n : 0;
  const nieuw = Math.min(Math.max(0, limiet - alGedaan), kaarten.length - gezien);

  const laatste = prog.history.length ? prog.history[prog.history.length - 1] : null;
  const laatsteCijfer = laatste ? cijfer(laatste.punten ?? laatste.ok, laatste.maxPunten ?? laatste.n) : null;

  return { totaal: kaarten.length, gezien, beheerst, due, nieuw, moeilijk, ongezien: kaarten.length - gezien,
    laatsteToets: laatste ? { datum: laatste.date, cijfer: laatsteCijfer } : null,
    cijfers: prog.history.slice(-12).map(h => cijfer(h.punten ?? h.ok, h.maxPunten ?? h.n)),
    zwakste: zwaksteGroepen(kaarten, prog, 1)[0] || null };
}

// Groepen (les of onderwerp) met het laagste percentage behaalde punten in toetsen.
// Alleen groepen met minstens `min` gestelde vragen tellen mee.
export function zwaksteGroepen(kaarten, prog, aantal = 3, min = 3, groep = b => b.les || b.onderwerp) {
  const per = {};
  for (const b of kaarten.filter(toetsbaar)) {
    const q = prog.quiz[b.id];
    if (!q) continue;
    const g = groep(b), r = (per[g] ||= { groep: g, p: 0, m: 0, n: 0 });
    r.n += q.ok + q.no;
    if (q.m) { r.p += q.p; r.m += q.m; } else { r.p += q.ok; r.m += q.ok + q.no; }
  }
  return Object.values(per).filter(r => r.n >= min && r.m > 0)
    .map(r => ({ groep: r.groep, pct: Math.round(r.p / r.m * 100), n: r.n }))
    .sort((a, b) => a.pct - b.pct).slice(0, aantal);
}
