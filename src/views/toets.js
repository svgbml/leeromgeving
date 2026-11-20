// Oefentoets. Twee standen: oefenen (direct feedback per vraag) en examensimulatie (#15: pas aan
// het eind nakijken, vrij navigeren, vragen markeren). Een lopende toets wordt bewaard (#16).
import { esc, rich, plain, kort, cijferMetNorm, gokScore, cijferTekst } from "../domain/text.js";
import { MIX_STD, TYPEN, TYPENAAM, LETTERS, nakijken, kernHints } from "../domain/quiz.js";
import { fmt } from "../domain/rekenen.js";
import { nuHerhalen } from "../domain/srs.js";
import { app, prog, bewaar, instellingen, noteerDag, bewaarToets, weightOf } from "../core/store.js";
import { $, $$, acties, say, toast } from "../core/dom.js";
import { link, zetParams } from "../core/router.js";
import { maakToets } from "../core/toetsmaker.js";
import { telOp, meters, confetti } from "../ui/motion.js";
import { laadExtra, sterKnop, wisselSter, kaartVoet, linkTermen, videoKnop, toonVideos, slideLink, bron } from "../ui/kaart-extra.js";

const isVraag = () => app.data.kaarttype === "vraag";
const lesLabel = l => `Les ${l.nr} – ${l.titel}`;
const pt = n => `${n} ${n === 1 ? "punt" : "punten"}`;
const kaartVan = it => app.gen.byId(it.id);
const groepVan = it => it.groep || (k => k ? ((isVraag() && k.les) ? k.les : k.onderwerp) : "Overig")(kaartVan(it));
const labelVan = it => it.casus ? "Casus" : TYPENAAM[it.kind] || it.kind;
const HELP = {
  mc: "1 punt; ook BEHALVE en “geen van de andere antwoorden”", open: "1–4 punten, één per kernpunt",
  casus: "deelvragen A, B, C bij één situatie", koppel: "vier begrippen aan omschrijvingen, 2 punten",
  volgorde: "stappen van een procedure ordenen, 2 punten", rekenen: "getallen elke keer anders, 2 punten",
  aanwijs: "klik het juiste deel van een figuur aan, 1 punt"
};

// Meerkeuze-filters: les en onderwerp zijn lijsten. Leeg = alles. In links gescheiden door ~
// (komt niet voor in les- of onderwerpnamen), zodat een oude link met een enkele les blijft werken.
const SEP = "~";
const lijst = v => Array.isArray(v) ? v.filter(Boolean) : String(v || "").split(SEP).map(x => x.trim()).filter(Boolean);
const keuzeLabel = (gekozen, alles, meer) => !gekozen.length ? alles : gekozen.length === 1 ? kort(gekozen[0], 34) : `${gekozen.length} ${meer}`;

let timerId = null;
const stopTimer = () => { clearInterval(timerId); timerId = null; };

export default {
  async mount({ main, params, signal }) {
    await laadExtra();
    signal.addEventListener("abort", () => { pauzeer(); stopTimer(); });
    const q0 = app.quiz;
    if (q0 && !q0.klaar) return vraagScherm(main, signal);
    if (q0 && q0.klaar) return uitslag(main, signal);
    startScherm(main, signal, params);
  }
};

const opslaan = () => { const q = app.quiz; if (q) bewaarToets(app.mod.id, q.klaar ? null : q); };
function pauzeer() {
  const q = app.quiz;
  if (q && !q.klaar && q.tStart) { q.verstreken = (q.verstreken || 0) + (Date.now() - q.tStart) / 1000; q.tStart = 0; opslaan(); }
}
const resterend = q => q.limit ? Math.max(0, Math.round(q.limit - (q.verstreken || 0) - (q.tStart ? (Date.now() - q.tStart) / 1000 : 0))) : null;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Filterveld als uitklapmenu met checkboxes: meerdere lessen of onderwerpen tegelijk.
function keuzeVeld(id, label, opties, gekozen, alles, meer) {
  const aan = lijst(gekozen);
  return `<div class="field keuzeveld">
        <span id="${id}-lab">${label}</span>
        <details class="menu keuzemenu">
          <summary class="btn keuzeknop" aria-describedby="${id}-lab"><span class="keuzetekst" id="${id}-uit">${esc(keuzeLabel(aan, alles, meer))}</span></summary>
          <div class="menu-lijst keuzelijst">
            <div class="keuzekop">
              <button type="button" class="btn btn-klein" data-actie="keuzeAlles" data-veld="${id}">Alles</button>
              <span class="src" data-telling="${id}">${aan.length ? `${aan.length} van ${opties.length}` : `alle ${opties.length}`}</span>
            </div>
            ${opties.map(o => `<label class="check"><input type="checkbox" data-keuze="${id}" value="${esc(o)}" ${aan.includes(o) ? "checked" : ""}> <span>${esc(o)}</span></label>`).join("")}
          </div>
        </details>
      </div>`;
}

