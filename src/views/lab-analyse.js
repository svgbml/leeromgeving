// Lab > Analyse: na de sessie je resultaten uitwerken (OVERHAUL.md > B2, 2.6).
//
// De eisen per sessie en de rekenuitleg staan nog niet in de data. Wat er wél is, zijn de
// experimenten van de handleiding; die worden hier een afvinklijst, zodat je ziet wat nog open
// staat. Het afvinken staat in deze browser, niet in de voortgang van de module.
import { esc } from "../domain/text.js";
import { sessiesVan, kiesSessie, experimentenVan, stappen, sessieSleutel, expSleutel } from "../domain/lab.js";
import { sessieKiezer, sessieSub, geenSessies, herkomst } from "../ui/labsessie.js";
import { app, laadVleugelData, labVinkjes, zetLabVinkje } from "../core/store.js";
import { $, $$, acties, say } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

const stand = (gedaan, totaal) =>
  `${gedaan} van de ${totaal} ${totaal === 1 ? "uitwerking" : "uitwerkingen"} afgevinkt`;

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `<h1>Analyse</h1><p class="sub">Lab · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Labsessies laden…</p>`;

    let lab = null;
    try { lab = await laadVleugelData(m, "lab"); }
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
      const gezet = labVinkjes()[m?.id]?.[sessieSleutel(sessie)] || {};
      const gedaan = exps.filter(e => gezet[expSleutel(e)]).length;
      const st = stappen(sessie);

      main.innerHTML = `
        <h1>Analyse</h1>
        <p class="sub">${sessieSub(m, sessie, i)}</p>
        ${!sessies.length ? geenSessies("per sessie wat je uitwerkt en waar je verslag aan moet voldoen") : `
          ${sessieKiezer(sessies, i)}

          <div class="card">
            <h2>Uitwerkingen bijhouden</h2>
            ${exps.length ? `
              <p class="m0" id="labstand" role="status">${stand(gedaan, exps.length)}</p>
              <ul class="kernlijst">${exps.map((e, n) => {
                const k = expSleutel(e);
                return `<li><label><input type="checkbox" data-wijzig="vink" data-k="${esc(k)}"${gezet[k] ? " checked" : ""}>
                  <span>${esc(e.naam || `Experiment ${n + 1}`)}${e.aantal_stappen
                    ? `<span class="src"> minstens ${e.aantal_stappen} stappen</span>` : ""}</span></label></li>`;
              }).join("")}</ul>
              <p class="src">Wat je afvinkt staat in deze browser, niet in de voortgang van de module
                en niet in de synchronisatie.</p>`
              : `<p class="m0">Deze sessie noemt nog geen experimenten om uit te werken.</p>`}
          </div>

          <div class="card">
            <h2>Nog niet ingevuld</h2>
            <p class="m0">Wat je resultaten moeten bevatten — de eisen uit de handleiding en de rubric,
            en de uitleg bij de berekeningen — staat nog niet in de data. Hier komt die eisenlijst zodra
            ze er is; tot dan houdt dit scherm alleen bij welke experimenten je hebt uitgewerkt, en is
            de handleiding${sessie?.bron ? ` <code>${esc(sessie.bron)}</code>` : ""} de eis.</p>
            <p class="src">Zie OVERHAUL.md, stap 2.6.</p>
          </div>

          <p class="src"><a href="${esc(link("lab/protocollen", { sessie: i }))}">Opbouw van deze sessie</a> ·
            <a href="${esc(link("verslag"))}">Verslag van de module</a>${st.totaal
            ? ` · deze sessie heeft minstens ${st.totaal} stappen` : ""}.</p>
          ${herkomst(sessie)}`}`;

      acties(main, {
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); },
        // Alleen de teller bijwerken, niet opnieuw tekenen: anders springt de focus uit het vakje.
        vink: el => {
          zetLabVinkje(m?.id, sessieSleutel(sessies[kiesSessie(sessies, params.sessie)]), el.dataset.k, el.checked);
          const n = $$(".kernlijst input:checked", main).length, totaal = $$(".kernlijst input", main).length;
          const regel = $("#labstand", main);
          if (regel) regel.textContent = stand(n, totaal);
          say(el.checked ? "Afgevinkt" : "Vinkje weg");
        }
      }, signal);
    };

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
