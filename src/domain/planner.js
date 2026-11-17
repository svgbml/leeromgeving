// Studieplanning (#27, #28), dagboek, reeks en mijlpalen (#14, #39–#42). Pure functies.
import { localDay, DAY } from "./srs.js";

export const dagenTot = (datum, nu = new Date()) => {
  if (!datum) return null;
  const [j, m, d] = datum.split("-").map(Number);
  const doel = new Date(j, m - 1, d), vandaag = new Date(nu.getFullYear(), nu.getMonth(), nu.getDate());
  return Math.round((doel - vandaag) / DAY);
};

// Hoeveel nieuwe kaarten per dag om alles twee dagen vóór de toets gezien te hebben?
export function plan({ ongezien, toetsdatum, nu = new Date() }) {
  const dagen = dagenTot(toetsdatum, nu);
  if (dagen === null) return null;
  if (dagen < 0) return { dagen, voorbij: true, perDag: 0 };
  const leerdagen = Math.max(1, dagen - 2);
  return { dagen, leerdagen, perDag: Math.ceil(ongezien / leerdagen), voorbij: false };
}

// Verwachte herhalingen per dag voor de komende n dagen.
export function prognose(cards, n = 7, nu = Date.now()) {
  const begin = new Date(nu); begin.setHours(0, 0, 0, 0);
  const uit = Array.from({ length: n }, (_, i) => ({ dag: localDay(new Date(begin.getTime() + i * DAY)), n: 0 }));
  for (const c of cards) {
    const i = Math.floor((Math.max(c.due, begin.getTime()) - begin.getTime()) / DAY);
    if (i >= 0 && i < n) uit[i].n++;
  }
  return uit;
}

// ---------- dagboek ----------
// { "2026-11-17": { n: herhalingen, nieuw, p: toetspunten, m: max, ms: studietijd } }
export function noteer(dagboek, wat, dag = localDay()) {
  const d = (dagboek[dag] ||= { n: 0, nieuw: 0, p: 0, m: 0, ms: 0 });
  for (const [k, v] of Object.entries(wat)) d[k] = (d[k] || 0) + v;
  return dagboek;
}
const actief = d => !!d && (d.n > 0 || d.m > 0 || d.ms >= 60e3);

// Aantal dagen op rij met activiteit; vandaag telt mee als je al iets deed, anders vanaf gisteren.
export function reeks(dagboek, nu = new Date()) {
  let n = 0;
  const d = new Date(nu); d.setHours(12, 0, 0, 0);
  if (!actief(dagboek[localDay(d)])) d.setDate(d.getDate() - 1);
  while (actief(dagboek[localDay(d)])) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
export function langsteReeks(dagboek) {
  const dagen = Object.keys(dagboek).filter(k => actief(dagboek[k])).sort();
  let best = 0, nu = 0, vorige = null;
  for (const k of dagen) {
    const t = new Date(k + "T12:00:00").getTime();
    nu = vorige !== null && Math.round((t - vorige) / DAY) === 1 ? nu + 1 : 1;
    best = Math.max(best, nu); vorige = t;
  }
  return best;
}

// Heatmap: weken × 7 dagen (maandag eerst), oudste week links.
export function heatmap(dagboek, weken = 20, nu = new Date()) {
  const eind = new Date(nu); eind.setHours(12, 0, 0, 0);
  const maandag = new Date(eind); maandag.setDate(eind.getDate() - ((eind.getDay() + 6) % 7));
  const start = new Date(maandag); start.setDate(maandag.getDate() - 7 * (weken - 1));
  const uit = [];
  for (let w = 0; w < weken; w++) {
    const kolom = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + w * 7 + i);
      const k = localDay(d), v = dagboek[k];
      kolom.push({ dag: k, n: v ? v.n + Math.round((v.m || 0) / 2) : 0, toekomst: d > eind });
    }
    uit.push(kolom);
  }
  return uit;
}
export const niveau = n => n <= 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : n < 60 ? 3 : 4;

// Weekoverzicht (#42): de afgelopen 7 dagen.
export function week(dagboek, nu = new Date()) {
  const s = { n: 0, nieuw: 0, p: 0, m: 0, ms: 0, dagen: 0 };
  const d = new Date(nu); d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const v = dagboek[localDay(d)];
    if (v) { for (const k of ["n", "nieuw", "p", "m", "ms"]) s[k] += v[k] || 0; if (actief(v)) s.dagen++; }
    d.setDate(d.getDate() - 1);
  }
  return s;
}

// ---------- mijlpalen (#41) ----------
export const MIJLPALEN = [
  { id: "beheerst-100", tekst: "100 kaarten beheerst", test: s => s.beheerst >= 100 },
  { id: "beheerst-250", tekst: "250 kaarten beheerst", test: s => s.beheerst >= 250 },
  { id: "beheerst-500", tekst: "500 kaarten beheerst", test: s => s.beheerst >= 500 },
  { id: "beheerst-1000", tekst: "1000 kaarten beheerst", test: s => s.beheerst >= 1000 },
  { id: "eerste-8", tekst: "Je eerste 8 of hoger op een oefentoets", test: s => s.besteCijfer >= 8 },
  { id: "eerste-10", tekst: "Een 10 op een oefentoets", test: s => s.besteCijfer >= 9.95 },
  { id: "reeks-7", tekst: "7 dagen op rij gestudeerd", test: s => s.reeks >= 7 },
  { id: "reeks-30", tekst: "30 dagen op rij gestudeerd", test: s => s.reeks >= 30 },
  { id: "module-gezien", tekst: "Alle kaarten van een module gezien", test: s => s.moduleCompleet },
  { id: "doel-gehaald", tekst: "Je eerste dagdoel gehaald", test: s => s.doelVandaag }
];
export const nieuweMijlpalen = (stand, behaald) => MIJLPALEN.filter(m => !behaald[m.id] && m.test(stand));
