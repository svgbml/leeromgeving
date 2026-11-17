// Synchroniseren tussen apparaten, zonder server.
// #45 Map: via de File System Access API schrijf je naar een bestand in een map die je kiest
//      (bijv. in OneDrive of Google Drive). Werkt in Chrome en Edge op de computer.
// #46 GitHub Gist: met een eigen token (scope "gist") in een privé-gist. Werkt overal.
// Samenvoegen: per module wint de nieuwste voortgang; zie samenvoegen() in domain/progress.js.
import { SLEUTEL } from "./config.js";
import { momentopname, toepassen, bijWijziging } from "./store.js";
import { samenvoegen } from "../domain/progress.js";

const BESTAND = "leeromgeving-voortgang.json";
const lees = () => { try { return JSON.parse(localStorage.getItem(SLEUTEL.sync)) || {}; } catch { return {}; } };
const schrijf = v => { try { localStorage.setItem(SLEUTEL.sync, JSON.stringify(v)); } catch {} };
export const syncStatus = () => lees();

// ---------- kleine IndexedDB-opslag voor de maphandle (die kan niet in localStorage) ----------
function idb(actie, waarde) {
  return new Promise((res, rej) => {
    const r = indexedDB.open("leeromgeving", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction("kv", actie === "get" ? "readonly" : "readwrite");
      const st = tx.objectStore("kv");
      const q = actie === "get" ? st.get("map") : actie === "del" ? st.delete("map") : st.put(waarde, "map");
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    };
  });
}

// ---------- map (#45) ----------
export const mapMogelijk = () => typeof window.showDirectoryPicker === "function";
export async function kiesMap() {
  const h = await window.showDirectoryPicker({ id: "leeromgeving", mode: "readwrite" });
  await idb("put", h);
  schrijf({ ...lees(), map: h.name });
  await syncMap({ vraag: false });
  return h.name;
}
export async function ontkoppelMap() { await idb("del"); const s = lees(); delete s.map; delete s.mapTijd; schrijf(s); }
async function mapHandle(vraag) {
  if (!mapMogelijk()) return null;
  const h = await idb("get").catch(() => null);
  if (!h) return null;
  let p = await h.queryPermission({ mode: "readwrite" });
  if (p === "prompt" && vraag) p = await h.requestPermission({ mode: "readwrite" });
  return p === "granted" ? h : null;
}
export async function syncMap({ vraag = false } = {}) {
  const h = await mapHandle(vraag);
  if (!h) return { ok: false, reden: "geen toegang" };
  const fh = await h.getFileHandle(BESTAND, { create: true });
  const tekst = await (await fh.getFile()).text();
  const extern = tekst ? JSON.parse(tekst) : null;
  const { resultaat, gewijzigd } = samenvoegen(momentopname(), extern);
  if (gewijzigd.length) toepassen(resultaat);
  const w = await fh.createWritable(); await w.write(JSON.stringify(resultaat)); await w.close();
  schrijf({ ...lees(), mapTijd: Date.now() });
  return { ok: true, gewijzigd };
}

// ---------- GitHub Gist (#46) ----------
const API = "https://api.github.com/gists";
export function zetGist({ token, id }) { schrijf({ ...lees(), gistToken: token || undefined, gistId: id || undefined }); }
export async function syncGist() {
  const s = lees();
  if (!s.gistToken) return { ok: false, reden: "geen token" };
  const kop = { Authorization: `Bearer ${s.gistToken}`, Accept: "application/vnd.github+json" };
  let extern = null;
  if (s.gistId) {
    const r = await fetch(`${API}/${s.gistId}`, { headers: kop });
    if (!r.ok) return { ok: false, reden: `GitHub antwoordde ${r.status}` };
    const g = await r.json();
    const f = g.files?.[BESTAND];
    if (f) extern = JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content);
  }
  const { resultaat, gewijzigd } = samenvoegen(momentopname(), extern);
  if (gewijzigd.length) toepassen(resultaat);
  const body = JSON.stringify({ description: "Leeromgeving BML – voortgang", public: false, files: { [BESTAND]: { content: JSON.stringify(resultaat) } } });
  const r = await fetch(s.gistId ? `${API}/${s.gistId}` : API, { method: s.gistId ? "PATCH" : "POST", headers: { ...kop, "Content-Type": "application/json" }, body });
  if (!r.ok) return { ok: false, reden: `GitHub antwoordde ${r.status}` };
  const g = await r.json();
  schrijf({ ...lees(), gistId: g.id, gistTijd: Date.now() });
  return { ok: true, gewijzigd };
}

// Automatisch: bij het opstarten ophalen, na wijzigingen (gebundeld) wegschrijven.
let wachtrij = null;
export function startAutoSync(bijImport) {
  const s = lees();
  const run = async () => {
    const st = lees(), uit = [];
    if (st.map) uit.push(await syncMap().catch(e => ({ ok: false, reden: e.message })));
    if (st.gistToken) uit.push(await syncGist().catch(e => ({ ok: false, reden: e.message })));
    if (uit.some(r => r.ok && r.gewijzigd?.length)) bijImport?.();
    return uit;
  };
  if (s.map || s.gistToken) run();
  bijWijziging(w => {
    if (w.soort !== "prog" && w.soort !== "dagboek") return;
    const st = lees(); if (!st.map && !st.gistToken) return;
    clearTimeout(wachtrij); wachtrij = setTimeout(run, st.gistToken ? 30000 : 4000);
  });
  return run;
}
