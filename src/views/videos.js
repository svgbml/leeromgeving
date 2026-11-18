// Video's: alle uitgekozen video's van de gekozen module, per les bij elkaar.
// Bron: data/videos.json ({ module: { "Les 1 – titel": [ {id,titel,kanaal,duur,taal} ] } }).
// Video's laden pas als je op een thumbnail klikt (youtube-nocookie), net als in de dialoog bij een kaart.
import { esc } from "../domain/text.js";
import { app, instellingen } from "../core/store.js";
import { $, $$, acties, say } from "../core/dom.js";
import { link } from "../core/router.js";
import { laadExtra, videosVoor, youtubeZoek, videoItem, speelBijKlik } from "../ui/kaart-extra.js";

// De zoekterm bij een les: de titel zonder het lesnummer ervoor.
const zoekterm = l => l.titel.replace(/^\s*(les|week)\s*[\d.]+\s*[–-]?\s*/i, "").trim() || l.titel;

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `
      <h1 style="view-transition-name:titel">Video's</h1>
      <p class="sub"><span style="view-transition-name:mod-${esc(m.id)}">${esc(m.titel)}</span> · ${esc(m.periode)}</p>
      <div id="video-vak"><p class="loading" role="status">Video's laden…</p></div>`;
    const vak = $("#video-vak", main);

    if (!instellingen().videos) {
      vak.innerHTML = `<div class="card"><p>Video's staan uit. Zet ze aan bij <a href="${link("instellingen")}">Instellingen</a> om de uitgekozen video's per les te zien.</p></div>`;
      return;
    }

    await laadExtra();
    if (signal.aborted) return;

    const lessen = (app.data?.lessen || []).slice().sort((a, b) => a.nr - b.nr);
    const per = lessen.map(l => ({ l, naam: `Les ${l.nr} – ${l.titel}`, vs: videosVoor(m.id, `Les ${l.nr} – ${l.titel}`) }));
    const totaal = per.reduce((n, p) => n + p.vs.length, 0);
    const metVideo = per.filter(p => p.vs.length);

    if (!lessen.length) {
      vak.innerHTML = `<div class="card"><p class="m0">Voor deze module zijn nog geen lessen bekend.</p></div>`;
      return;
    }

    const kies = params.les || "";
    // Alle lessen staan altijd in de pagina; filteren verbergt ze, zodat terug naar "alle" niets hoeft te hertekenen.
    const ga = p => { location.hash = link("videos", p); };

    vak.innerHTML = `
      <div class="card video-kop">
        <p class="m0">${totaal
          ? `<strong>${totaal}</strong> uitgekozen video${totaal === 1 ? "" : "'s"} bij ${metVideo.length} van de ${lessen.length} lessen.`
          : `Voor deze module zijn nog geen video's uitgekozen. Hieronder staan per les zoeklinks naar YouTube.`}</p>
        ${m.verslag ? `<p class="src m0">Meer achtergrond bij de stof staat in het <a href="${link("verslag")}">verslag</a>.</p>` : ""}
      </div>
      <div class="les-chips" role="group" aria-label="Kies een les">
        <button type="button" class="chip" data-actie="lesChip" data-les="" aria-pressed="${!kies}">Alle lessen</button>
        ${per.map(p => `<button type="button" class="chip" data-actie="lesChip" data-les="${esc(p.naam)}" title="${esc(p.naam)}" aria-pressed="${kies === p.naam}">Les ${esc(p.l.nr)}<span class="chip-t"> · ${esc(p.l.titel)}</span>${p.vs.length ? ` (${p.vs.length})` : ""}</button>`).join("")}
      </div>
      <div class="video-lessen">
        ${per.map(p => `
          <section class="card video-les" aria-labelledby="vl-${p.l.nr}" data-les="${esc(p.naam)}"${kies && kies !== p.naam ? " hidden" : ""}>
            <h2 class="kop0" id="vl-${p.l.nr}">${esc(p.naam)}</h2>
            ${p.vs.length
              ? `<ul class="video-lijst" role="list">${p.vs.map(videoItem).join("")}</ul>`
              : `<p>Voor deze les zijn nog geen video's uitgekozen.</p>`}
            <p class="video-zoek">Zelf zoeken op YouTube:
              <a href="${youtubeZoek(`${zoekterm(p.l)} uitleg`)}" target="_blank" rel="noopener">${esc(zoekterm(p.l))} (Nederlands)</a> ·
              <a href="${youtubeZoek(`${zoekterm(p.l)} explained`)}" target="_blank" rel="noopener">${esc(zoekterm(p.l))} (Engels)</a></p>
            <p class="row m0">
              <a class="btn btn-klein" href="${link("begrippen", { les: p.naam })}">Kaarten van deze les</a>
              <a class="btn btn-klein" href="${link("flashcards", { les: p.naam })}">Leren</a>
            </p>
          </section>`).join("")}
      </div>
      <p class="src">Video's spelen af via youtube-nocookie.com en laden pas als je op afspelen klikt.</p>`;

    speelBijKlik(vak, signal);
    acties(vak, { lesChip: el => ga(el.dataset.les ? { les: el.dataset.les } : {}) }, signal);

    // Filteren zonder het scherm opnieuw op te bouwen: alleen de chips en de secties bijwerken.
    zetUpdate(p => {
      const k = p.les || "";
      $$(".les-chips .chip", vak).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.les === k)));
      $$(".video-les", vak).forEach(s => (s.hidden = !!k && s.dataset.les !== k));
      say(k ? `Video's van ${k}` : "Video's van alle lessen");
    });
  }
};
