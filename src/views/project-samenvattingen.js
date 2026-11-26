// Project > Samenvattingen (OVERHAUL.md > B3, 3.7).
//
// Stap 3.7 vraagt samenvattingen van de projectcolleges. Die bestaan nog niet: de PowerPoints van
// het project zijn niet gedownload (zie het overzicht in tools/slide-overzicht.py), dus er is
// geen slidetekst om samen te vatten. Dit scherm doet daarom twee dingen en niet meer:
//   - het laat de tekstpagina's van de cursus zien die er wél zijn, met de map waar ze stonden;
//   - het zegt precies wat ontbreekt en waarom, zodat niemand denkt dat dit alles is.
// Een samenvatting verzinnen uit een titel zou erger zijn dan een leeg scherm: je zou erop leren.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, paginasVan, algemeenVan } from "../domain/project.js";
import { projectKiezer, projectSub, herkomst, alineas, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, projectKeuze, zetProjectKeuze } from "../core/store.js";
import { $, acties } from "../core/dom.js";

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Samenvattingen</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Projectgegevens laden…</p>`;

    let data = null;
    try { data = await laadVleugelData(m, "project"); }
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
      const eigen = paginasVan(project);
      const algemeen = algemeenVan(data);

      main.innerHTML = `
        <h1>Samenvattingen</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${projectKiezer(projecten, project, gekozen, { open })}

        ${eigen.length ? `<div class="card">
          <h2>Bij ${esc(project.naam)}</h2>
          ${eigen.map(p => `<h3>${esc(p.titel)}</h3>${alineas(p)}${p.map
            ? `<p class="src">Uit <code>${esc(p.map)}</code>.</p>` : ""}`).join("")}
        </div>` : ""}

        ${algemeen.length ? `<div class="card">
          <h2>Voor het hele project</h2>
          <p class="m0">Deze pagina's horen niet bij één keuze maar bij de hele leeruitkomst.</p>
          ${algemeen.map(p => `<h3>${esc(p.titel)}</h3>${alineas(p)}${p.map
            ? `<p class="src">Uit <code>${esc(p.map)}</code>.</p>` : ""}`).join("")}
        </div>` : ""}

        <div class="card">
          <h2>De colleges zelf staan hier nog niet</h2>
          <p class="m0">Wat je hierboven ziet zijn de tekstpagina's uit de cursus, niet de
            projectcolleges. De PowerPoints van het project zijn niet opgehaald, dus er is geen
            slidetekst om samen te vatten. Een samenvatting uit alleen een bestandsnaam maken zou
            hier niet staan: daar zou je op leren.</p>
          ${!eigen.length && !algemeen.length
            ? `<p class="m0">Voor deze module staat er nog geen enkele projecttekst in de data.</p>` : ""}
          <p class="src">Zie OVERHAUL.md, stap 3.7.</p>
        </div>

        ${herkomst(data)}`;
    };

    acties(main, keuzeActies({
      modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken
    }), signal);
    teken();
  }
};
