// Project > Opdrachten: alles wat je voor dit project maakt, met een status per opdracht
// (OVERHAUL.md > B3, 3.6).
//
// De opdrachten komen uit de inleverlinks van de cursus. De status (te doen / bezig /
// ingeleverd / beoordeeld) zet je zelf en staat in deze browser, op opdracht-id. PPO (B4) leest
// daaruit welk bewijs er is, dus die id's zijn bewust niet de plek in de lijst: wordt de data
// opnieuw gegenereerd en komt er een opdracht bij, dan blijft je status staan.
import { esc } from "../domain/text.js";
import {
  projectenVan, kiesProject, keuzeId, opdrachtenVoor, splitsHerkansingen,
  STATUSSEN, STANDAARD_STATUS, statusGeldig, volgendeStatus, statusTelling
} from "../domain/project.js";
import { projectKiezer, projectSub, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, projectKeuze, zetProjectKeuze, opdrachtStatus, zetOpdrachtStatus } from "../core/store.js";
import { $, acties, say } from "../core/dom.js";
import { link } from "../core/router.js";

const stand = t => `${t.af} van de ${t.totaal} ${t.totaal === 1 ? "opdracht" : "opdrachten"} ingeleverd of beoordeeld`;

// Eén opdracht als regel: titel, vorm en een knop die door de statussen loopt.
const regel = (o, status) => {
  const nu = statusGeldig(status[o.id]) ? status[o.id] : STANDAARD_STATUS;
  return `<li>
    <div class="row tussen">
      <span>${esc(o.titel)}${o.vorm ? ` <span class="src">${esc(o.vorm)}</span>` : ""}</span>
      <button class="btn btn-klein" data-actie="status" data-id="${esc(o.id)}" data-titel="${esc(o.titel)}"
        aria-label="Status van ${esc(o.titel)}: ${esc(nu)}. Klik voor ${esc(volgendeStatus(nu))}.">${esc(nu)}</button>
    </div>
  </li>`;
};

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Opdrachten</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
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
      const status = opdrachtStatus(m?.id);
      const mijn = opdrachtenVoor(data, keuzeId(projecten, gekozen));
      const { gewoon, herkansingen } = splitsHerkansingen(mijn);
      const t = statusTelling(gewoon, status);

      main.innerHTML = `
        <h1>Opdrachten</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${projectKiezer(projecten, project, gekozen, { open })}

        ${!mijn.length ? `<div class="card">
          <p class="m0">De cursus heeft voor deze module geen inleverlinks in de opgehaalde data,
            dus hier staat nog geen opdracht.</p>
          ${data?._ontbreekt ? `<p class="src">${esc(data._ontbreekt)}</p>` : ""}
        </div>` : `
          <div class="card">
            <h2>Te maken</h2>
            <p class="m0" id="opdrachtstand" role="status">${stand(t)}</p>
            <ul class="kernlijst">${gewoon.map(o => regel(o, status)).join("")}</ul>
            <p class="src">De status zet je zelf en staat in deze browser. Hij zegt niets over wat er
              in Brightspace is ingeleverd; dat blijft daar de waarheid.</p>
          </div>

          ${herkansingen.length ? `<div class="card">
            <h2>Herkansingen</h2>
            <p class="m0">Deze staan apart: je komt er pas aan toe als het eerste niet gehaald is.</p>
            <ul class="kernlijst">${herkansingen.map(o => regel(o, status)).join("")}</ul>
          </div>` : ""}`}

        <p class="src"><a href="${esc(link("project/inleveren"))}">Wat en in welke vorm je inlevert</a> ·
          <a href="${esc(link("project/rubrics"))}">Waarop het beoordeeld wordt</a></p>
        ${herkomst(data)}`;
    };

    acties(main, {
      ...keuzeActies({ modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken }),
      // Alleen deze knop en de teller bijwerken, niet opnieuw tekenen: anders verliest de knop
      // die je net indrukte zijn focus en kun je er met het toetsenbord niet doorheen lopen.
      status: el => {
        const status = opdrachtStatus(m?.id);
        const id = el.dataset.id;
        const nu = statusGeldig(status[id]) ? status[id] : STANDAARD_STATUS;
        // Na het laatste niveau terug naar het begin, anders zit je vast op "beoordeeld".
        const volgende = nu === STATUSSEN.at(-1) ? STANDAARD_STATUS : volgendeStatus(nu);
        zetOpdrachtStatus(m?.id, id, volgende);

        // Uit het data-attribuut, niet uit de span: daar staat de vorm bij ("Rapportage verslag").
        const titel = el.dataset.titel || "Opdracht";
        el.textContent = volgende;
        el.setAttribute("aria-label",
          `Status van ${titel}: ${volgende}. Klik voor ${volgende === STATUSSEN.at(-1) ? STANDAARD_STATUS : volgendeStatus(volgende)}.`);
        // De keuze hier opnieuw ophalen: deze handler staat buiten teken() en heeft dus geen
        // gekozen in scope, en hij mag ook niet op een oude waarde leunen.
        const { gewoon } = splitsHerkansingen(opdrachtenVoor(data, keuzeId(projecten, projectKeuze(m?.id))));
        const regelEl = $("#opdrachtstand", main);
        if (regelEl) regelEl.textContent = stand(statusTelling(gewoon, opdrachtStatus(m?.id)));
        say(`${titel}: ${volgende}`);
      }
    }, signal);

    teken();
  }
};
