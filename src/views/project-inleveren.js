// Project > Inleveren: wat je inlevert en in welke vorm (OVERHAUL.md > B3, 3.4).
//
// Stap 3.4 vraagt om een aftelling naar de deadline. Die is er niet: geen enkel item in de
// opgehaalde Brightspace-data heeft een datum (zie _ontbreekt in het databestand), want de
// inleverdata staan in de opdrachteigenschappen en die zijn niet meegekomen. Dit scherm verzint
// er dus geen, en zegt waar de datums wél staan. Wat het wel kan: wat je inlevert, in welke
// vorm, wat nog open staat en welke herkansing ernaast hoort.
import { esc } from "../domain/text.js";
import {
  projectenVan, kiesProject, keuzeId, opdrachtenVoor, splitsHerkansingen,
  STANDAARD_STATUS, statusGeldig, statusTelling
} from "../domain/project.js";
import { perLeeruitkomst, termijnTekst, tweedeKans, regelsVan, verplichtVan } from "../domain/deadlines.js";
import { projectKiezer, projectSub, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, laadDeadlines, projectKeuze, zetProjectKeuze, opdrachtStatus } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { link } from "../core/router.js";

// Per vorm één regel uitleg, zodat "plan" of "labjournaal" niet alleen een label is.
const VORM_UITLEG = {
  verslag: "een verslag of rapportage volgens de rubric",
  presentatie: "een presentatie, meestal in de les",
  labjournaal: "je labjournaal als pdf",
  plan: "een onderzoeksplan, vaak formatief beoordeeld",
  certificaat: "een certificaat dat je elders haalt",
  opdracht: "een opdracht of set vragen"
};

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Inleveren</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Projectgegevens laden…</p>`;

    let data = null, ddata = null;
    try { [data, ddata] = await Promise.all([laadVleugelData(m, "project"), laadDeadlines(m)]); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De projectgegevens konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const projecten = projectenVan(data);
    let open = false;

    const teken = () => {
      const gekozen = projectKeuze(m?.id);
      const project = kiesProject(projecten, gekozen);
      const status = opdrachtStatus(m?.id);
      const { gewoon, herkansingen } = splitsHerkansingen(opdrachtenVoor(data, keuzeId(projecten, gekozen)));
      const t = statusTelling(gewoon, status);
      const vormen = [...new Set(gewoon.map(o => o.vorm).filter(Boolean))];
      const deadlines = perLeeruitkomst(ddata);

      main.innerHTML = `
        <h1>Inleveren</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${projectKiezer(projecten, project, gekozen, { open })}

        ${!gewoon.length ? `<div class="card">
          <p class="m0">Er staan voor deze module geen inleverlinks in de opgehaalde data.</p>
          ${data?._ontbreekt ? `<p class="src">${esc(data._ontbreekt)}</p>` : ""}
        </div>` : `
          <div class="card">
            <h2>Wat je inlevert</h2>
            <p class="m0" role="status">${t.af} van de ${t.totaal} staat bij jou op ingeleverd of beoordeeld.</p>
            <ul class="kernlijst">${gewoon.map(o => {
              const nu = statusGeldig(status[o.id]) ? status[o.id] : STANDAARD_STATUS;
              return `<li><div class="row tussen">
                <span>${esc(o.titel)}${o.vorm ? ` <span class="src">${esc(o.vorm)}</span>` : ""}</span>
                <span class="src">${esc(nu)}</span>
              </div></li>`;
            }).join("")}</ul>
            <p class="src">De status verander je op <a href="${esc(link("project/opdrachten"))}">Opdrachten</a>.</p>
          </div>

          ${vormen.length ? `<div class="card">
            <h2>In welke vorm</h2>
            <ul class="feiten">${vormen.map(v => `<li><strong>${esc(v)}</strong>${VORM_UITLEG[v]
              ? ` — ${esc(VORM_UITLEG[v])}` : ""}</li>`).join("")}</ul>
            <p class="src">De vorm is uit de titel van de inleverlink afgeleid; de opdracht zelf is de eis.</p>
          </div>` : ""}

          ${herkansingen.length ? `<div class="card">
            <h2>Herkansingen</h2>
            <ul class="feiten">${herkansingen.map(o => `<li>${esc(o.titel)}</li>`).join("")}</ul>
          </div>` : ""}`}

        ${!deadlines.length ? `<div class="card">
          <h2>Wanneer — dat weet deze app niet</h2>
          <p class="m0">Voor deze module zijn de inlever- en toetsmomenten nog niet overgenomen, en ze
            worden niet geraden. De opleiding zet ze per module op de pagina <em>Activiteiten
            deadlines</em> in Brightspace; zolang die hier niet staat, is Brightspace de enige plek
            waar de deadline klopt.</p>
        </div>` : `<div class="card">
          <h2>Wanneer</h2>
          ${deadlines.map(g => `<h3>${esc(g.lu)}${g.onderdeel ? ` — ${esc(g.onderdeel)}` : ""}${
            g.ec ? ` <span class="src">${g.ec} EC</span>` : ""}</h3>
            <ul class="kernlijst">${g.rijen.map(a => `<li>
              <div class="row tussen">
                <span>${esc(a.toets)}${a.herkansing ? ` <span class="src">herkansing</span>` : ""}</span>
                <span class="src">${esc(a.beoordeling)}</span>
              </div>
              <p class="src m0">${esc(termijnTekst(a))}${tweedeKans(a)
                ? ` · tweede kans: ${esc(tweedeKans(a))}` : ""}</p>
              ${a._onzeker ? `<p class="src m0"><em>${esc(a._onzeker)}</em></p>` : ""}
            </li>`).join("")}</ul>`).join("")}
          ${verplichtVan(ddata).length ? `<h3>Opdrachten die voldaan moeten zijn</h3>
            <p class="m0">Deze horen niet bij een cijfer maar moeten wél af: zonder deze opdrachten
              krijg je de studiepunten van die leeruitkomst niet.</p>
            <ul class="kernlijst">${verplichtVan(ddata).map(v => `<li>
              <p class="m0"><strong>${esc(v.lu)}</strong>${v.onderdeel ? ` — ${esc(v.onderdeel)}` : ""}</p>
              <ul class="feiten">${(v.opdrachten || []).map(o => `<li>${esc(o)}</li>`).join("")}</ul>
            </li>`).join("")}</ul>` : ""}
          ${regelsVan(ddata).length ? `<h3>Wanneer is een leeruitkomst behaald?</h3>
            <ul class="feiten">${regelsVan(ddata).map(r => `<li>${esc(r)}</li>`).join("")}</ul>` : ""}
          <p class="src">Overgenomen van de pagina <em>Activiteiten deadlines</em> van deze module.
            Waar de opleiding een week of een les noemt staat dat hier ook zo: daar wordt geen datum
            van gemaakt. Er wordt alleen afgeteld bij een echte datum.${ddata?._bron ? ` ${esc(ddata._bron)}` : ""}</p>
        </div>`}

        ${herkomst(data)}`;
    };

    acties(main, keuzeActies({
      modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken
    }), signal);
    teken();
  }
};
