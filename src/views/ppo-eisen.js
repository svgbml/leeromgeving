// PPO > Eisen: wat PPO van je vraagt, per studiejaar (OVERHAUL.md > B4, 4.1).
//
// PPO is modulevrij, dus dit scherm kent geen module: het gaat over je hele opleiding. De vier
// pijlers staan er altijd; de fase hangt af van het jaar dat je kiest.
//
// Alles komt uit het informatiedocument van de opleiding. Waar dat document zelf twijfelt — het
// zet een vraagteken achter de studiepunten van jaar 4 — staat die twijfel hier op het scherm.
// En waar materiaal ontbreekt (jaar 1 is leeg op SharePoint) zegt het dat, want een lege lijst
// kan er anders uitzien als "er is niets nodig".
import { esc } from "../domain/text.js";
import { pijlersVan, fasesVan, portfoliovormenVan, faseVanJaar, beoordelingVan } from "../domain/ppo.js";
import { app, laadPPO } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

// Het jaar uit de URL, teruggebracht tot een jaar dat de bron kent.
const kiesJaar = (ppo, param) => (faseVanJaar(ppo, param) ? Number(param) : fasesVan(ppo)[0]?.jaar ?? null);

export default {
  async mount({ main, params, signal, zetUpdate }) {
    main.innerHTML = `<h1>Eisen</h1><p class="sub">PPO</p>
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

    const pijlers = pijlersVan(ppo);
    const fases = fasesVan(ppo);

    const teken = () => {
      const jaar = kiesJaar(ppo, params.jaar);
      const fase = faseVanJaar(ppo, jaar);

      main.innerHTML = `
        <h1>Eisen</h1>
        <p class="sub">PPO${fase ? ` · jaar ${fase.jaar}: ${esc(fase.titel || "")}` : ""}</p>

        ${!fases.length ? `<div class="card"><p class="m0">De PPO-data heeft nog geen fases.</p></div>` : `
          <div class="row">
            <label class="field grow">Studiejaar
              <select data-invoer="jaar" aria-label="Studiejaar kiezen">${fases.map(f =>
                `<option value="${f.jaar}"${f.jaar === jaar ? " selected" : ""}>Jaar ${f.jaar} — ${esc(f.titel || "")}</option>`
              ).join("")}</select></label>
          </div>

          <div class="card">
            <h2>${esc(fase.titel || `Jaar ${fase.jaar}`)}</h2>
            ${fase.centrale_vraag ? `<p class="m0"><strong>${esc(fase.centrale_vraag)}</strong></p>` : ""}
            ${fase.nieuw ? `<p class="m0">${esc(fase.nieuw)}</p>` : ""}
            <h3>Hoe het beoordeeld wordt</h3>
            <p class="m0">${esc(beoordelingVan(fase)) || "Dat zegt de bron voor dit jaar niet."}</p>
            <p class="src">${fase.studiepunten === null
              ? "De bron noemt voor dit jaar geen studiepunten; dat is niet hetzelfde als nul."
              : `${fase.studiepunten} studiepunten.`}</p>
            ${fase._onzeker ? `<p class="waarschuwing" role="alert">${esc(fase._onzeker)}</p>` : ""}
          </div>`}

        <div class="card">
          <h2>De vier pijlers</h2>
          <p class="m0">Deze vier vragen lopen door je hele opleiding; je ontwikkeling binnen elk
            ervan maak je zichtbaar in je portfolio.</p>
          <ul class="kernlijst">${pijlers.map(p => `<li>
            <p class="m0"><strong>${esc(p.naam)}</strong></p>
            <p class="m0">${esc(p.vraag)}</p>
          </li>`).join("")}</ul>
          <p class="src"><a href="${esc(link("ppo/bewijs"))}">Hang je werk aan een pijler</a></p>
        </div>

        <div class="card">
          <h2>Het portfolio</h2>
          <p class="m0">${esc(ppo.portfolio?._wat || "")}</p>
          ${portfoliovormenVan(ppo).length ? `<h3>In welke vorm</h3>
            <ul class="feiten">${portfoliovormenVan(ppo).map(v => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}
        </div>

        ${ppo._ontbreekt ? `<div class="card">
          <h2>Wat er niet in staat</h2>
          <p class="m0">${esc(ppo._ontbreekt)}</p>
        </div>` : ""}

        <p class="src">Samengevat uit ${ppo._bron
            // _bron eindigt zelf al op een punt; anders staan er twee.
            ? `<code>${esc(ppo._bron.replace(/\.\s*$/, ""))}</code>`
            : "het informatiedocument van de opleiding"}.
          De studiegids is de eis; dit is een samenvatting.</p>`;
    };

    acties(main, {
      jaar: el => { params = { ...params, jaar: el.value }; zetParams(params); teken(); }
    }, signal);

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
