// Vorm van de voortgang per module (localStorage "leeromgeving:<module-id>").
// normaliseProg vult ontbrekende velden aan en gooit onbruikbare weg, zodat een oud
// of geïmporteerd bestand de app niet kan laten vastlopen.

const isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);
const num = (x, d = 0) => (typeof x === "number" && Number.isFinite(x) ? x : d);

export function emptyProg() {
  return { cards: {}, quiz: {}, history: [], newDay: { day: "", n: 0 }, antwoorden: {}, types: {},
    sterren: {}, notities: {}, fouten: {}, t: 0 };
}

export function normaliseProg(raw) {
  const p = emptyProg();
  if (!isObj(raw)) return p;

  if (isObj(raw.cards)) for (const [id, c] of Object.entries(raw.cards)) {
    if (!isObj(c) || typeof c.due !== "number") continue;
    const k = { iv: num(c.iv), reps: num(c.reps), lapses: num(c.lapses), due: c.due };
    if (typeof c.s === "number") Object.assign(k, { s: Math.max(0.1, c.s), d: Math.min(10, Math.max(1, num(c.d, 5))), last: num(c.last, c.due) });
    else k.ef = Math.max(1.3, num(c.ef, 2.5));
    p.cards[id] = k;
  }
  if (isObj(raw.quiz)) for (const [id, q] of Object.entries(raw.quiz)) {
    if (!isObj(q)) continue;
    p.quiz[id] = { ok: num(q.ok), no: num(q.no), ...(q.p !== undefined ? { p: num(q.p), m: num(q.m) } : {}) };
  }
  if (Array.isArray(raw.history)) p.history = raw.history.filter(h => isObj(h) && typeof h.date === "string" && isObj(h.per)).slice(-200);
  if (isObj(raw.newDay) && typeof raw.newDay.day === "string") p.newDay = { day: raw.newDay.day, n: num(raw.newDay.n) };
  if (isObj(raw.antwoorden)) for (const [id, l] of Object.entries(raw.antwoorden)) {
    if (Array.isArray(l)) p.antwoorden[id] = l.filter(a => isObj(a) && typeof a.d === "string").slice(-3);
  }
  if (isObj(raw.types)) for (const [k, t] of Object.entries(raw.types)) {
    if (isObj(t)) p.types[k] = { n: num(t.n), p: num(t.p), m: num(t.m) };
  }
  if (typeof raw.limiet === "number" && raw.limiet > 0) p.limiet = raw.limiet;
  if (isObj(raw.mix)) p.mix = Object.fromEntries(Object.entries(raw.mix).filter(([, v]) => typeof v === "number").map(([k, v]) => [k, Math.max(0, Math.min(100, v))]));
  for (const veld of ["sterren", "fouten"]) if (isObj(raw[veld])) for (const [id, v] of Object.entries(raw[veld])) if (v) p[veld][id] = v;
  if (isObj(raw.notities)) for (const [id, v] of Object.entries(raw.notities)) if (typeof v === "string" && v.trim()) p.notities[id] = v.slice(0, 2000);
  p.t = num(raw.t);
  return p;
}

// Controleert een exportbestand. Geeft { ok, prog, fout } terug.
export function leesExport(obj, moduleId) {
  if (!isObj(obj) || !isObj(obj.prog)) return { ok: false, fout: "Dit is geen voortgangsbestand." };
  if (obj.module !== moduleId) return { ok: false, fout: `Dit bestand hoort bij een andere module (${String(obj.module ?? "onbekend")}).` };
  return { ok: true, prog: normaliseProg(obj.prog) };
}

// ---------- synchronisatie (#45, #46) ----------
// Een momentopname van alles: per module de voortgang, plus het globale dagboek, mijlpalen,
// toetsdata en instellingen. Samenvoegen: per module wint de nieuwste (t), het dagboek per dag het hoogste.
export const SYNC_VERSIE = 1;

export function samenvoegen(lokaal, extern) {
  if (!isObj(extern) || extern.versie !== SYNC_VERSIE || !isObj(extern.modules)) return { resultaat: lokaal, gewijzigd: [] };
  const uit = { ...lokaal, modules: { ...lokaal.modules } }, gewijzigd = [];
  for (const [id, prog] of Object.entries(extern.modules)) {
    const mijn = lokaal.modules[id];
    if (!mijn || num(prog?.t) > num(mijn.t)) { uit.modules[id] = normaliseProg(prog); gewijzigd.push(id); }
  }
  const dagboek = { ...(lokaal.dagboek || {}) };
  for (const [dag, v] of Object.entries(extern.dagboek || {})) {
    const m = dagboek[dag];
    if (!m) { dagboek[dag] = v; continue; }
    dagboek[dag] = Object.fromEntries([...new Set([...Object.keys(m), ...Object.keys(v)])].map(k => [k, Math.max(num(m[k]), num(v[k]))]));
  }
  uit.dagboek = dagboek;
  uit.mijlpalen = { ...(extern.mijlpalen || {}), ...(lokaal.mijlpalen || {}) };
  uit.toetsdata = num(extern.t) > num(lokaal.t) ? { ...(lokaal.toetsdata || {}), ...(extern.toetsdata || {}) } : { ...(extern.toetsdata || {}), ...(lokaal.toetsdata || {}) };
  uit.t = Math.max(num(lokaal.t), num(extern.t));
  return { resultaat: uit, gewijzigd };
}

// Voortgang van een opgeheven module in een andere module schuiven (zie
// tools/samenvoegen-de-cel.py). Alles wat op kaart-id is gesleuteld gaat door `hernoem` heen;
// wat de ontvangende module zelf al heeft wint, want dat is de module die blijft bestaan.
//
// Twee dingen gaan bewust niet mee zoals ze waren:
//  - history is per toets gesleuteld op groepsnaam (les of onderwerp), niet op kaart-id. Die
//    namen zijn door het hernummeren veranderd, dus oude uitslagen houden hun oude lesnummer.
//    Omrekenen zou een toets herschrijven die je zo hebt gemaakt; samenvoegen is eerlijker.
//  - newDay telt herhalingen van vandaag en hoort bij de module, niet bij de kaart; de teller
//    van de ontvangende module blijft staan.
export function verhuisProg(oud, nieuw, hernoem) {
  const van = normaliseProg(oud), naar = normaliseProg(nieuw);
  const perKaart = ["cards", "quiz", "antwoorden", "sterren", "notities", "fouten"];
  for (const veld of perKaart) {
    for (const [id, v] of Object.entries(van[veld])) {
      const nieuwId = hernoem(id);
      if (!(nieuwId in naar[veld])) naar[veld][nieuwId] = v;
    }
  }
  for (const [k, t] of Object.entries(van.types)) {
    const b = naar.types[k] || { n: 0, p: 0, m: 0 };
    naar.types[k] = { n: b.n + t.n, p: b.p + t.p, m: b.m + t.m };
  }
  naar.history = [...van.history, ...naar.history]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-200);
  naar.t = Math.max(num(van.t), num(naar.t));
  return naar;
}
