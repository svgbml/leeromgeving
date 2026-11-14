/* Leeromgeving BML – statische app, geen build-stap.
   Data: data/modules.json + data/jaar-<j>/periode-<p>/<module>.json. Voortgang: localStorage (per browser). */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const main = $("#main");
  const live = $("#live");
  const DAY = 864e5;
  const NEW_PER_DAY = 15;

  const state = { modules: [], mod: null, data: null, prog: null, flash: null, quiz: null };

  // ---------- helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const say = msg => { live.textContent = ""; setTimeout(() => (live.textContent = msg), 30); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const topics = () => [...new Set(state.data.begrippen.map(b => b.onderwerp))];
  const byId = id => state.data.begrippen.find(b => b.id === id);
  const src = b => `${esc(b.bron_bestand.replace(" - student.pptx", "").replace(".pptx", ""))}, slide ${b.bron_slides.join(", ")}`;
  const focusMain = () => main.focus({ preventScroll: false });
  const topicOptions = (sel) => `<option value="">Alle onderwerpen</option>` + topics().map(t => `<option ${t === sel ? "selected" : ""}>${esc(t)}</option>`).join("");

  // ---------- opslag ----------
  const key = () => `leeromgeving:${state.mod.id}`;
  function loadProg() {
    try { state.prog = JSON.parse(localStorage.getItem(key())) || {}; } catch { state.prog = {}; }
    state.prog.cards ??= {}; state.prog.quiz ??= {}; state.prog.history ??= []; state.prog.newDay ??= { day: "", n: 0 };
  }
  function saveProg() { try { localStorage.setItem(key(), JSON.stringify(state.prog)); } catch { /* opslag niet beschikbaar */ } }

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
    // Volg het systeem zolang er geen eigen keuze is opgeslagen.
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", e => {
      let saved = null; try { saved = localStorage.getItem("leeromgeving:thema"); } catch {}
      if (!saved) apply(e.matches ? "dark" : "light", false);
    });
  }

  // ---------- laden ----------
  async function init() {
    setupTheme();
    try {
      const r = await fetch("data/modules.json");
      state.modules = (await r.json()).modules;
    } catch (e) { main.innerHTML = `<p role="alert">Kon de modules niet laden.</p>`; return; }
    const sel = $("#module");
    // Modules gegroepeerd per map: Jaar X · Periode Y
    const groups = {};
    for (const m of state.modules) (groups[m.periode] ||= []).push(m);
    sel.innerHTML = Object.entries(groups)
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
    state.flash = null; state.quiz = null;
    loadProg();
  }

  // ---------- routing ----------
  function route() {
    const r = (location.hash.replace(/^#\/?/, "") || "begrippen").split("?")[0];
    document.querySelectorAll(".tabs a").forEach(a => { if (a.dataset.route === r) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
    ({ begrippen: viewBegrippen, flashcards: viewFlash, toets: viewToets, voortgang: viewVoortgang }[r] || viewBegrippen)();
    const t = { begrippen: "Begrippen", flashcards: "Flashcards", toets: "Oefentoets", voortgang: "Voortgang" }[r] || "Begrippen";
    document.title = `${t} · ${state.mod.titel} · Leeromgeving BML`;
  }

  // ---------- begrippenlijst ----------
  let bState = { q: "", t: "" };
  function viewBegrippen() {
    main.innerHTML = `
      <h1>Begrippenlijst</h1>
      <p class="sub">${esc(state.mod.titel)} · ${esc(state.mod.periode)} · ${state.data.begrippen.length} begrippen</p>
      <div class="row" role="search">
        <label class="field grow">Zoeken<input id="q" type="search" value="${esc(bState.q)}" placeholder="bijv. peptidoglycaan, MIC, lithotroof" autocomplete="off"></label>
        <label class="field">Onderwerp<select id="t">${topicOptions(bState.t)}</select></label>
      </div>
      <p class="count" id="count" aria-live="polite"></p>
      <div id="list"></div>`;
    const draw = () => {
      const q = bState.q.trim().toLowerCase();
      const items = state.data.begrippen.filter(b => (!bState.t || b.onderwerp === bState.t) &&
        (!q || (b.begrip + " " + b.uitleg + " " + b.aanvulling).toLowerCase().includes(q)));
      $("#count").textContent = `${items.length} ${items.length === 1 ? "begrip" : "begrippen"} gevonden`;
      let html = "", cur = "";
      for (const b of items) {
        if (b.onderwerp !== cur) { cur = b.onderwerp; html += `<h2 class="group-h">${esc(cur)}</h2>`; }
        html += `<article class="card" aria-labelledby="${b.id}">
          <h3 class="term" id="${b.id}">${esc(b.begrip)}</h3>
          <p style="margin:0">${esc(b.uitleg)}</p>
          ${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${esc(b.aanvulling)}</p>` : ""}
          <p class="src">Bron: ${src(b)}</p>
        </article>`;
      }
      $("#list").innerHTML = html || `<p>Geen begrippen gevonden.</p>`;
    };
    $("#q").addEventListener("input", e => { bState.q = e.target.value; draw(); });
    $("#t").addEventListener("change", e => { bState.t = e.target.value; draw(); });
    draw();
  }

  // ---------- flashcards (spaced repetition) ----------
  const today = () => new Date().toISOString().slice(0, 10);
  function cardState(id) { return state.prog.cards[id]; }
  function buildSession(topic) {
    const now = Date.now();
    const pool = state.data.begrippen.filter(b => !topic || b.onderwerp === topic);
    const due = shuffle(pool.filter(b => cardState(b.id) && cardState(b.id).due <= now));
    if (state.prog.newDay.day !== today()) state.prog.newDay = { day: today(), n: 0 };
    const room = Math.max(0, NEW_PER_DAY - state.prog.newDay.n);
    const fresh = pool.filter(b => !cardState(b.id)).slice(0, room);
    return { topic, queue: [...due, ...fresh].map(b => b.id), shown: false, done: 0, reverse: state.flash?.reverse ?? false };
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
    return c;
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
    if (!state.flash) state.flash = buildSession("");
    const f = state.flash;
    const total = f.queue.length + f.done;
    const head = `
      <h1>Flashcards</h1>
      <p class="sub">Spaced repetition: kaarten die je goed kent komen later terug. Max. ${NEW_PER_DAY} nieuwe kaarten per dag.</p>
      <div class="row">
        <label class="field">Onderwerp<select id="ft">${topicOptions(f.topic)}</select></label>
        <label class="field">Richting<select id="fr"><option value="0" ${!f.reverse ? "selected" : ""}>Begrip → uitleg</option><option value="1" ${f.reverse ? "selected" : ""}>Uitleg → begrip</option></select></label>
      </div>
      <p class="count">${f.done} van ${total} gedaan</p>
      <div class="meter" role="progressbar" aria-label="Voortgang sessie" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${f.done}"><span style="width:${total ? (f.done / total) * 100 : 0}%"></span></div>`;
    if (!f.queue.length) {
      const next = Object.values(state.prog.cards).map(c => c.due).filter(d => d > Date.now()).sort((a, b) => a - b)[0];
      main.innerHTML = head + `<div class="card"><h2 style="margin-top:0">Klaar voor nu</h2>
        <p>Er staan geen kaarten meer klaar${f.topic ? ` voor “${esc(f.topic)}”` : ""}.${next ? ` Volgende herhaling: ${new Date(next).toLocaleString("nl-NL", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.` : ""}</p>
        <button class="btn" id="extra">Oefen alle kaarten van dit onderwerp nog een keer</button></div>`;
      $("#extra").onclick = () => { f.queue = shuffle(state.data.begrippen.filter(b => !f.topic || b.onderwerp === f.topic).map(b => b.id)); f.done = 0; f.cram = true; viewFlash(); };
    } else {
      const b = byId(f.queue[0]);
      const front = f.reverse ? `<p class="prompt" style="text-align:left">${esc(mask(b))}</p>` : `<p class="q">${esc(b.begrip)}</p>`;
      const back = f.reverse ? `<p class="q">${esc(b.begrip)}</p><p>${esc(b.uitleg)}</p>` : `<p>${esc(b.uitleg)}</p>`;
      main.innerHTML = head + `
        <section class="card flash" aria-label="Flashcard">
          <span class="tag" style="align-self:center">${esc(b.onderwerp)}</span>
          ${front}
          ${f.shown ? `<div class="a">${back}${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${esc(b.aanvulling)}</p>` : ""}<p class="src">Bron: ${src(b)}</p></div>` : ""}
        </section>
        ${f.shown ? `<div class="grade" role="group" aria-label="Hoe goed wist je het?">
            ${["Opnieuw", "Moeilijk", "Goed", "Makkelijk"].map((l, g) => `<button class="btn ${g === 2 ? "btn-primary" : ""}" data-g="${g}">${l}${f.cram ? "" : `<small>${ivText(preview(b.id, g))}</small>`}<span class="visually-hidden"> (toets ${g + 1})</span></button>`).join("")}
          </div>` : `<button class="btn btn-primary" id="show" style="width:100%;margin-top:.8rem">Toon antwoord <span aria-hidden="true">(spatie)</span></button>`}`;
      if (!f.shown) { $("#show").onclick = () => { f.shown = true; viewFlash(); $(".grade .btn-primary")?.focus(); say("Antwoord: " + b.begrip); }; $("#show").focus(); }
      else main.querySelectorAll("[data-g]").forEach(btn => btn.onclick = () => doGrade(+btn.dataset.g));
    }
    $("#ft").onchange = e => { state.flash = buildSession(e.target.value); state.flash.reverse = f.reverse; viewFlash(); };
    $("#fr").onchange = e => { f.reverse = e.target.value === "1"; f.shown = false; viewFlash(); };
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
  function mask(b) {
    const parts = b.begrip.replace(/\(([^)]+)\)/g, ",$1,").split(/[,\/=+–]| en | of /).map(s => s.trim()).filter(s => s.length >= 3);
    let t = b.uitleg;
    for (const p of parts.sort((a, c) => c.length - a.length)) t = t.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "▁▁▁");
    return t;
  }
  function weightOf(id) { const q = state.prog.quiz[id] || { ok: 0, no: 0 }; return Math.max(0.5, 1 + 2 * q.no - q.ok); }
  function pickWeighted(pool, n) {
    const out = [], rest = pool.slice();
    while (out.length < n && rest.length) {
      const tot = rest.reduce((s, b) => s + weightOf(b.id), 0); let r = Math.random() * tot, i = 0;
      for (; i < rest.length - 1; i++) { r -= weightOf(rest[i].id); if (r <= 0) break; }
      out.push(rest.splice(i, 1)[0]);
    }
    return out;
  }
  function makeQuestion(b) {
    const type = Math.random() < 0.6 ? "uitleg" : "begrip"; // uitleg → kies begrip, of begrip → kies uitleg
    // Geen afleiders waarvan de naam letterlijk in de omschrijving staat (zou verwarrend of verraderlijk zijn).
    const inText = x => b.uitleg.toLowerCase().includes(x.begrip.toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim());
    const ok = x => x.id !== b.id && !inText(x);
    const same = shuffle(state.data.begrippen.filter(x => ok(x) && x.onderwerp === b.onderwerp));
    const other = shuffle(state.data.begrippen.filter(x => ok(x) && x.onderwerp !== b.onderwerp));
    const distract = [...same, ...other].slice(0, 3);
    const opts = shuffle([b, ...distract]).map(x => ({ id: x.id, text: type === "uitleg" ? x.begrip : x.uitleg }));
    return { id: b.id, type, prompt: type === "uitleg" ? mask(b) : b.begrip, opts, answer: null };
  }
  let tSettings = { n: 10, t: "", time: 30 };
  function viewToets() {
    const q = state.quiz;
    if (q && !q.finished) return drawQuestion();
    if (q && q.finished) return drawResult();
    main.innerHTML = `
      <h1>Oefentoets</h1>
      <p class="sub">Meerkeuzevragen uit de begrippenlijst. Begrippen die je eerder fout had komen vaker terug.</p>
      <form id="qs" class="card">
        <div class="row">
          <label class="field">Aantal vragen<select id="qn">${[10, 20, 30].map(n => `<option ${n === tSettings.n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
          <label class="field">Onderwerp<select id="qt">${topicOptions(tSettings.t)}</select></label>
          <label class="field">Tijd per vraag<select id="qtime">${[[0, "Geen tijdslimiet"], [20, "20 seconden"], [30, "30 seconden"], [60, "60 seconden"]].map(([v, l]) => `<option value="${v}" ${v === tSettings.time ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        </div>
        <p class="src">Met tijdslimiet krijg je een totaaltijd van aantal vragen × tijd per vraag.</p>
        <button class="btn btn-primary" type="submit">Start toets</button>
      </form>`;
    $("#qs").onsubmit = e => {
      e.preventDefault();
      tSettings = { n: +$("#qn").value, t: $("#qt").value, time: +$("#qtime").value };
      const pool = state.data.begrippen.filter(b => !tSettings.t || b.onderwerp === tSettings.t);
      const items = pickWeighted(pool, Math.min(tSettings.n, pool.length)).map(makeQuestion);
      state.quiz = { items, i: 0, topic: tSettings.t, limit: tSettings.time ? tSettings.time * items.length : 0, start: Date.now(), finished: false };
      drawQuestion(); focusMain();
    };
  }
  let timerId = null;
  function remaining() { const q = state.quiz; return q.limit ? Math.max(0, Math.round(q.limit - (Date.now() - q.start) / 1000)) : null; }
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function tick() {
    const el = $("#timer"); if (!state.quiz || state.quiz.finished) return clearInterval(timerId);
    const r = remaining(); if (r === null) return;
    if (el) el.textContent = mmss(r);
    if (r === 60 || r === 10) say(`Nog ${r} seconden`);
    if (r <= 0) { finishQuiz(true); }
  }
  function drawQuestion() {
    const q = state.quiz, it = q.items[q.i];
    const answered = it.answer !== null;
    main.innerHTML = `
      <h1>Oefentoets</h1>
      <div class="qhead"><span>Vraag ${q.i + 1} van ${q.items.length}</span>${q.limit ? `<span>Resterende tijd: <span class="timer" id="timer">${mmss(remaining())}</span></span>` : ""}</div>
      <div class="meter" aria-hidden="true"><span style="width:${(q.i / q.items.length) * 100}%"></span></div>
      <section class="card" aria-labelledby="qtext">
        <span class="tag">${esc(byId(it.id).onderwerp)}</span>
        <h2 id="qtext" class="prompt">${it.type === "uitleg" ? "Welk begrip hoort bij deze omschrijving?" : `Wat is de juiste omschrijving van <strong>${esc(it.prompt)}</strong>?`}</h2>
        ${it.type === "uitleg" ? `<p>${esc(it.prompt)}</p>` : ""}
        <ul class="opts" role="list">
          ${it.opts.map((o, k) => `<li><button class="opt ${answered ? (o.id === it.id ? "ok" : o.id === it.answer ? "no" : "") : ""}" data-id="${o.id}" ${answered ? "disabled" : ""}><span aria-hidden="true">${"ABCD"[k]}. </span>${esc(o.text)}${answered && o.id === it.id ? '<span class="visually-hidden"> (juiste antwoord)</span>' : ""}</button></li>`).join("")}
        </ul>
        <div id="fb">${answered ? feedbackHtml(it) : ""}</div>
      </section>
      ${answered ? `<button class="btn btn-primary" id="next">${q.i + 1 < q.items.length ? "Volgende vraag" : "Bekijk resultaat"}</button>` : ""}
      <button class="btn" id="stop" style="margin-left:.4rem">Stop toets</button>`;
    main.querySelectorAll(".opt:not([disabled])").forEach(b => b.onclick = () => answer(b.dataset.id));
    $("#next")?.addEventListener("click", () => { if (q.i + 1 < q.items.length) { q.i++; drawQuestion(); main.querySelector(".opt")?.focus(); } else finishQuiz(false); });
    $("#stop").onclick = () => finishQuiz(false, true);
    if (answered) $("#next").focus();
    clearInterval(timerId); if (q.limit) timerId = setInterval(tick, 1000);
  }
  function feedbackHtml(it) {
    const b = byId(it.id), ok = it.answer === it.id;
    return `<div class="feedback ${ok ? "ok" : "no"}" role="status"><strong>${ok ? "Goed!" : "Fout."}</strong> ${ok ? "" : `Het juiste antwoord is <strong>${esc(b.begrip)}</strong>.`}</div>
      ${it.type === "begrip" ? "" : `<p style="margin:.3rem 0"><strong>${esc(b.begrip)}</strong></p>`}${b.aanvulling ? `<p class="extra"><span class="tag tag-extra">aanvulling</span> ${esc(b.aanvulling)}</p>` : ""}<p class="src">Bron: ${src(b)}</p>`;
  }
  function answer(id) {
    const it = state.quiz.items[state.quiz.i]; it.answer = id;
    const rec = state.prog.quiz[it.id] ||= { ok: 0, no: 0 };
    id === it.id ? rec.ok++ : rec.no++; saveProg();
    drawQuestion();
    say(id === it.id ? "Goed" : `Fout, het juiste antwoord is ${byId(it.id).begrip}`);
  }
  function finishQuiz(timeUp, stopped) {
    clearInterval(timerId);
    const q = state.quiz; q.finished = true; q.timeUp = timeUp;
    const done = q.items.filter(i => i.answer !== null);
    if (done.length) {
      const per = {};
      for (const it of q.items) { const t = byId(it.id).onderwerp; per[t] ||= { ok: 0, n: 0 }; per[t].n++; if (it.answer === it.id) per[t].ok++; }
      state.prog.history.push({ date: new Date().toISOString(), n: q.items.length, ok: q.items.filter(i => i.answer === i.id).length, per, timeUp: !!timeUp, stopped: !!stopped });
      saveProg();
    }
    drawResult(); focusMain();
  }
  function drawResult() {
    const q = state.quiz, ok = q.items.filter(i => i.answer === i.id).length, n = q.items.length;
    const per = {};
    for (const it of q.items) { const t = byId(it.id).onderwerp; per[t] ||= { ok: 0, n: 0 }; per[t].n++; if (it.answer === it.id) per[t].ok++; }
    const wrong = q.items.filter(i => i.answer !== i.id);
    main.innerHTML = `
      <h1>Resultaat</h1>
      ${q.timeUp ? `<p class="feedback no" role="alert">De tijd is om. Onbeantwoorde vragen tellen als fout.</p>` : ""}
      <p class="card" style="font-size:1.3rem"><strong>${ok} van ${n}</strong> goed (${Math.round((ok / n) * 100)}%)</p>
      <h2>Score per onderwerp</h2>
      <table><thead><tr><th scope="col">Onderwerp</th><th scope="col">Goed</th><th scope="col">Score</th></tr></thead>
      <tbody>${Object.entries(per).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n).map(([t, v]) => `<tr><th scope="row" style="font-weight:600;color:var(--ink)">${esc(t)}</th><td class="num">${v.ok}/${v.n}</td><td class="num">${Math.round((v.ok / v.n) * 100)}%</td></tr>`).join("")}</tbody></table>
      ${wrong.length ? `<h2>Nog eens bekijken</h2>${wrong.map(it => { const b = byId(it.id); return `<article class="card"><h3 class="term">${esc(b.begrip)}</h3><p style="margin:0">${esc(b.uitleg)}</p><p class="src">Bron: ${src(b)}</p></article>`; }).join("")}` : ""}
      <div class="row" style="margin-top:1rem"><button class="btn btn-primary" id="again">Nieuwe toets</button><a class="btn" href="#/voortgang" style="text-decoration:none">Naar voortgang</a></div>`;
    $("#again").onclick = () => { state.quiz = null; viewToets(); focusMain(); };
  }

  // ---------- voortgang ----------
  function viewVoortgang() {
    const rows = topics().map(t => {
      const items = state.data.begrippen.filter(b => b.onderwerp === t);
      const seen = items.filter(b => state.prog.cards[b.id]).length;
      const known = items.filter(b => (state.prog.cards[b.id]?.iv || 0) >= 7).length;
      let ok = 0, no = 0; items.forEach(b => { const q = state.prog.quiz[b.id]; if (q) { ok += q.ok; no += q.no; } });
      return { t, n: items.length, seen, known, pct: ok + no ? Math.round((ok / (ok + no)) * 100) : null };
    });
    const tot = rows.reduce((a, r) => ({ n: a.n + r.n, known: a.known + r.known, seen: a.seen + r.seen }), { n: 0, known: 0, seen: 0 });
    const due = state.data.begrippen.filter(b => state.prog.cards[b.id] && state.prog.cards[b.id].due <= Date.now()).length;
    const hist = state.prog.history.slice(-8).reverse();
    main.innerHTML = `
      <h1>Voortgang</h1>
      <p class="sub">${esc(state.mod.titel)} · “beheerst” = kaart komt pas over 7 dagen of later terug.</p>
      <div class="card"><p style="margin:0 0 .4rem"><strong>${tot.known}</strong> van ${tot.n} begrippen beheerst · ${tot.seen} gezien · ${due} kaarten klaar om te herhalen</p>
        <div class="meter" role="progressbar" aria-label="Beheerst" aria-valuemin="0" aria-valuemax="${tot.n}" aria-valuenow="${tot.known}"><span style="width:${(tot.known / tot.n) * 100}%"></span></div></div>
      <h2>Per onderwerp</h2>
      <table><thead><tr><th scope="col">Onderwerp</th><th scope="col">Gezien</th><th scope="col">Beheerst</th><th scope="col">Toets goed</th></tr></thead>
      <tbody>${rows.map(r => `<tr><th scope="row" style="font-weight:600;color:var(--ink)">${esc(r.t)}</th><td class="num">${r.seen}/${r.n}</td><td class="num">${r.known}/${r.n}</td><td class="num">${r.pct === null ? "–" : r.pct + "%"}</td></tr>`).join("")}</tbody></table>
      <h2>Laatste toetsen</h2>
      ${hist.length ? `<table><thead><tr><th scope="col">Datum</th><th scope="col">Score</th><th scope="col">Zwakste onderwerp</th></tr></thead><tbody>${hist.map(h => {
        const weak = Object.entries(h.per).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
        return `<tr><td>${new Date(h.date).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td class="num">${h.ok}/${h.n}</td><td>${weak ? esc(weak[0]) : "–"}</td></tr>`; }).join("")}</tbody></table>` : `<p>Nog geen toetsen gemaakt.</p>`}
      <h2>Opslag</h2>
      <p class="src" style="margin-top:0">Voortgang staat alleen in deze browser. Exporteer om over te zetten naar een ander apparaat.</p>
      <div class="row">
        <button class="btn" id="exp">Exporteer voortgang</button>
        <label class="btn" for="imp" style="display:inline-flex;align-items:center">Importeer voortgang</label><input id="imp" type="file" accept="application/json" class="visually-hidden">
        <button class="btn" id="reset">Wis voortgang</button>
      </div>`;
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
      if (b.dataset.confirm) { state.prog = {}; loadProgReset(); say("Voortgang gewist"); viewVoortgang(); }
      else { b.dataset.confirm = "1"; b.textContent = "Klik nogmaals om te wissen"; b.focus(); }
    };
  }
  function loadProgReset() { try { localStorage.removeItem(key()); } catch {} loadProg(); state.flash = null; }

  init();
})();
