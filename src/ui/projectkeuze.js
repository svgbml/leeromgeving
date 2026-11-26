// Gedeelde stukjes van de zeven projectschermen: de projectkeuze, de lege toestand en de
// voetnoot over de herkomst.
//
// De keuze wordt één keer gemaakt en daarna onthouden (store.js > zetProjectKeuze). Daarom is
// dit geen keuzelijst die bovenaan elk scherm om aandacht vraagt, maar een regel die zegt wélk
// project je doet, met één knop om te wisselen. Pas als er nog geen keuze is, staat de lijst
// uitgeklapt: dan is er iets te kiezen.
import { esc } from "../domain/text.js";
import { keuzeGeldig } from "../domain/project.js";

// De regel onder de kop: vleugel, module en het gekozen project. Zolang je nog niet gekozen hebt
// noemt hij géén project: kiesProject valt dan terug op het eerste, en dat als "jouw project"
// aankondigen terwijl de vraag nog openstaat leest als een keuze die je niet hebt gemaakt.
export const projectSub = (mod, project, projecten = [], gekozen = null) => {
  const eigen = !projecten.length || keuzeGeldig(projecten, gekozen) || projecten.length === 1;
  return `Project · ${esc(mod?.titel || "")}${project && eigen ? ` · ${esc(project.naam)}` : ""}`;
};

// Het blok waarmee je kiest of wisselt. `gekozen` is het bewaarde id (niet het teruggevallen
// project), zodat dit het verschil kan tonen tussen een eigen keuze en een terugval.
export function projectKiezer(projecten, project, gekozen, { open = false } = {}) {
  if (!projecten.length) return "";
  const eigenKeuze = keuzeGeldig(projecten, gekozen);
  if (projecten.length === 1) {
    return `<p class="src">Deze module heeft één project: ${esc(projecten[0].naam)}.</p>`;
  }
  if (eigenKeuze && !open) {
    return `<div class="row tussen">
      <p class="m0">Je doet <strong>${esc(project.naam)}</strong>.</p>
      <button class="btn btn-klein" data-actie="anderProject">Ander project</button>
    </div>`;
  }
  return `<div class="card">
    <h2>${eigenKeuze ? "Ander project kiezen" : "Welk project doe je?"}</h2>
    ${!eigenKeuze && gekozen ? `<p class="src" role="status">Je eerdere keuze
      (<code>${esc(gekozen)}</code>) bestaat niet meer in de data; hieronder staat wat er nu is.</p>` : ""}
    <p class="src">Je kiest dit één keer. Daarna onthoudt de app het per module en vraagt het
      niet opnieuw; met <em>Ander project</em> wissel je altijd nog.</p>
    <div class="row">${projecten.map(p => `
      <button class="btn" data-actie="kiesProject" data-id="${esc(p.id)}"
        aria-pressed="${p.id === project?.id}">${esc(p.naam)}</button>`).join("")}</div>
  </div>`;
}

// Deze module heeft geen projectkeuzes in de data. Twee oorzaken, met een ander antwoord: de
// module staat niet in de opgehaalde bron, of hij staat er wel maar zonder projectmappen.
// Daarom niet blind _ontbreekt eronder plakken: die notitie gaat over inleverdata.
export const geenProjecten = (wat, data) => `<div class="card">
  <p class="m0">${data?._bron_leeg
    ? `Van deze module is nog geen projectinhoud opgehaald, dus ${esc(wat)} is hier leeg.`
    : `Deze module verdeelt zijn project niet in keuzes — de cursus heeft geen mappen die
       <em>Project &lt;naam&gt;</em> heten — dus ${esc(wat)} is hier leeg.`}</p>
  ${data?._bron_leeg && data?._ontbreekt ? `<p class="src">${esc(data._ontbreekt)}</p>` : ""}</div>`;

// Waar de projectgegevens vandaan komen, en wat de bron niet weet.
export const herkomst = data => `<p class="src">Afgeleid uit de cursusmappen in Brightspace
  (<code>tools/project.py</code>). De projecten volgen uit mappen die <em>Project &lt;naam&gt;</em>
  heten; staat een project daar niet in, dan staat het hier niet.${data?._ontbreekt
    ? ` ${esc(data._ontbreekt)}` : ""}</p>`;

// Alinea's van een projectpagina als leesbare tekst. De eerste alinea is in deze bron vaak de
// titel nog een keer (de pagina begint met zijn eigen kop); die laten we weg, want hij staat al
// als h2 of h3 boven de tekst. Alleen bij een exacte match, zodat er geen inhoud sneuvelt.
export const alineas = pagina => {
  const lijst = (pagina?.alineas || []).slice();
  const titel = (pagina?.titel || "").trim().toLowerCase();
  if (lijst.length > 1 && lijst[0].trim().toLowerCase() === titel) lijst.shift();
  return lijst.map(a => `<p>${esc(a)}</p>`).join("") || `<p class="src">Deze pagina heeft geen tekst.</p>`;
};

// De twee acties van het keuzeblok, als map voor acties() uit core/dom.js. Alle zeven schermen
// hangen dit in hun eigen acties-map, zodat de keuze zich overal gelijk gedraagt.
export const keuzeActies = ({ modId, zetKeuze, zetOpen, hertekenen }) => ({
  kiesProject: el => { zetKeuze(modId, el.dataset.id); zetOpen(false); hertekenen(); },
  anderProject: () => { zetOpen(true); hertekenen(); }
});
