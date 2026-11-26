/* Leeromgeving BML – statische app, geen build-stap nodig om te draaien (ES-modules).
   Opbouw: src/core (opslag, router, sync, pwa), src/domain (pure logica, getest), src/views (schermen,
   pas geladen als je ze opent), src/ui (gedeelde onderdelen). Zie README › Ontwikkelen. */
import { app, laadModules, kiesModule, laatsteModule, kiesVleugel, instellingen, pasToe, bijWijziging, prog, dagboek, mijlpalen, zetMijlpaal } from "./src/core/store.js";
import { VLEUGELS, vleugelVan, vleugelRoutes, tabsVan } from "./src/domain/vleugels.js";
import { tekenVleugelkiezer, tekenTabs } from "./src/ui/vleugelbalk.js";
import { registreer, start, toon, bijWissel, ga } from "./src/core/router.js";
import { $, say, toast } from "./src/core/dom.js";
import { esc, cijfer } from "./src/domain/text.js";
import { isKnown, localDay } from "./src/domain/srs.js";
import { reeks, nieuweMijlpalen } from "./src/domain/planner.js";
import { setupBeweging, confetti } from "./src/ui/motion.js";
import { koppelTermPopover, koppelSlideViewer, koppelMelder } from "./src/ui/kaart-extra.js";
import { toonSneltoetsen } from "./src/ui/sneltoetsen.js";
import { registreerSW } from "./src/core/pwa.js";
import { startAutoSync } from "./src/core/sync.js";

// Schermen worden pas geladen als je ze opent.
registreer("vandaag", () => import("./src/views/vandaag.js").then(m => m.default));
registreer("begrippen", () => import("./src/views/begrippen.js").then(m => m.default));
registreer("flashcards", () => import("./src/views/flashcards.js").then(m => m.default));
registreer("toets", () => import("./src/views/toets.js").then(m => m.default));
registreer("voortgang", () => import("./src/views/voortgang.js").then(m => m.default));
registreer("instellingen", () => import("./src/views/instellingen.js").then(m => m.default));
registreer("verslag", () => import("./src/views/verslag.js").then(m => m.default));
registreer("videos", () => import("./src/views/videos.js").then(m => m.default));
registreer("plasmide", () => import("./src/views/plasmide.js").then(m => m.default));
// Lab, project en PPO. Sinds B4 heeft elke route uit VLEUGELS hier een scherm; binnenkort.js is
// het vangnet dat overblijft voor een tab die later aan de tabel wordt toegevoegd maar nog geen
// scherm heeft. tests/vleugels.test.js houdt bij dat de tabel en deze lijst gelijk blijven.
const INGERICHT = {
  "lab/voorbereiding": () => import("./src/views/lab-voorbereiding.js").then(m => m.default),
  "lab/protocollen": () => import("./src/views/lab-protocollen.js").then(m => m.default),
  "lab/analyse": () => import("./src/views/lab-analyse.js").then(m => m.default),
  "project/verhaal": () => import("./src/views/project-verhaal.js").then(m => m.default),
  "project/doel": () => import("./src/views/project-doel.js").then(m => m.default),
  "project/protocollen": () => import("./src/views/project-protocollen.js").then(m => m.default),
  "project/inleveren": () => import("./src/views/project-inleveren.js").then(m => m.default),
  "project/rubrics": () => import("./src/views/project-rubrics.js").then(m => m.default),
  "project/opdrachten": () => import("./src/views/project-opdrachten.js").then(m => m.default),
  "ppo/eisen": () => import("./src/views/ppo-eisen.js").then(m => m.default),
  "ppo/bewijs": () => import("./src/views/ppo-bewijs.js").then(m => m.default),
  "ppo/deadlines": () => import("./src/views/ppo-deadlines.js").then(m => m.default)
};
for (const route of vleugelRoutes()) registreer(route, INGERICHT[route] || (() => import("./src/views/binnenkort.js").then(m => m.default)));

const TITELS = { vandaag: "Vandaag", flashcards: "Flashcards", toets: "Oefentoets", voortgang: "Voortgang", instellingen: "Instellingen", verslag: "Verslag", videos: "Video's", plasmide: "Plasmidebouwer" };

