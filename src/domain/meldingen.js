// Meldingen: fouten in een kaart of een toetsvraag, hier opgeschreven in plaats van op GitHub.
//
// Een melding opende eerst een nieuw GitHub-issue. Dat werkt alleen als je op dat moment zin hebt
// in een tabblad met een inlogpagina, en je bent de kaart die je wilde melden kwijt voordat je
// terug bent. Dit houdt het in de site: je schrijft op wat er niet klopt, de melding komt in deze
// browser te staan, en bij Instellingen staan ze op een rij om te lezen, te kopiëren of te
// downloaden. De context (module, kaart-id, les, bron) gaat automatisch mee, want zonder die
// regels is een melding achteraf niet na te trekken.
//
// Een melding is pas nuttig als hij ook aankomt bij wie de kaarten onderhoudt, ook vanaf een
// computer van een medestudent. Daarom gaat hij daarnaast naar het verzamelpunt in
// MELD_ENDPOINT: een Google Apps Script web-app die er een regel bij zet in een Google Sheet
// (zie tools/meldingen-appsscript.gs). Staat die niet ingesteld, of lukt het versturen niet,
// dan blijft de melding gewoon in deze browser staan en kan hij later alsnog weg.
//
// Opslag is localStorage, net als de voortgang; meldingen gaan niet mee in de synchronisatie,
// want ze gaan over de inhoud van de site en niet over wat jij geleerd hebt.
import { MELD_ENDPOINT } from "../core/config.js";

const SLEUTEL = "leeromgeving:meldingen";
const MELDER = "leeromgeving:melder";
const MAX = 200;              // meer dan dit is geen lijst meer maar een berg
const MAX_TEKST = 4000;

const lees = () => {
  try {
    const v = JSON.parse(localStorage.getItem(SLEUTEL) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};
const schrijf = lijst => {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(lijst.slice(0, MAX))); return true; }
  catch { return false; }
};

// Een willekeurig kenmerk per browser, zodat in de sheet te zien is of tien meldingen van één
// iemand komen of van tien mensen. Het zegt niets over wie je bent en staat nergens anders.
function melderId() {
  try {
    let id = localStorage.getItem(MELDER);
    if (!id) { id = `b${Math.random().toString(36).slice(2, 10)}`; localStorage.setItem(MELDER, id); }
    return id;
  } catch { return ""; }
}

/** Alle meldingen, de nieuwste eerst. */
export const meldingen = () => lees();

export const aantalMeldingen = () => lees().length;

/** De meldingen die nog niet bij het verzamelpunt zijn aangekomen. */
export const openstaand = () => lees().filter(m => !m.verstuurd);

export const verzendenMogelijk = () => Boolean(MELD_ENDPOINT);

/** Een melding opschrijven. `tekst` is wat de lezer zelf typt; de rest is context. */
export function bewaarMelding({ titel, tekst, context = "", soort = "kaart", module = "", kaart = "" }) {
  const schoon = String(tekst || "").trim();
  if (!schoon) return null;
  const melding = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tijd: new Date().toISOString(),
    soort, module, kaart,
    titel: String(titel || "Melding").slice(0, 160),
    context: String(context || "").slice(0, MAX_TEKST),
    tekst: schoon.slice(0, MAX_TEKST),
    verstuurd: false
  };
  schrijf([melding, ...lees()]);
  return melding;
}

const markeer = (id, verstuurd) =>
  schrijf(lees().map(m => (m.id === id ? { ...m, verstuurd } : m)));

/** Eén melding naar het verzamelpunt sturen. Geeft true als hij is aangekomen.
 *
 * Content-Type text/plain en niet application/json: dat scheelt een preflight-verzoek, dat een
 * Apps Script web-app niet beantwoordt. De inhoud is nog steeds JSON; het script parst hem zelf.
 */
export async function verstuur(melding, fetchFn = globalThis.fetch) {
  if (!MELD_ENDPOINT || !melding || typeof fetchFn !== "function") return false;
  const nu = { ...melding, melder: melderId(), versie: globalThis.location?.host || "" };
  try {
    const r = await fetchFn(MELD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(nu),
      redirect: "follow"
    });
    if (!r?.ok) return false;
    // Het script antwoordt met {"ok":true}. Komt er iets anders terug (een inlogpagina van
    // Google bijvoorbeeld), dan is de melding niet opgeslagen en blijft hij hier staan.
    const antwoord = await r.text();
    if (!/"ok"\s*:\s*true/.test(antwoord)) return false;
  } catch { return false; }
  markeer(melding.id, true);
  return true;
}

/** Alles wat nog openstaat alsnog versturen; geeft terug hoeveel er weg zijn en hoeveel niet. */
export async function verstuurOpenstaand(fetchFn = globalThis.fetch) {
  const wacht = openstaand();
  let gelukt = 0;
  for (const m of wacht) {
    // Eén voor één: het verzamelpunt is een scriptje, geen API die tien gelijktijdige
    // verzoeken aankan, en de volgorde in de sheet blijft zo de volgorde van melden.
    if (await verstuur(m, fetchFn)) gelukt++;
  }
  return { gelukt, mislukt: wacht.length - gelukt };
}

export const wisMelding = id => schrijf(lees().filter(m => m.id !== id));
export const wisMeldingen = () => schrijf([]);

/** Alle meldingen als één stuk Markdown, om te kopiëren of te downloaden. */
export function alsTekst(lijst = lees()) {
  if (!lijst.length) return "Geen meldingen.\n";
  return lijst.map(m => `## ${m.titel}\n\n*${new Date(m.tijd).toLocaleString("nl-NL")}*`
    + `${m.module ? ` · ${m.module}` : ""}${m.verstuurd ? " · verstuurd" : " · nog niet verstuurd"}`
    + `\n\n${m.context ? `${m.context}\n\n` : ""}`
    + `**Wat klopt er niet?**\n\n${m.tekst}\n`).join("\n---\n\n");
}
