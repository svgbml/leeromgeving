// Project > Verhaal: waar het project over gaat en waarom (OVERHAUL.md > B3, 3.2).
//
// Dit is ook het scherm waar je je project kiest: het is de eerste tab van de vleugel, dus hier
// hoort die keuze. De andere zes schermen tonen alleen welk project het is, met een knop om te
// wisselen. De tekst komt uit de projectpagina's van de cursus; heeft een project die niet,
// dan zegt dit scherm dat in plaats van een inleiding te verzinnen.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, keuzeGeldig, paginasVan, algemeenVan } from "../domain/project.js";
import { projectKiezer, projectSub, geenProjecten, herkomst, alineas, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, projectKeuze, zetProjectKeuze } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { link } from "../core/router.js";

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Verhaal</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
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
    // Nog geen keuze gemaakt? Dan staat de lijst open; na het kiezen klapt hij dicht.
    let open = !keuzeGeldig(projecten, projectKeuze(m?.id));

    const teken = () => {
      const gekozen = projectKeuze(m?.id);
      const project = kiesProject(projecten, gekozen);
      const paginas = paginasVan(project);
      const algemeen = algemeenVan(data);

      main.innerHTML = `
        <h1>Verhaal</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${!projecten.length ? geenProjecten("het verhaal achter het project", data) : `
          ${projectKiezer(projecten, project, gekozen, { open })}

          ${paginas.length ? paginas.map(p => `<div class="card">
            <h2>${esc(p.titel)}</h2>
            ${alineas(p)}
            ${p.map ? `<p class="src">Uit de cursusmap <code>${esc(p.map)}</code>.</p>` : ""}
          </div>`).join("") : `<div class="card">
            <h2>Nog geen tekst</h2>
            <p class="m0">De cursus heeft voor ${esc(project?.naam || "dit project")} geen pagina met
              tekst${project?.aantal_bronnen ? ` (wel ${project.aantal_bronnen}
              ${project.aantal_bronnen === 1 ? "bron" : "bronnen"} zonder leestekst, zoals links en
              bestanden)` : ""}. Hier komt de achtergrond zodra die in de data staat; de
              projecthandleiding is tot dan de bron.</p>
          </div>`}

          ${algemeen.length ? `<div class="card">
            <h2>Voor het hele project</h2>
            <p class="m0">Deze pagina's horen niet bij één keuze maar bij de hele leeruitkomst.</p>
            ${algemeen.map(p => `<h3>${esc(p.titel)}</h3>${alineas(p)}${p.map
              ? `<p class="src">Uit de cursusmap <code>${esc(p.map)}</code>.</p>` : ""}`).join("")}
          </div>` : ""}

          <div class="card">
            <h2>Doel en hypothese</h2>
            <p class="m0">Er staat een suggestie klaar voor het doel en de hypothese bij deze casus,
              die je naar je eigen onderzoeksvraag toe schrijft.
              <a href="${esc(link("project/doel"))}">Open Doel &amp; hypothese</a>.</p>
          </div>

          ${herkomst(data)}`}`;
    };

    // Eén keer registreren, niet in teken(): main zelf wordt niet vervangen, dus listeners
    // zouden zich bij elke hertekening opstapelen en de actie dubbel afvuren.
    acties(main, keuzeActies({
      modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken
    }), signal);
    teken();
  }
};
