// Labsessies uit <module>.lab.json: de hulpjes die Voorbereiding, Protocollen en Analyse delen.
// Puur, zodat tests/lab.test.js ze zonder browser kan nalopen.
//
// De sessies zijn automatisch uit de practicumhandleidingen ontleed (zie het veld
// _betrouwbaarheid in het databestand). Twee gevolgen staan hieronder in code:
//  - een stappental is een ondergrens, en soms nul; stappen(…) geeft daarom ook hoeveel
//    experimenten niets opleverden, zodat een scherm geen totaal als waarheid kan brengen;
//  - een sessienummer is geen sleutel (week 1 heeft twee sessies met nummer 1), dus de plek
//    in de lijst is de sleutel in de URL.
import { kort } from "./text.js";

export const sessiesVan = lab => (Array.isArray(lab?.sessies) ? lab.sessies : []);

// De sessie uit de URL-parameter, teruggebracht tot een bestaande plek in de lijst.
export function kiesSessie(sessies = [], param) {
  const i = Number.parseInt(param, 10);
  return Number.isInteger(i) && i >= 0 && i < sessies.length ? i : 0;
}

// Wat in de keuzelijst staat. Titels komen soms uit de eerste regel van een Word-document en
// lezen als een zin; die worden hier afgekapt. Niet elke handleiding noemt een week.
export const weekVan = sessie => (Number.isFinite(sessie?.week) ? `week ${sessie.week}` : "");
export const sessieLabel = (sessie, i) =>
  `${i + 1}. ${weekVan(sessie) ? `${weekVan(sessie)} – ` : ""}${kort(sessie?.titel || "zonder titel", 70)}`;

export const experimentenVan = sessie => (Array.isArray(sessie?.experimenten) ? sessie.experimenten : []);

// Apparatuur van de hele sessie, zonder dubbels, in de volgorde van de handleiding.
export function apparatuurVan(sessie) {
  const uit = [];
  for (const e of experimentenVan(sessie)) for (const a of e.apparatuur || []) if (a && !uit.includes(a)) uit.push(a);
  return uit;
}

// Stappen van de sessie: het totaal, en bij hoeveel experimenten het ontleden niets vond.
export function stappen(sessie) {
  const exps = experimentenVan(sessie);
  const geteld = exps.filter(e => (e.aantal_stappen || 0) > 0);
  return {
    totaal: exps.reduce((n, e) => n + (e.aantal_stappen || 0), 0),
    geteld: geteld.length,
    zonder: exps.length - geteld.length
  };
}

export const heeftOpruimen = sessie => experimentenVan(sessie).some(e => e.heeft_opruimen);

// Sleutels voor het afvinken in Analyse. Op naam en niet op plek, zodat een afvinkje blijft staan
// als de handleidingen opnieuw ontleed worden en er een experiment bij komt.
export const sessieSleutel = sessie => String(sessie?.bron || sessie?.titel || "");
export const expSleutel = exp => String(exp?.naam || "");

// Het protocol als tekst. data/protocollen/<module>-<NN>.md hoort bij een sessie via zijn plek in
// de lijst; de index staat in het .lab.json zodat het scherm niet hoeft te gokken of er tekst is.
export const protocolVan = (lab, i) =>
  (Array.isArray(lab?.protocollen) ? lab.protocollen : []).find(p => p.sessie === i) || null;
