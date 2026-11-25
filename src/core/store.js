// Alle opslag en gedeelde toestand op één plek.
// - Voortgang per module, met vertraagd wegschrijven (#75): wijzigingen worden gebundeld en hooguit
//   eens per seconde (en altijd bij het verlaten van de pagina) naar localStorage geschreven.
// - Globale gegevens: instellingen, dagboek (#39), mijlpalen (#41), toetsdata (#27).
// - Moduledata: eerst de kleine index (#63), de volledige kaarten pas als je de module opent.
import { SLEUTEL, STANDAARD } from "./config.js";
import { normaliseProg, SYNC_VERSIE } from "../domain/progress.js";
import { noteer } from "../domain/planner.js";
import { createQuizGenerator } from "../domain/quiz.js";
import { VLEUGELS, STANDAARD_VLEUGEL } from "../domain/vleugels.js";

const lees = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const schrijf = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const wis = k => { try { localStorage.removeItem(k); } catch {} };

// ---------- gedeelde toestand ----------
export const app = {
  modules: [], index: null, mod: null, data: null, gen: null,
  route: "", vleugel: STANDAARD_VLEUGEL, params: {}, flash: null, quiz: null
};

// ---------- vleugel (theorie/lab/project/ppo) ----------
// De route is de bron van waarheid; dit onthoudt alleen welke vleugel je het laatst gebruikte,
// zodat de app daar weer opent. Voortgang per vleugel scheiden komt in B2, als er labkaarten zijn.
export function kiesVleugel(v) {
  app.vleugel = v in VLEUGELS ? v : STANDAARD_VLEUGEL;
  schrijf(SLEUTEL.vleugel, app.vleugel);
  return app.vleugel;
}
export const laatsteVleugel = () => {
  const v = lees(SLEUTEL.vleugel, STANDAARD_VLEUGEL);
  return v in VLEUGELS ? v : STANDAARD_VLEUGEL;
};

// ---------- luisteraars (sync, mijlpalen) ----------
const luisteraars = new Set();
export const bijWijziging = f => (luisteraars.add(f), () => luisteraars.delete(f));
const meld = wat => luisteraars.forEach(f => { try { f(wat); } catch (e) { console.error(e); } });

// ---------- voortgang per module (#75) ----------
const progs = new Map(), vies = new Set();
let timer = null;
export function prog(id = app.mod?.id) {
  if (!progs.has(id)) progs.set(id, normaliseProg(lees(SLEUTEL.prog(id), null)));
  return progs.get(id);
}
export function bewaar(id = app.mod?.id) {
  const p = prog(id); p.t = Date.now();
  vies.add(id);
  clearTimeout(timer); timer = setTimeout(flush, 1000);
  meld({ soort: "prog", id });
}
export function flush() {
  clearTimeout(timer); timer = null;
  for (const id of vies) schrijf(SLEUTEL.prog(id), progs.get(id));
  vies.clear();
  if (globaalVies) { schrijf(SLEUTEL.dagboek, dagboek()); globaalVies = false; }
}
export function vervangProg(id, nieuw) { progs.set(id, normaliseProg(nieuw)); bewaar(id); flush(); }
export function wisProg(id) { progs.delete(id); wis(SLEUTEL.prog(id)); }
addEventListener("pagehide", flush);
addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });

// ---------- instellingen ----------
let inst = null;
export function instellingen() { return inst ||= { ...STANDAARD, ...lees(SLEUTEL.instellingen, {}) }; }
export function zetInstelling(k, v) { instellingen()[k] = v; schrijf(SLEUTEL.instellingen, inst); pasToe(); meld({ soort: "instellingen" }); }
// Lettergrootte, lettertype en contrast op <html> zetten (#55, #57). Ook al gedaan in index.html, vóór het tekenen.
export function pasToe() {
  const i = instellingen(), root = document.documentElement;
  root.style.fontSize = i.lettergrootte === 100 ? "" : `${i.lettergrootte * 1.0625}%`;
  root.dataset.lettertype = i.lettertype;
  root.dataset.contrast = i.contrast ? "hoog" : "";
}

