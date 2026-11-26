// PPO > Deadlines (OVERHAUL.md > B4).
//
// Er zijn geen datums. Het informatiedocument van de opleiding zegt wannéér er beoordeeld wordt
// in termen van fases en periodes ("aan het eind van jaar 2", "tijdens het assessment van
// leeruitkomst 3 in periode 1.4"), maar geen enkele datum. Dit scherm geeft dus de momenten die
// de bron noemt, in de volgorde van je opleiding, en zegt waar de echte datums staan.
//
// Een datum verzinnen of afleiden uit een periodenummer zou hier het gevaarlijkst zijn van alle
// schermen: je zou een assessment mislopen. Daarom staat er niets dat op een deadline lijkt.
import { esc } from "../domain/text.js";
import { fasesVan, beoordelingVan, heeftDatums } from "../domain/ppo.js";
import { laadPPO } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { link } from "../core/router.js";

export default {
  async mount({ main, signal }) {
    main.innerHTML = `<h1>Deadlines</h1><p class="sub">PPO</p>
      <p class="loading" role="status">PPO laden…</p>`;

    let ppo = null;
    try { ppo = await laadPPO(); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De PPO-gegevens konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const fases = fasesVan(ppo).slice().sort((a, b) => a.jaar - b.jaar);

    main.innerHTML = `
      <h1>Deadlines</h1>
      <p class="sub">PPO · over alle jaren heen</p>

      <div class="card">
        <h2>Deze app weet de datums niet</h2>
        <p class="m0">Het informatiedocument van de opleiding zegt in welke fase en periode er
          beoordeeld wordt, maar noemt geen enkele datum. Die staan in Brightspace bij de opdracht
          zelf en in de cursusagenda. Hier wordt er geen datum geraden of uit een periodenummer
          afgeleid: een gemist assessment is een te hoge prijs voor een gokje.</p>
        <p class="src">Zie OVERHAUL.md, batch B4.</p>
      </div>

      ${!fases.length ? `<div class="card"><p class="m0">De PPO-data heeft nog geen fases.</p></div>` : `
        <div class="card">
          <h2>Wanneer er beoordeeld wordt</h2>
          <p class="m0">De momenten die de bron noemt, in de volgorde van je opleiding.</p>
          <ol class="feiten nummers">${fases.map(f => `<li>
            <p class="m0"><strong>Jaar ${f.jaar} — ${esc(f.titel || "")}</strong>${
              f.studiepunten === null ? "" : ` <span class="src">${f.studiepunten} studiepunten</span>`}</p>
            <p class="m0">${esc(beoordelingVan(f)) || "De bron zegt hier niets over."}</p>
            ${f._onzeker ? `<p class="waarschuwing" role="alert">${esc(f._onzeker)}</p>` : ""}
          </li>`).join("")}</ol>
        </div>`}

      ${heeftDatums(ppo) ? `<div class="card">
        <p class="m0" role="alert">De data heeft nu wél datumvelden. Dit scherm gebruikt ze nog niet;
          werk het bij zodat het met die datums kan aftellen.</p>
      </div>` : ""}

      <p class="src"><a href="${esc(link("ppo/eisen"))}">De eisen per jaar</a> ·
        <a href="${esc(link("ppo/bewijs"))}">Je bewijsstukken</a></p>`;

    acties(main, {}, signal);
  }
};
