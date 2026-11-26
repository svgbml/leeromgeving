// Lab > Analyse: hoe je de resultaten van deze sessie uitwerkt — een stappenplan en de formules
// die erbij horen (OVERHAUL.md > B2, 2.6).
//
// Dit scherm vraagt niets en houdt niets bij: het vertelt. Welke technieken in de sessie zitten
// komt uit de experimentnamen, de apparatuur en de protocoltekst; het stappenplan en de formules
// komen uit data/analyse-recepten.json. Dat is zelf geschreven uitleg, geen tekst van de
// opleiding: de eis blijft wat de handleiding en de rubric zeggen.
import { esc } from "../domain/text.js";
import { markdown } from "../domain/markdown.js";
import { sessiesVan, kiesSessie, experimentenVan, protocolVan, sessieSleutel } from "../domain/lab.js";
import { labStand, sessieGedaan, SESSIE_VINK } from "../domain/samenhang.js";
import { herkenTechnieken, sessieTekst } from "../domain/analyse.js";
import { sessieKiezer, sessieSub, geenSessies, herkomst } from "../ui/labsessie.js";
import { app, laadVleugelData, laadAnalyseRecepten, labVinkjes, zetLabVinkje } from "../core/store.js";
import { $, acties, say } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

const cache = new Map();
function laadTekst(pad) {
  if (!cache.has(pad)) cache.set(pad, fetch(pad)
    .then(r => (r.ok ? r.text() : "")).catch(() => ""));
  return cache.get(pad);
}

const standRegel = stand =>
  `${stand.gedaan} van de ${stand.sessies} ${stand.sessies === 1 ? "sessie" : "sessies"} uitgewerkt.`;

const stappenplan = stappen => `<ol class="feiten nummers">${
  (stappen || []).map(s => `<li>${markdown(s).html.replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ol>`;

const formule = f => `<div class="formule">
  <h3>${esc(f.naam)}</h3>
  <p class="formule-regel" tabindex="0" role="region" aria-label="Formule ${esc(f.naam)}"><code>${esc(f.formule)}</code></p>
  <p class="m0">${esc(f.uitleg)}</p>
  ${f.symbolen?.length ? `<ul class="src formule-symbolen">${f.symbolen.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
</div>`;

const techniekKaart = ({ recept, treffers }) => `<section class="card">
  <h2>${esc(recept.naam)}</h2>
  <p class="src">Herkend aan: ${treffers.slice(0, 6).map(t => `<code>${esc(t)}</code>`).join(" · ")}.</p>
  ${stappenplan(recept.stappen)}
  ${recept.formules?.length ? `<h3 class="formule-kop">Formules</h3>${recept.formules.map(formule).join("")}` : ""}
</section>`;

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `<h1>Analyse</h1><p class="sub">Lab · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Uitwerking laden…</p>`;

    let lab = null, bib = { basis: {}, recepten: [] };
    try { [lab, bib] = await Promise.all([laadVleugelData(m, "lab"), laadAnalyseRecepten()]); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De uitwerking kon niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const sessies = sessiesVan(lab);
    const teken = async () => {
      const i = kiesSessie(sessies, params.sessie);
      const sessie = sessies[i];
      const exps = experimentenVan(sessie);
      const prot = protocolVan(lab, i);
      // De protocoltekst maakt de herkenning een stuk scherper (een gelfoto staat zelden in de
      // titel van een experiment), maar is niet nodig om iets te kunnen laten zien.
      const tekst = sessieTekst(sessie, prot ? await laadTekst(prot.bestand) : "");
      if (signal.aborted) return;
      const technieken = herkenTechnieken(bib.recepten, tekst);
      const vinkjes = labVinkjes()[m?.id] || {};
      const gedaan = sessieGedaan(sessie, vinkjes[sessieSleutel(sessie)] || {});
      const stand = labStand(lab, vinkjes);

      main.innerHTML = `
        <h1>Analyse</h1>
        <p class="sub">${sessieSub(m, sessie, i)}</p>
        ${!sessies.length ? geenSessies("per sessie hoe je je resultaten uitwerkt") : `
          ${sessieKiezer(sessies, i)}

          <div class="card">
            <h2>Wat je uitwerkt</h2>
            ${exps.length ? `<ul class="feiten">${exps.map(e =>
              `<li>${esc(e.naam || "Zonder naam")}</li>`).join("")}</ul>`
              : `<p class="m0">Deze sessie noemt nog geen experimenten.</p>`}
            <p class="src">Hieronder staat per techniek hoe je die resultaten verwerkt. Het is uitleg
              die hier zelf bij geschreven is; wat je móet inleveren staat in de handleiding
              ${sessie?.bron ? `<code>${esc(sessie.bron)}</code>` : ""} en in de rubric.</p>
          </div>

          ${technieken.length ? technieken.map(techniekKaart).join("") : `<div class="card">
            <p class="m0">Voor deze sessie is geen techniek herkend in de experimentnamen en de
            protocoltekst. Het stappenplan hieronder geldt voor elke uitwerking.</p></div>`}

          <section class="card">
            <h2>${esc(bib.basis?.naam || "Elke uitwerking")}</h2>
            ${stappenplan(bib.basis?.stappen)}
            ${bib.basis?.formules?.length
              ? `<h3 class="formule-kop">Formules</h3>${bib.basis.formules.map(formule).join("")}` : ""}
          </section>

          <div class="card">
            <h2>Voortgang</h2>
            <p class="m0"><label><input type="checkbox" data-wijzig="klaar"${gedaan ? " checked" : ""}>
              <span>Deze sessie heb ik uitgewerkt</span></label></p>
            <p class="src"><span id="labstand" role="status">${standRegel(stand)}</span> Dit is alleen een
              markering voor je voortgang en staat in deze browser, niet in de synchronisatie.</p>
          </div>

          <p class="src"><a href="${esc(link("lab/protocollen", { sessie: i }))}">Protocol van deze sessie</a> ·
            <a href="${esc(link("verslag"))}">Verslag van de module</a> ·
            <a href="${esc(link("lab/stoffen", { sel: "sessie", sessie: i }))}">Stoffen</a></p>
          ${herkomst(sessie)}`}`;

      acties(main, {
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); },
        klaar: el => {
          zetLabVinkje(m?.id, sessieSleutel(sessie), SESSIE_VINK, el.checked);
          const nu = labStand(lab, labVinkjes()[m?.id] || {});
          const regel = $("#labstand", main);
          if (regel) regel.textContent = standRegel(nu);
          say(el.checked ? "Uitgewerkt" : "Markering weg");
        }
      }, signal);
    };

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
