// Project > Protocollen (OVERHAUL.md > B3, 3.3).
//
// Stap 3.3 zegt: hergebruik wat B2 al heeft. Dat gebeurt hier letterlijk — de protocollen van een
// module staan in <module>.lab.json en worden niet gekopieerd naar de projectdata. Een project
// gebruikt dezelfde practicumhandleidingen als het lab; een eigen lijst zou een tweede waarheid
// zijn die kan gaan afwijken.
//
// Wat dit scherm toevoegt boven Lab > Protocollen: het staat in de projectvleugel, naast je
// projectkeuze, en het wijst per sessie naar het labscherm dat de opbouw al toont.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, protocollenVan, labsVoorProject } from "../domain/project.js";
import { sessiesVan, sessieLabel, stappen, stofIdsVan } from "../domain/lab.js";
import { projectKiezer, projectSub, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, projectKeuze, zetProjectKeuze } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { link } from "../core/router.js";

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Protocollen</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Protocollen laden…</p>`;

    let data = null, lab = null;
    try { [data, lab] = await Promise.all([laadVleugelData(m, "project"), laadVleugelData(m, "lab")]); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De protocollen konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const projecten = projectenVan(data);
    const sessies = sessiesVan(lab);
    let open = false;

    const teken = () => {
      const gekozen = projectKeuze(m?.id);
      const project = kiesProject(projecten, gekozen);
      const eigen = labsVoorProject(project, sessies);
      const protocollen = protocollenVan(project);

      main.innerHTML = `
        <h1>Protocollen</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${projectKiezer(projecten, project, gekozen, { open })}

        ${!sessies.length ? `<div class="card">
          <p class="m0">Van deze module zijn nog geen practicumhandleidingen omgezet, dus er staat hier
            geen protocol.</p>
          <p class="src">De protocollen komen uit <code>.lab.json</code>, hetzelfde bestand dat de
            labvleugel gebruikt.</p>
        </div>` : `
          <div class="card">
            <h2>Protocollen van deze module</h2>
            <p class="m0">Een project gebruikt dezelfde practicumhandleidingen als het lab. Ze staan
              daarom op één plek; dit is geen aparte projectlijst die kan gaan afwijken.</p>
            <ul class="kernlijst">${sessies.map((s, i) => {
              const st = stappen(s);
              return `<li><div class="row tussen">
                <span><a href="${esc(link("lab/protocollen", { sessie: i }))}">${esc(sessieLabel(s, i))}</a></span>
                <span class="src">${st.totaal ? `minstens ${st.totaal} stappen` : "stappen onbekend"}${
                  stofIdsVan(s).length ? ` · ${stofIdsVan(s).length} stoffen` : ""}</span>
              </div></li>`;
            }).join("")}</ul>
          </div>

          ${eigen.length ? `<div class="card">
            <h2>Wat ${esc(project.naam)} gebruikt</h2>
            <p class="m0">Dit project noemt zelf deze protocollen; hieronder staat bij welke labsessie
              ze horen.</p>
            <ul class="kernlijst">${eigen.map(l => `<li>
              <p class="m0">${l.sessie
                ? `<a href="${esc(link("lab/protocollen", { sessie: l.plek }))}">${esc(l.sessie.titel)}</a>`
                : `<span>Lab ${l.nr}</span> <span class="src">staat niet in de labdata</span>`}</p>
              <p class="src m0">${esc(l.waarom || "")}</p>
            </li>`).join("")}</ul>
            ${protocollen.length ? `<h3>Zoals het project ze noemt</h3>
              <ul class="feiten">${protocollen.map(p => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
            <p class="src">De koppeling protocol → labsessie is afgeleid uit de namen, niet door de
              opleiding gelegd. De projecthandleiding blijft leidend.</p>
          </div>` : `<div class="card">
            <h2>Welk protocol hoort bij jouw project?</h2>
            <p class="m0">Dat zegt de opgehaalde data voor deze module niet: de cursus koppelt de
              handleidingen hier niet aan een projectkeuze. Hierboven staan ze daarom allemaal, en de
              projecthandleiding zegt welke je nodig hebt.</p>
          </div>`}`}

        <p class="src"><a href="${esc(link("lab/stoffen"))}">Stoffen en gevaren</a> ·
          <a href="${esc(link("project/doel"))}">Doel &amp; hypothese</a></p>
        ${herkomst(data)}`;
    };

    acties(main, keuzeActies({
      modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken
    }), signal);
    teken();
  }
};