// ---------- dagboek, mijlpalen, toetsdata ----------
let boek = null, globaalVies = false;
export const dagboek = () => boek ||= lees(SLEUTEL.dagboek, {});
export function noteerDag(wat) {
  noteer(dagboek(), wat); globaalVies = true;
  clearTimeout(timer); timer = setTimeout(flush, 1000);
  meld({ soort: "dagboek" });
}
export const mijlpalen = () => lees(SLEUTEL.mijlpalen, {});
export const zetMijlpaal = id => { const m = mijlpalen(); m[id] = new Date().toISOString(); schrijf(SLEUTEL.mijlpalen, m); };
export const toetsdata = () => lees(SLEUTEL.toetsdata, {});
export function zetToetsdatum(modId, datum) {
  const t = toetsdata(); if (datum) t[modId] = datum; else delete t[modId];
  schrijf(SLEUTEL.toetsdata, t); meld({ soort: "toetsdata" });
}

// ---------- lopende toets bewaren (#16) ----------
export const bewaarToets = (modId, q) => q ? schrijf(SLEUTEL.toets(modId), q) : wis(SLEUTEL.toets(modId));
export const leesToets = modId => lees(SLEUTEL.toets(modId), null);

// ---------- moduledata ----------
const dataCache = new Map();
export async function laadModules() {
  const r = await fetch("data/modules.json");
  app.modules = (await r.json()).modules;
  // De index (#63) bestaat alleen in de gebouwde site; zonder index rekent Vandaag met de volledige data.
  try { const i = await fetch("data/index.json"); if (i.ok) app.index = await i.json(); } catch {}
  return app.modules;
}
// Procedures voor volgordevragen (data/volgordes.json); de build zet ze al in de moduledata.
let volgordes = null;
const laadVolgordes = () => volgordes ||= fetch("data/volgordes.json").then(r => r.ok ? r.json() : { volgordes: [] }).then(j => j.volgordes || []).catch(() => []);
export function fetchData(mod) {
  if (!dataCache.has(mod.id)) {
    const p = fetch(mod.bestand).then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(async d => { if (!d.volgordes) d.volgordes = (await laadVolgordes()).filter(v => v.modules.includes(mod.id)); return d; });
    dataCache.set(mod.id, p);
    p.catch(() => dataCache.delete(mod.id));
  }
  return dataCache.get(mod.id);
}
// Kaarten voor de samenvatting: uit de index als die er is, anders uit de volledige data.
export async function samenvattingKaarten(mod) {
  const i = app.index?.modules?.[mod.id];
  if (i) return i.k.map(([id, g]) => ({ id, les: i.g[g] }));
  return (await fetchData(mod)).begrippen;
}
export const weightOf = (id, p = prog()) => { const q = p.quiz[id] || { ok: 0, no: 0 }; return Math.max(0.5, 1 + 2 * q.no - q.ok); };

// Zet de module meteen (Vandaag kan dan al tekenen) en laadt de kaarten; app.laden wacht daarop.
export function kiesModule(id) {
  const mod = app.modules.find(m => m.id === id) || app.modules[0];
  if (!app.mod) app.mod = mod;
  return (app.laden = laadModuleData(mod));
}
async function laadModuleData(mod) {
  const data = await fetchData(mod);
  app.mod = mod; app.data = data;
  app.gen = createQuizGenerator({ data, weightOf: x => weightOf(x) });
  app.flash = null; app.quiz = leesToets(mod.id);
  schrijf(SLEUTEL.module, mod.id);
  meld({ soort: "module", id: mod.id });
  return mod;
}
export const laatsteModule = () => lees(SLEUTEL.module, null);

// ---------- momentopname voor synchronisatie (#45, #46) ----------
export function momentopname() {
  flush();
  const modules = {};
  for (const m of app.modules) { const p = prog(m.id); if (p.t || Object.keys(p.cards).length) modules[m.id] = p; }
  return { versie: SYNC_VERSIE, t: Math.max(0, ...Object.values(modules).map(p => p.t || 0)), modules,
    dagboek: dagboek(), mijlpalen: mijlpalen(), toetsdata: toetsdata() };
}
export function toepassen(s) {
  for (const [id, p] of Object.entries(s.modules || {})) { progs.set(id, normaliseProg(p)); schrijf(SLEUTEL.prog(id), progs.get(id)); }
  boek = s.dagboek || {}; schrijf(SLEUTEL.dagboek, boek);
  schrijf(SLEUTEL.mijlpalen, s.mijlpalen || {});
  schrijf(SLEUTEL.toetsdata, s.toetsdata || {});
}
