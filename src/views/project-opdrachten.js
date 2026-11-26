// Project > Opdrachten: wat je voor dit project maakt, wat elke opdracht inhoudt en hoe je hem
// maakt (OVERHAUL.md > B3, 3.6).
//
// De inleverlinks van de cursus geven alleen een titel en soms een vorm. Dit scherm was daardoor
// een takenlijst met statusknoppen, en dat is precies wat je niet nodig hebt: je weet zelf wel
// dat een verslag af moet. Wat je niet weet, is wat er in moet en in welke volgorde je het maakt.
// Daarom staat bij elke opdracht nu de uitleg en het stappenplan van zijn soort, uit
// data/opdracht-recepten.json. De status blijft, want PPO (B4) leest daaruit welk bewijs er is.
import { esc } from "../domain/text.js";
import {
  projectenVan, kiesProject, keuzeId, opdrachtenVoor, splitsHerkansingen,
  STATUSSEN, STANDAARD_STATUS, statusGeldig, volgendeStatus, statusTelling
} from "../domain/project.js";
import { soortVan } from "../domain/opdrachtsoort.js";
import { projectKiezer, projectSub, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, laadOpdrachtRecepten, projectKeuze, zetProjectKeuze, opdrachtStatus, zetOpdrachtStatus } from "../core/store.js";
import { $, acties, say } from "../core/dom.js";
import { link } from "../core/router.js";

const stand = t => `${t.af} van de ${t.totaal} ${t.totaal === 1 ? "opdracht" : "opdrachten"} ingeleverd of beoordeeld`;

const statusKnop = (o, status) => {
  const nu = statusGeldig(status[o.id]) ? status[o.id] : STANDAARD_STATUS;
  return `<button class="btn btn-klein" data-actie="status" data-id="${esc(o.id)}" data-titel="${esc(o.titel)}"
    aria-label="Status van ${esc(o.titel)}: ${esc(nu)}. Klik voor ${esc(volgendeStatus(nu))}.">${esc(nu)}</button>`;
};

// Eén opdracht: wat het is, hoe je het maakt, en de status. Het stappenplan staat ingeklapt, want
// met tien opdrachten op één scherm is alles uitgeklapt niet meer te overzien.
function opdrachtKaart(o, status, recepten) {
  const s = soortVan(recepten, o);
  return `<section class="card">
    <div class="row tussen">
      <h3 class="m0">${esc(o.titel)}</h3>
      ${statusKnop(o, status)}
    </div>
    ${s ? `
      <p class="src">${esc(s.recept.naam)}${o.vorm ? ` · vorm volgens de cursus: ${esc(o.vorm)}` : ""}</p>
      <p class="m0">${esc(s.recept.wat)}</p>
      <details class="opdracht-stappen">
        <summary>Hoe je dit maakt (${s.recept.stappen.length} stappen)</summary>
        <ol class="feiten nummers">${s.recept.stappen.map(st => `<li>${esc(st)}</li>`).join("")}</ol>
        ${s.recept.let_op ? `<p class="src"><strong>Let op:</strong> ${esc(s.recept.let_op)}</p>` : ""}
      </details>`
      : `<p class="src">${o.vorm ? `Vorm volgens de cursus: ${esc(o.vorm)}. ` : ""}Voor dit soort opdracht
        staat hier nog geen uitleg; wat er moet gebeuren staat in de opdracht zelf in Brightspace.</p>`}
  </section>`;
}

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Opdrachten</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Projectgegevens laden…</p>`;

    let data = null, recepten = [];
    try { [data, recepten] = await Promise.all([laadVleugelData(m, "project"), laadOpdrachtRecepten()]); }
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
            <p class="src">Bij elke opdracht staat wat dat soort werkstuk inhoudt en in welke volgorde
              je het maakt. Dat is hier zelf geschreven uitleg: de eis staat in de opdracht zelf en in
              het beoordelingsformulier. De status zet je zelf en staat in deze browser; wat er in
              Brightspace is ingeleverd, blijft daar de waarheid.</p>
          </div>

          ${gewoon.map(o => opdrachtKaart(o, status, recepten)).join("")}

          ${herkansingen.length ? `<div class="card">
            <h2>Herkansingen</h2>
            <p class="m0">Deze staan apart: je komt er pas aan toe als het eerste niet gehaald is. De
              aanpak is dezelfde als bij de eerste kans — lees eerst de feedback op je eerste versie.</p>
            <ul class="kernlijst">${herkansingen.map(o => `<li><div class="row tussen">
              <span>${esc(o.titel)}</span>${statusKnop(o, status)}</div></li>`).join("")}</ul>
          </div>` : ""}`}

        <p class="src"><a href="${esc(link("project/inleveren"))}">Wat en in welke vorm je inlevert</a> ·
          <a href="${esc(link("project/rubrics"))}">Waarop het beoordeeld wordt</a></p>
        ${herkomst(data)}`;
    };

    acties(main, {
      ...keuzeActies({ modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken }),
      // Alleen deze knop en de teller bijwerken, niet opnieuw tekenen: anders verliest de knop
      // die je net indrukte zijn focus, en klappen de stappenplannen die je open had weer dicht.
      status: el => {
        const status = opdrachtStatus(m?.id);
        const id = el.dataset.id;
        const nu = statusGeldig(status[id]) ? status[id] : STANDAARD_STATUS;
        // Na het laatste niveau terug naar het begin, anders zit je vast op "beoordeeld".
        const volgende = nu === STATUSSEN.at(-1) ? STANDAARD_STATUS : volgendeStatus(nu);
        zetOpdrachtStatus(m?.id, id, volgende);

        // Uit het data-attribuut, niet uit de kop: daar kan de vorm bij staan.
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