// Schermen die maar bij één module horen; de tab verschijnt alleen als die module gekozen is.
const PER_MODULE = { plasmide: new Set(["dna-kraak-de-code"]) };

// Paginatitel: theorie houdt zijn bestaande vorm; PPO is modulevrij, dus zonder modulenaam.
function titelVoor(route, vleugel, lijst) {
  if (route === "vandaag" || route === "instellingen") return `${TITELS[route]} · Leeromgeving BML`;
  if (vleugel === "theorie") return `${TITELS[route] || lijst} · ${app.mod.titel} · Leeromgeving BML`;
  const tab = tabsVan(vleugel).find(t => t.id === route.split("/")[1]);
  const naam = tab?.t || VLEUGELS[vleugel].naam;
  return VLEUGELS[vleugel].modulevrij
    ? `${naam} · ${VLEUGELS[vleugel].naam} · Leeromgeving BML`
    : `${naam} · ${VLEUGELS[vleugel].naam} · ${app.mod.titel} · Leeromgeving BML`;
}

// ---------- thema (licht/donker; hoog contrast staat in Instellingen) ----------
function setupTheme() {
  const btn = $("#theme"), root = document.documentElement, meta = document.querySelector('meta[name="theme-color"]');
  const apply = (t, save) => {
    root.setAttribute("data-theme", t);
    btn.setAttribute("aria-pressed", String(t === "dark"));
    meta.setAttribute("content", t === "dark" ? "#0f1719" : "#0b6e74");
    if (save) { try { localStorage.setItem("leeromgeving:thema", t); } catch {} say(t === "dark" ? "Donkere modus aan" : "Donkere modus uit"); }
  };
  apply(root.getAttribute("data-theme") || "light", false);
  btn.addEventListener("click", () => apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true));
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", e => {
    let saved = null; try { saved = localStorage.getItem("leeromgeving:thema"); } catch {}
    if (!saved) apply(e.matches ? "dark" : "light", false);
  });
}

// ---------- modulekeuze ----------
function vulModulekeuze() {
  const sel = $("#module"), groepjes = {};
  for (const m of app.modules) (groepjes[m.periode] ||= []).push(m);
  sel.innerHTML = Object.entries(groepjes)
    .sort((a, b) => (a[1][0].jaar - b[1][0].jaar) || (a[1][0].periode_nr - b[1][0].periode_nr))
    .map(([g, ms]) => `<optgroup label="${esc(g)}">${ms.map(m => `<option value="${esc(m.id)}">${esc(m.titel)}</option>`).join("")}</optgroup>`).join("");
  sel.value = app.mod.id;
  sel.addEventListener("change", async () => { await kiesModule(sel.value); toon(true); });
}

// ---------- sneltoetsen (#51) ----------
function sneltoetsen() {
  let g = 0;
  // In de capture-fase, zodat "g f" niet ook de focusmodus van de flashcards aanzet.
  document.addEventListener("keydown", e => {
    if (e.target.closest?.("input,select,textarea,[contenteditable]") || e.ctrlKey || e.metaKey || e.altKey) return;
    const klaar = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.key === "?") { klaar(); toonSneltoetsen(); return; }
    if (e.key === "/") { klaar(); if (app.route !== "begrippen") ga("begrippen"); setTimeout(() => $("#q")?.focus(), 250); return; }
    if (Date.now() - g < 1200) {
      const naar = { v: "vandaag", b: "begrippen", f: "flashcards", t: "toets", p: "voortgang", i: "instellingen", m: "videos", s: "verslag" }[e.key];
      g = 0;
      if (naar) { klaar(); ga(naar); return; }
    }
    if (e.key === "g") { g = Date.now(); klaar(); }
  }, true);
}

