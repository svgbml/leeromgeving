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

  const slideUrl = f => (state.data && state.data.slides && state.data.slides[f]) || "";
  function slideNaam(f) {
    const les = (state.data && state.data.lessen || []).find(l => (l.bronnen || []).includes(f));
    if (les) return `Les ${les.nr} – ${les.titel}`;
    return (f || "").replace(" - student.pptx", "").replace(/\.(pptx|docx)$/, "").replace(/_/g, " ");
  }
  // Verwijzing naar het bronbestand; met een Drive-link erachter als die bekend is.
  function slideLink(f, label) {
    const u = slideUrl(f);
    if (!f) return "";
    const naam = esc(label || slideNaam(f));
    return u ? `<a href="${esc(u)}" target="_blank" rel="noopener">${naam}<span class="visually-hidden"> (opent in Google Drive)</span></a>` : naam;
  }
  function src(b) {
    const f = b.bron_bestand || "";
    if (!f) return "";
    const deel = b.bron_slides && b.bron_slides.length ? `, slide ${b.bron_slides.join(", ")}` : "";
    return slideLink(f) + deel;
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
    state.prog.cards ??= {}; state.prog.quiz ??= {}; state.prog.history ??= []; state.prog.newDay ??= { day: "", n: 0 }; state.prog.antwoorden ??= {};
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
  // Opgezet naar het model van de officiële Remindo-oefentoetsen:
  // punten per vraag, casussen met deelvragen A/B/C/D, open vragen met puntenschaal,
  // en een terugkoppelingsrapportage per onderdeel.
  const MIX_STD = { mc: 50, open: 30, casus: 20 };
  const mix = () => Object.assign({}, MIX_STD, state.prog.mix || {});
  const LETTERS = "ABCDEFGH";
  const GEEN = "__geenvan__";

  function mask(b) {
    const parts = b.begrip.replace(/\(([^)]+)\)/g, ",$1,").split(/[,\/=+–]| en | of /).map(s => s.trim()).filter(s => s.length >= 3);
    let t = b.uitleg;
    for (const p of parts.sort((a, c) => c.length - a.length)) t = t.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "_______");
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
  // Puntenweging zoals in de officiële toets: korte kennisvragen 1 punt, zwaardere 2,
  // open vragen 3 of 4 punten.
  function puntenVoor(kind, b, variant) {
    // In de officiele toets levert elke meerkeuzevraag 1 punt op, ongeacht de vorm;
    // open vragen tellen per kernpunt (zie kernpunten()).
    return 1;
  }

  // --- vraag bouwen ---
  // Het antwoordmodel wordt opgesplitst in kernpunten; elk kernpunt is één punt waard.
  // Zo is te zien waar het verschil tussen bijvoorbeeld 2 en 3 punten zit.
  function kernpunten(b) {
    let delen = b.uitleg
      .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "||")
      .replace(/<\/li>/gi, "||").replace(/<li>/gi, "")
      .replace(/<br\s*\/?>\s*(?=[•\-–])/gi, "||")
      .split("||").map(s => s.trim()).filter(Boolean);
    if (delen.length < 2) {
      // Eén blok: op zinnen splitsen, korte stukjes weer aan de vorige zin plakken.
      const zinnen = b.uitleg.split(/(?<=[.!?])\s+(?=[A-Z0-9“„'"<])/).map(s => s.trim()).filter(Boolean);
      delen = [];
      for (const z of zinnen) {
        if (delen.length && plain(z).length < 30) delen[delen.length - 1] += " " + z;
        else delen.push(z);
      }
    }
    delen = delen.map(s => s.replace(/^[•\-–]\s*/, "").replace(/<br\s*\/?>/gi, " ").trim()).filter(s => plain(s).length > 2);
    if (delen.length > 4) {
      // Samenvoegen tot maximaal vier kernpunten, zodat de schaal werkbaar blijft.
      const per = Math.ceil(delen.length / 4), samen = [];
      for (let i = 0; i < delen.length; i += per) samen.push(delen.slice(i, i + per).join(" "));
      delen = samen;
    }
    // Valt er niets te splitsen, dan is het één kernpunt en dus een vraag van één punt.
    if (!delen.length) delen = [b.uitleg];
    return delen.slice(0, 4);
  }
  function makeOpen(b) {
    const prompt = isVraag() ? b.begrip : `Leg uit wat wordt bedoeld met <b>${plain(b.begrip)}</b>.`;
    const kern = kernpunten(b);
    return { id: b.id, kind: "open", variant: "open", prompt, kern, punten: kern.length, behaald: null, answer: null, tekst: "", gemist: [] };
  }
  function makeMC(b, p) {
    const noemt = x => plain(b.uitleg).toLowerCase().includes(plain(x.begrip).toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim());
    const bruikbaar = x => x.id !== b.id && !noemt(x);
    const zelfde = shuffle(state.data.begrippen.filter(x => bruikbaar(x) && x.onderwerp === b.onderwerp));
    const anders = shuffle(state.data.begrippen.filter(x => bruikbaar(x) && x.onderwerp !== b.onderwerp));
    const voorraad = [...zelfde, ...anders];
    // De officiele toets wisselt af tussen vier en vijf antwoordopties.
    const distract = voorraad.slice(0, voorraad.length >= 4 && Math.random() < 0.45 ? 4 : 3);
    if (distract.length < 3) return makeOpen(b);
    const r = Math.random();

    // "Welke hoort NIET bij ...?" — drie uit hetzelfde onderwerp, één eruit.
    if (!isVraag() && r < 0.15 && zelfde.length >= 3 && anders.length >= 1) {
      const binnen = zelfde.slice(0, zelfde.length >= 4 && Math.random() < 0.45 ? 4 : 3), buiten = anders[0];
      const opts = shuffle([...binnen, buiten]).map(x => ({ id: x.id, text: x.begrip }));
      return { id: b.id, kind: "mc", variant: "behalve", onderwerpLabel: b.onderwerp,
        prompt: `De volgende begrippen horen allemaal bij <b>${b.onderwerp}</b>, <b><u>behalve</u></b>`,
        opts, correct: buiten.id, punten: puntenVoor("mc", b, "behalve"), behaald: null, answer: null };
    }
    // "Geen van de andere 3 antwoorden" is het juiste antwoord.
    if (r >= 0.15 && r < 0.27) {
      const opts = shuffle(distract.map(x => ({ id: x.id, text: isVraag() ? kort(x.uitleg) : x.begrip })));
      opts.push({ id: GEEN, text: `Geen van de andere ${distract.length} antwoorden.` });
      return { id: b.id, kind: "mc", variant: "geenvan",
        prompt: isVraag() ? b.begrip : `Welk begrip hoort bij deze omschrijving?`,
        intro: isVraag() ? "" : mask(b),
        opts, correct: GEEN, punten: puntenVoor("mc", b, "geenvan"), behaald: null, answer: null };
    }
    if (isVraag()) {
      const opts = shuffle([b, ...distract]).map(x => ({ id: x.id, text: kort(x.uitleg) }));
      return { id: b.id, kind: "mc", variant: "antwoord", prompt: b.begrip, opts, correct: b.id,
        punten: puntenVoor("mc", b), behaald: null, answer: null };
    }
    const variant = Math.random() < 0.6 ? "invul" : "omschrijving";
    const opts = shuffle([b, ...distract]).map(x => ({ id: x.id, text: variant === "invul" ? x.begrip : kort(x.uitleg, 220) }));
    return { id: b.id, kind: "mc", variant, prompt: variant === "invul" ? "Welk begrip hoort bij deze omschrijving?" : `Wat is de juiste omschrijving van <b>${plain(b.begrip)}</b>?`,
      intro: variant === "invul" ? mask(b) : "", opts, correct: b.id, punten: puntenVoor("mc", b), behaald: null, answer: null };
  }

  // --- casussen ---
  // Een casus krijgt een situatie, achtergrond uit de lesstof (kaarten die zelf geen deelvraag
  // zijn), een opdracht en een verwijzing naar de slides van die les.
  const VAAG = /^(deel|onderdeel|opgave|overig|algemeen|inleiding|diversen)\b/i;
  const META = /^(opzet|toets|organisatie|planning|beoordeling|rooster)\b/i;
  function achtergrondBij(b, items) {
    const bruikbaar = x => x.les === b.les && !items.includes(x) && !META.test(x.onderwerp || "");
    const zelfdeOnderwerp = state.data.begrippen.filter(x => bruikbaar(x) && x.onderwerp === b.onderwerp);
    const zelfdeLes = state.data.begrippen.filter(x => bruikbaar(x) && x.onderwerp !== b.onderwerp);
    return [...shuffle(zelfdeOnderwerp), ...shuffle(zelfdeLes)].slice(0, 2).map(x => isVraag()
      ? `<b>${plain(x.begrip)}</b> ${kort(x.uitleg, 220)}`
      : `<b>${plain(x.begrip)}</b> — ${kort(x.uitleg, 220)}`);
  }
  function casusGroepen(p) {
    if (Array.isArray(state.data.casussen) && state.data.casussen.length) {
      return shuffle(state.data.casussen
        .map(c => ({ titel: c.titel, tekst: c.tekst, achtergrond: c.achtergrond || [], afbeelding: c.afbeelding || null,
                     bron: c.bron || "", items: c.vragen.map(byId).filter(b => b && p.includes(b)) }))
        .filter(c => c.items.length >= 2));
    }
    const buckets = {};
    for (const b of p) { if (!META.test(b.onderwerp || "")) (buckets[`${b.les || ""}||${b.onderwerp}`] ||= []).push(b); }
    return shuffle(Object.values(buckets).filter(v => v.length >= 2)).map(v => {
      const items = shuffle(v).slice(0, Math.min(4, v.length));
      const b = items[0];
      const lesTitel = (b.les || "").replace(/^Les\s*\d+\s*[–-]\s*/, "").trim();
      // "Deel B" of "Opgaven" zegt niets; val dan terug op de titel van de les.
      const thema = VAAG.test(b.onderwerp) ? (lesTitel || b.onderwerp) : b.onderwerp;
      const waar = b.les ? `, onderdeel van <b>${plain(b.les)}</b>` : "";
      return {
        titel: `Casus · ${thema}`,
        tekst: `Deze casus gaat over <b>${plain(thema)}</b>${waar}. Je loopt de stappen na die daarbij horen: de deelvragen gaan over dezelfde situatie en bouwen op elkaar voort.`,
        achtergrond: achtergrondBij(b, items),
        afbeelding: null,
        bron: b.bron_bestand || "",
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
    const aanpassing = [], items = [], gebruikt = new Set();

    let gezet = 0, gid = 0;
    if (nCasus >= 2) {
      for (const g of casusGroepen(p)) {
        if (gezet >= nCasus) break;
        const vrij = g.items.filter(b => !gebruikt.has(b.id));
        if (vrij.length < 2) continue;
        const neem = vrij.slice(0, Math.min(vrij.length, nCasus - gezet, 4));
        if (neem.length < 2) continue;
        gid++;
        const deel = [];
        neem.forEach((b, i) => {
          gebruikt.add(b.id);
          // Binnen een casus wisselen meerkeuze- en open deelvragen elkaar af.
          const it = (i % 2 === 1 || neem.length === 2 && i === 1) ? makeOpen(b) : makeMC(b, p);
          it.casus = { gid, titel: g.titel, tekst: g.tekst, achtergrond: g.achtergrond || [], afbeelding: g.afbeelding || null,
            bron: g.bron || "", letter: LETTERS[i], i: i + 1, n: neem.length };
          deel.push(it);
        });
        const punten = deel.reduce((s, x) => s + x.punten, 0);
        deel.forEach(x => x.casus.punten = punten);
        items.push(...deel);
        gezet += neem.length;
      }
    }
    if (gezet < nCasus) { const over = nCasus - gezet; nMc += Math.ceil(over / 2); nOpen += Math.floor(over / 2); if (nCasus) aanpassing.push("te weinig samenhangende vragen voor alle casussen"); }

    const rest = p.filter(b => !gebruikt.has(b.id));
    const los = pickWeighted(rest, Math.min(nMc + nOpen, rest.length));
    let mcOver = nMc;
    for (const b of los) {
      if (mcOver > 0) { const it = makeMC(b, p); if (it.kind === "open" && !aanpassing.includes("te weinig afleiders voor meerkeuze")) aanpassing.push("te weinig afleiders voor meerkeuze"); items.push(it); mcOver--; }
      else items.push(makeOpen(b));
    }

    const blokken = [], perCasus = {};
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
      <p class="sub">Opgezet als de officiële toets: punten per vraag, casussen met deelvragen en open vragen met een puntenschaal.</p>
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
            ${[["mc", "Meerkeuze", "1 of 2 punten; ook BEHALVE-vragen en “geen van de andere 3”"],
               ["open", "Open vraag", "3 of 4 punten; antwoordmodel met puntenschaal"],
               ["casus", "Casus", "deelvragen A, B, C bij één situatie"]].map(([k, naam, uitleg]) => `
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
    inputs.forEach(i => i.addEventListener("input", () => { state.prog.mix = toonMix(); saveProg(); }));
    $("#qn").addEventListener("change", toonMix);
    $("#mixreset").onclick = () => { inputs.forEach(i => i.value = MIX_STD[i.id.slice(4)]); state.prog.mix = Object.assign({}, MIX_STD); saveProg(); toonMix(); say("Verdeling terug op standaard"); };
    toonMix();

    $("#qs").onsubmit = e => {
      e.preventDefault();
      tSettings = { n: +$("#qn").value, t: $("#qt").value, l: $("#ql")?.value || "", time: +$("#qtime").value };
      const p = state.data.begrippen.filter(b => (!tSettings.t || b.onderwerp === tSettings.t) && (!tSettings.l || b.les === tSettings.l));
      const { items, aanpassing } = buildItems(p, Math.min(tSettings.n, p.length), mix());
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
  const pt = n => `${n} ${n === 1 ? "punt" : "punten"}`;
  const puntBadge = it => it.behaald === null
    ? `<span class="punten">${pt(it.punten)}</span>`
    : `<span class="punten ${it.behaald === it.punten ? "vol" : it.behaald > 0 ? "deels" : "nul"}">${it.behaald}/${it.punten} ${it.punten === 1 ? "punt" : "punten"}</span>`;

  function drawQuestion() {
    const q = state.quiz, it = q.items[q.i], b = byId(it.id);
    const klaar = it.behaald !== null;
    const label = it.casus ? "Casus" : it.kind === "mc" ? "Meerkeuze" : "Open vraag";
    const c = it.casus;
    const fig = c && c.afbeelding ? `
        <figure class="casus-f">
          <img src="${esc(c.afbeelding.src)}" alt="${esc(c.afbeelding.alt || "")}" loading="lazy">
          ${c.afbeelding.bijschrift ? `<figcaption>${rich(c.afbeelding.bijschrift)}</figcaption>` : ""}
        </figure>` : "";
    const achter = c && c.achtergrond && c.achtergrond.length ? `
        <details class="casus-a" open>
          <summary>Achtergrond uit de lesstof</summary>
          <ul>${c.achtergrond.map(x => `<li>${rich(x)}</li>`).join("")}</ul>
        </details>` : "";
    const hulp = c && (c.bron || c.afbeelding) ? `
        <p class="casus-h">Hulpmiddel: ${c.bron ? `de figuren en schema's bij deze stof staan in ${slideLink(c.bron)}` : "de figuur hierboven"}.</p>` : "";
    const casusBlok = c ? `
      <section class="casus" aria-label="Casusbeschrijving">
        <p class="casus-t">${esc(c.titel)} <span class="punten">${pt(c.punten)}</span></p>
        <p class="casus-x">${rich(c.tekst)}</p>
        ${fig}${achter}${hulp}
        <p class="casus-n">Deelvraag ${c.letter} van ${c.n}. Lees eerst alle deelvragen: ze bouwen op elkaar voort.</p>
      </section>` : "";
    const kop = it.casus ? `<span class="letter">${it.casus.letter})</span> ` : "";
    const eerder = (state.prog.antwoorden[it.id] || []).slice(-1)[0];
    const body = it.kind === "open"
      ? `<h2 id="qtext" class="prompt">${kop}${rich(it.prompt)}</h2>
         ${klaar ? `<div id="fb">${feedbackHtml(it)}</div>` : `
           <label class="antwoordveld">
             <span class="modelkop">Jouw antwoord</span>
             <textarea id="antwoord" rows="5" placeholder="Typ hier je antwoord. Het wordt bij je voortgang bewaard."></textarea>
             <span class="telling" id="telling" aria-live="off">Aantal woorden: 0, aantal tekens: 0</span>
           </label>
           ${eerder ? `<details class="eerder"><summary>Je vorige antwoord (${new Date(eerder.d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}, ${eerder.p}/${eerder.max})</summary><p>${esc(eerder.t) || "<em>leeg gelaten</em>"}</p></details>` : ""}
           <button class="btn btn-primary" id="reveal" style="margin-top:.8rem">Toon antwoordmodel</button>`}`
      : `<h2 id="qtext" class="prompt">${kop}${rich(it.prompt)}</h2>
         ${it.intro ? `<p class="intro">${rich(it.intro)}</p>` : ""}
         <ul class="opts" role="list">
           ${it.opts.map((o, k) => `<li><button class="opt ${klaar ? (o.id === it.correct ? "ok" : o.id === it.answer ? "no" : "") : ""}" data-id="${esc(o.id)}" ${klaar ? "disabled" : ""}><span aria-hidden="true">${"ABCDE"[k]}. </span>${rich(o.text)}${klaar && o.id === it.correct ? `<span class="optpt">${pt(it.punten)}<span class="visually-hidden">, juiste antwoord</span></span>` : ""}</button></li>`).join("")}
         </ul>
         <div id="fb">${klaar ? feedbackHtml(it) : ""}</div>`;
    main.innerHTML = `
      <h1>Oefentoets</h1>
      <div class="qhead"><span>Vraag ${q.i + 1} van ${q.items.length}</span>${q.limit ? `<span>Resterende tijd: <span class="timer" id="timer">${mmss(remaining())}</span></span>` : ""}</div>
      <div class="meter" aria-hidden="true"><span style="width:${(q.i / q.items.length) * 100}%"></span></div>
      ${casusBlok}
      <section class="card" aria-labelledby="qtext">
        <div class="qtags"><span class="tag">${label}</span> <span class="tag">${esc(b.onderwerp)}</span>${b.les ? ` <span class="tag">${esc(b.les)}</span>` : ""}${puntBadge(it)}</div>
        ${body}
      </section>
      ${klaar ? `<button class="btn btn-primary" id="next">${q.i + 1 < q.items.length ? "Volgende vraag" : "Bekijk resultaat"}</button>` : ""}
      <button class="btn" id="stop" style="margin-left:.4rem">Stop toets</button>`;
    main.querySelectorAll(".opt:not([disabled])").forEach(x => x.onclick = () => antwoordMc(x.dataset.id));
    const veld = $("#antwoord");
    veld?.addEventListener("input", () => {
      const t = veld.value.trim();
      $("#telling").textContent = `Aantal woorden: ${t ? t.split(/\s+/).length : 0}, aantal tekens: ${veld.value.length}`;
    });
    $("#reveal")?.addEventListener("click", () => {
      it.tekst = $("#antwoord")?.value || "";
      const n = it.punten;
      const schaal = Array.from({ length: n + 1 }, (_, k) => n - k)
        .map(k => `<li><strong>${pt(k)}</strong> — ${k === 0 ? (n === 1 ? "kernpunt niet genoemd" : "geen enkel kernpunt genoemd") : k === n ? (n === 1 ? "kernpunt genoemd" : "alle kernpunten genoemd") : `${k} van de ${n} kernpunten genoemd`}</li>`).join("");
      $("#reveal").outerHTML = `<div class="a" style="margin-top:.8rem">
          <p class="modelkop">Antwoordmodel</p>
          <p style="margin:0">${rich(b.uitleg)}</p>
          ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
          ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}</div>
        <fieldset class="rubriek">
          <legend>Puntenmodel — vink aan wat in jouw antwoord staat</legend>
          <ul class="kernlijst">
            ${it.kern.map((k, i) => `<li><label><input type="checkbox" data-k="${i}"> <span>${rich(k)}</span></label><span class="kernpt">1 punt</span></li>`).join("")}
          </ul>
          <p class="rscore">Jouw score: <output id="rscore">0</output> van ${pt(n)}</p>
          <details class="schaal"><summary>Wat levert welk aantal punten op?</summary><ul>${schaal}</ul></details>
          <button type="button" class="btn btn-primary" id="vastleggen">Punten vastleggen</button>
        </fieldset>`;
      const vakjes = [...main.querySelectorAll(".kernlijst input")];
      const tel = () => { const s = vakjes.filter(v => v.checked).length; $("#rscore").textContent = s; return s; };
      vakjes.forEach(v => v.addEventListener("change", tel));
      $("#vastleggen").onclick = () => antwoordOpen(tel(), vakjes.map((v, i) => v.checked ? -1 : i).filter(i => i >= 0));
      vakjes[0]?.focus();
    });
    $("#next")?.addEventListener("click", () => { if (q.i + 1 < q.items.length) { q.i++; drawQuestion(); (main.querySelector(".opt") || $("#reveal"))?.focus(); } else finishQuiz(false); });
    $("#stop").onclick = () => finishQuiz(false, true);
    if (klaar) $("#next").focus();
    clearInterval(timerId); if (q.limit) timerId = setInterval(tick, 1000);
  }

  function feedbackHtml(it) {
    const b = byId(it.id), vol = it.behaald === it.punten;
    if (it.kind === "open") {
      const gemist = (it.gemist || []).map(i => it.kern[i]).filter(Boolean);
      return `<div class="feedback ${vol ? "ok" : it.behaald > 0 ? "" : "no"}" role="status"><strong>${it.behaald} van ${pt(it.punten)}</strong> toegekend.</div>
        ${it.tekst ? `<div class="jouw"><p class="modelkop">Jouw antwoord</p><p style="margin:0;white-space:pre-wrap">${esc(it.tekst)}</p></div>` : ""}
        ${gemist.length ? `<p class="modelkop" style="margin-top:.7rem">Niet genoemd${gemist.length === 1 ? "" : ` (${gemist.length} punten gemist)`}</p>
          <ul class="kernlijst gemist">${gemist.map(k => `<li><span>${rich(k)}</span></li>`).join("")}</ul>` : ""}
        <p class="modelkop" style="margin-top:.7rem">Antwoordmodel</p>
        <p style="margin:.2rem 0">${rich(b.uitleg)}</p>
        ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}`;
    }
    const juist = it.opts.find(o => o.id === it.correct);
    return `<div class="feedback ${vol ? "ok" : "no"}" role="status"><strong>${vol ? "Goed." : "Fout."}</strong> ${vol ? "" : `Het juiste antwoord is: ${rich(kort(juist ? juist.text : "", 160))}`}</div>
      ${it.variant === "behalve" ? "" : `<p style="margin:.3rem 0"><strong>${rich(plain(b.begrip))}</strong> — ${rich(b.uitleg)}</p>`}
      ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${rich(b.aanvulling)}</p>` : ""}
      ${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}`;
  }

  function antwoordMc(id) {
    const it = state.quiz.items[state.quiz.i];
    it.answer = id; it.behaald = id === it.correct ? it.punten : 0;
    const rec = state.prog.quiz[it.id] ||= { ok: 0, no: 0 };
    it.behaald > 0 ? rec.ok++ : rec.no++; saveProg();
    drawQuestion();
    say(it.behaald > 0 ? `Goed, ${pt(it.punten)}` : "Fout, 0 punten");
  }
  function antwoordOpen(punten, gemist) {
    const it = state.quiz.items[state.quiz.i];
    it.answer = "zelf"; it.behaald = punten; it.gemist = gemist || [];
    const rec = state.prog.quiz[it.id] ||= { ok: 0, no: 0 };
    punten >= it.punten ? rec.ok++ : rec.no++;
    // Het getypte antwoord bewaren; per kaart de laatste drie pogingen.
    const lijst = state.prog.antwoorden[it.id] ||= [];
    lijst.push({ d: new Date().toISOString(), t: it.tekst || "", p: punten, max: it.punten });
    if (lijst.length > 3) lijst.splice(0, lijst.length - 3);
    saveProg();
    drawQuestion();
    say(`${punten} van ${pt(it.punten)} toegekend`);
  }

  function finishQuiz(timeUp, stopped) {
    clearInterval(timerId);
    const q = state.quiz; q.finished = true; q.timeUp = timeUp;
    q.items.forEach(it => { if (it.behaald === null) it.behaald = 0; });
    if (q.items.some(i => i.answer !== null)) {
      const per = {};
      for (const it of q.items) { const t = groep(byId(it.id)); per[t] ||= { ok: 0, n: 0 }; per[t].n += it.punten; per[t].ok += it.behaald; }
      const behaald = q.items.reduce((s, i) => s + i.behaald, 0), max = q.items.reduce((s, i) => s + i.punten, 0);
      state.prog.history.push({ date: new Date().toISOString(), n: q.items.length, ok: q.items.filter(i => i.behaald === i.punten).length, punten: behaald, maxPunten: max, per, timeUp: !!timeUp, stopped: !!stopped });
      saveProg();
    }
    drawResult(); focusMain();
  }

  function drawResult() {
    const q = state.quiz;
    const behaald = q.items.reduce((s, i) => s + (i.behaald || 0), 0);
    const max = q.items.reduce((s, i) => s + i.punten, 0);
    const cijfer = Math.max(1, 1 + 9 * (behaald / (max || 1)));
    const perOnderdeel = {}, perType = {};
    for (const it of q.items) {
      const t = groep(byId(it.id));
      perOnderdeel[t] ||= { p: 0, m: 0 }; perOnderdeel[t].p += it.behaald || 0; perOnderdeel[t].m += it.punten;
      const ty = it.casus ? "Casus" : it.kind === "mc" ? "Meerkeuze" : "Open vraag";
      perType[ty] ||= { p: 0, m: 0 }; perType[ty].p += it.behaald || 0; perType[ty].m += it.punten;
    }
    const tabel = (titel, kop, obj) => `
      <h2>${titel}</h2>
      <table><thead><tr><th scope="col">${kop}</th><th scope="col">Punten</th><th scope="col">Max</th><th scope="col">%</th></tr></thead>
      <tbody>${Object.entries(obj).sort((a, b) => a[1].p / a[1].m - b[1].p / b[1].m).map(([t, v]) =>
        `<tr><th scope="row" style="font-weight:600;color:var(--ink)">${esc(t)}</th><td class="num">${v.p}</td><td class="num">${v.m}</td><td class="num">${(v.p / v.m * 100).toFixed(2).replace(".", ",")} %</td></tr>`).join("")}</tbody></table>`;
    const fout = q.items.filter(i => i.behaald < i.punten);
    main.innerHTML = `
      <h1>Resultaat</h1>
      ${q.timeUp ? `<p class="feedback no" role="alert">De tijd is om. Onbeantwoorde vragen tellen als 0 punten.</p>` : ""}
      ${q.aanpassing && q.aanpassing.length ? `<p class="src">De verdeling is aangepast: ${q.aanpassing.map(esc).join(" en ")}.</p>` : ""}
      <div class="card uitslag">
        <div><p class="uit-p"><strong>${behaald}</strong> van ${pt(max)}</p><p class="src" style="margin:0">${Math.round(behaald / (max || 1) * 100)}% van de punten</p></div>
        <div class="cijfer ${cijfer >= 5.5 ? "voldoende" : "onvoldoende"}"><span>${cijfer.toFixed(1).replace(".", ",")}</span><small>${cijfer >= 5.5 ? "Voldoende" : "Onvoldoende"}</small></div>
      </div>
      <p class="src">Cijfer berekend als 1 + 9 × (punten / maximum). De officiële toets kan een andere norm gebruiken.</p>
      ${tabel("Terugkoppelingsrapportage", isVraag() ? "Les" : "Onderdeel", perOnderdeel)}
      ${tabel("Per vraagtype", "Type", perType)}
      ${fout.length ? `<h2>Nog eens bekijken</h2>${fout.map(it => { const b = byId(it.id); return `<article class="card"><h3 class="term">${rich(plain(b.begrip))}</h3><p style="margin:.3rem 0 0">${rich(b.uitleg)}</p>${src(b) ? `<p class="src">Bron: ${src(b)}</p>` : ""}</article>`; }).join("")}` : ""}
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
    // Bewaarde open antwoorden, nieuwste eerst.
    const antw = Object.entries(state.prog.antwoorden || {})
      .map(([id, lijst]) => ({ b: byId(id), lijst }))
      .filter(x => x.b && x.lijst.length)
      .sort((x, y) => new Date(y.lijst[y.lijst.length - 1].d) - new Date(x.lijst[x.lijst.length - 1].d));
    const antwKaart = x => `<article class="card"><h3 class="term">${rich(plain(x.b.begrip))}</h3>
      ${x.lijst.slice().reverse().map(p => `<div class="poging"><p class="src" style="margin:0">${new Date(p.d).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · <strong>${p.p}/${p.max} punten</strong></p>
        <p style="margin:.2rem 0 0;white-space:pre-wrap">${esc(p.t) || "<em>leeg gelaten</em>"}</p></div>`).join("")}
      <details><summary>Antwoordmodel</summary><p style="margin:.3rem 0 0">${rich(x.b.uitleg)}</p></details></article>`;
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
      ${hist.length ? `<table><thead><tr><th scope="col">Datum</th><th scope="col">Punten</th><th scope="col">Cijfer</th><th scope="col">Zwakste</th></tr></thead><tbody>${hist.map(h => {
        const weak = Object.entries(h.per).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
        const p = h.punten ?? h.ok, m = h.maxPunten ?? h.n;
        const c = Math.max(1, 1 + 9 * (p / (m || 1)));
        return `<tr><td>${new Date(h.date).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td class="num">${p}/${m}</td><td class="num">${c.toFixed(1).replace(".", ",")}</td><td>${weak ? esc(weak[0]) : "–"}</td></tr>`; }).join("")}</tbody></table>` : `<p>Nog geen toetsen gemaakt.</p>`}
      ${antw.length ? `<h2>Mijn antwoorden</h2>
      <p class="src" style="margin-top:0">${antw.length} ${antw.length === 1 ? "vraag" : "vragen"} met een bewaard antwoord, per vraag de laatste drie pogingen. Ze gaan mee in de export.</p>
      <div id="antwlijst">${antw.slice(0, 5).map(x => antwKaart(x)).join("")}</div>
      ${antw.length > 5 ? `<button class="btn" id="meerantw">Toon alle ${antw.length}</button>` : ""}
      <button class="btn" id="wisantw" style="margin-left:.4rem">Wis bewaarde antwoorden</button>` : ""}
      <h2>Opslag</h2>
      <p class="src" style="margin-top:0">Voortgang staat alleen in deze browser. Exporteer om over te zetten naar een ander apparaat.</p>
      <div class="row">
        <button class="btn" id="exp">Exporteer voortgang</button>
        <label class="btn" for="imp" style="display:inline-flex;align-items:center">Importeer voortgang</label><input id="imp" type="file" accept="application/json" class="visually-hidden">
        <button class="btn" id="reset">Wis voortgang</button>
      </div>`;
    $("#meerantw")?.addEventListener("click", () => { $("#antwlijst").innerHTML = antw.map(x => antwKaart(x)).join(""); $("#meerantw").remove(); });
    $("#wisantw")?.addEventListener("click", () => {
      const btn = $("#wisantw");
      if (btn.dataset.confirm) { state.prog.antwoorden = {}; saveProg(); say("Bewaarde antwoorden gewist"); viewVoortgang(); }
      else { btn.dataset.confirm = "1"; btn.textContent = "Klik nogmaals om te wissen"; btn.focus(); }
    });
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
