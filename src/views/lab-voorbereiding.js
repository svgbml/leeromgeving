// Lab > Voorbereiding: wat je vóór de labsessie weet moet hebben — wat je gaat doen, wat je
// aantrekt en welke apparatuur klaarstaat (OVERHAUL.md > B2, 2.5).
//
// Een eigen samenvatting en een labdeck (flashcards en toets op de labstof) horen hier ook, maar
// die inhoud bestaat nog niet per sessie. Dit scherm vult dat niet zelf in: het zegt wat er mist.
import { esc } from "../domain/text.js";
import { stoffenVoor, pbmVan } from "../domain/stoffen.js";
import { sessiesVan, kiesSessie, experimentenVan, apparatuurVan, stofIdsVan, stappen, heeftOpruimen } from "../domain/lab.js";
import { sessieDoel } from "../domain/doelen.js";
import { sessieKiezer, sessieSub, geenSessies, herkomst, onbekendeNoot } from "../ui/labsessie.js";
import { app, laadStoffen, laadVleugelData, laadDoelen } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `<h1>Voorbereiding</h1><p class="sub">Lab · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Labsessies laden…</p>`;

    let bibliotheek = [], lab = null, doelen = null;
    try { [bibliotheek, lab, doelen] = await Promise.all([laadStoffen(), laadVleugelData(m, "lab"), laadDoelen(m)]); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De labsessies konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const sessies = sessiesVan(lab);
    const teken = () => {
      const i = kiesSessie(sessies, params.sessie);
      const sessie = sessies[i];
      const exps = experimentenVan(sessie);
      const st = stappen(sessie);
      const stoffen = stoffenVoor(stofIdsVan(sessie), bibliotheek);
      const bekend = stoffen.filter(s => !s.onbekend);
      const pbm = pbmVan(bekend);
      const appar = apparatuurVan(sessie);
      const stoffenUrl = link("lab/stoffen", { sel: "sessie", sessie: i });
      const protocolUrl = link("lab/protocollen", { sessie: i });
      const doel = sessieDoel(doelen, i);

      main.innerHTML = `
        <h1>Voorbereiding</h1>
        <p class="sub">${sessieSub(m, sessie, i)}</p>
        ${!sessies.length ? geenSessies("per sessie wat je vooraf moet weten en meenemen") : `
          ${sessieKiezer(sessies, i)}

          <div class="card">
            <h2>Wat ga je doen</h2>
            ${exps.length ? `<ol class="feiten nummers">${exps.map(e => `<li>${esc(e.naam || "Zonder naam")}${
              e.aantal_stappen ? ` <span class="src">(minstens ${e.aantal_stappen} stappen)</span>` : ""}</li>`).join("")}</ol>`
              : `<p class="m0">Deze sessie noemt nog geen experimenten.</p>`}
            ${st.totaal ? `<p class="src">Samen minstens ${st.totaal} stappen${st.zonder
              ? `, en bij ${st.zonder} ${st.zonder === 1 ? "experiment" : "experimenten"} is het aantal onbekend` : ""}.
              ${heeftOpruimen(sessie) ? "Reken op tijd om op te ruimen." : ""}</p>` : ""}
            <p class="src"><a href="${esc(protocolUrl)}">Bekijk de opbouw per experiment</a></p>
          </div>

          <div class="grid-2">
            <div class="card"><h2>Wat trek je aan</h2>
              <p class="m0">${pbm.length ? pbm.map(esc).join(" · ")
                : `<span class="src">Nog niet af te leiden uit de stoffen van deze sessie.</span>`}</p>
              <p class="src">Afgeleid uit de stoffen van deze sessie. De SDS van de fles die je
                vastpakt blijft de bron.</p></div>
          </div>

          <div class="card">
            <h2>Stoffen en apparatuur</h2>
            <ul class="feiten">
              <li><strong>Stoffen:</strong> ${stoffen.length} in deze sessie.
                <a href="${esc(stoffenUrl)}">Open Stoffen</a></li>
              <li><strong>Apparatuur:</strong> ${appar.length ? appar.map(esc).join(" · ")
                : `<span class="src">niets genoemd in de handleiding</span>`}</li>
            </ul>
            ${onbekendeNoot(stoffen, stoffenUrl)}
          </div>

          ${doel ? `<div class="card">
            <h2>Doel en hypothese</h2>
            <h3>Doel</h3>
            <p class="m0">${esc(doel.doel)}</p>
            <h3>${doel.hypothese ? "Hypothese" : "Waaraan je je werk afmeet"}</h3>
            ${doel.hypothese ? `<p class="m0">${esc(doel.hypothese)}</p>` : ""}
            <p class="${doel.hypothese ? "src" : "m0"}">${esc(doel.onderbouwing)}</p>
            <p class="src">Een suggestie, hier zelf geschreven bij deze sessie. Kijk of het klopt met
              jouw opdracht voor je het overneemt: in de rubric is de hypothese een beoordeeld onderdeel.</p>
          </div>` : `<div class="card">
            <h2>Doel en hypothese</h2>
            <p class="m0">Voor deze sessie staat nog geen doel en hypothese in
              <code>data/doelen/</code>. Lees het doel in de handleiding${sessie?.bron
                ? ` <code>${esc(sessie.bron)}</code>` : ""}.</p>
          </div>`}

          ${herkomst(sessie)}`}`;

      acties(main, {
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); }
      }, signal);
    };

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
