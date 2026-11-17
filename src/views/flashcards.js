// Flashcards met FSRS. Het scherm wordt één keer opgebouwd; daarna wordt alleen de kaart
// vervangen (#69), zodat filters, meter en focus blijven staan.
import { esc, rich, plain, shuffle, besteGelijkenis, gelijkenis } from "../domain/text.js";
import { grade as srsGrade, preview, ivText, isLeech, localDay } from "../domain/srs.js";
import { mask, toetsbaar, createQuizGenerator } from "../domain/quiz.js";
import { sleutels, basisId, soortVan, clozeNr, clozes, slideVolgorde } from "../domain/kaarten.js";
import { STD_LIMIET } from "../domain/stats.js";
import { app, prog, bewaar, instellingen, noteerDag, fetchData, weightOf } from "../core/store.js";
import { $, acties, say, toast } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";
import { meters, confetti } from "../ui/motion.js";
import { veegbaar } from "../ui/swipe.js";
import { laadExtra, engels, sterKnop, wisselSter, notitieHtml, notitieBewerker, bewaarNotitie, kaartVoet, linkTermen, verwantHtml, videoKnop, toonVideos } from "../ui/kaart-extra.js";

const KNOPPEN = ["Opnieuw", "Moeilijk", "Goed", "Makkelijk"];
const lesLabel = l => `Les ${l.nr} – ${l.titel}`;

// Context per module (voor "alle modules", #8): data, generator en voortgang.
const ctxCache = new Map();
async function modCtx(id) {
  if (!ctxCache.has(id)) {
    const mod = app.modules.find(m => m.id === id), data = await fetchData(mod);
    ctxCache.set(id, { mod, data, gen: createQuizGenerator({ data, weightOf: x => weightOf(x, prog(id)) }) });
  }
  return ctxCache.get(id);
}

function bouwSessie(f) {
  const inst = instellingen(), now = Date.now();
  if (f.modus === "alle") return f; // wordt asynchroon gevuld
  const p = prog();
  const kaarten = app.gen.toetsbareKaarten.filter(b =>
    (!f.topic || b.onderwerp === f.topic) && (!f.les || b.les === f.les) && (!f.ster || p.sterren[b.id]) &&
    (f.modus !== "moeilijk" || isLeech(p.cards[b.id])));
  const opties = { richting: inst.richting, cloze: inst.cloze, kaarttype: app.data.kaarttype };
  const due = [], nieuw = [];
  if (p.newDay.day !== localDay()) p.newDay = { day: localDay(), n: 0 };
  const ruimte = f.modus === "les" ? Infinity : f.modus === "moeilijk" ? 0 : Math.max(0, (p.limiet ?? STD_LIMIET) - p.newDay.n);
  const volgorde = inst.volgorde === "slides" ? slideVolgorde(kaarten) : shuffle(kaarten);
  for (const b of volgorde) {
    for (const k of sleutels(b, opties)) {
      const c = p.cards[k];
      if (c) { if (c.due <= now || f.modus === "moeilijk") due.push(k); continue; }
      // Omgekeerde en invulkaarten komen pas als de gewone kaart al eens gezien is (broers niet op dezelfde dag).
      if (k !== b.id && !p.cards[b.id]) continue;
      if (nieuw.length < ruimte) nieuw.push(k);
    }
  }
  return Object.assign(f, { queue: [...shuffle(due), ...nieuw].map(key => ({ key, mod: app.mod.id })), done: 0, shown: false, undo: [], cram: f.modus === "moeilijk" });
}

async function bouwAlle(f) {
  const now = Date.now(), items = [];
  for (const m of app.modules) {
    const c = await modCtx(m.id), p = prog(m.id), ids = new Set(c.gen.toetsbareKaarten.map(b => b.id));
    for (const [k, s] of Object.entries(p.cards)) if (ids.has(basisId(k)) && s.due <= now) items.push({ key: k, mod: m.id });
  }
  return Object.assign(f, { queue: shuffle(items), done: 0, shown: false, undo: [], cram: false });
}

