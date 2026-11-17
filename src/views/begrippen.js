// Begrippenlijst (of vragenlijst bij vraagmodules).
import { esc, rich, plain } from "../domain/text.js";
import { toetsbaar } from "../domain/quiz.js";
import { app, prog } from "../core/store.js";
import { $, acties, markeer, download, say } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";
import { laadExtra, engels, woordenlijst, sterKnop, wisselSter, notitieHtml, kaartVoet, linkTermen, videoKnop, toonVideos, videosVoor, youtubeZoek } from "../ui/kaart-extra.js";
import { vertaling } from "../domain/kaarten.js";
import { mindmap } from "../ui/mindmap.js";

const isVraag = () => app.data.kaarttype === "vraag";
const lesLabel = l => `Les ${l.nr} – ${l.titel}`;
const groep = b => (isVraag() && b.les) ? b.les : b.onderwerp;

// Zoekindex (#67): platte tekst per kaart, één keer per module berekend.
const zoekIndex = new WeakMap();
function zoektekst(b) {
  let m = zoekIndex.get(app.data);
  if (!m) { m = new Map(); zoekIndex.set(app.data, m); }
  if (!m.has(b.id)) {
    const v = vertaling(woordenlijst(), b);
    m.set(b.id, plain(`${b.begrip} ${b.uitleg} ${b.aanvulling || ""} ${v ? v[1] : ""}`).toLowerCase());
  }
  return m.get(b.id) + " " + (prog().notities[b.id] || "").toLowerCase();
}

