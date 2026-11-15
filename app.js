/* Leeromgeving BML – statische app, geen build-stap.
   Data: data/modules.json + data/jaar-<j>/periode-<p>/<module>.json. Voortgang: localStorage (per browser).
   Een module bevat begripkaarten (begrip → uitleg) of vraagkaarten (vraag → antwoord, kaarttype "vraag"). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const main = $("#main");
  const live = $("#live");
  const DAY = 864e5;

  const state = { modules: [], mod: null, data: null, prog: null, flash: null, quiz: null };

  // ---------- helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // Opmaak uit de bronkaarten (vet, cursief, regeleinde, lijst) blijft staan; al het andere wordt tekst.
  const rich = s => esc(s).replace(/&lt;(\/?)(b|i|u|em|strong|br|sup|sub|ul|ol|li|p)&gt;/g, "<$1$2>");
  const plain = s => String(s ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const say = msg => { live.textContent = ""; setTimeout(() => (live.textContent = msg), 30); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const byId = id => state.data.begrippen.find(b => b.id === id);
  const isVraag = () => state.data.kaarttype === "vraag";
  const newPerDay = () => state.prog.limiet ?? 15;

  const topics = () => [...new Set(state.data.begrippen.map(b => b.onderwerp))];
  const lessen = () => state.data.lessen ? state.data.lessen.filter(l => l.aantal > 0) : [];
  // Groepeer vraagmodules per les, begripmodules per onderwerp.
  const groep = b => (isVraag() && b.les) ? b.les : b.onderwerp;
  const groepen = () => [...new Set(state.data.begrippen.map(groep))];

  function src(b) {
    const f = (b.bron_bestand || "").replace(" - student.pptx", "").replace(/\.(pptx|docx)$/, "");
    if (!f) return "";
    return b.bron_slides && b.bron_slides.length ? `${esc(f)}, slide ${b.bron_slides.join(", ")}` : esc(f);
  }
  const focusMain = () => main.focus({ preventScroll: false });
  const opties = (lijst, sel) => `<option value="">Alles</option>` + lijst.map(t => `<option ${t === sel ? "selected" : ""}>${esc(t)}</option>`).join("");

  // ---------- thema (Labwit licht/donker) ----------
  function setupTheme() {
    const btn = $("#theme"), root = document.documentElement, meta = document.querySelector('meta[name="theme-color"]');
    const apply = (t, save) => {
      root.setAttribute("data-theme", t);
      btn.setAttribute("aria-pressed", String(t === "dark"));
      meta.setAttribute("content", t === "dark" ? "#0f1719" : "#0b6e74");
      if (save) { try { localStorage.setItem("leeromgeving:thema", t); } catch {} say(t === "dark" ? "Donkere modus aan" : "Donkere modus uit"); }
    };
    apply(root.getAttribute("data-theme") || "light", false);
    btn.addEventListener("click", () => apply(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true));
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", e => {
      let saved = null; try { saved = localStorage.getItem("leeromgeving:thema"); } catch {}
      if (!saved) apply(e.matches ? "dark" : "light", false);
    });
  }

  // ---------- opslag ----------
  const key = () => `leeromgeving:${state.mod.id}`;
  function loadProg() {
    try { state.prog = JSON.parse(localStorage.getItem(key())) || {}; } catch { state.prog = {}; }
    state.prog.cards ??= {}; state.prog.quiz ??= {}; state.prog.history ??= []; state.prog.newDay ??= { day: "", n: 0 };
  }
  function saveProg() { try { localStorage.setItem(key(), JSON.stringify(state.prog)); } catch {} }

  // ---------- laden ----------
  async function init() {
    setupTheme();
    try {
      const r = await fetch("data/modules.json");
      state.modules = (await r.json()).modules;
    } catch { main.innerHTML = `<p role="alert">Kon de modules niet laden.</p>`; return; }
    const sel = $("#module");
    const groepjes = {};
    for (const m of state.modules) (groepjes[m.periode] ||= []).push(m);
    sel.innerHTML = Object.entries(groepjes)
      .sort((a, b) => (a[1][0].jaar - b[1][0].jaar) || (a[1][0].periode_nr - b[1][0].periode_nr))
      .map(([g, ms]) => `<optgroup label="${esc(g)}">${ms.map(m => `<option value="${esc(m.id)}">${esc(m.titel)}</option>`).join("")}</optgroup>`).join("");
    let last = null; try { last = localStorage.getItem("leeromgeving:module"); } catch {}
    if (last && state.modules.some(m => m.id === last)) sel.value = last;
    sel.addEventListener("change", async () => { await loadModule(sel.value); route(); });
    await loadModule(sel.value);
    window.addEventListener("hashchange", route);
    route();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  async function loadModule(id) {
    state.mod = state.modules.find(m => m.id === id);
    const r = await fetch(state.mod.bestand);
    state.data = await r.json();
    try { localStorage.setItem("leeromgeving:module", id); } catch {}
    state.flash = null; state.quiz = null; bState = { q: "", t: "", l: "" };
    loadProg();
  }

  // ---------- routing ----------
  function route() {
    const r = (location.hash.replace(/^#\/?/, "") || "begrippen").split("?")[0];
    document.querySelectorAll(".tabs a").forEach(a => { if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
    ({ begrippen: viewBegrippen, flashcards: viewFlash, toets: viewToets, voortgang: viewVoortgang }[r] || viewBegrippen)();
    const t = { begrippen: isVraag() ? "Vragen" : "Begrippen", flashcards: "Flashcards", toets: "Oefentoets", voortgang: "Voortgang" }[r] || "Begrippen";
    $(".tabs a[data-route=begrippen]").textContent = isVraag() ? "Vragen" : "Begrippen";
    document.title = `${t} · ${state.mod.titel} · Leeromgeving BML`;
  }

  // ---------- lijst (begrippen of vragen) ----------
  let bState = { q: "", t: "", l: "" };
  function filterPool() {
    const q = bState.q.trim().toLowerCase();
    return state.data.begrippen.filter(b =>
      (!bState.t || b.onderwerp === bState.t) &&
      (!bState.l || b.les === bState.l) &&
      (!q || plain(b.begrip + " " + b.uitleg + " " + (b.aanvulling || "")).toLowerCase().includes(q)));
  }
  function viewBegrippen() {
    const les = lessen();
    main.innerHTML = `
      <h1>${isVraag() ? "Vragen en antwoorden" : "Begrippenlijst"}</h1>
      <p class="sub">${esc(state.mod.titel)} · ${esc(state.mod.periode)} · ${state.data.begrippen.length} ${isVraag() ? "kaarten" : "begrippen"}</p>
      <div class="row" role="search">
        <label class="field grow">Zoeken<input id="q" type="search" value="${esc(bState.q)}" placeholder="zoek op woord" autocomplete="off"></label>
        ${les.length ? `<label class="field">Les<select id="l">${opties(les.map(l => `Les ${l.nr} – ${l.titel}`), bState.l)}</select></label>` : ""}
        <label class="field">Onderwerp<select id="t">${opties(topics(), bState.t)}</select></label>
      </div>
      <p class="count" id="count" aria-live="polite"></p>
      <div id="list"></div>`;
    const draw = () => {
      const items = filterPool();
      $("#count").textContent = `${items.length} ${items.length === 1 ? "kaart" : "kaarten"} gevonden`;
      let html = "", cur = "";
      for (const b of items) {
        const g = groep(b);
        if (g !== cur) { cur = g; html += `<h2 class="group-h">${esc(cur)}</h2>`; }
        html += `<article class="card" aria-labelledby="${b.id}">
          <h3 class="term" id="${b.id}">${rich(b.begrip)}</h3>
          ${isVraag() ? `<span class="tag">${esc(b.onderwerp)}</span>` : ""}
          <p style="margin:.4rem 0 0">${rich(b.uitleg)}</p>
          ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
          ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}
        </article>`;
      }
      $("#list").innerHTML = html || `<p>Niets gevonden.</p>`;
    };
    $("#q").addEventListener("input", e => { bState.q = e.target.value; draw(); });
    $("#t").addEventListener("change", e => { bState.t = e.target.value; draw(); });
    $("#l")?.addEventListener("change", e => { bState.l = e.target.value; draw(); });
    draw();
  }

  // ---------- flashcards (spaced repetition) ----------
  const today = () => new Date().toISOString().slice(0, 10);
  const cardState = id => state.prog.cards[id];
  const isLeech = c => c && c.lapses >= 4;

  function pool(f) {
    return state.data.begrippen.filter(b =>
      (!f.topic || b.onderwerp === f.topic) && (!f.les || b.les === f.les) &&
      (!f.onlyHard || isLeech(cardState(b.id))));
  }
  function buildSession(opts = {}) {
    const f = Object.assign({ topic: "", les: "", onlyHard: false }, opts);
    const now = Date.now();
    const p = pool(f);
    const due = shuffle(p.filter(b => cardState(b.id) && cardState(b.id).due <= now));
    if (state.prog.newDay.day !== today()) state.prog.newDay = { day: today(), n: 0 };
    const room = Math.max(0, newPerDay() - state.prog.newDay.n);
    const fresh = p.filter(b => !cardState(b.id)).slice(0, f.onlyHard ? 0 : room);
    return Object.assign(f, { queue: [...due, ...fresh].map(b => b.id), shown: false, done: 0, cram: false });
  }
  function grade(id, g) {
    const now = Date.now();
    let c = state.prog.cards[id];
    if (!c) { c = { iv: 0, ef: 2.5, reps: 0, lapses: 0, due: now }; state.prog.newDay.n++; }
    if (g === 0) { c.reps = 0; c.lapses++; c.iv = 0; c.ef = Math.max(1.3, c.ef - 0.2); c.due = now + 60e3; }
    else {
      if (g === 1) { c.iv = Math.max(1, Math.round((c.iv || 1) * 1.2)); c.ef = Math.max(1.3, c.ef - 0.15); }
      if (g === 2) c.iv = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.iv * c.ef);
      if (g === 3) { c.iv = c.reps === 0 ? 4 : Math.round(Math.max(4, c.iv * c.ef * 1.3)); c.ef += 0.15; }
      c.reps++; c.due = now + c.iv * DAY;
    }
    state.prog.cards[id] = c; saveProg();
  }
  const ivText = d => d < 1 ? "1 min" : d === 1 ? "1 dag" : d < 31 ? `${d} dagen` : `${Math.round(d / 30)} mnd`;
  function preview(id, g) {
    const c = state.prog.cards[id] || { iv: 0, ef: 2.5, reps: 0 };
    if (g === 0) return 0;
    if (g === 1) return Math.max(1, Math.round((c.iv || 1) * 1.2));
    if (g === 2) return c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.iv * c.ef);
    return c.reps === 0 ? 4 : Math.round(Math.max(4, c.iv * c.ef * 1.3));
  }

  function viewFlash() {
    if (!state.flash) state.flash = buildSession();
    const f = state.flash, les = lessen();
    const total = f.queue.length + f.done;
    const head = `
      <h1>Flashcards</h1>
      <p class="sub">Kaarten die je goed kent komen later terug. Maximaal ${newPerDay()} nieuwe kaarten per dag${f.onlyHard ? " · alleen moeilijke kaarten" : ""}.</p>
      <div class="row">
        ${les.length ? `<label class="field">Les<select id="fl">${opties(les.map(l => `Les ${l.nr} – ${l.titel}`), f.les)}</select></label>` : ""}
        <label class="field">Onderwerp<select id="ft">${opties(topics(), f.topic)}</select></label>
        <label class="field">Nieuw per dag<select id="fn">${[5, 10, 15, 25, 40].map(v => `<option ${v === newPerDay() ? "selected" : ""}>${v}</option>`).join("")}</select></label>
      </div>
      <p class="count">${f.done} van ${total} gedaan</p>
      <div class="meter" role="progressbar" aria-label="Voortgang sessie" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${f.done}"><span style="width:${total ? (f.done / total) * 100 : 0}%"></span></div>`;

    if (!f.queue.length) {
      const next = Object.values(state.prog.cards).map(c => c.due).filter(d => d > Date.now()).sort((a, b) => a - b)[0];
      const hard = state.data.begrippen.filter(b => isLeech(cardState(b.id))).length;
      main.innerHTML = head + `<div class="card"><h2 style="margin-top:0">Klaar voor nu</h2>
        <p>Er staan geen kaarten meer klaar.${next ? ` Volgende herhaling: ${new Date(next).toLocaleString("nl-NL", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.` : ""}</p>
        <div class="row">
          <button class="btn btn-primary" id="extra">Oefen deze selectie nog een keer</button>
          ${hard ? `<button class="btn" id="hard">Alleen moeilijke kaarten (${hard})</button>` : ""}
        </div></div>`;
      $("#extra").onclick = () => { f.queue = shuffle(pool(f).map(b => b.id)); f.done = 0; f.cram = true; viewFlash(); };
      $("#hard")?.addEventListener("click", () => { state.flash = buildSession({ onlyHard: true }); state.flash.queue = shuffle(pool(state.flash).map(b => b.id)); state.flash.cram = true; viewFlash(); });
    } else {
      const b = byId(f.queue[0]);
      const c = cardState(b.id);
      main.innerHTML = head + `
        <section class="card flash" aria-label="Flashcard">
          <div style="display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap">
            <span class="tag">${esc(b.onderwerp)}</span>
            ${b.les ? `<span class="tag">${esc(b.les)}</span>` : ""}
            ${isLeech(c) ? `<span class="tag tag-extra">moeilijke kaart</span>` : ""}
          </div>
          <p class="${isVraag() ? "prompt" : "q"}" style="${isVraag() ? "text-align:left;font-weight:700" : ""}">${rich(b.begrip)}</p>
          ${f.shown ? `<div class="a"><hr aria-hidden="true" style="border:0;border-top:1px solid var(--line);margin:0 0 .9rem"><p style="margin:0">${rich(b.uitleg)}</p>
            ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
            ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}</div>` : ""}
        </section>
        ${f.shown ? `<div class="grade" role="group" aria-label="Hoe goed wist je het?">
            ${["Opnieuw", "Moeilijk", "Goed", "Makkelijk"].map((l, g) => `<button class="btn ${g === 2 ? "btn-primary" : ""}" data-g="${g}">${l}${f.cram ? "" : `<small>${ivText(preview(b.id, g))}</small>`}<span class="visually-hidden"> (toets ${g + 1})</span></button>`).join("")}
          </div>` : `<button class="btn btn-primary" id="show" style="width:100%;margin-top:.8rem">Toon antwoord <span aria-hidden="true">(spatie)</span></button>`}`;
      if (!f.shown) { $("#show").onclick = () => { f.shown = true; viewFlash(); $(".grade .btn-primary")?.focus(); say("Antwoord: " + plain(b.uitleg).slice(0, 160)); }; $("#show").focus(); }
      else main.querySelectorAll("[data-g]").forEach(btn => btn.onclick = () => doGrade(+btn.dataset.g));
    }
    $("#ft").onchange = e => { state.flash = buildSession({ topic: e.target.value, les: f.les }); viewFlash(); };
    $("#fl")?.addEventListener("change", e => { state.flash = buildSession({ topic: f.topic, les: e.target.value }); viewFlash(); });
    $("#fn").onchange = e => { state.prog.limiet = +e.target.value; saveProg(); state.flash = buildSession({ topic: f.topic, les: f.les }); viewFlash(); };
  }
  function doGrade(g) {
    const f = state.flash, id = f.queue.shift();
    if (!f.cram) grade(id, g);
    if (g === 0) f.queue.splice(Math.min(f.queue.length, 3), 0, id); else f.done++;
    f.shown = false; viewFlash();
  }
  document.addEventListener("keydown", e => {
    if (!location.hash.startsWith("#/flashcards") || !state.flash || e.target.matches("input,select,textarea")) return;
    if (!state.flash.shown && (e.key === " " || e.key === "Enter") && $("#show") && document.activeElement !== $("#show")) { e.preventDefault(); $("#show").click(); }
    if (state.flash.shown && ["1", "2", "3", "4"].includes(e.key)) { e.preventDefault(); doGrade(+e.key - 1); }
  });

  // ---------- oefentoets ----------
  // Drie vraagtypes: meerkeuze (mc), open vraag (open) en casus (meerdere vragen bij één situatie).
  // De verhouding is instelbaar; onmogelijke types worden automatisch herverdeeld.
  const MIX_STD = { mc: 50, open: 30, casus: 20 };
  const mix = () => Object.assign({}, MIX_STD, state.prog.mix || {});

  function mask(b) {
    const parts = b.begrip.replace(/\(([^)]+)\)/g, ",$1,").split(/[,\/=+–]| en | of /).map(s => s.trim()).filter(s => s.length >= 3);
    let t = b.uitleg;
    for (const p of parts.sort((a, c) => c.length - a.length)) t = t.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "▁▁▁");
    return t;
  }
  const kort = (s, n = 150) => { const t = plain(s); return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t; };
  function weightOf(id) { const q = state.prog.quiz[id] || { ok: 0, no: 0 }; return Math.max(0.5, 1 + 2 * q.no - q.ok); }
  function pickWeighted(p, n) {
    const out = [], rest = p.slice();
    while (out.length < n && rest.length) {
      const tot = rest.reduce((s, b) => s + weightOf(b.id), 0); let r = Math.random() * tot, i = 0;
      for (; i < rest.length - 1; i++) { r -= weightOf(rest[i].id); if (r <= 0) break; }
      out.push(rest.splice(i, 1)[0]);
    }
    return out;
  }

  // --- één item bouwen ---
  function makeMC(b, p) {
    // Afleiders mogen niet letterlijk in de vraagtekst staan.
    const noemt = x => plain(b.uitleg).toLowerCase().includes(plain(x.begrip).toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim());
    const bruikbaar = x => x.id !== b.id && !noemt(x);
    const zelfde = shuffle(p.filter(x => bruikbaar(x) && x.onderwerp === b.onderwerp));
    const rest = shuffle(state.data.begrippen.filter(x => bruikbaar(x) && x.onderwerp !== b.onderwerp));
    const distract = [...zelfde, ...rest].slice(0, 3);
    if (distract.length < 3) return makeOpen(b);
    if (isVraag()) {
      const opts = shuffle([b, ...distract]).map(x => ({ id: x.id, text: kort(x.uitleg) }));
      return { id: b.id, kind: "mc", variant: "antwoord", prompt: b.begrip, opts, answer: null };
    }
    const variant = Math.random() < 0.6 ? "uitleg" : "begrip";
    const opts = shuffle([b, ...distract]).map(x => ({ id: x.id, text: variant === "uitleg" ? x.begrip : x.uitleg }));
    return { id: b.id, kind: "mc", variant, prompt: variant === "uitleg" ? mask(b) : b.begrip, opts, answer: null };
  }
  // Een begripkaart is geen vraag; die krijgt een vraagzin om hem heen.
  const openPrompt = b => isVraag() ? b.begrip : `Wat wordt bedoeld met <b>${b.begrip}</b>?`;
  const makeOpen = b => ({ id: b.id, kind: "open", prompt: openPrompt(b), answer: null });

  // --- casussen ---
  // Een module mag eigen casussen meeleveren (data: casussen[{titel,tekst,vragen:[id]}]).
  // Zo niet, dan wordt een casus samengesteld uit vragen die bij hetzelfde onderwerp en dezelfde les horen.
  function casusGroepen(p) {
    if (Array.isArray(state.data.casussen) && state.data.casussen.length) {
      return shuffle(state.data.casussen
        .map(c => ({ titel: c.titel, tekst: c.tekst, items: c.vragen.map(byId).filter(b => b && p.includes(b)) }))
        .filter(c => c.items.length >= 2));
    }
    const buckets = {};
    for (const b of p) ((buckets[`${b.les || ""}||${b.onderwerp}`] ||= []).push(b));
    return shuffle(Object.values(buckets).filter(v => v.length >= 2)).map(v => {
      const items = shuffle(v).slice(0, Math.min(4, v.length));
      const b = items[0];
      const waar = b.les ? ` uit <strong>${esc(b.les)}</strong>` : "";
      return {
        titel: `Casus · ${b.onderwerp}`,
        tekst: `Je staat in het lab en krijgt te maken met <strong>${esc(b.onderwerp)}</strong>${waar}. Beantwoord de ${items.length} vragen die bij deze situatie horen; ze gaan allemaal over dit onderdeel.`,
        items
      };
    });
  }

  function buildItems(p, n, m) {
    const totaal = Math.max(1, m.mc + m.open + m.casus);
    let nCasus = Math.round(n * m.casus / totaal);
    let nMc = Math.round(n * m.mc / totaal);
    let nOpen = n - nCasus - nMc;
    if (nOpen < 0) { nMc += nOpen; nOpen = 0; }
    const aanpassing = [];
    const items = [];
    const gebruikt = new Set();

    // 1. Casussen vullen met hele groepen; een groep blijft bij elkaar.
    let gezet = 0;
    if (nCasus >= 2) {
      let gid = 0;
      for (const g of casusGroepen(p)) {
        if (gezet >= nCasus) break;
        const vrij = g.items.filter(b => !gebruikt.has(b.id));
        if (vrij.length < 2) continue;
        const neem = vrij.slice(0, Math.min(vrij.length, nCasus - gezet, 4));
        if (neem.length < 2) continue;
        gid++;
        neem.forEach((b, i) => {
          gebruikt.add(b.id);
          const it = (!isVraag() && Math.random() < 0.5) ? makeMC(b, p) : makeOpen(b);
          it.casus = { gid, titel: g.titel, tekst: g.tekst, i: i + 1, n: neem.length };
          items.push(it);
        });
        gezet += neem.length;
      }
    }
    if (gezet < nCasus) { const over = nCasus - gezet; nMc += Math.ceil(over / 2); nOpen += Math.floor(over / 2); if (nCasus) aanpassing.push("te weinig samenhangende vragen voor alle casussen"); }

    // 2. Losse vragen.
    const rest = p.filter(b => !gebruikt.has(b.id));
    const los = pickWeighted(rest, Math.min(nMc + nOpen, rest.length));
    let mcOver = nMc;
    for (const b of los) {
      if (mcOver > 0) { const it = makeMC(b, p); if (it.kind === "open" && !aanpassing.includes("te weinig afleiders voor meerkeuze")) aanpassing.push("te weinig afleiders voor meerkeuze"); items.push(it); mcOver--; }
      else items.push(makeOpen(b));
    }

    // 3. Volgorde husselen, casusvragen blijven op volgorde bij elkaar.
    const blokken = [];
    const perCasus = {};
    for (const it of items) {
      if (it.casus) { (perCasus[it.casus.gid] ||= []).push(it); if (perCasus[it.casus.gid].length === 1) blokken.push(perCasus[it.casus.gid]); }
      else blokken.push([it]);
    }
    return { items: shuffle(blokken).flat(), aanpassing };
  }

  let tSettings = { n: 10, t: "", l: "", time: 30 };
  function viewToets() {
    const q = state.quiz;
    if (q && !q.finished) return drawQuestion();
    if (q && q.finished) return drawResult();
    const les = lessen(), m = mix();
    main.innerHTML = `
      <h1>Oefentoets</h1>
      <p class="sub">Stel zelf samen hoeveel meerkeuzevragen, open vragen en casussen je krijgt.</p>
      <form id="qs" class="card">
        <div class="row">
          <label class="field">Aantal vragen<select id="qn">${[10, 20, 30, 40].map(n => `<option ${n === tSettings.n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          ${les.length ? `<label class="field">Les<select id="ql">${opties(les.map(l => `Les ${l.nr} – ${l.titel}`), tSettings.l)}</select></label>` : ""}
          <label class="field">Onderwerp<select id="qt">${opties(topics(), tSettings.t)}</select></label>
          <label class="field">Tijd per vraag<select id="qtime">${[[0, "Geen tijdslimiet"], [20, "20 seconden"], [30, "30 seconden"], [60, "60 seconden"], [90, "90 seconden"]].map(([v, l]) => `<option value="${v}" ${v === tSettings.time ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        </div>

        <fieldset class="mixset">
          <legend>Verdeling vraagtypes</legend>
          <div class="mixrow">
            ${[["mc", "Meerkeuze", "vier antwoorden, één juist"],
               ["open", "Open vraag", "zelf bedenken, daarna jezelf beoordelen"],
               ["casus", "Casus", "2 tot 4 vragen bij één situatie"]].map(([k, naam, uitleg]) => `
              <label class="mixitem">
                <span class="mixname">${naam}</span>
                <span class="mixhelp">${uitleg}</span>
                <input type="range" id="mix-${k}" name="mix-${k}" min="0" max="100" step="5" value="${m[k]}" aria-describedby="mixout-${k}">
                <output id="mixout-${k}" for="mix-${k}">${m[k]}%</output>
              </label>`).join("")}
          </div>
          <p class="src" id="mixinfo" aria-live="polite"></p>
          <button type="button" class="btn" id="mixreset">Terug naar standaard</button>
        </fieldset>

        <p class="src">Met tijdslimiet krijg je een totaaltijd van aantal vragen × tijd per vraag.</p>
        <button class="btn btn-primary" type="submit">Start toets</button>
      </form>`;

    const inputs = ["mc", "open", "casus"].map(k => $(`#mix-${k}`));
    const toonMix = () => {
      const w = {}; let som = 0;
      inputs.forEach(i => { const k = i.id.slice(4); w[k] = +i.value; som += +i.value; });
      inputs.forEach(i => { const k = i.id.slice(4); $(`#mixout-${k}`).textContent = som ? `${Math.round(w[k] / som * 100)}%` : "0%"; });
      const n = +$("#qn").value;
      $("#mixinfo").textContent = som === 0
        ? "Zet minstens één type op meer dan 0."
        : `Dat is ongeveer ${Math.round(n * w.mc / som)} meerkeuze, ${Math.round(n * w.open / som)} open en ${Math.round(n * w.casus / som)} casusvragen.`;
      $("#qs button[type=submit]").disabled = som === 0;
      return w;
    };
    inputs.forEach(i => i.addEventListener("input", () => { const w = toonMix(); state.prog.mix = w; saveProg(); }));
    $("#qn").addEventListener("change", toonMix);
    $("#mixreset").onclick = () => { inputs.forEach(i => i.value = MIX_STD[i.id.slice(4)]); state.prog.mix = Object.assign({}, MIX_STD); saveProg(); toonMix(); say("Verdeling terug op standaard"); };
    toonMix();

    $("#qs").onsubmit = e => {
      e.preventDefault();
      tSettings = { n: +$("#qn").value, t: $("#qt").value, l: $("#ql")?.value || "", time: +$("#qtime").value };
      const m2 = mix();
      const p = state.data.begrippen.filter(b => (!tSettings.t || b.onderwerp === tSettings.t) && (!tSettings.l || b.les === tSettings.l));
      const { items, aanpassing } = buildItems(p, Math.min(tSettings.n, p.length), m2);
      if (!items.length) { say("Geen vragen beschikbaar voor deze selectie"); return; }
      state.quiz = { items, i: 0, limit: tSettings.time ? tSettings.time * items.length : 0, start: Date.now(), finished: false, aanpassing };
      drawQuestion(); focusMain();
    };
  }

  let timerId = null;
  const remaining = () => { const q = state.quiz; return q.limit ? Math.max(0, Math.round(q.limit - (Date.now() - q.start) / 1000)) : null; };
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function tick() {
    const el = $("#timer"); if (!state.quiz || state.quiz.finished) return clearInterval(timerId);
    const r = remaining(); if (r === null) return;
    if (el) el.textContent = mmss(r);
    if (r === 60 || r === 10) say(`Nog ${r} seconden`);
    if (r <= 0) finishQuiz(true);
  }

  function drawQuestion() {
    const q = state.quiz, it = q.items[q.i], b = byId(it.id);
    const answered = it.answer !== null;
    const label = it.casus ? "Casus" : it.kind === "mc" ? "Meerkeuze" : "Open vraag";
    const casusBlok = it.casus ? `
      <section class="casus" aria-label="Casusbeschrijving">
        <p class="casus-t">${esc(it.casus.titel)}</p>
        <p class="casus-x">${rich(it.casus.tekst)}</p>
        <p class="casus-n">Vraag ${it.casus.i} van ${it.casus.n} in deze casus</p>
      </section>` : "";
    const body = it.kind === "open"
      ? `<h2 id="qtext" class="prompt" style="font-weight:600">${rich(it.prompt)}</h2>
         ${answered ? `<div id="fb">${feedbackHtml(it)}</div>` : `<button class="btn btn-primary" id="reveal" style="margin-top:.8rem">Toon antwoord</button>`}`
      : `<h2 id="qtext" class="prompt">${it.variant === "uitleg" ? "Welk begrip hoort bij deze omschrijving?" : it.variant === "begrip" ? `Wat is de juiste omschrijving van <strong>${rich(it.prompt)}</strong>?` : rich(it.prompt)}</h2>
         ${it.variant === "uitleg" ? `<p>${rich(it.prompt)}</p>` : ""}
         <ul class="opts" role="list">
           ${it.opts.map((o, k) => `<li><button class="opt ${answered ? (o.id === it.id ? "ok" : o.id === it.answer ? "no" : "") : ""}" data-id="${o.id}" ${answered ? "disabled" : ""}><span aria-hidden="true">${"ABCD"[k]}. </span>${rich(o.text)}${answered && o.id === it.id ? '<span class="visually-hidden"> (juiste antwoord)</span>' : ""}</button></li>`).join("")}
         </ul>
         <div id="fb">${answered ? feedbackHtml(it) : ""}</div>`;
    main.innerHTML = `
      <h1>Oefentoets</h1>
      <div class="qhead"><span>Vraag ${q.i + 1} van ${q.items.length}</span>${q.limit ? `<span>Resterende tijd: <span class="timer" id="timer">${mmss(remaining())}</span></span>` : ""}</div>
      <div class="meter" aria-hidden="true"><span style="width:${(q.i / q.items.length) * 100}%"></span></div>
      ${casusBlok}
      <section class="card" aria-labelledby="qtext">
        <span class="tag">${label}</span> <span class="tag">${esc(b.onderwerp)}</span>${b.les ? ` <span class="tag">${esc(b.les)}</span>` : ""}
        ${body}
      </section>
      ${answered ? `<button class="btn btn-primary" id="next">${q.i + 1 < q.items.length ? "Volgende vraag" : "Bekijk resultaat"}</button>` : ""}
      <button class="btn" id="stop" style="margin-left:.4rem">Stop toets</button>`;
    main.querySelectorAll(".opt:not([disabled])").forEach(x => x.onclick = () => answer(x.dataset.id));
    $("#reveal")?.addEventListener("click", () => {
      $("#reveal").outerHTML = `<div class="a" style="margin-top:.8rem"><hr aria-hidden="true" style="border:0;border-top:1px solid var(--line);margin:0 0 .8rem"><p style="margin:0">${rich(b.uitleg)}</p>
        ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}</div>
        <div class="row" style="margin-top:.8rem" role="group" aria-label="Wist je het?">
          <button class="btn btn-primary" id="self-ok">Wist ik</button>
          <button class="btn" id="self-no">Wist ik niet</button></div>`;
      $("#self-ok").onclick = () => answer(it.id);
      $("#self-no").onclick = () => answer("__fout__");
      $("#self-ok").focus();
    });
    $("#next")?.addEventListener("click", () => { if (q.i + 1 < q.items.length) { q.i++; drawQuestion(); (main.querySelector(".opt") || $("#reveal"))?.focus(); } else finishQuiz(false); });
    $("#stop").onclick = () => finishQuiz(false, true);
    if (answered) $("#next").focus();
    clearInterval(timerId); if (q.limit) timerId = setInterval(tick, 1000);
  }

  function feedbackHtml(it) {
    const b = byId(it.id), ok = it.answer === it.id;
    if (it.kind === "open") {
      return `<div class="feedback ${ok ? "ok" : "no"}" role="status"><strong>${ok ? "Je wist het." : "Nog niet."}</strong></div>
        <p style="margin:.3rem 0">${rich(b.uitleg)}</p>${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}`;
    }
    const juist = it.variant === "antwoord" || it.variant === "uitleg" ? b.begrip : b.uitleg;
    return `<div class="feedback ${ok ? "ok" : "no"}" role="status"><strong>${ok ? "Goed!" : "Fout."}</strong> ${ok ? "" : `Het juiste antwoord hoort bij <strong>${rich(kort(juist, 120))}</strong>.`}</div>
      <p style="margin:.3rem 0">${rich(b.uitleg)}</p>
      ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
      ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}`;
  }

  function answer(id) {
    const it = state.quiz.items[state.quiz.i]; it.answer = id;
    const rec = state.prog.quiz[it.id] ||= { ok: 0, no: 0 };
    id === it.id ? rec.ok++ : rec.no++; saveProg();
    drawQuestion();
    say(id === it.id ? "Goed" : "Fout");
  }

  function finishQuiz(timeUp, stopped) {
    clearInterval(timerId);
    const q = state.quiz; q.finished = true; q.timeUp = timeUp;
    if (q.items.some(i => i.answer !== null)) {
      const per = {};
      for (const it of q.items) { const t = groep(byId(it.id)); per[t] ||= { ok: 0, n: 0 }; per[t].n++; if (it.answer === it.id) per[t].ok++; }
      state.prog.history.push({ date: new Date().toISOString(), n: q.items.length, ok: q.items.filter(i => i.answer === i.id).length, per, timeUp: !!timeUp, stopped: !!stopped });
      saveProg();
    }
    drawResult(); focusMain();
  }

  function drawResult() {
    const q = state.quiz, ok = q.items.filter(i => i.answer === i.id).length, n = q.items.length;
    const per = {}, perType = {};
    for (const it of q.items) {
      const t = groep(byId(it.id)); per[t] ||= { ok: 0, n: 0 }; per[t].n++; if (it.answer === it.id) per[t].ok++;
      const ty = it.casus ? "Casus" : it.kind === "mc" ? "Meerkeuze" : "Open vraag";
      perType[ty] ||= { ok: 0, n: 0 }; perType[ty].n++; if (it.answer === it.id) perType[ty].ok++;
    }
    const wrong = q.items.filter(i => i.answer !== i.id);
    main.innerHTML = `
      <h1>Resultaat</h1>
      ${q.timeUp ? `<p class="feedback no" role="alert">De tijd is om. Onbeantwoorde vragen tellen als fout.</p>` : ""}
      ${q.aanpassing && q.aanpassing.length ? `<p class="src">De verdeling is aangepast: ${q.aanpassing.map(esc).join(" en ")}.</p>` : ""}
      <p class="card" style="font-size:1.3rem"><strong>${ok} van ${n}</strong> goed (${Math.round((ok / n) * 100)}%)</p>
      <h2>Score per vraagtype</h2>
      <table><thead><tr><th scope="col">Type</th><th scope="col">Goed</th><th scope="col">Score</th></tr></thead>
      <tbody>${Object.entries(perType).map(([t, v]) => `<tr><th scope="row" style="font-weight:600;color:var(--ink)">${esc(t)}</th><td class="num">${v.ok}/${v.n}</td><td class="num">${Math.round((v.ok / v.n) * 100)}%</td></tr>`).join("")}</tbody></table>
      <h2>Score per ${isVraag() ? "les" : "onderwerp"}</h2>
      <table><thead><tr><th scope="col">${isVraag() ? "Les" : "Onderwerp"}</th><th scope="col">Goed</th><th scope="col">Score</th></tr></thead>
      <tbody>${Object.entries(per).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, v]) => `<tr><th scope="row" style="font-weight:600;color:var(--ink)">${esc(t)}</th><td class="num">${v.ok}/${v.n}</td><td class="num">${Math.round((v.ok / v.n) * 100)}%</td></tr>`).join("")}</tbody></table>
      ${wrong.length ? `<h2>Nog eens bekijken</h2>${wrong.map(it => { const b = byId(it.id); return `<article class="card"><h3 class="term">${rich(b.begrip)}</h3><p style="margin:.3rem 0 0">${rich(b.uitleg)}</p>${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}</article>`; }).join("")}` : ""}
      <div class="row" style="margin-top:1rem"><button class="btn btn-primary" id="again">Nieuwe toets</button><a class="btn" href="#/voortgang" style="text-decoration:none">Naar voortgang</a></div>`;
    $("#again").onclick = () => { state.quiz = null; viewToets(); focusMain(); };
  }
  // ---------- voortgang ----------
  function viewVoortgang() {
    const rows = groepen().map(t => {
      const items = state.data.begrippen.filter(b => groep(b) === t);
      const seen = items.filter(b => state.prog.cards[b.id]).length;
      const known = items.filter(b => (state.prog.cards[b.id]?.iv || 0) >= 7).length;
      let ok = 0, no = 0; items.forEach(b => { const q = state.prog.quiz[b.id]; if (q) { ok += q.ok; no += q.no; } });
      return { t, n: items.length, seen, known, pct: ok + no ? Math.round((ok / (ok + no)) * 100) : null };
    });
    const tot = rows.reduce((a, r) => ({ n: a.n + r.n, known: a.known + r.known, seen: a.seen + r.seen }), { n: 0, known: 0, seen: 0 });
    const due = state.data.begrippen.filter(b => state.prog.cards[b.id] && state.prog.cards[b.id].due <= Date.now()).length;
    const hard = state.data.begrippen.filter(b => isLeech(state.prog.cards[b.id]));
    const hist = state.prog.history.slice(-8).reverse();
    main.innerHTML = `
      <h1>Voortgang</h1>
      <p class="sub">${esc(state.mod.titel)} · “beheerst” = kaart komt pas over 7 dagen of later terug.</p>
      <div class="card"><p style="margin:0 0 .4rem"><strong>${tot.known}</strong> van ${tot.n} kaarten beheerst · ${tot.seen} gezien · ${due} klaar om te herhalen</p>
        <div class="meter" role="progressbar" aria-label="Beheerst" aria-valuemin="0" aria-valuemax="${tot.n}" aria-valuenow="${tot.known}"><span style="width:${tot.n ? (tot.known / tot.n) * 100 : 0}%"></span></div></div>
      ${hard.length ? `<div class="card"><p style="margin:0 0 .5rem"><strong>${hard.length} moeilijke ${hard.length === 1 ? "kaart" : "kaarten"}</strong> — vier keer of vaker fout gegaan.</p>
        <a class="btn" href="#/flashcards" id="tohard" style="text-decoration:none">Oefen alleen die kaarten</a></div>` : ""}
      <h2>Per ${isVraag() ? "les" : "onderwerp"}</h2>
      <table><thead><tr><th scope="col">${isVraag() ? "Les" : "Onderwerp"}</th><th scope="col">Gezien</th><th scope="col">Beheerst</th><th scope="col">Toets goed</th></tr></thead>
      <tbody>${rows.map(r => `<tr><th scope="row" style="font-weight:600;color:var(--ink)">${esc(r.t)}</th><td class="num">${r.seen}/${r.n}</td><td class="num">${r.known}/${r.n}</td><td class="num">${r.pct === null ? "–" : r.pct + "%"}</td></tr>`).join("")}</tbody></table>
      <h2>Laatste toetsen</h2>
      ${hist.length ? `<table><thead><tr><th scope="col">Datum</th><th scope="col">Score</th><th scope="col">Zwakste</th></tr></thead><tbody>${hist.map(h => {
        const weak = Object.entries(h.per).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
        return `<tr><td>${new Date(h.date).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td class="num">${h.ok}/${h.n}</td><td>${weak ? esc(weak[0]) : "–"}</td></tr>`; }).join("")}</tbody></table>` : `<p>Nog geen toetsen gemaakt.</p>`}
      <h2>Opslag</h2>
      <p class="src" style="margin-top:0">Voortgang staat alleen in deze browser. Exporteer om over te zetten naar een ander apparaat.</p>
      <div class="row">
        <button class="btn" id="exp">Exporteer voortgang</button>
        <label class="btn" for="imp" style="display:inline-flex;align-items:center">Importeer voortgang</label><input id="imp" type="file" accept="application/json" class="visually-hidden">
        <button class="btn" id="reset">Wis voortgang</button>
      </div>`;
    $("#tohard")?.addEventListener("click", () => { state.flash = buildSession({ onlyHard: true }); state.flash.queue = shuffle(pool(state.flash).map(b => b.id)); state.flash.cram = true; });
    $("#exp").onclick = () => {
      const blob = new Blob([JSON.stringify({ module: state.mod.id, prog: state.prog }, null, 1)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `voortgang-${state.mod.id}-${today()}.json` });
      a.click(); URL.revokeObjectURL(a.href);
    };
    $("#imp").onchange = async e => {
      try { const d = JSON.parse(await e.target.files[0].text()); if (d.module !== state.mod.id) throw 0; state.prog = d.prog; saveProg(); say("Voortgang geïmporteerd"); viewVoortgang(); }
      catch { say("Importeren mislukt: verkeerd bestand of andere module"); }
    };
    $("#reset").onclick = () => {
      const b = $("#reset");
      if (b.dataset.confirm) { try { localStorage.removeItem(key()); } catch {} loadProg(); state.flash = null; say("Voortgang gewist"); viewVoortgang(); }
      else { b.dataset.confirm = "1"; b.textContent = "Klik nogmaals om te wissen"; b.focus(); }
    };
  }

  init();
})();
