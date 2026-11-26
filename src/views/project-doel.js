// Project > Doel & hypothese (OVERHAUL.md > B3, 3.2).
//
// De cursusdata heeft geen doel en geen hypothese (zie _ontbreekt in het databestand). Daarom
// staat hier eerst een suggestie uit data/doelen/<module>.json — zelf geschreven bij de casus van
// dit project — en daaronder je eigen tekst. De suggestie is nadrukkelijk niet het antwoord: de
// hypothese is een beoordeeld onderdeel van de rubric, dus je moet hem naar je eigen
// onderzoeksvraag toe schrijven. Je eigen tekst blijft in deze browser; die gaat niet mee in de
// synchronisatie van kaarten en toetsen.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, keuzeGeldig } from "../domain/project.js";
import { projectKiezer, projectSub, geenProjecten, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { projectSuggestie } from "../domain/doelen.js";
import { app, laadVleugelData, laadDoelen, projectKeuze, zetProjectKeuze, projectDoel, zetProjectDoel } from "../core/store.js";
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

    let data = null, doelen = null;
    try { [data, doelen] = await Promise.all([laadVleugelData(m, "project"), laadDoelen(m)]); }
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
      const sug = projectSuggestie(doelen, project?.id);

      main.innerHTML = `
        <h1>Doel &amp; hypothese</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${!projecten.length ? geenProjecten("je doel en hypothese", data) : `
          ${projectKiezer(projecten, project, gekozen, { open })}

          ${sug ? `<div class="card">
            <h2>Suggestie voor dit project</h2>
            <h3>Doel</h3>
            <p class="m0">${esc(sug.doel)}</p>
            <h3>Hypothese</h3>
            <p class="m0">${esc(sug.hypothese)}</p>
            <h3>Waarom je dat verwacht</h3>
            <p class="m0">${esc(sug.onderbouwing)}</p>
            <p class="src">Hier zelf geschreven bij de casus van dit project, als startpunt. Schrijf je
              eigen doel en hypothese naar je eigen onderzoeksvraag toe: de beoordeling kijkt naar of
              je ze kunt onderbouwen, niet naar of ze mooi geformuleerd zijn.</p>
          </div>` : ""}

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