export default {
  async mount({ main, params, signal, zetUpdate }) {
    await laadExtra();
    let f = lees(params);
    const lessen = (app.data.lessen || []).filter(l => l.aantal > 0);
    const onderwerpen = [...new Set(app.data.begrippen.map(b => b.onderwerp))];
    const nInfo = app.data.begrippen.filter(b => !toetsbaar(b)).length;

    main.innerHTML = `
      <h1 style="view-transition-name:titel">${isVraag() ? "Vragen en antwoorden" : "Begrippenlijst"}</h1>
      <p class="sub"><span style="view-transition-name:mod-${esc(app.mod.id)}">${esc(app.mod.titel)}</span> · ${esc(app.mod.periode)} · ${app.data.begrippen.length} ${isVraag() ? "kaarten" : "begrippen"}</p>
      <div class="row filters" role="search">
        <label class="field grow">Zoeken<input id="q" type="search" placeholder="zoek op woord, ook Engels" autocomplete="off" data-invoer="zoek"></label>
        ${lessen.length ? `<label class="field">Les<select id="l" data-wijzig="filter"><option value="">Alles</option>${lessen.map(l => `<option>${esc(lesLabel(l))}</option>`).join("")}</select></label>` : ""}
        <label class="field">Onderwerp<select id="t" data-wijzig="filter"><option value="">Alles</option>${onderwerpen.map(o => `<option>${esc(o)}</option>`).join("")}</select></label>
      </div>
      <div class="row opties">
        <label class="check"><input type="checkbox" id="ster" data-wijzig="filter"> Alleen gemarkeerd</label>
        ${nInfo ? `<label class="check"><input type="checkbox" id="info" data-wijzig="filter"> Ook lesinfo tonen (${nInfo})</label>` : ""}
        <span class="grow"></span>
        <div class="weergave" role="group" aria-label="Weergave">
          <button type="button" class="btn btn-klein" data-actie="weergave" data-w="lijst">Lijst</button>
          <button type="button" class="btn btn-klein" data-actie="weergave" data-w="compact">Compact</button>
          <button type="button" class="btn btn-klein" data-actie="weergave" data-w="kaart">Mindmap</button>
        </div>
        <details class="menu"><summary class="btn btn-klein">Meer</summary><div class="menu-lijst">
          <button type="button" class="btn btn-klein" data-actie="print">Afdrukken of pdf</button>
          <button type="button" class="btn btn-klein" data-actie="csv">Exporteer CSV (Excel)</button>
          <button type="button" class="btn btn-klein" data-actie="anki">Exporteer voor Anki</button>
        </div></details>
      </div>
      <div id="lesblok"></div>
      <p class="count" id="count" aria-live="polite"></p>
      <div id="list"></div>`;
    const q = $("#q", main); q.value = f.q;
    if ($("#l", main)) $("#l", main).value = f.les;
    $("#t", main).value = f.t; $("#ster", main).checked = f.ster; if ($("#info", main)) $("#info", main).checked = f.info;

    // Begriplinks alleen voor kaarten die in beeld komen (#66, #67): scheelt honderden zoekacties.
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { linkTermen(e.target, e.target.dataset.id); io.unobserve(e.target); } }), { rootMargin: "200px" });
    signal.addEventListener("abort", () => io.disconnect());

    function pool() {
      const zoek = f.q.trim().toLowerCase();
      return app.data.begrippen.filter(b =>
        (f.info || toetsbaar(b)) && (!f.t || b.onderwerp === f.t) && (!f.les || b.les === f.les) &&
        (!f.ster || prog().sterren[b.id]) && (!zoek || zoektekst(b).includes(zoek)));
    }
    function kaartHtml(b) {
      return `<article class="card begrip" id="k-${esc(b.id)}" data-id="${esc(b.id)}" aria-labelledby="t-${esc(b.id)}">
        <div class="begrip-kop"><h3 class="term" id="t-${esc(b.id)}">${rich(b.begrip)}</h3>${sterKnop(b.id)}</div>
        <div class="term-meta">${isVraag() ? `<span class="tag">${esc(b.onderwerp)}</span>` : ""}${engels(b)}${toetsbaar(b) ? "" : `<span class="tag tag-info">lesinfo</span>`}</div>
        <div class="tekst">${rich(b.uitleg)}</div>
        ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
        ${notitieHtml(b.id)}
        ${kaartVoet(b)}
      </article>`;
    }
    function lesBlok() {
      const el = $("#lesblok", main);
      if (!f.les) { el.innerHTML = ""; return; }
      const voorbeeld = app.data.begrippen.find(b => b.les === f.les);
      const nieuw = app.gen.toetsbareKaarten.filter(b => b.les === f.les && !prog().cards[b.id]).length;
      el.innerHTML = `<div class="card lesblok">
        <p class="m0"><strong>${esc(f.les)}</strong></p>
        <div class="row">
          ${nieuw ? `<a class="btn btn-primary" href="${link("flashcards", { les: f.les, modus: "les" })}">Leer deze les (${nieuw} nieuw)</a>` : ""}
          <a class="btn" href="${link("toets", { les: f.les })}">Oefentoets over deze les</a>
          ${voorbeeld ? videoKnop(voorbeeld, { klein: false }) : ""}
        </div></div>`;
    }
    function draw() {
      const items = pool();
      $("#count", main).textContent = `${items.length} ${items.length === 1 ? "kaart" : "kaarten"} gevonden`;
      const lijst = $("#list", main);
      lijst.className = f.w === "compact" ? "compact" : "";
      for (const b of main.querySelectorAll("[data-actie=weergave]")) b.setAttribute("aria-pressed", String(b.dataset.w === f.w));
      lesBlok();
      if (f.w === "kaart") { lijst.innerHTML = mindmap(app.data, items); return; }
      let html = "", cur = "";
      for (const b of items) {
        const g = groep(b);
        if (g !== cur) {
          cur = g;
          const zoekterm = plain(g).replace(/^Les\s*\d+\s*[–-]\s*/, "");
          html += `<h2 class="group-h">${esc(cur)} <a class="yt-zoek" href="${youtubeZoek(`${zoekterm} uitleg`)}" target="_blank" rel="noopener" title="Zoek video's over ${esc(zoekterm)} op YouTube"><span aria-hidden="true">▶</span><span class="visually-hidden">Video's over ${esc(zoekterm)} op YouTube</span></a></h2>`;
        }
        html += kaartHtml(b);
      }
      lijst.innerHTML = html || `<p>Niets gevonden.</p>`;
      if (f.q) markeer(lijst, f.q);
      for (const k of lijst.querySelectorAll(".begrip")) io.observe(k);
      if (f.id) {
        const el = document.getElementById(`k-${f.id}`);
        if (el) { el.classList.add("uitgelicht"); requestAnimationFrame(() => el.scrollIntoView({ block: "center" })); }
      }
    }
    const naarUrl = () => zetParams({ q: f.q, les: f.les, t: f.t, ster: f.ster ? 1 : "", info: f.info ? 1 : "", w: f.w === "lijst" ? "" : f.w });
    let wacht = null;
    acties(main, {
      zoek: el => { f.q = el.value; f.id = ""; clearTimeout(wacht); wacht = setTimeout(() => { draw(); naarUrl(); }, 150); },
      filter: () => {
        f.les = $("#l", main)?.value || ""; f.t = $("#t", main).value; f.ster = $("#ster", main).checked; f.info = $("#info", main)?.checked || false; f.id = "";
        draw(); naarUrl();
      },
      weergave: el => { f.w = el.dataset.w; draw(); naarUrl(); },
      ster: el => { wisselSter(el.dataset.id, el); if (f.ster) draw(); },
      videos: el => toonVideos(app.gen.byId(el.dataset.id)),
      print: () => { main.querySelectorAll("details").forEach(d => d.open = false); print(); },
      csv: () => exporteer(pool(), "csv"),
      anki: () => exporteer(pool(), "anki")
    }, signal);
    zetUpdate(p => { f = lees(p); q.value = f.q; if ($("#l", main)) $("#l", main).value = f.les; $("#t", main).value = f.t; draw(); });
    draw();
  }
};