export default {
  async mount({ main, params, signal }) {
    await laadExtra();
    // In "alle modules" wisselt app.mod per kaart; zet bij het verlaten de gekozen module terug.
    const origineel = { mod: app.mod, data: app.data, gen: app.gen };
    signal.addEventListener("abort", () => { if (params.modus === "alle") Object.assign(app, origineel); document.body.classList.remove("focus"); });
    const f0 = { topic: params.t || "", les: params.les || "", ster: !!params.ster, modus: params.modus || "" };
    const zelfde = app.flash && ["topic", "les", "ster", "modus"].every(k => app.flash[k] === f0[k]) && (f0.modus !== "alle" || app.flash.modus === "alle");
    if (!zelfde) app.flash = f0.modus === "alle" ? await bouwAlle(f0) : bouwSessie(f0);
    const f = app.flash;
    const lessen = (app.data.lessen || []).filter(l => l.aantal > 0);
    const p0 = prog();

    main.innerHTML = `
      <div class="kop-rij"><h1 style="view-transition-name:titel">Flashcards</h1>
        <button type="button" class="btn btn-klein" data-actie="focus" aria-pressed="false" title="Focusmodus (f)">Focus</button></div>
      <p class="sub">${f.modus === "alle" ? "Alle modules · alleen kaarten die klaarstaan" : `<span style="view-transition-name:mod-${esc(app.mod.id)}">${esc(app.mod.titel)}</span>`}
        ${f.modus === "les" ? ` · alle nieuwe kaarten van ${esc(f.les)}` : f.modus === "moeilijk" ? " · alleen moeilijke kaarten" : ""}</p>
      ${f.modus === "alle" ? "" : `<div class="row filters">
        ${lessen.length ? `<label class="field">Les<select id="fl" data-wijzig="filter"><option value="">Alles</option>${lessen.map(l => `<option>${esc(lesLabel(l))}</option>`).join("")}</select></label>` : ""}
        <label class="field">Onderwerp<select id="ft" data-wijzig="filter"><option value="">Alles</option>${[...new Set(app.gen.toetsbareKaarten.map(b => b.onderwerp))].map(o => `<option>${esc(o)}</option>`).join("")}</select></label>
        <label class="field">Nieuw per dag<select id="fn" data-wijzig="limiet">${[5, 10, 15, 25, 40, 60].map(v => `<option ${v === (p0.limiet ?? STD_LIMIET) ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="check"><input type="checkbox" id="fs" data-wijzig="filter"> Alleen gemarkeerd</label>
      </div>`}
      <p class="count" id="telling"></p>
      <div class="meter" data-meter="flash" role="progressbar" aria-label="Voortgang sessie" aria-valuemin="0"><span></span></div>
      <div id="kaartvak"></div>
      <p class="src sneltoets-hint">Toetsen: spatie = omdraaien · 1–4 = beoordelen · z = ongedaan maken · s = ster · n = notitie · f = focus · ? = alle toetsen</p>`;
    if ($("#fl", main)) $("#fl", main).value = f.les;
    if ($("#ft", main)) $("#ft", main).value = f.topic;
    if ($("#fs", main)) $("#fs", main).checked = f.ster;
    const vak = $("#kaartvak", main);

    function kop() {
      const total = f.queue.length + f.done;
      $("#telling", main).textContent = `${f.done} van ${total} gedaan`;
      const m = $(".meter", main);
      m.setAttribute("aria-valuemax", total); m.setAttribute("aria-valuenow", f.done);
      m.firstElementChild.style.width = `${total ? f.done / total * 100 : 0}%`;
      meters(main);
    }

    async function teken() {
      kop();
      if (!f.queue.length) return klaar();
      const item = f.queue[0];
      if (f.modus === "alle") { const c = await modCtx(item.mod); Object.assign(app, { mod: c.mod, data: c.data, gen: c.gen }); }
      const b = app.gen.byId(basisId(item.key));
      if (!b) { f.queue.shift(); return teken(); }
      const soort = soortVan(item.key), p = prog(item.mod), c = p.cards[item.key];
      const inst = instellingen(), typen = inst.typen && soort !== "normaal";
      const cz = soort === "cloze" ? clozes(b)[clozeNr(item.key) - 1] : null;
      if (soort === "cloze" && !cz) { f.queue.shift(); return teken(); }
      const isVraag = app.data.kaarttype === "vraag";
      const voor = soort === "omgekeerd"
        ? `<p class="modelkop">Welk begrip hoort hierbij?</p><div class="tekst0 voor-tekst">${rich(mask(b))}</div>`
        : soort === "cloze"
          ? `${isVraag ? `<p class="modelkop">${rich(b.begrip)}</p>` : `<p class="modelkop">${esc(plain(b.begrip))} — vul in</p>`}<div class="tekst0 voor-tekst">${rich(cz.vraag)}</div>`
          : `<p class="${isVraag ? "prompt flash-vraag" : "q"}">${rich(b.begrip)}</p>`;
      const achter = soort === "cloze"
        ? `<div class="tekst0">${rich(cz.vol)}</div>`
        : `<p class="${soort === "omgekeerd" ? "q klein" : "achter-vraag"}">${rich(b.begrip)}</p><hr aria-hidden="true" class="scheiding"><div class="tekst0">${rich(b.uitleg)}</div>`;
      const tags = `<div class="flash-tags"><span class="tag">${esc(b.onderwerp)}</span>${b.les ? `<span class="tag">${esc(b.les)}</span>` : ""}
        ${f.modus === "alle" ? `<span class="tag">${esc(app.mod.titel)}</span>` : ""}
        ${soort !== "normaal" ? `<span class="tag tag-extra">${soort === "omgekeerd" ? "omgekeerd" : "invullen"}</span>` : ""}
        ${isLeech(c) ? `<span class="tag tag-moeilijk">moeilijke kaart</span>` : ""}${engels(b)}</div>`;
      vak.innerHTML = `
        <div class="flip-scene">
          <section class="card flash flip-kaart kaart-in" aria-label="Flashcard" aria-live="polite">
            <div class="flip-voor">
              <div class="flash-top">${tags}${sterKnop(b.id)}</div>
              ${voor}
              ${typen ? `<label class="typ-veld"><span class="visually-hidden">Jouw antwoord</span><input id="typ" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Typ je antwoord en druk op Enter"></label>` : ""}
            </div>
            <div class="flip-achter" hidden>
              <div class="flash-top">${tags}${sterKnop(b.id)}</div>
              <div id="typ-uitslag"></div>
              ${achter}
              ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
              ${notitieHtml(b.id)}
              ${isLeech(c) ? `<div class="leech-tip"><strong>Deze kaart ging ${c.lapses}× fout.</strong> Probeer hem kleiner te maken: schrijf in je eigen woorden één kernzin of een ezelsbruggetje op.
                <button type="button" class="btn btn-klein" data-actie="notitie">Notitie toevoegen</button></div>` : ""}
              <div id="notitievak"></div>
              ${verwantHtml(b)}
              <div class="row kaart-acties">${videoKnop(b)}<button type="button" class="btn btn-klein" data-actie="notitie">Notitie (n)</button></div>
              ${kaartVoet(b)}
            </div>
          </section>
        </div>
        <div id="knoppen">${toonKnop()}</div>`;
      if (typen) { const i = $("#typ", vak); i.focus(); i.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); omdraaien(); } }); }
      else $("#show", vak)?.focus();
      f.shown = false;
      function toonKnop() {
        return `<div class="row">${f.undo.length ? `<button type="button" class="btn" data-actie="undo" title="Ongedaan maken (z)">↶ Terug</button>` : ""}
          <button type="button" class="btn btn-primary grow" id="show" data-actie="omdraaien">${typen ? "Controleer" : "Toon antwoord"} <span aria-hidden="true">(spatie)</span></button></div>`;
      }
    }

    function omdraaien() {
      if (f.shown || !f.queue.length) return;
      const item = f.queue[0], b = app.gen.byId(basisId(item.key)), c = prog(item.mod).cards[item.key];
      f.shown = true;
      const kaart = $(".flip-kaart", vak);
      $(".flip-achter", vak).hidden = false;
      kaart.classList.remove("kaart-in"); kaart.classList.add("omgedraaid");
      $(".flip-voor", vak).setAttribute("aria-hidden", "true");
      // Getypt antwoord vergelijken (#3).
      let voorstel = 2;
      const typ = $("#typ", vak);
      if (typ) {
        const soort = soortVan(item.key);
        const juist = soort === "cloze" ? clozes(b)[clozeNr(item.key) - 1].antwoord : plain(b.begrip);
        const g = soort === "cloze" ? gelijkenis(typ.value, juist) : besteGelijkenis(typ.value, b.begrip);
        voorstel = g >= 0.85 ? 2 : g >= 0.6 ? 1 : 0;
        $("#typ-uitslag", vak).innerHTML = `<p class="feedback ${voorstel === 2 ? "ok" : voorstel === 1 ? "" : "no"}"><strong>${voorstel === 2 ? "Goed" : voorstel === 1 ? "Bijna" : "Niet goed"}.</strong>
          Jij: <em>${esc(typ.value || "–")}</em>${voorstel === 2 && g === 1 ? "" : ` · juist: <strong>${esc(juist)}</strong>`}</p>`;
      }
      const r = instellingen().retentie;
      $("#knoppen", vak).innerHTML = `<div class="grade" role="group" aria-label="Hoe goed wist je het?">
        ${KNOPPEN.map((l, g) => `<button type="button" class="btn ${g === voorstel ? "btn-primary" : ""}" data-actie="beoordeel" data-g="${g}">${l}${f.cram ? "" : `<small>${ivText(preview(c, g, Date.now(), r))}</small>`}<span class="visually-hidden"> (toets ${g + 1})</span></button>`).join("")}
      </div>${f.undo.length ? `<button type="button" class="btn btn-klein" data-actie="undo">↶ Vorige kaart terug (z)</button>` : ""}
      <p class="src veeg-hint">Op de telefoon: veeg naar links (opnieuw), rechts (goed) of omhoog (makkelijk).</p>`;
      linkTermen($(".flip-achter", vak), b.id);
      $(`.grade [data-g="${voorstel}"]`, vak)?.focus();
      say(`Antwoord: ${plain(b.uitleg).slice(0, 160)}`);
      veegbaar(kaart, g => beoordeel(g), signal);
    }

    function beoordeel(g) {
      if (!f.shown || !f.queue.length) return;
      const item = f.queue.shift(), p = prog(item.mod), oud = p.cards[item.key];
      const dag = localDay();
      if (p.newDay.day !== dag) p.newDay = { day: dag, n: 0 };
      f.undo.push({ item, oud: oud ? { ...oud } : undefined, newDay: { ...p.newDay }, was0: g === 0 });
      if (f.undo.length > 20) f.undo.shift();
      if (!f.cram) {
        if (!oud) p.newDay.n++;
        p.cards[item.key] = srsGrade(oud, g, Date.now(), instellingen().retentie);
        bewaar(item.mod);
        noteerDag({ n: 1, nieuw: oud ? 0 : 1 });
      }
      if (g === 0) f.queue.splice(Math.min(f.queue.length, 3), 0, item); else f.done++;
      teken();
    }

    function undo() {
      const u = f.undo.pop(); if (!u) return;
      const p = prog(u.item.mod);
      if (!f.cram) {
        if (u.oud) p.cards[u.item.key] = u.oud; else delete p.cards[u.item.key];
        p.newDay = u.newDay; bewaar(u.item.mod);
        noteerDag({ n: -1, nieuw: u.oud ? 0 : -1 });
      }
      if (u.was0) { const i = f.queue.findIndex(x => x.key === u.item.key && x.mod === u.item.mod); if (i >= 0) f.queue.splice(i, 1); }
      else f.done--;
      f.queue.unshift(u.item);
      teken(); say("Laatste beoordeling ongedaan gemaakt");
    }

    function klaar() {
      const p = prog();
      const next = Object.values(p.cards).map(c => c.due).filter(d => d > Date.now()).sort((a, b) => a - b)[0];
      const hard = f.modus === "alle" ? 0 : app.gen.toetsbareKaarten.filter(b => isLeech(p.cards[b.id])).length;
      vak.innerHTML = `<div class="card kaart-in"><h2 class="kop0">Klaar voor nu</h2>
        <p>Er staan geen kaarten meer klaar.${next && f.modus !== "alle" ? ` Volgende herhaling: ${new Date(next).toLocaleString("nl-NL", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.` : ""}</p>
        <div class="row">
          ${f.modus !== "alle" ? `<button type="button" class="btn btn-primary" data-actie="nogmaals">Oefen deze selectie nog een keer</button>` : ""}
          ${hard ? `<a class="btn" href="${link("flashcards", { modus: "moeilijk" })}">Alleen moeilijke kaarten (${hard})</a>` : ""}
          ${f.undo.length ? `<button type="button" class="btn" data-actie="undo">↶ Laatste terug</button>` : ""}
          <a class="btn" href="#/vandaag">Naar Vandaag</a>
        </div></div>`;
      if (f.done && !f.gevierd) { f.gevierd = true; confetti($("h2", vak)); }
    }

    const filters = () => {
      const nf = { topic: $("#ft", main)?.value || "", les: $("#fl", main)?.value || "", ster: $("#fs", main)?.checked || false, modus: "" };
      app.flash = bouwSessie(nf); Object.assign(f, app.flash);
      zetParams({ t: nf.topic, les: nf.les, ster: nf.ster ? 1 : "" });
      teken();
    };
    const notitie = () => {
      const item = f.queue[0]; if (!item || !f.shown) return;
      const id = basisId(item.key), nv = $("#notitievak", vak);
      if (nv.innerHTML) { nv.querySelector("textarea")?.focus(); return; }
      nv.innerHTML = notitieBewerker(id);
      const ta = nv.querySelector("textarea"); ta.focus();
      ta.addEventListener("input", () => bewaarNotitie(id, ta.value));
    };
    const focus = knop => {
      const aan = document.body.classList.toggle("focus");
      (knop || $("[data-actie=focus]", main))?.setAttribute("aria-pressed", String(aan));
      say(aan ? "Focusmodus aan. Esc om te stoppen." : "Focusmodus uit");
    };
    acties(main, {
      filter: filters,
      limiet: el => { prog().limiet = +el.value; bewaar(); filters(); },
      omdraaien, beoordeel: el => beoordeel(+el.dataset.g), undo, notitie,
      ster: el => wisselSter(el.dataset.id, el),
      videos: el => toonVideos(app.gen.byId(el.dataset.id)),
      focus: el => focus(el),
      nogmaals: () => { f.queue = shuffle(f.modus === "les" ? bouwSessie({ ...f }).queue : app.gen.toetsbareKaarten.filter(b => (!f.topic || b.onderwerp === f.topic) && (!f.les || b.les === f.les)).map(b => ({ key: b.id, mod: app.mod.id }))); f.done = 0; f.cram = true; f.gevierd = false; teken(); }
    }, signal);
    document.addEventListener("keydown", e => {
      if (e.target.closest?.("input,select,textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!f.shown && (e.key === " " || e.key === "Enter") && document.activeElement?.id !== "show") { e.preventDefault(); omdraaien(); }
      else if (f.shown && ["1", "2", "3", "4"].includes(e.key)) { e.preventDefault(); beoordeel(+e.key - 1); }
      else if (e.key === "z") undo();
      else if (e.key === "s" && f.queue[0]) { const k = $(f.shown ? ".flip-achter .ster" : ".flip-voor .ster", vak); wisselSter(basisId(f.queue[0].key), k); }
      else if (e.key === "n") { e.preventDefault(); notitie(); }
      else if (e.key === "f") focus();
      else if (e.key === "Escape" && document.body.classList.contains("focus")) focus();
    }, { signal });
    teken();
  }
};
