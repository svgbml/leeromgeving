// Lab > Protocollen: het protocol van de sessie om te lezen, met daarboven wat je nodig hebt.
//
// De protocoltekst stond eerst buiten de repo, omdat het lesmateriaal van de opleiding is. Hij
// staat er nu wél in, maar versleuteld: deze repo is openbaar, dus achter een wachtwoord (zie
// tools/versleutel.js en src/core/kluis.js). Het is opmaak van de bron, geen herschrijving: de
// stappen zijn die van de handleiding, want een protocol dat "mooier" gemaakt is kun je niet
// meer op varen.
import { esc } from "../domain/text.js";
import { markdown } from "../domain/markdown.js";
import { haal, open as kluisOpen } from "../core/kluis.js";
import { slotKaart, slotActies } from "../ui/slot.js";
import { sessiesVan, kiesSessie, experimentenVan, apparatuurVan, stappen, protocolVan } from "../domain/lab.js";
import { sessieKiezer, sessieSub, geenSessies, herkomst } from "../ui/labsessie.js";
import { app, laadVleugelData } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { zetParams } from "../core/router.js";

// Eén niveau opschuiven: de protocoltekst heeft zijn eigen h1, maar staat hier onder de h1 van
// de pagina. Zonder dit springt de koppenvolgorde terug van h2 naar h1.
const eenNiveauLager = html => html.replace(/<(\/?)h([1-5])/g, (_, slash, n) => `<${slash}h${+n + 1}`);

const cache = new Map();
function laadProtocol(pad) {
  if (!cache.has(pad)) cache.set(pad, haal(pad).then(markdown)
    .catch(e => { cache.delete(pad); throw e; }));
  return cache.get(pad);
}

// Eén experiment, kort: de tekst eronder zegt de rest. Dit is de regel die je vóór de sessie leest.
const experimentRegel = exp => `<li><strong>${esc(exp.naam || "Zonder naam")}</strong>${
  exp.aantal_stappen ? ` <span class="src">${exp.aantal_stappen} stappen</span>` : ""}${
  exp.heeft_opruimen ? ` <span class="tag tag-info">opruimstap</span>` : ""}</li>`;

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `<h1>Protocollen</h1><p class="sub">Lab · ${esc(m?.titel || "")}</p>
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
    // De kluis onthoudt de sleutel per tabblad; dit onthoudt alleen of we hem al gevraagd hebben.
    let ontgrendeld = await kluisOpen();
    if (signal.aborted) return;

    const teken = () => {
      const i = kiesSessie(sessies, params.sessie);
      const sessie = sessies[i];
      const exps = experimentenVan(sessie);
      const st = stappen(sessie);
      const prot = protocolVan(lab, i);

      main.innerHTML = `
        <h1>Protocollen</h1>
        <p class="sub">${sessieSub(m, sessie, i)}</p>
        ${!sessies.length ? geenSessies("per sessie welke experimenten je doet en wat je ervoor nodig hebt") : `
          ${sessieKiezer(sessies, i)}

          <div class="grid-2">
            <div class="card"><h2>Deze sessie</h2>
              ${exps.length ? `<ul class="feiten">${exps.map(experimentRegel).join("")}</ul>`
                : `<p class="m0">Deze sessie noemt nog geen experimenten.</p>`}
              ${st.totaal ? `<p class="src">Samen minstens ${st.totaal} stappen.</p>` : ""}</div>
            <div class="card"><h2>Apparatuur</h2>
              <p class="m0">${apparatuurVan(sessie).map(esc).join(" · ") || `<span class="src">niets genoemd</span>`}</p></div>
          </div>

          <div id="protocol-vak">${prot
            ? `<p class="loading" role="status">Protocol laden…</p>`
            : `<div class="card"><p class="m0">Van deze sessie staat de protocoltekst nog niet in de site;
                hierboven staat wat er wel uit de handleiding te halen is. De stappen lees je in
                ${sessie?.bron ? `<code>${esc(sessie.bron)}</code>` : "de handleiding"} van de opleiding.</p></div>`}</div>

          ${herkomst(sessie)}`}`;

      acties(main, {
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); }
      }, signal);

      if (prot && !ontgrendeld) {
        const vak = $("#protocol-vak", main);
        if (vak) {
          vak.innerHTML = slotKaart("het protocol van deze sessie");
          slotActies(vak, { signal, klaar: () => { ontgrendeld = true; teken(); } });
        }
        return;
      }
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