// ---------- mijlpalen (#41) ----------
let mijlTimer = null;
function controleerMijlpalen() {
  clearTimeout(mijlTimer);
  mijlTimer = setTimeout(() => {
    let beheerst = 0, besteCijfer = 0, moduleCompleet = false;
    for (const m of app.modules) {
      const p = prog(m.id);
      for (const [k, c] of Object.entries(p.cards)) if (!k.includes("~") && isKnown(c)) beheerst++;
      for (const h of p.history) if (!h.stopped && (h.maxPunten ?? h.n) >= 10) besteCijfer = Math.max(besteCijfer, cijfer(h.punten ?? h.ok, h.maxPunten ?? h.n));
      const idx = app.index?.modules?.[m.id];
      if (idx && idx.k.length && idx.k.every(([id]) => p.cards[id])) moduleCompleet = true;
    }
    const boek = dagboek(), vandaag = boek[localDay()];
    const stand = { beheerst, besteCijfer, reeks: reeks(boek), moduleCompleet, doelVandaag: !!vandaag && vandaag.n >= instellingen().doel };
    for (const m of nieuweMijlpalen(stand, mijlpalen())) {
      zetMijlpaal(m.id);
      toast(`<strong>Mijlpaal:</strong> ${esc(m.tekst)}!`, { ms: 5000 });
      confetti(document.querySelector(".toast:last-child"));
    }
  }, 1500);
}

// ---------- start ----------
async function init() {
  pasToe();
  setupTheme();
  setupBeweging($("#beweging"), say);
  try { await laadModules(); }
  catch { $("#main").innerHTML = `<p role="alert">Kon de modules niet laden. Controleer je verbinding en herlaad de pagina.</p>`; return; }
  kiesModule(laatsteModule() || app.modules[0].id).catch(() => kiesModule(app.modules[0].id)).catch(() => {
    $("#main").innerHTML = `<p role="alert">Kon de module niet laden. Controleer je verbinding en probeer het opnieuw.</p>`;
  });
  vulModulekeuze();
  koppelTermPopover();
  koppelSlideViewer();
  koppelMelder();
  sneltoetsen();
  bijWissel(route => {
    app.route = route;
    const vleugel = vleugelVan(route);
    kiesVleugel(vleugel);
    tekenTabs(vleugel);
    tekenVleugelkiezer(vleugel);
    // Tabs van module-eigen schermen verbergen bij een andere module (en dan ook niet op dat scherm blijven).
    // Na tekenTabs, want dat vervangt de tabbalk bij een vleugelwissel.
    for (const [naam, modules] of Object.entries(PER_MODULE)) {
      const aan = modules.has(app.mod?.id);
      document.querySelectorAll(`.tabs [data-route="${naam}"]`).forEach(a => (a.hidden = !aan));
      if (!aan && route === naam) { ga("vandaag"); return; }
    }
    document.querySelectorAll("[data-route]").forEach(a => a.dataset.route === route ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    const lijst = app.data?.kaarttype === "vraag" ? "Vragen" : "Begrippen";
    document.querySelectorAll("[data-route=begrippen] .tab-t").forEach(s => (s.textContent = lijst));
    document.title = titelVoor(route, vleugel, lijst);
    if (route !== "flashcards" && route !== "toets") document.body.classList.remove("focus");
  });
  // Gedeelde tekst (#62, share target): ?q=… opent de begrippenlijst met die zoekterm.
  const gedeeld = new URLSearchParams(location.search).get("q");
  if (gedeeld) { history.replaceState(null, "", location.pathname + `#/begrippen?q=${encodeURIComponent(gedeeld.slice(0, 80))}`); }
  bijWijziging(w => { if (w.soort === "dagboek" || w.soort === "prog") controleerMijlpalen(); });
  await start();
  startAutoSync(() => { toast("Voortgang van een ander apparaat bijgewerkt."); app.flash = null; toon(true); });
  // Service worker alleen in de gebouwde site (met data/index.json), niet tijdens ontwikkelen.
  if (app.index) registreerSW();
  // Installeerknop in de voet (#58).
  addEventListener("beforeinstallprompt", () => $("#installeer")?.removeAttribute("hidden"));
  $("#installeer")?.addEventListener("click", async () => { const { installeer } = await import("./src/core/pwa.js"); if (await installeer()) $("#installeer").hidden = true; });
}

init();