// ---------- startscherm ----------
function startScherm(main, signal, params) {
  const p = prog(), inst = instellingen();
  const lessen = (app.data.lessen || []).filter(l => l.aantal > 0);
  const voorraad = app.gen.typeVoorraad();
  const onderwerpen = [...new Set(app.gen.toetsbareKaarten.map(b => b.onderwerp))];
  const gedeeld = params.seed ? { seed: +params.seed, n: +params.n || 20, les: lijst(params.les), t: lijst(params.t), tijd: +params.tijd || 0,
    mix: Object.fromEntries((params.mix || "").split(".").map((v, i) => [TYPEN[i], +v || 0])), examen: !!params.examen } : null;
  const m = gedeeld?.mix && Object.values(gedeeld.mix).some(Boolean) ? gedeeld.mix : Object.assign({}, MIX_STD, p.mix || {});
  const fouten = Object.keys(p.fouten).filter(id => app.gen.toetsbareKaarten.some(b => b.id === id));
  const instel = gedeeld || { n: 20, les: lijst(params.les), t: lijst(params.t), tijd: 0, examen: inst.examen };

  main.innerHTML = `
    <h1 style="view-transition-name:titel">Oefentoets</h1>
    <p class="sub"><span style="view-transition-name:mod-${esc(app.mod.id)}">${esc(app.mod.titel)}</span> · opgezet als de officiële toets: punten per vraag, casussen en open vragen met een puntenschaal.</p>
    ${gedeeld ? `<p class="card gedeeld"><strong>Gedeelde toets.</strong> Iedereen met deze link krijgt dezelfde vragen in dezelfde volgorde.</p>` : ""}
    ${fouten.length ? `<div class="card foutenboek"><p class="m0"><strong>Foutenboek: ${fouten.length} ${fouten.length === 1 ? "kaart" : "kaarten"}</strong> die je in een toets fout had en nog niet goed hebt beantwoord.</p>
      <div class="row"><button type="button" class="btn" data-actie="toetsFouten">Toets alleen het foutenboek</button>
      <button type="button" class="btn" data-actie="foutenNaarFlash">Zet ze in de flashcards van vandaag</button>
      <details class="menu"><summary class="btn btn-klein">Bekijk</summary><ul class="menu-lijst fouten-lijst">${fouten.slice(0, 40).map(id => `<li><a href="${link("begrippen", { id })}">${esc(kort(app.gen.byId(id).begrip, 70))}</a></li>`).join("")}</ul></details></div></div>` : ""}
    <form id="qs" class="card">
      <div class="row">
        <label class="field">Aantal vragen<select id="qn">${[10, 20, 30, 40, 60].map(n => `<option ${n === instel.n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        ${lessen.length ? keuzeVeld("ql", "Lessen", lessen.map(lesLabel), instel.les, "Alle lessen", "lessen") : ""}
        ${keuzeVeld("qt", "Onderwerpen", onderwerpen, instel.t, "Alle onderwerpen", "onderwerpen")}
        <label class="field">Tijd<select id="qtime">${[[0, "Geen tijdslimiet"], [30, "30 s per vraag"], [60, "60 s per vraag"], [90, "90 s per vraag"], [120, "2 min per vraag"]].map(([v, l]) => `<option value="${v}" ${v === instel.tijd ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      </div>
      <p class="src" id="qselinfo" aria-live="polite"></p>
      <label class="check"><input type="checkbox" id="qexam" ${instel.examen ? "checked" : ""}> <span><strong>Examensimulatie</strong>: geen feedback tot je inlevert, vrij heen en terug, vragen markeren, één totale tijd.</span></label>
      <label class="check"><input type="checkbox" id="qster"> Alleen gemarkeerde kaarten</label>
      <fieldset class="mixset">
        <legend>Verdeling vraagtypes</legend>
        <div class="mixrow">
          ${TYPEN.map(k => `
            <label class="mixitem${voorraad[k] ? "" : " leeg"}">
              <span class="mixname">${TYPENAAM[k]}</span>
              <span class="mixhelp">${HELP[k]}${voorraad[k] ? "" : " · <em>niet beschikbaar in deze module</em>"}</span>
              <input type="range" id="mix-${k}" data-invoer="mix" min="0" max="100" step="5" value="${voorraad[k] ? (m[k] || 0) : 0}" ${voorraad[k] ? "" : "disabled"} aria-describedby="mixout-${k}">
              <output id="mixout-${k}">0%</output>
            </label>`).join("")}
        </div>
        <p class="src" id="mixinfo" aria-live="polite"></p>
        <button type="button" class="btn btn-klein" data-actie="mixreset">Terug naar standaard</button>
      </fieldset>
      <p class="src">Normering: ${inst.norm === "cesuur" ? `cesuur ${inst.cesuur}% (een 5,5 bij ${inst.cesuur}% van de punten)` : "lineair, 1 + 9 × score"}${inst.gokcorrectie ? ", met gokcorrectie" : ""}. Aan te passen onder <a href="#/instellingen">Instellingen</a>.</p>
      <div class="row"><button class="btn btn-primary" type="submit">Start toets</button>
        <button type="button" class="btn" data-actie="deel">Kopieer link naar deze toets</button></div>
    </form>`;

  const leesMix = () => Object.fromEntries(TYPEN.map(k => [k, +$(`#mix-${k}`, main).value]));
  const toonMix = () => {
    const w = leesMix(), som = Object.values(w).reduce((s, x) => s + x, 0), n = +$("#qn", main).value;
    for (const k of TYPEN) $(`#mixout-${k}`, main).textContent = som ? `${Math.round(w[k] / som * 100)}%` : "0%";
    $("#mixinfo", main).textContent = som ? `Ongeveer ${TYPEN.filter(k => w[k]).map(k => `${Math.round(n * w[k] / som)} ${TYPENAAM[k].toLowerCase()}`).join(", ")}.` : "Zet minstens één type op meer dan 0.";
    $("#qs button[type=submit]", main).disabled = !som;
    return w;
  };
  const leesKeuze = veld => $$(`input[data-keuze="${veld}"]`, main).filter(i => i.checked).map(i => i.value);
  const instellingenNu = () => ({ n: +$("#qn", main).value, les: leesKeuze("ql"), t: leesKeuze("qt"), tijd: +$("#qtime", main).value,
    examen: $("#qexam", main).checked, ster: $("#qster", main).checked, mix: leesMix() });
  const KEUZEMETA = { ql: ["Alle lessen", "lessen"], qt: ["Alle onderwerpen", "onderwerpen"] };
  const telSelectie = () => {
    const s = instellingenNu();
    const n = app.gen.toetsbareKaarten.filter(b => (!s.t.length || s.t.includes(b.onderwerp)) && (!s.les.length || s.les.includes(b.les)) && (!s.ster || p.sterren[b.id])).length;
    $("#qselinfo", main).textContent = `${n} ${n === 1 ? "kaart" : "kaarten"} in deze selectie.`;
  };
  const toonKeuze = veld => {
    const vakjes = $$(`input[data-keuze="${veld}"]`, main);
    if (!vakjes.length) return;
    const aan = vakjes.filter(i => i.checked).map(i => i.value), [alles, meer] = KEUZEMETA[veld];
    $(`#${veld}-uit`, main).textContent = keuzeLabel(aan, alles, meer);
    $(`[data-telling="${veld}"]`, main).textContent = aan.length ? `${aan.length} van ${vakjes.length}` : `alle ${vakjes.length}`;
    telSelectie();
  };
  toonMix();
  telSelectie();

  acties(main, {
    keuzeAlles: el => { for (const i of $$(`input[data-keuze="${el.dataset.veld}"]`, main)) i.checked = false; toonKeuze(el.dataset.veld); say(`${KEUZEMETA[el.dataset.veld][0]} geselecteerd`); },
    mix: () => { p.mix = toonMix(); bewaar(); },
    mixreset: () => { for (const k of TYPEN) { const i = $(`#mix-${k}`, main); if (!i.disabled) i.value = MIX_STD[k]; } p.mix = toonMix(); bewaar(); say("Verdeling terug op standaard"); },
    deel: async () => {
      const s = instellingenNu(), seed = gedeeld?.seed || Math.floor(Math.random() * 1e9);
      const url = `${location.origin}${location.pathname}${link("toets", { seed, n: s.n, les: s.les.join(SEP), t: s.t.join(SEP), tijd: s.tijd, examen: s.examen ? 1 : "", mix: TYPEN.map(k => s.mix[k]).join(".") })}`;
      try { await navigator.clipboard.writeText(url); toast("Link gekopieerd. Wie hem opent, krijgt dezelfde vragen."); }
      catch { prompt("Kopieer deze link:", url); }
    },
    toetsFouten: () => start({ ...instellingenNu(), ids: fouten, n: Math.min(fouten.length, 40), les: [], t: [] }),
    foutenNaarFlash: () => {
      const now = Date.now();
      for (const id of fouten) p.cards[id] = nuHerhalen(p.cards[id], now);
      bewaar(); app.flash = null; toast(`${fouten.length} kaarten staan klaar in de flashcards.`);
    }
  }, signal);
  $("#qn", main).addEventListener("change", toonMix, { signal });
  $("#qster", main).addEventListener("change", telSelectie, { signal });
  main.addEventListener("change", e => { const v = e.target.dataset?.keuze; if (v) toonKeuze(v); }, { signal });
  $("#qs", main).addEventListener("submit", e => { e.preventDefault(); start({ ...instellingenNu(), seed: gedeeld?.seed }); }, { signal });

  async function start(s) {
    const kiesT = lijst(s.t), kiesL = lijst(s.les);
    const pool = s.ids || app.gen.toetsbareKaarten.filter(b => (!kiesT.length || kiesT.includes(b.onderwerp)) && (!kiesL.length || kiesL.includes(b.les)) && (!s.ster || p.sterren[b.id])).map(b => b.id);
    if (!pool.length) { say("Geen vragen beschikbaar voor deze selectie"); toast("Geen kaarten in deze selectie."); return; }
    const knop = $("#qs button[type=submit]", main); knop.disabled = true; knop.textContent = "Toets maken…";
    const gewichten = s.seed ? {} : Object.fromEntries(pool.map(id => [id, weightOf(id)]));
    const { items, aanpassing } = await maakToets({ moduleId: app.mod.id, data: app.data, ids: pool, n: Math.min(s.n, 200), mix: s.mix, seed: s.seed, gewichten });
    if (!items.length) { knop.disabled = false; knop.textContent = "Start toets"; toast("Geen vragen beschikbaar voor deze selectie."); return; }
    app.quiz = { items, i: 0, limit: s.tijd ? s.tijd * items.length : 0, verstreken: 0, tStart: 0, klaar: false, aanpassing,
      examen: s.examen, seed: s.seed || null, instel: { ...s, ids: undefined }, fase: "vragen", begin: new Date().toISOString() };
    if (s.seed) zetParams({});
    opslaan();
    vraagScherm(main, signal);
    main.focus({ preventScroll: true });
  }
}

// ---------- vraagscherm ----------
function vraagScherm(main, signal) {
  const q = app.quiz;
  q.tStart = Date.now();
  if (q.limit && resterend(q) <= 0) return einde(main, signal, true);

  main.innerHTML = `
    <div class="kop-rij"><h1 style="view-transition-name:titel">Oefentoets${q.examen ? ` <span class="tag">examensimulatie</span>` : ""}</h1>
      <button type="button" class="btn btn-klein" data-actie="focus" aria-pressed="false">Focus</button></div>
    <div class="qhead"><span id="qnr"></span>${q.limit ? `<span>Resterende tijd: <span class="timer" id="timer">${mmss(resterend(q))}</span></span>` : ""}</div>
    <div class="meter" data-meter="toets" aria-hidden="true"><span></span></div>
    ${q.examen ? `<nav class="qnav" aria-label="Vragen" id="qnav"></nav>` : ""}
    <div id="vraag"></div>
    <div class="row" id="qknoppen"></div>`;
  const vak = $("#vraag", main);

  function tekenVraag() {
    const it = q.items[q.i], klaar = it.behaald !== null && !q.examen;
    const toonUitslag = klaar || (q.examen && q.fase === "nakijken" && it.kind === "open");
    $("#qnr", main).textContent = q.fase === "nakijken" ? `Nakijken: open vraag ${q.nk + 1} van ${q.openIdx.length}` : `Vraag ${q.i + 1} van ${q.items.length}`;
    $(".meter span", main).style.width = `${(q.fase === "nakijken" ? q.nk / q.openIdx.length : q.i / q.items.length) * 100}%`;
    meters(main);
    const k = kaartVan(it), c = it.casus;
    const casusBlok = c ? `
      <section class="casus" aria-label="Casusbeschrijving">
        <p class="casus-t">${esc(c.titel)} <span class="punten">${pt(c.punten)}</span></p>
        <p class="casus-x">${rich(c.tekst)}</p>
        ${c.afbeelding ? `<figure class="casus-f"><img src="${esc(c.afbeelding.src)}" alt="${esc(c.afbeelding.alt || "")}" loading="lazy">${c.afbeelding.bijschrift ? `<figcaption>${rich(c.afbeelding.bijschrift)}</figcaption>` : ""}</figure>` : ""}
        ${c.achtergrond?.length ? `<details class="casus-a" open><summary>Achtergrond uit de lesstof</summary><ul>${c.achtergrond.map(x => `<li>${rich(x)}</li>`).join("")}</ul></details>` : ""}
        ${c.bron ? `<p class="casus-h">Hulpmiddel: de figuren en schema's bij deze stof staan in ${slideLink(c.bron)}.</p>` : ""}
        <p class="casus-n">Deelvraag ${c.letter} van ${c.n}. Lees eerst alle deelvragen: ze bouwen op elkaar voort.</p>
      </section>` : "";
    const kop = c ? `<span class="letter">${c.letter})</span> ` : "";
    vak.innerHTML = `${casusBlok}
      <section class="card ${toonUitslag ? "" : "vraag-in"}" aria-labelledby="qtext">
        <div class="qtags"><span class="tag">${labelVan(it)}</span>${k ? ` <span class="tag">${esc(k.onderwerp)}</span>` : ""}${k?.les ? ` <span class="tag">${esc(k.les)}</span>` : ""}
          ${k ? sterKnop(k.id) : ""}${puntBadge(it, toonUitslag)}</div>
        <h2 id="qtext" class="prompt">${kop}${rich(it.prompt)}</h2>
        ${it.intro ? `<p class="intro">${rich(it.intro)}</p>` : ""}
        ${body(it, toonUitslag)}
      </section>`;
    knoppen();
    const eerste = vak.querySelector(".opt:not([disabled]), textarea, input, select, [data-actie=controleer]");
    if (toonUitslag) $("#next", main)?.focus(); else eerste?.focus({ preventScroll: true });
    if (toonUitslag) linkTermen(vak, it.id);
    if (q.examen && q.fase !== "nakijken") navigatie();
    koppelVolgorde(it);
  }

  function puntBadge(it, uitslag) {
    if (!uitslag || it.behaald === null) return `<span class="punten">${pt(it.punten)}</span>`;
    return `<span class="punten ${it.behaald === it.punten ? "vol" : it.behaald > 0 ? "deels" : "nul"}">${it.behaald}/${pt(it.punten)}</span>`;
  }

  function body(it, uitslag) {
    const dis = uitslag ? "disabled" : "";
    switch (it.kind) {
      case "mc": return `<ul class="opts" role="list">${it.opts.map((o, i) => `<li><button type="button" class="opt ${uitslag ? (o.id === it.correct ? "ok" : o.id === it.answer ? "no" : "") : (o.id === it.answer ? "gekozen" : "")}" data-actie="mc" data-id="${esc(o.id)}" ${dis} aria-pressed="${o.id === it.answer}"><span class="letter" aria-hidden="true">${LETTERS[i]}</span> <span class="opt-t">${rich(o.text)}</span>${uitslag && o.id === it.correct ? `<span class="optpt">${pt(it.punten)}<span class="visually-hidden">, juiste antwoord</span></span>` : ""}</button></li>`).join("")}</ul>
        ${uitslag ? feedback(it) : ""}`;
      case "open": {
        const eerder = (prog().antwoorden[it.id] || []).slice(-1)[0];
        if (uitslag && it.behaald !== null) return feedback(it);
        if (uitslag) return rubriek(it);
        return `<label class="antwoordveld"><span class="modelkop">Jouw antwoord</span>
          <textarea id="antwoord" rows="5" data-invoer="tekst" placeholder="Typ hier je antwoord.">${esc(it.tekst || "")}</textarea>
          <span class="telling" id="telling">${telling(it.tekst || "")}</span></label>
          ${eerder ? `<details class="eerder"><summary>Je vorige antwoord (${new Date(eerder.d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}, ${eerder.p}/${eerder.max})</summary><p>${esc(eerder.t) || "<em>leeg gelaten</em>"}</p></details>` : ""}
          ${q.examen ? "" : `<button type="button" class="btn btn-primary mt" data-actie="toonModel">Toon antwoordmodel</button>`}`;
      }
      case "koppel": return `<ol class="koppel-oms" type="A">${it.opties.map(o => `<li>${rich(o.text)}</li>`).join("")}</ol>
        <div class="koppel-rij">${it.paren.map(p => {
          const gekozen = it.antwoord?.[p.id] || "";
          const goed = uitslag && gekozen === p.id;
          return `<label class="koppel-paar ${uitslag ? (goed ? "ok" : "no") : ""}"><span class="koppel-term">${esc(p.term)}</span>
            <select data-wijzig="koppel" data-id="${esc(p.id)}" ${dis}><option value="">kies…</option>${it.opties.map((o, i) => `<option value="${esc(o.id)}" ${o.id === gekozen ? "selected" : ""}>${LETTERS[i]}</option>`).join("")}</select>
            ${uitslag && !goed ? `<span class="koppel-juist">juist: ${LETTERS[it.opties.findIndex(o => o.id === p.id)]}</span>` : ""}</label>`;
        }).join("")}</div>
        ${uitslag ? feedback(it) : q.examen ? "" : `<button type="button" class="btn btn-primary mt" data-actie="controleer">Controleer</button>`}`;
      case "volgorde": return `<ol class="volgorde" id="volgorde">${it.antwoord.map((k, pos) => `
          <li class="${uitslag ? (k === pos ? "ok" : "no") : ""}" draggable="${!uitslag}" data-k="${k}">
            <span class="volg-grip" aria-hidden="true">⋮⋮</span><span class="volg-t">${esc(it.stappen[k])}</span>
            ${uitslag ? (k === pos ? "" : `<span class="koppel-juist">hoort op plek ${k + 1}</span>`) : `<span class="volg-knoppen">
              <button type="button" class="btn btn-klein" data-actie="op" data-pos="${pos}" ${pos === 0 ? "disabled" : ""} aria-label="Stap omhoog">↑</button>
              <button type="button" class="btn btn-klein" data-actie="neer" data-pos="${pos}" ${pos === it.antwoord.length - 1 ? "disabled" : ""} aria-label="Stap omlaag">↓</button></span>`}
          </li>`).join("")}</ol>
        ${uitslag ? feedback(it) : `<p class="src">Sleep de stappen of gebruik de pijltjes.</p>${q.examen ? "" : `<button type="button" class="btn btn-primary" data-actie="controleer">Controleer</button>`}`}`;
      case "rekenen": return `<label class="reken"><span class="modelkop">Jouw antwoord</span>
          <span class="reken-rij"><input id="reken" inputmode="decimal" autocomplete="off" data-invoer="reken" value="${esc(it.invoer || "")}" ${dis}><span>${esc(it.eenheid)}</span></span>
          <span class="src">Komma of punt mag; ook 1,5e3 of 1,5 × 10^3. Marge: ${Math.round(it.marge * 100)}%.</span></label>
        ${uitslag ? feedback(it) : q.examen ? "" : `<button type="button" class="btn btn-primary mt" data-actie="controleer">Controleer</button>`}`;
      case "aanwijs": return `<figure class="aanwijs">
          <div class="aanwijs-vlak"><img src="${esc(it.figuur.src)}" alt="${esc(it.figuur.alt)}">
            ${it.vlakken.map((v, i) => `<button type="button" class="hotspot ${uitslag ? (v.id === it.doel ? "ok" : v.id === it.answer ? "no" : "") : v.id === it.answer ? "gekozen" : ""}" style="left:${v.x}%;top:${v.y}%;width:${v.w}%;height:${v.h}%"
              data-actie="aanwijs" data-id="${esc(v.id)}" ${dis} aria-label="${uitslag ? esc(v.label) : `Gebied ${i + 1}`}">${uitslag ? `<span>${esc(v.label)}</span>` : ""}</button>`).join("")}
          </div>${it.figuur.bron ? `<figcaption class="src">${esc(it.figuur.bron)}</figcaption>` : ""}</figure>
        ${uitslag ? feedback(it) : ""}`;
    }
    return "";
  }

  function feedback(it) {
    const k = kaartVan(it), vol = it.behaald === it.punten;
    const kop = `<div class="feedback ${vol ? "ok" : it.behaald > 0 ? "" : "no"}" role="status"><strong>${vol ? "Goed." : it.behaald > 0 ? "Deels goed." : "Fout."}</strong> ${it.behaald} van ${pt(it.punten)}.`;
    let uit = "";
    if (it.kind === "mc") { const j = it.opts.find(o => o.id === it.correct); uit = `${kop} ${vol ? "" : `Het juiste antwoord is: ${rich(kort(j?.text || "", 160))}`}</div>`; }
    else if (it.kind === "open") {
      const gemist = (it.gemist || []).map(i => it.kern[i]).filter(Boolean);
      uit = `${kop}</div>${it.tekst ? `<div class="jouw"><p class="modelkop">Jouw antwoord</p><p class="tekst0 pre">${esc(it.tekst)}</p></div>` : ""}
        ${gemist.length ? `<p class="modelkop mt">Niet genoemd</p><ul class="kernlijst gemist">${gemist.map(x => `<li><span>${rich(x)}</span></li>`).join("")}</ul>` : ""}`;
    }
    else if (it.kind === "rekenen") uit = `${kop} Jij: ${esc(it.invoer || "–")} · juist: <strong>${fmt(it.antwoordGetal, 3)} ${esc(it.eenheid)}</strong></div><p class="uitwerking"><span class="modelkop">Uitwerking</span><br>${rich(it.uitwerking)}</p>`;
    else if (it.kind === "aanwijs") uit = `${kop} ${vol ? "" : `Het juiste gebied is gemarkeerd.`}</div>${it.uitleg ? `<p class="tekst">${rich(it.uitleg)}</p>` : ""}`;
    else uit = `${kop}</div>`;
    if (k && it.kind !== "koppel" && it.variant !== "behalve") uit += `<div class="a mt"><p class="modelkop">${it.kind === "open" ? "Antwoordmodel" : "Uitleg"}</p>
      ${it.kind === "open" ? "" : `<p class="m0"><strong>${rich(plain(k.begrip))}</strong></p>`}<div class="tekst">${rich(k.uitleg)}</div>
      ${k.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(k.aanvulling)}</p>` : ""}
      <div class="row kaart-acties">${videoKnop(k)}</div>${kaartVoet(k)}</div>`;
    return uit;
  }

  function rubriek(it) {
    const hints = kernHints(it.kern, it.tekst || "");
    const n = it.punten, k = kaartVan(it);
    return `${it.tekst ? `<div class="jouw"><p class="modelkop">Jouw antwoord</p><p class="tekst0 pre">${esc(it.tekst)}</p></div>` : `<p class="src">Je liet deze vraag leeg.</p>`}
      <div class="a mt"><p class="modelkop">Antwoordmodel</p><div class="tekst">${rich(k.uitleg)}</div>${k.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(k.aanvulling)}</p>` : ""}${kaartVoet(k)}</div>
      <fieldset class="rubriek"><legend>Puntenmodel — vink aan wat in jouw antwoord staat</legend>
        ${it.tekst ? `<p class="src mt0">Vooraf aangevinkt: kernpunten waarvan minstens de helft van de sleutelwoorden in je antwoord staat. Controleer zelf of het klopt.</p>` : ""}
        <ul class="kernlijst">${it.kern.map((x, i) => `<li><label><input type="checkbox" data-wijzig="kern" data-k="${i}" ${hints[i].voorstel ? "checked" : ""}> <span>${rich(x)}${hints[i].gevonden.length ? `<span class="hint">gevonden: ${hints[i].gevonden.map(esc).join(", ")}</span>` : ""}</span></label><span class="kernpt">1 punt</span></li>`).join("")}</ul>
        <p class="rscore">Jouw score: <output id="rscore">${hints.filter(h => h.voorstel).length}</output> van ${pt(n)}</p>
        <button type="button" class="btn btn-primary" data-actie="vastleggen">Punten vastleggen</button>
      </fieldset>`;
  }

  function knoppen() {
    const it = q.items[q.i], el = $("#qknoppen", main);
    if (q.fase === "nakijken") { el.innerHTML = it.behaald !== null ? `<button type="button" class="btn btn-primary" id="next" data-actie="volgendeNk">${q.nk + 1 < q.openIdx.length ? "Volgende open vraag" : "Bekijk resultaat"}</button>` : ""; return; }
    if (q.examen) {
      el.innerHTML = `<button type="button" class="btn" data-actie="vorige" ${q.i === 0 ? "disabled" : ""}>← Vorige</button>
        <button type="button" class="btn" data-actie="markeer" aria-pressed="${!!it.gemarkeerd}">${it.gemarkeerd ? "Markering weg" : "Markeer voor later"}</button>
        ${q.i + 1 < q.items.length ? `<button type="button" class="btn btn-primary" data-actie="volgende">Volgende →</button>` : ""}
        <span class="grow"></span><button type="button" class="btn ${q.i + 1 === q.items.length ? "btn-primary" : ""}" data-actie="inleveren">Inleveren</button>`;
      return;
    }
    const klaar = it.behaald !== null;
    el.innerHTML = `${klaar ? `<button type="button" class="btn btn-primary" id="next" data-actie="volgende">${q.i + 1 < q.items.length ? "Volgende vraag" : "Bekijk resultaat"}</button>` : ""}
      <button type="button" class="btn" data-actie="stop">Stop toets</button>`;
  }

  function navigatie() {
    $("#qnav", main).innerHTML = q.items.map((it, i) => `<button type="button" class="qnav-b ${i === q.i ? "nu" : ""} ${beantwoord(it) ? "gedaan" : ""} ${it.gemarkeerd ? "vlag" : ""}"
      data-actie="ga" data-i="${i}" aria-current="${i === q.i ? "step" : "false"}" aria-label="Vraag ${i + 1}${beantwoord(it) ? ", beantwoord" : ""}${it.gemarkeerd ? ", gemarkeerd" : ""}">${i + 1}</button>`).join("");
  }
  const beantwoord = it => it.kind === "mc" || it.kind === "aanwijs" ? it.answer !== null : it.kind === "open" ? !!(it.tekst || "").trim() :
    it.kind === "koppel" ? Object.keys(it.antwoord || {}).length > 0 : it.kind === "rekenen" ? !!(it.invoer || "").trim() : it.kind === "volgorde" ? !!it.aangeraakt : false;
  const telling = t => `Aantal woorden: ${t.trim() ? t.trim().split(/\s+/).length : 0}, aantal tekens: ${t.length}`;

  // Slepen bij volgordevragen.
  function koppelVolgorde(it) {
    if (it.kind !== "volgorde" || it.behaald !== null && !q.examen) return;
    const ol = $("#volgorde", vak); if (!ol) return;
    let sleep = null;
    ol.addEventListener("dragstart", e => { sleep = e.target.closest("li"); sleep?.classList.add("sleept"); });
    ol.addEventListener("dragend", () => sleep?.classList.remove("sleept"));
    ol.addEventListener("dragover", e => {
      e.preventDefault();
      const na = [...ol.children].find(li => li !== sleep && e.clientY < li.getBoundingClientRect().top + li.offsetHeight / 2);
      if (sleep) ol.insertBefore(sleep, na || null);
    });
    ol.addEventListener("drop", e => { e.preventDefault(); it.antwoord = [...ol.children].map(li => +li.dataset.k); it.aangeraakt = true; opslaan(); tekenVraag(); });
  }

  // ---------- antwoorden ----------
  function scoor(it, punten, gemist) {
    it.behaald = punten ?? nakijken(it);
    if (it.kind === "open") it.gemist = gemist || [];
    registreer(it);
  }
  function registreer(it) {
    const p = prog(), k = kaartVan(it), nu = new Date().toISOString();
    const rec = p.quiz[it.id] ||= { ok: 0, no: 0 };
    it.behaald >= it.punten ? rec.ok++ : rec.no++;
    rec.p = (rec.p || 0) + it.behaald; rec.m = (rec.m || 0) + it.punten;
    const soort = it.casus ? "casus" : it.kind;
    const t = p.types[soort] ||= { n: 0, p: 0, m: 0 }; t.n++; t.p += it.behaald; t.m += it.punten;
    // Foutenboek (#17): per kaart; bij koppelvragen per paar.
    if (it.kind === "koppel") for (const pr of it.paren) { if (it.antwoord?.[pr.id] === pr.id) delete p.fouten[pr.id]; else p.fouten[pr.id] = nu; }
    else if (k) { if (it.behaald >= it.punten) delete p.fouten[k.id]; else p.fouten[k.id] = nu; }
    if (it.kind === "open") {
      const l = p.antwoorden[it.id] ||= [];
      l.push({ d: nu, t: it.tekst || "", p: it.behaald, max: it.punten });
      if (l.length > 3) l.splice(0, l.length - 3);
    }
    bewaar(); noteerDag({ p: it.behaald, m: it.punten });
    opslaan();
  }
  const huidige = () => q.items[q.i];
  function naarVraag(i) { q.i = Math.max(0, Math.min(q.items.length - 1, i)); opslaan(); tekenVraag(); }

  acties(main, {
    mc: el => {
      const it = huidige(); it.answer = el.dataset.id;
      if (q.examen) { opslaan(); tekenVraag(); return; }
      scoor(it); tekenVraag(); say(it.behaald ? `Goed, ${pt(it.punten)}` : "Fout, 0 punten");
    },
    aanwijs: el => {
      const it = huidige(); it.answer = el.dataset.id;
      if (q.examen) { opslaan(); tekenVraag(); return; }
      scoor(it); tekenVraag(); say(it.behaald ? "Goed" : "Fout");
    },
    tekst: el => { huidige().tekst = el.value; $("#telling", main).textContent = telling(el.value); if (q.examen) navigatie(); },
    reken: el => { huidige().invoer = el.value; },
    koppel: el => { const it = huidige(); (it.antwoord ||= {})[el.dataset.id] = el.value; opslaan(); if (q.examen) navigatie(); },
    op: el => verplaats(+el.dataset.pos, -1), neer: el => verplaats(+el.dataset.pos, 1),
    controleer: () => { const it = huidige(); if (it.kind === "rekenen") it.invoer = $("#reken", main)?.value || ""; scoor(it); tekenVraag(); say(`${it.behaald} van ${pt(it.punten)}`); },
    toonModel: () => { const it = huidige(); it.tekst = $("#antwoord", main)?.value || ""; vak.querySelector(".antwoordveld").outerHTML = rubriek(it); vak.querySelector(".eerder")?.remove(); $("[data-actie=toonModel]", main)?.remove(); vak.querySelector(".kernlijst input")?.focus(); linkTermen(vak, it.id); },
    kern: () => { $("#rscore", main).textContent = $$(".kernlijst input:checked", vak).length; },
    vastleggen: () => {
      const it = huidige(), vakjes = $$(".kernlijst input", vak);
      scoor(it, vakjes.filter(v => v.checked).length, vakjes.map((v, i) => v.checked ? -1 : i).filter(i => i >= 0));
      if (q.fase === "nakijken") { knoppen(); vak.querySelector(".rubriek").outerHTML = feedback(it); $("#next", main)?.focus(); return; }
      tekenVraag(); say(`${it.behaald} van ${pt(it.punten)} toegekend`);
    },
    volgende: () => { if (q.i + 1 < q.items.length) { naarVraag(q.i + 1); } else einde(main, signal, false); },
    vorige: () => naarVraag(q.i - 1),
    ga: el => naarVraag(+el.dataset.i),
    markeer: () => { const it = huidige(); it.gemarkeerd = !it.gemarkeerd; opslaan(); knoppen(); navigatie(); },
    inleveren: el => {
      const open = q.items.filter(it => !beantwoord(it)).length, vlag = q.items.filter(it => it.gemarkeerd).length;
      if ((open || vlag) && !el.dataset.zeker) { el.dataset.zeker = "1"; el.textContent = `Toch inleveren? (${open} open, ${vlag} gemarkeerd)`; return; }
      inleveren();
    },
    volgendeNk: () => { if (q.nk + 1 < q.openIdx.length) { q.nk++; q.i = q.openIdx[q.nk]; opslaan(); tekenVraag(); } else einde(main, signal, false); },
    stop: () => einde(main, signal, false, true),
    ster: el => wisselSter(el.dataset.id, el),
    videos: el => toonVideos(app.gen.byId(el.dataset.id)),
    focus: el => { const aan = document.body.classList.toggle("focus"); el.setAttribute("aria-pressed", String(aan)); }
  }, signal);
  function verplaats(pos, d) {
    const it = huidige(), a = it.antwoord, n = pos + d;
    [a[pos], a[n]] = [a[n], a[pos]]; it.aangeraakt = true; opslaan(); tekenVraag();
    vak.querySelectorAll(`[data-actie=${d < 0 ? "op" : "neer"}]`)[n]?.focus();
  }
  function inleveren() {
    // Alles behalve open vragen wordt nu nagekeken; open vragen kijk je daarna zelf na met het puntenmodel.
    for (const it of q.items) if (it.kind !== "open") { if (it.kind === "rekenen") it.invoer ||= ""; scoor(it); }
    q.openIdx = q.items.map((it, i) => it.kind === "open" ? i : -1).filter(i => i >= 0);
    if (!q.openIdx.length) return einde(main, signal, false);
    q.fase = "nakijken"; q.nk = 0; q.i = q.openIdx[0];
    stopTimer(); pauzeer(); q.limit = 0; opslaan();
    $("#timer", main)?.parentElement.remove();
    $("#qnav", main)?.remove();
    tekenVraag();
  }

  stopTimer();
  if (q.limit) timerId = setInterval(() => {
    if (!app.quiz || app.quiz.klaar || app.route !== "toets") return stopTimer();
    const r = resterend(q), el = $("#timer", main);
    if (el) { el.textContent = mmss(r); el.classList.toggle("bijna", r <= 10); }
    if (r === 60 || r === 10) say(`Nog ${r} seconden`);
    if (r % 10 === 0) { pauzeer(); q.tStart = Date.now(); }
    if (r <= 0) { if (q.examen) inleveren(); else einde(main, signal, true); }
  }, 1000);
  tekenVraag();
}

// ---------- einde en uitslag ----------
function einde(main, signal, tijdOm, gestopt) {
  stopTimer(); pauzeer();
  const q = app.quiz; q.klaar = true; q.tijdOm = tijdOm;
  for (const it of q.items) if (it.behaald === null) it.behaald = 0;
  if (q.items.some(i => i.answer !== null || i.tekst || i.invoer || i.aangeraakt || Object.keys(i.antwoord || {}).length)) {
    const per = {};
    for (const it of q.items) { const g = groepVan(it); per[g] ||= { ok: 0, n: 0 }; per[g].n += it.punten; per[g].ok += it.behaald; }
    const behaald = q.items.reduce((s, i) => s + i.behaald, 0), max = q.items.reduce((s, i) => s + i.punten, 0);
    prog().history.push({ date: new Date().toISOString(), n: q.items.length, ok: q.items.filter(i => i.behaald === i.punten).length, punten: behaald, maxPunten: max, per, timeUp: !!tijdOm, stopped: !!gestopt, examen: !!q.examen });
    bewaar();
  }
  bewaarToets(app.mod.id, null);
  if (app.route === "toets") { uitslag(main, signal); scrollTo(0, 0); main.focus({ preventScroll: true }); }
}

function uitslag(main, signal) {
  const q = app.quiz, inst = instellingen();
  const behaald = q.items.reduce((s, i) => s + (i.behaald || 0), 0), max = q.items.reduce((s, i) => s + i.punten, 0);
  const gok = q.items.filter(i => i.kind === "mc").reduce((s, i) => s + 1 / i.opts.length, 0);
  const pEff = inst.gokcorrectie ? gokScore(behaald, max, gok) : behaald;
  const c = cijferMetNorm(pEff, max, { soort: inst.norm, cesuur: inst.cesuur });
  const perOnderdeel = {}, perType = {};
  for (const it of q.items) {
    const g = groepVan(it); (perOnderdeel[g] ||= { p: 0, m: 0 }); perOnderdeel[g].p += it.behaald || 0; perOnderdeel[g].m += it.punten;
    const t = labelVan(it); (perType[t] ||= { p: 0, m: 0 }); perType[t].p += it.behaald || 0; perType[t].m += it.punten;
  }
  const tabel = (titel, kop, obj) => `<h2>${titel}</h2><div class="tabelwrap" tabindex="0" role="region" aria-label="${esc(titel)}"><table><thead><tr><th scope="col">${kop}</th><th scope="col">Punten</th><th scope="col">Max</th><th scope="col">%</th></tr></thead>
    <tbody>${Object.entries(obj).sort((a, b) => a[1].p / a[1].m - b[1].p / b[1].m).map(([t, v]) => `<tr><th scope="row">${esc(t)}</th><td class="num">${v.p}</td><td class="num">${v.m}</td><td class="num">${Math.round(v.p / v.m * 100)}%</td></tr>`).join("")}</tbody></table></div>`;
  const fout = q.items.filter(i => i.behaald < i.punten && kaartVan(i));
  const zwakkeLes = Object.entries(perOnderdeel).filter(([, v]) => v.p / v.m < 0.55).map(([g]) => g);
  const lesKaart = zwakkeLes.map(g => app.gen.toetsbareKaarten.find(b => b.les === g || b.onderwerp === g)).filter(Boolean).slice(0, 3);
  main.innerHTML = `
    <h1 style="view-transition-name:titel">Resultaat</h1>
    ${q.tijdOm ? `<p class="feedback no" role="alert">De tijd is om. Onbeantwoorde vragen tellen als 0 punten.</p>` : ""}
    ${q.aanpassing?.length ? `<p class="src">De verdeling is aangepast: ${q.aanpassing.map(esc).join(" en ")}.</p>` : ""}
    <div class="card uitslag">
      <div><p class="uit-p"><strong>${behaald}</strong> van ${pt(max)}</p><p class="src m0">${Math.round(behaald / (max || 1) * 100)}% van de punten${inst.gokcorrectie ? ` · na gokcorrectie ${Math.round(pEff / (max || 1) * 100)}%` : ""}</p></div>
      <div class="cijfer ${c >= 5.5 ? "voldoende" : "onvoldoende"}"><span>${cijferTekst(c)}</span><small>${c >= 5.5 ? "Voldoende" : "Onvoldoende"}</small></div>
    </div>
    <p class="src">${inst.norm === "cesuur" ? `Cesuur ${inst.cesuur}%: bij ${inst.cesuur}% van de punten een 5,5.` : "Cijfer = 1 + 9 × (punten / maximum)."} De officiële toets kan een andere norm gebruiken.</p>
    <div class="row">
      <button type="button" class="btn btn-primary" data-actie="nieuw">Nieuwe toets</button>
      <button type="button" class="btn" data-actie="opnieuw">Zelfde vragen opnieuw</button>
      ${fout.length ? `<button type="button" class="btn" data-actie="foutFlash">Fouten naar flashcards (${fout.length})</button>` : ""}
      <a class="btn" href="#/voortgang">Naar voortgang</a>
    </div>
    ${lesKaart.length ? `<div class="card"><p class="m0"><strong>Nog eens uitleg nodig?</strong> Video's bij je zwakste onderdelen:</p><div class="row">${lesKaart.map(b => videoKnop(b, { klein: false }).replace("Video-uitleg", `Video's: ${esc(kort(b.les || b.onderwerp, 40))}`)).join("")}</div></div>` : ""}
    ${tabel("Terugkoppelingsrapportage", isVraag() ? "Les" : "Onderdeel", perOnderdeel)}
    ${tabel("Per vraagtype", "Type", perType)}
    ${fout.length ? `<h2>Nog eens bekijken</h2>${fout.map(it => { const b = kaartVan(it); return `<article class="card"><div class="begrip-kop"><h3 class="term">${rich(plain(b.begrip))}</h3>${sterKnop(b.id)}</div><div class="tekst">${rich(b.uitleg)}</div>${kaartVoet(b)}</article>`; }).join("")}` : ""}`;
  telOp($(".cijfer span", main), 1, c, 900, cijferTekst);
  telOp($(".uit-p strong", main), 0, behaald, 700);
  if (c >= 8 && !q.tijdOm && !q.gevierd) { q.gevierd = true; setTimeout(() => confetti($(".cijfer", main)), 350); }
  linkTermen(main);
  acties(main, {
    nieuw: () => { app.quiz = null; startScherm(main, signal, {}); main.focus({ preventScroll: true }); },
    opnieuw: () => {
      for (const it of q.items) {
        Object.assign(it, { behaald: null, answer: null, tekst: "", invoer: "", gemist: [], gemarkeerd: false, aangeraakt: false });
        if (it.kind === "koppel") it.antwoord = {};
        if (it.kind === "volgorde") it.antwoord = it.antwoord.slice().sort(() => Math.random() - 0.5);
        if (it.opts) it.opts = it.opts.slice().sort(() => Math.random() - 0.5);
      }
      Object.assign(q, { i: 0, klaar: false, tijdOm: false, verstreken: 0, fase: "vragen", gevierd: false, limit: q.instel?.tijd ? q.instel.tijd * q.items.length : 0 });
      opslaan(); vraagScherm(main, signal);
    },
    foutFlash: () => { const p = prog(), now = Date.now(); for (const it of fout) p.cards[it.id] = nuHerhalen(p.cards[it.id], now); bewaar(); app.flash = null; toast(`${fout.length} kaarten staan klaar in de flashcards.`); },
    ster: el => wisselSter(el.dataset.id, el),
    videos: el => toonVideos(app.gen.byId(el.dataset.id))
  }, signal);
}
