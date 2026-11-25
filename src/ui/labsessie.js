// Gedeelde stukjes van de drie labschermen (Voorbereiding, Protocollen, Analyse): de keuzelijst
// met sessies, de lege toestand en de voetnoot over hoe de data tot stand komt.
import { esc } from "../domain/text.js";
import { sessieLabel, weekVan } from "../domain/lab.js";

// Keuzelijst met de sessies. Eén sessie: dan geen lijst, de sub-regel zegt al welke het is.
export function sessieKiezer(sessies, i) {
  if (sessies.length < 2) return "";
  return `<div class="row"><label class="field grow">Labsessie
    <select data-invoer="sessie" aria-label="Labsessie kiezen">${sessies.map((s, n) =>
      `<option value="${n}"${n === i ? " selected" : ""}>${esc(sessieLabel(s, n))}</option>`).join("")}</select></label></div>`;
}

// Sub-regel onder de kop: vleugel, module en welke sessie je bekijkt.
export const sessieSub = (mod, sessie, i) =>
  `Lab · ${esc(mod?.titel || "")}${sessie
    ? ` · ${weekVan(sessie) ? `${esc(weekVan(sessie))}: ` : `sessie ${i + 1}: `}${esc(sessie.titel || "")}`
    : ""}`;

// Geen labsessies in het databestand van deze module.
export const geenSessies = wat => `<div class="card"><p class="m0">Deze module heeft nog geen labsessies.
  Zodra ze in het <code>.lab.json</code>-bestand staan, staat hier ${esc(wat)}.</p>
  <p class="src">De sessies van Biomoleculen en labveiligheid komen uit de practicumhandleidingen
  van de opleiding; de andere modules zijn nog niet omgezet.</p></div>`;

// Waar de gegevens vandaan komen en waarom een aantal geen harde waarheid is.
export const herkomst = sessie => `<p class="src">Uit de practicumhandleiding${sessie?.bron
  ? ` <code>${esc(sessie.bron)}</code>` : ""}, automatisch ontleed. Aantallen zijn een ondergrens:
  waar een handleiding geen kopje Uitvoering gebruikt, zijn stappen gemist. De handleiding zelf is de
  bron in het lab.</p>`;

// Stoffen als leesbare regel. Een id die nog niet in data/stoffen.json staat verdwijnt niet, maar
// blijft als id staan: anders mis je stil een stof waarvan je de gevaren nog niet kent.
export function stoffenRegel(stoffen) {
  if (!stoffen.length) return `<span class="src">geen stoffen genoemd</span>`;
  return stoffen.map(s => s.onbekend
    ? `<span class="src" title="Staat nog niet in data/stoffen.json">${esc(s.id)}</span>`
    : esc(s.naam)).join(" · ");
}

// Hoeveel stoffen nog geen gegevens hebben. De labschermen zeggen dat, met een verwijzing naar Stoffen.
export const onbekendeNoot = (stoffen, stoffenUrl) => {
  const n = stoffen.filter(s => s.onbekend).length;
  if (!n) return "";
  return `<p class="src">${n} van de ${stoffen.length} stoffen staat nog niet in de stoffenbibliotheek,
    dus daarvan zijn de gevaren, de PBM en het afvalvat hier nog onbekend.
    <a href="${esc(stoffenUrl)}">Open Stoffen</a> om te zien wat er wel is.</p>`;
};
