// Project > Doel & hypothese (OVERHAUL.md > B3, 3.2).
//
// Dit is het enige projectscherm waar je zelf schrijft. De cursusdata heeft geen doel en geen
// hypothese (zie _ontbreekt in het databestand), dus die worden hier niet uit de bron gehaald
// maar door jou getypt en per module en project bewaard. Blijft in deze browser; het gaat niet
// mee in de synchronisatie van kaarten en toetsen.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, keuzeGeldig } from "../domain/project.js";
import { projectKiezer, projectSub, geenProjecten, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, projectKeuze, zetProjectKeuze, projectDoel, zetProjectDoel } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { link } from "../core/router.js";

// Een hypothese is een uitspraak die fout kan zijn; dit zijn de vragen die daarbij helpen.
const HULP = [
  "Wat onderzoek je precies, en met welke techniek?",
  "Welke uitkomst verwacht je, en waarom verwacht je die?",
  "Welke uitkomst zou je hypothese onderuit halen?"
];

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Doel &amp; hypothese</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
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
      const eigen = projectDoel(m?.id, project?.id || "");

      main.innerHTML = `
        <h1>Doel &amp; hypothese</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${!projecten.length ? geenProjecten("je doel en hypothese", data) : `
          ${projectKiezer(projecten, project, gekozen, { open })}

          <div class="card">
            <h2>Je doel</h2>
            <label class="field">Wat wil je met dit onderzoek te weten komen?
              <textarea data-invoer="doel" rows="3" placeholder="Bijvoorbeeld: bepalen of…">${esc(eigen.doel)}</textarea>
            </label>
          </div>

          <div class="card">
            <h2>Je hypothese</h2>
            <label class="field">Wat verwacht je, en waarom?
              <textarea data-invoer="hypothese" rows="4" placeholder="Ik verwacht dat… omdat…">${esc(eigen.hypothese)}</textarea>
            </label>
            <p class="src" id="doelstand" role="status">${eigen.doel.trim() || eigen.hypothese.trim()
              ? "Opgeslagen in deze browser." : "Nog niets opgeschreven."}</p>
          </div>

          <div class="card">
            <h2>Hulpvragen</h2>
            <ul class="feiten">${HULP.map(v => `<li>${esc(v)}</li>`).join("")}</ul>
            <p class="src">Deze vragen zijn algemeen. De eisen die de opleiding aan je onderzoeksplan
              stelt staan in de rubric: <a href="${esc(link("project/rubrics"))}">open Rubrics</a>.</p>
          </div>

          <p class="src">Je tekst staat in deze browser, per module en per project. Kies je een ander
            project, dan blijft dit staan en krijg je een leeg vel voor dat project.</p>
          ${herkomst(data)}`}`;
    };

    const bewaar = velden => {
      const project = kiesProject(projecten, projectKeuze(m?.id));
      zetProjectDoel(m?.id, project?.id || "", velden);
      const regel = $("#doelstand", main);
      // Geen say(): dat zou bij elke toetsaanslag door de schermlezer worden voorgelezen. De
      // statusregel heeft role="status" en meldt zichzelf rustig.
      if (regel) regel.textContent = "Opgeslagen in deze browser.";
    };

    acties(main, {
      ...keuzeActies({ modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken }),
      // Niet hertekenen tijdens het typen: dan springt de cursor uit het tekstvak.
      doel: el => bewaar({ doel: el.value }),
      hypothese: el => bewaar({ hypothese: el.value })
    }, signal);

    teken();
  }
};
