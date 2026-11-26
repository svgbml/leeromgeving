// Lab > Protocollen: het protocol van de sessie om te lezen, met daarboven wat je nodig hebt.
//
// De protocoltekst stond eerst buiten de repo, omdat het lesmateriaal van de opleiding is. Op
// verzoek staat hij er nu wél in, als Markdown in data/protocollen/, zodat je in het lab niet
// hoeft te wisselen tussen deze site en SharePoint. BIJDRAGEN.md zegt wat dat betekent voor
// verspreiding. Het is opmaak van de bron, geen herschrijving: de stappen zijn die van de
// handleiding, want een protocol dat "mooier" gemaakt is kun je niet meer op varen.
import { esc } from "../domain/text.js";
import { markdown } from "../domain/markdown.js";
import { stoffenVoor } from "../domain/stoffen.js";
import { sessiesVan, kiesSessie, experimentenVan, apparatuurVan, stofIdsVan, stappen, protocolVan } from "../domain/lab.js";
import { sessieKiezer, sessieSub, geenSessies, herkomst, stoffenRegel, onbekendeNoot } from "../ui/labsessie.js";
import { app, laadStoffen, laadVleugelData } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

// Eén niveau opschuiven: de protocoltekst heeft zijn eigen h1, maar staat hier onder de h1 van
// de pagina. Zonder dit springt de koppenvolgorde terug van h2 naar h1.
const eenNiveauLager = html => html.replace(/<(\/?)h([1-5])/g, (_, slash, n) => `<${slash}h${+n + 1}`);

const cache = new Map();
function laadProtocol(pad) {
  if (!cache.has(pad)) cache.set(pad, fetch(pad)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(markdown));
  return cache.get(pad);
}

// Eén experiment, kort: de tekst eronder zegt de rest. Dit is de regel die je vóór de sessie leest.
const experimentRegel = (exp, bibliotheek) => `<li><strong>${esc(exp.naam || "Zonder naam")}</strong>${
  exp.aantal_stappen ? ` <span class="src">${exp.aantal_stappen} stappen</span>` : ""}${
  exp.heeft_opruimen ? ` <span class="tag tag-info">opruimstap</span>` : ""}
  <div class="src m0">Stoffen: ${stoffenRegel(stoffenVoor(exp.stoffen || [], bibliotheek))}</div></li>`;

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
      const prot = protocolVan(lab, i);

      main.innerHTML = `
        <h1>Protocollen</h1>
        <p class="sub">${sessieSub(m, sessie, i)}</p>
        ${!sessies.length ? geenSessies("per sessie welke experimenten je doet en wat je ervoor nodig hebt") : `
          ${sessieKiezer(sessies, i)}

          <div class="grid-2">
            <div class="card"><h2>Deze sessie</h2>
              ${exps.length ? `<ul class="feiten">${exps.map(e => experimentRegel(e, bibliotheek)).join("")}</ul>`
                : `<p class="m0">Deze sessie noemt nog geen experimenten.</p>`}
              ${st.totaal ? `<p class="src">Samen minstens ${st.totaal} stappen.</p>` : ""}</div>
            <div class="card"><h2>Apparatuur</h2>
              <p class="m0">${apparatuurVan(sessie).map(esc).join(" · ") || `<span class="src">niets genoemd</span>`}</p>
              <p class="src"><a href="${esc(stoffenUrl)}">${alle.length} ${alle.length === 1 ? "stof" : "stoffen"} met hun gevaren</a></p></div>
          </div>

          ${onbekendeNoot(alle, stoffenUrl)}

          <div id="protocol-vak">${prot
            ? `<p class="loading" role="status">Protocol laden…</p>`
            : `<div class="card"><p class="m0">Van deze sessie staat de protocoltekst nog niet in de site;
                hierboven staat wat er wel uit de handleiding te halen is. De stappen lees je in
                ${sessie?.bron ? `<code>${esc(sessie.bron)}</code>` : "de handleiding"} van de opleiding.</p></div>`}</div>

          ${herkomst(sessie)}`}`;

      acties(main, {
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); }
      }, signal);

      if (prot) laadProtocol(prot.bestand).then(doc => {
        if (signal.aborted) return;
        const vak = $("#protocol-vak", main);
        if (vak) vak.innerHTML = `<article class="card verslag-tekst">${doc.html}</article>`;
      }).catch(() => {
        const vak = $("#protocol-vak", main);
        if (vak) vak.innerHTML = `<div class="card"><p class="m0" role="alert">Het protocol kon niet
          geladen worden. Ben je offline en heb je deze sessie nog niet eerder geopend?</p></div>`;
      });
    };

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