function lees(p) {
  return { q: p.q || "", les: p.les || "", t: p.t || "", ster: !!p.ster, info: !!p.info || !!(p.id && !toetsbaar(app.gen.byId(p.id) || {})), id: p.id || "", w: p.w || "lijst" };
}

// Export (#36): CSV met puntkomma's voor Nederlandse Excel, of tab-gescheiden voor Anki (HTML blijft staan).
function exporteer(kaarten, soort) {
  const naam = `${app.mod.id}-${new Date().toISOString().slice(0, 10)}`;
  if (soort === "csv") {
    const cel = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rijen = [["Begrip", "Uitleg", "Aanvulling", "Onderwerp", "Les", "Bron", "Slides", "Notitie"].map(cel).join(";"),
      ...kaarten.map(b => [plain(b.begrip), plain(b.uitleg), plain(b.aanvulling || ""), b.onderwerp, b.les || "", b.bron_bestand || "", (b.bron_slides || []).join(" "), prog().notities[b.id] || ""].map(cel).join(";"))];
    download(`${naam}.csv`, "﻿" + rijen.join("\r\n"), "text/csv;charset=utf-8");
  } else {
    const veld = s => String(s ?? "").replace(/[\t\r\n]+/g, " ");
    const kop = "#separator:tab\n#html:true\n#tags column:4\n";
    const rijen = kaarten.map(b => [veld(b.begrip), veld(b.uitleg + (b.aanvulling ? `<br><i>${b.aanvulling}</i>` : "")), veld(b.bron_bestand || ""),
      veld([app.mod.id, (b.onderwerp || "").replace(/\s+/g, "_"), (b.les || "").replace(/\s+/g, "_")].filter(Boolean).join(" "))].join("\t"));
    download(`${naam}-anki.txt`, kop + rijen.join("\n"), "text/plain;charset=utf-8");
  }
  say(`${kaarten.length} kaarten geëxporteerd`);
}
