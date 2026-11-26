// Alle opslag en gedeelde toestand op één plek.
// - Voortgang per module, met vertraagd wegschrijven (#75): wijzigingen worden gebundeld en hooguit
//   eens per seconde (en altijd bij het verlaten van de pagina) naar localStorage geschreven.
// - Globale gegevens: instellingen, dagboek (#39), mijlpalen (#41), toetsdata (#27).
// - Moduledata: eerst de kleine index (#63), de volledige kaarten pas als je de module opent.
import { SLEUTEL, STANDAARD } from "./config.js";
import { haalJson } from "./kluis.js";
import { normaliseProg, SYNC_VERSIE, verhuisProg } from "../domain/progress.js";
import { noteer } from "../domain/planner.js";
import { createQuizGenerator } from "../domain/quiz.js";
import { VLEUGELS, STANDAARD_VLEUGEL, vleugelBestand } from "../domain/vleugels.js";

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
// Celbiologie en datavaardigheden is opgegaan in De cel (tools/samenvoegen-de-cel.py). Wie die
// module al had gebruikt, heeft voortgang onder de oude sleutel staan; die wordt hier één keer
// verhuisd. De kaarten kregen de stam "celbio-" in plaats van "cel-", en dat is de hele
// hernoeming — daarom hoeft de verhuiskaart uit data/schema/ er niet voor opgehaald te worden.
const OUDE_MODULE = "celbiologie-datavaardigheden";
let verhuisd = false;
function verhuisCelbiologie() {
  if (verhuisd) return;
  verhuisd = true;
  const oud = lees(SLEUTEL.prog(OUDE_MODULE), null);
  if (!oud) return;
  const samen = verhuisProg(oud, lees(SLEUTEL.prog("de-cel"), null), id => id.replace(/^cel-/, "celbio-"));
  progs.set("de-cel", samen);
  schrijf(SLEUTEL.prog("de-cel"), samen);
  wis(SLEUTEL.prog(OUDE_MODULE));
}

