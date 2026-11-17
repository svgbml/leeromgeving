// Hash-router met parameters (#34): #/begrippen?les=Les%203&q=dna
// Elk scherm is een module met mount(ctx); bij een paginawissel wordt de AbortController van het
// vorige scherm afgebroken, zodat zijn luisteraars en timers verdwijnen (#68, bug #1).
import { overgang } from "../ui/motion.js";
import { app } from "./store.js";

const ZONDER_DATA = new Set(["vandaag", "instellingen"]);

const schermen = new Map();
let huidig = null, ctrl = null, opWissel = () => {};

export const registreer = (naam, laad) => schermen.set(naam, laad);
export const bijWissel = f => (opWissel = f);

export function lees() {
  const [pad, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const route = pad || "vandaag";
  return { route: schermen.has(route) ? route : "vandaag", params: Object.fromEntries(new URLSearchParams(query)) };
}
const maak = (route, params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null && v !== false)).toString();
  return `#/${route}${q ? `?${q}` : ""}`;
};
export const link = maak;

// Naar een scherm gaan.
export function ga(route, params = {}) {
  const h = maak(route, params);
  if (location.hash === h) toon(true); else location.hash = h;
}
// Alleen de parameters in de adresbalk bijwerken (filters), zonder het scherm opnieuw te laden.
export function zetParams(params) {
  const h = maak(huidig?.route || "vandaag", params);
  history.replaceState(null, "", h);
  if (huidig) huidig.params = params;
}

let eerste = true;
export async function toon(forceer = false) {
  const { route, params } = lees();
  if (!forceer && huidig && huidig.route === route && huidig.update && JSON.stringify(params) !== JSON.stringify(huidig.params)) {
    huidig.params = params; huidig.update(params); return;
  }
  ctrl?.abort();
  ctrl = new AbortController();
  const signal = ctrl.signal;
  const laad = schermen.get(route);
  // Vandaag en Instellingen hebben de kaarten van de gekozen module niet nodig; de rest wacht erop.
  const [scherm] = await Promise.all([laad(), ZONDER_DATA.has(route) ? null : app.laden]);
  if (signal.aborted) return;
  const main = document.getElementById("main");
  huidig = { route, params, update: null };
  opWissel(route, params);
  // Bij het eerste tekenen geen overgang: die vertraagt het eerste beeld en telt als layout shift.
  const teken = eerste ? f => f() : overgang;
  eerste = false;
  teken(() => {
    window.scrollTo(0, 0);
    main.dataset.scherm = route; // voor de opmaak per scherm (bijv. smallere flashcards)
    const r = scherm.mount({ main, params, signal, zetUpdate: f => (huidig.update = f) });
    if (r && typeof r.catch === "function") r.catch(e => { console.error(e); main.innerHTML = `<p role="alert">Er ging iets mis bij het laden van deze pagina.</p>`; });
  });
}

export function start() {
  addEventListener("hashchange", () => toon());
  return toon(true);
}
