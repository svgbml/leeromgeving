// De kluis: lesmateriaal dat versleuteld in de repo staat, hier ontsleutelen.
//
// De site staat openbaar op GitHub Pages. De practicumhandleidingen en de beoordelingsformulieren
// zijn lesmateriaal van de opleiding en staan daarom versleuteld in de repo (zie
// tools/versleutel.js). Je typt één keer het wachtwoord; de sleutel komt daaruit met PBKDF2 en
// blijft in sessionStorage staan, zodat je hem niet bij elke pagina opnieuw hoeft te typen.
//
// sessionStorage en niet localStorage: zo is de sleutel weg zodra je het tabblad sluit. Op een
// computer die je deelt is dat het verschil tussen "even gelezen" en "staat er voor altijd op".
import { SLEUTEL } from "./config.js";

const MANIFEST = "data/beveiligd/manifest.json";
const CONTROLEZIN = "leeromgeving-bml";

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const naarB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));

let manifestP = null;
export const laadManifest = () => (manifestP ||= fetch(MANIFEST)
  .then(r => (r.ok ? r.json() : null))
  .catch(() => null));

let sleutel = null;      // CryptoKey zolang het tabblad open is

const bewaar = async key => {
  try {
    const ruw = await crypto.subtle.exportKey("raw", key);
    sessionStorage.setItem(SLEUTEL.kluis, naarB64(ruw));
  } catch { /* privémodus of geen opslag: dan vraagt hij het opnieuw */ }
};

async function uitSessie() {
  let opgeslagen = null;
  try { opgeslagen = sessionStorage.getItem(SLEUTEL.kluis); } catch { return null; }
  if (!opgeslagen) return null;
  try {
    return await crypto.subtle.importKey("raw", b64(opgeslagen), "AES-GCM", true, ["decrypt"]);
  } catch { return null; }
}

// Is de kluis open? Kijkt ook in de sessie, zodat een herlaadbeurt niet opnieuw vraagt.
export async function open() {
  if (sleutel) return true;
  sleutel = await uitSessie();
  return Boolean(sleutel);
}

export const sluit = () => {
  sleutel = null;
  try { sessionStorage.removeItem(SLEUTEL.kluis); } catch { /* niets te doen */ }
};

async function ontsleutel(key, blob) {
  const ruw = b64(blob);
  const plat = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ruw.slice(0, 12) }, key, ruw.slice(12));
  return new TextDecoder().decode(plat);
}

// Het wachtwoord omzetten naar een sleutel en meteen controleren of hij klopt: de controlezin in
// het manifest is met dezelfde sleutel versleuteld. Fout wachtwoord geeft false, geen uitzondering.
export async function ontgrendel(wachtwoord, manifest) {
  const m = manifest || await laadManifest();
  if (!m) return false;
  const basis = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(wachtwoord), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(m.afleiding.zout), iterations: m.afleiding.iteraties, hash: "SHA-256" },
    basis, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  try {
    if (await ontsleutel(key, m.controle) !== CONTROLEZIN) return false;
  } catch { return false; }
  sleutel = key;
  await bewaar(key);
  return true;
}

const cache = new Map();

// De tekst van een beveiligd bestand, aangeduid met zijn oorspronkelijke pad
// ("data/protocollen/de-cel-00.md"). Gooit als de kluis dicht is of het bestand er niet is.
export async function haal(pad) {
  if (!await open()) throw new Error("kluis dicht");
  if (cache.has(pad)) return cache.get(pad);
  const m = await laadManifest();
  const bron = m?.bestanden?.[pad];
  if (!bron) throw new Error(`niet in de kluis: ${pad}`);
  const p = fetch(bron)
    .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.text(); })
    .then(blob => ontsleutel(sleutel, blob))
    .catch(e => { cache.delete(pad); throw e; });
  cache.set(pad, p);
  return p;
}

export const haalJson = pad => haal(pad).then(JSON.parse);