export function prog(id = app.mod?.id) {
  if (id === "de-cel") verhuisCelbiologie();
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

// ---------- vleugeldata (B2): stoffenbibliotheek en de lab-/projectbestanden ----------
let stoffenP = null;
export const laadStoffen = () => (stoffenP ||= fetch("data/stoffen.json")
  .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  .then(j => j.stoffen || [])
  .catch(e => { stoffenP = null; throw e; }));

// De uitwerkrecepten: hoe je een techniek verwerkt en met welke formules. Eén bestand voor alle
// modules, want een standaardcurve werkt in elke module hetzelfde.
let receptenP = null;
export const laadAnalyseRecepten = () => (receptenP ||= fetch("data/analyse-recepten.json")
  .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  .catch(e => { receptenP = null; throw e; }));

// Hoe je een soort opdracht maakt. Eén bestand voor alle modules: een verslag schrijf je in elke
// module hetzelfde.
let opdrachtP = null;
export const laadOpdrachtRecepten = () => (opdrachtP ||= fetch("data/opdracht-recepten.json")
  .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  .then(j => j.recepten || [])
  .catch(() => []));

// Doel- en hypothesesuggesties per module. Een module zonder bestand is geen fout: dan staan er
// voor die module nog geen suggesties en zegt het scherm dat.
const doelenCache = new Map();
export function laadDoelen(mod) {
  const id = mod?.id;
  if (!id) return Promise.resolve(null);
  if (!doelenCache.has(id)) doelenCache.set(id, fetch(`data/doelen/${id}.json`)
    .then(r => (r.ok ? r.json() : null)).catch(() => null));
  return doelenCache.get(id);
}

// Het databestand van een vleugel volgt uit het theoriepad: <id>.lab.json, <id>.project.json.
// Een ontbrekend bestand is geen fout: dan heeft die module die vleugel nog niet.
const vleugelCache = new Map();
export function laadVleugelData(mod, vleugel) {
  const pad = vleugelBestand(mod.bestand, vleugel);
  if (!vleugelCache.has(pad)) vleugelCache.set(pad, fetch(pad).then(r => (r.ok ? r.json() : null)).catch(() => null));
  return vleugelCache.get(pad);
}

// ---------- labanalyse: afgevinkte experimenten (B2) ----------
// Per module en labsessie welke experimenten je hebt uitgewerkt. Dit gaat niet mee in de
// synchronisatie: de voortgang daar is er voor kaarten en toetsen, dit is een eigen lijstje.
let vinkjes = null;
export const labVinkjes = () => (vinkjes ||= lees(SLEUTEL.labvinkjes, {}));
export function zetLabVinkje(modId, sessie, exp, aan) {
  const alle = labVinkjes();
  const perModule = (alle[modId] ||= {});
  const perSessie = (perModule[sessie] ||= {});
  if (aan) perSessie[exp] = true; else delete perSessie[exp];
  if (!Object.keys(perSessie).length) delete perModule[sessie];
  if (!Object.keys(perModule).length) delete alle[modId];
  schrijf(SLEUTEL.labvinkjes, alle);
  return aan;
}

// Een rubric uit data/rubrics/<id>.json. Welke id's er zijn zegt de projectdata van de module.
// Een ontbrekend bestand geeft null: dan noemt de data een rubric die er niet is, en het scherm
// zegt dat liever dan dat het omvalt.
const rubriekCache = new Map();
export function laadRubric(id) {
  if (!rubriekCache.has(id)) {
    // Beoordelingsformulieren zijn lesmateriaal van de opleiding en staan versleuteld in de repo.
    rubriekCache.set(id, haalJson(`data/rubrics/${id}.json`)
      .catch(e => { rubriekCache.delete(id); throw e; }));
  }
  return rubriekCache.get(id);
}

// ---------- projectvleugel: keuze, opdrachtstatus en eigen doel (B3) ----------
// De projectkeuze wordt per module bewaard en één keer gevraagd: de vleugel vraagt er niet
// opnieuw om, maar elk projectscherm heeft een "ander project" waarmee je hem wijzigt.
// Per module, want een student doet in periode 1 een ander project dan in periode 3.
let keuzes = null;
export const projectKeuzes = () => (keuzes ||= lees(SLEUTEL.projectkeuze, {}));
export const projectKeuze = modId => projectKeuzes()[modId] || null;
export function zetProjectKeuze(modId, projectId) {
  const alle = projectKeuzes();
  if (projectId) alle[modId] = projectId; else delete alle[modId];
  schrijf(SLEUTEL.projectkeuze, alle);
  return projectId || null;
}

// De status van een opdracht (te doen / bezig / ingeleverd / beoordeeld). Dit is een eigen
// lijstje, net als de labvinkjes, en gaat niet mee in de synchronisatie van kaarten en toetsen.
// PPO (B4) leest hieruit welk bewijs er is, dus de sleutel is het opdracht-id en niet de plek
// in de lijst: dan blijft een status staan als de data opnieuw gegenereerd wordt.
let statussen = null;
export const opdrachtStatussen = () => (statussen ||= lees(SLEUTEL.opdrachtstatus, {}));
export const opdrachtStatus = modId => opdrachtStatussen()[modId] || {};
export function zetOpdrachtStatus(modId, opdrachtId, status) {
  const alle = opdrachtStatussen();
  const perModule = (alle[modId] ||= {});
  if (status && status !== "te doen") perModule[opdrachtId] = status; else delete perModule[opdrachtId];
  if (!Object.keys(perModule).length) delete alle[modId];
  schrijf(SLEUTEL.opdrachtstatus, alle);
  return status;
}

// Doel en hypothese staan niet in de bron (zie _ontbreekt in de projectdata); die schrijf je
// zelf. Per module en per project bewaard, zodat een ander project je tekst niet overschrijft.
let doelen = null;
export const projectDoelen = () => (doelen ||= lees(SLEUTEL.projectdoel, {}));
export const projectDoel = (modId, projectId) => projectDoelen()[`${modId}:${projectId}`] || { doel: "", hypothese: "" };
export function zetProjectDoel(modId, projectId, velden) {
  const alle = projectDoelen();
  const k = `${modId}:${projectId}`;
  const nu = { ...projectDoel(modId, projectId), ...velden };
  if (nu.doel.trim() || nu.hypothese.trim()) alle[k] = nu; else delete alle[k];
  schrijf(SLEUTEL.projectdoel, alle);
  return nu;
}

// De inlever- en toetsmomenten van een module, uit <module>.deadlines.json. Niet elke module
// heeft dat bestand: de pagina "Activiteiten deadlines" is per module met de hand overgenomen.
// Een ontbrekend bestand geeft null, en het scherm zegt dan dat het de datums niet weet.
export function laadDeadlines(mod) {
  const pad = (mod?.bestand || "").replace(".json", ".deadlines.json");
  if (!pad) return Promise.resolve(null);
  if (!vleugelCache.has(pad)) {
    vleugelCache.set(pad, fetch(pad).then(r => (r.ok ? r.json() : null)).catch(() => null));
  }
  return vleugelCache.get(pad);
}

// ---------- PPO: de eisen en het bewijs dat je eraan hangt (B4) ----------
// PPO is modulevrij, dus dit scherm heeft de projectdata van álle modules nodig om te weten
// welk werk er is. laadVleugelData cachet per bestand, dus dit kost één ronde fetches.
let ppoP = null;
export const laadPPO = () => (ppoP ||= fetch("data/ppo/ppo.json")
  .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
  .catch(e => { ppoP = null; throw e; }));

// { modId: data } voor elke module die deze vleugel heeft. Een module zonder bestand levert
// null; het domein gaat daar niet onderuit. laadVleugelData cachet per bestand, dus een tweede
// scherm dat hetzelfde vraagt kost geen nieuwe ronde.
export async function laadAlleVleugelData(vleugel) {
  const mods = app.modules.filter(m => (m.vleugels || []).includes(vleugel));
  const paren = await Promise.all(mods.map(m => laadVleugelData(m, vleugel).then(d => [m.id, d])));
  return Object.fromEntries(paren);
}
export const laadAlleProjectData = () => laadAlleVleugelData("project");

// Welk werk je aan welke pijler hebt gehangen: { pijlerId: { "<module>:<opdracht>": true } }.
// Dit is jouw keuze, niet die van de opleiding: de bron koppelt eisen niet aan opdrachten.
let bewijs = null;
export const ppoBewijs = () => (bewijs ||= lees(SLEUTEL.ppobewijs, {}));
export function zetPpoBewijs(pijlerId, sleutel, aan) {
  const alle = ppoBewijs();
  const perPijler = (alle[pijlerId] ||= {});
  if (aan) perPijler[sleutel] = true; else delete perPijler[sleutel];
  if (!Object.keys(perPijler).length) delete alle[pijlerId];
  schrijf(SLEUTEL.ppobewijs, alle);
  return aan;
}

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
