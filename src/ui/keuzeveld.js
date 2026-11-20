// Meerkeuzefilter: een uitklapmenu met checkboxes, voor lijsten als lessen en onderwerpen.
// Leeg = alles. In links worden de keuzes gescheiden door ~ (komt niet voor in les- of
// onderwerpnamen), zodat een oude link met één les of onderwerp blijft werken.
// Gebruikt door de oefentoets en de flashcards.
import { esc, kort } from "../domain/text.js";
import { $, $$ } from "../core/dom.js";

export const SEP = "~";

// Een string uit de URL, een array uit de app of niets → altijd een array.
export const lijst = v => Array.isArray(v) ? v.filter(Boolean) : String(v || "").split(SEP).map(x => x.trim()).filter(Boolean);

// Tekst op de knop: "Alle lessen" → de naam bij één keuze → "3 lessen".
export const keuzeLabel = (gekozen, alles, meer) => !gekozen.length ? alles : gekozen.length === 1 ? kort(gekozen[0], 34) : `${gekozen.length} ${meer}`;

// Hetzelfde, maar voor in een zin: "Les 1 – Labveiligheid" of "3 lessen".
export const keuzeZin = (gekozen, meer) => keuzeLabel(lijst(gekozen), `alle ${meer}`, meer);

/**
 * Rendert één filterveld. `id` is ook het prefix van de element-id's, `alles` de tekst
 * wanneer er niets is aangevinkt en `meer` het meervoud ("lessen", "onderwerpen").
 */
export function keuzeVeld(id, label, opties, gekozen, alles, meer) {
  const aan = lijst(gekozen);
  return `<div class="field keuzeveld">
        <span id="${id}-lab">${esc(label)}</span>
        <details class="menu keuzemenu" data-veld="${id}" data-alles="${esc(alles)}" data-meer="${esc(meer)}">
          <summary class="btn keuzeknop" aria-describedby="${id}-lab"><span class="keuzetekst" id="${id}-uit">${esc(keuzeLabel(aan, alles, meer))}</span></summary>
          <div class="menu-lijst keuzelijst">
            <div class="keuzekop">
              <button type="button" class="btn btn-klein" data-actie="keuzeAlles" data-veld="${id}">Alles</button>
              <span class="src" data-telling="${id}">${aan.length ? `${aan.length} van ${opties.length}` : `alle ${opties.length}`}</span>
            </div>
            ${opties.map(o => `<label class="check"><input type="checkbox" data-keuze="${id}" value="${esc(o)}" ${aan.includes(o) ? "checked" : ""}> <span>${esc(o)}</span></label>`).join("")}
          </div>
        </details>
      </div>`;
}

// De aangevinkte waarden van één veld.
export const leesKeuze = (veld, root) => $$(`input[data-keuze="${veld}"]`, root).filter(i => i.checked).map(i => i.value);

// Knoptekst en teller bijwerken; geeft de aangevinkte waarden terug.
export function toonKeuze(veld, root) {
  const vakjes = $$(`input[data-keuze="${veld}"]`, root);
  if (!vakjes.length) return [];
  const aan = vakjes.filter(i => i.checked).map(i => i.value), menu = $(`.keuzemenu[data-veld="${veld}"]`, root);
  $(`#${veld}-uit`, root).textContent = keuzeLabel(aan, menu?.dataset.alles || "Alles", menu?.dataset.meer || "gekozen");
  $(`[data-telling="${veld}"]`, root).textContent = aan.length ? `${aan.length} van ${vakjes.length}` : `alle ${vakjes.length}`;
  return aan;
}

// Alle vinkjes van één veld uit ("Alles"); geeft de tekst voor een schermlezersmelding terug.
export function wisKeuze(veld, root) {
  for (const i of $$(`input[data-keuze="${veld}"]`, root)) i.checked = false;
  const menu = $(`.keuzemenu[data-veld="${veld}"]`, root);
  toonKeuze(veld, root);
  return `${menu?.dataset.alles || "Alles"} geselecteerd`;
}
