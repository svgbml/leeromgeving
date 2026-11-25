// Lab > Protocollen: de structuur van een labsessie — welke experimenten, welke apparatuur,
// hoeveel stappen, of er opgeruimd moet worden en welke stoffen erbij horen (OVERHAUL.md > B2, 2.4).
//
// De protocoltekst zelf staat bewust niet in de repo: dat is lesmateriaal van de opleiding en
// BIJDRAGEN.md sluit het uit. Dit scherm verwijst daarom naar het bronbestand van de handleiding.
import { esc } from "../domain/text.js";
import { stoffenVoor } from "../domain/stoffen.js";
import { sessiesVan, kiesSessie, experimentenVan, apparatuurVan, stofIdsVan, stappen } from "../domain/lab.js";
import { sessieKiezer, sessieSub, geenSessies, herkomst, stoffenRegel, onbekendeNoot } from "../ui/labsessie.js";
import { app, laadStoffen, laadVleugelData } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

// Eén experiment: alles wat de handleiding erover prijsgeeft, zonder de stappen zelf.
function experiment(exp, bibliotheek) {
  const n = exp.aantal_stappen || 0;
  const stoffen = stoffenVoor(exp.stoffen || [], bibliotheek);
  const appar = exp.apparatuur || [];
  return `<section class="card">
    <h2>${esc(exp.naam || "Zonder naam")}</h2>
    <ul class="feiten">
      <li>${n
        ? `Minstens <strong>${n} ${n === 1 ? "stap" : "stappen"}</strong> in de handleiding.`
        : `<span class="src">Het aantal stappen is hier niet uit de handleiding te halen.</span>`}
        ${exp.heeft_opruimen ? `Met een <strong>opruimstap</strong>.` : ""}</li>
      <li><strong>Apparatuur:</strong> ${appar.length ? appar.map(esc).join(" · ") : `<span class="src">niets genoemd</span>`}</li>
      <li><strong>Stoffen:</strong> ${stoffenRegel(stoffen)}</li>
    </ul>
  </section>`;
}

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `<h1>Protocollen</h1><p class="sub">Lab · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Labsessies laden…</p>`;

    let bibliotheek = [], lab = null;
    try { [bibliotheek, lab] = await Promise.all([laadStoffen(), laadVleugelData(m, "lab")]); }
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
      const stoffenUrl = link("lab/stoffen", { sel: "sessie", sessie: i });
      const alle = stoffenVoor(stofIdsVan(sessie), bibliotheek);

      main.innerHTML = `
        <h1>Protocollen</h1>
        <p class="sub">${sessieSub(m, sessie, i)}</p>
        ${!sessies.length ? geenSessies("per sessie welke experimenten je doet en wat je ervoor nodig hebt") : `
          ${sessieKiezer(sessies, i)}
          <div class="card">
            <p class="m0">De protocoltekst staat niet in deze leeromgeving: de handleidingen zijn
            lesmateriaal van de opleiding. Hier staat waar de sessie uit bestaat, zodat je kunt zien
            wat je nodig hebt en hoe lang het ongeveer is. De stappen lees je in de handleiding
            ${sessie?.bron ? `<code>${esc(sessie.bron)}</code>` : ""} op SharePoint.</p>
          </div>
          <div class="grid-2">
            <div class="card"><h2>Deze sessie</h2>
              <p class="m0">${exps.length} ${exps.length === 1 ? "experiment" : "experimenten"}${st.totaal
                ? `, minstens ${st.totaal} stappen samen` : ""}.</p>
              ${st.zonder ? `<p class="src">Bij ${st.zonder} van de ${exps.length} experimenten vond het
                ontleden geen stappen; die tellen niet mee in dat aantal.</p>` : ""}</div>
            <div class="card"><h2>Apparatuur</h2>
              <p class="m0">${apparatuurVan(sessie).map(esc).join(" · ") || `<span class="src">niets genoemd</span>`}</p></div>
          </div>
          ${exps.length
            ? exps.map(e => experiment(e, bibliotheek)).join("")
            : `<div class="card"><p class="m0">Deze sessie noemt nog geen experimenten.</p></div>`}
          ${onbekendeNoot(alle, stoffenUrl)}
          <p class="src"><a href="${esc(stoffenUrl)}">Stoffen van deze sessie</a> ·
            ${alle.length} ${alle.length === 1 ? "stof" : "stoffen"} in totaal.</p>
          ${herkomst(sessie)}`}`;

      acties(main, {
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); }
      }, signal);
    };

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
