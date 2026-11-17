// Verslag: een uitgebreide samenvatting per module om na te lezen, in de site zelf (geen Google Drive).
// Bron: data/verslagen/<module>.md (Markdown), pad staat als "verslag" in data/modules.json.
// Inhoudsopgave per les, zoeken met markering, en per les knoppen naar flashcards en oefentoets.
import { esc } from "../domain/text.js";
import { markdown, slug } from "../domain/markdown.js";
import { app } from "../core/store.js";
import { $, acties, markeer, say } from "../core/dom.js";
import { zetParams, link } from "../core/router.js";

const cache = new Map();
async function laad(pad) {
  if (!cache.has(pad)) cache.set(pad, fetch(pad).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }).then(markdown));
  return cache.get(pad);
}

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `
      <h1 style="view-transition-name:titel">Verslag</h1>
      <p class="sub"><span style="view-transition-name:mod-${esc(m.id)}">${esc(m.titel)}</span> · ${esc(m.periode)}</p>
      <div id="verslag-vak"><p class="loading" role="status">Verslag laden…</p></div>`;
    if (!m.verslag) {
      $("#verslag-vak", main).innerHTML = `<div class="card"><p class="m0">Voor deze module is nog geen verslag.</p></div>`;
      return;
    }
    let doc;
    try { doc = await laad(m.verslag); }
    catch { $("#verslag-vak", main).innerHTML = `<div class="card"><p class="m0" role="alert">Het verslag kon niet geladen worden. Ben je offline en heb je het nog niet eerder geopend?</p></div>`; return; }
    if (signal.aborted) return;

    const lessen = doc.koppen.filter(k => k.niveau === 2);
    const onder = new Map(); let huidig = null;
    for (const k of doc.koppen) { if (k.niveau === 2) { huidig = k.id; onder.set(huidig, []); } else if (k.niveau === 3 && huidig) onder.get(huidig).push(k); }
    const inhoud = `<ol class="inhoud-lijst">${lessen.map(l => `<li><a href="#/verslag?k=${esc(l.id)}" data-k="${esc(l.id)}">${esc(l.tekst)}</a>
      ${onder.get(l.id)?.length ? `<ol>${onder.get(l.id).map(s => `<li><a href="#/verslag?k=${esc(s.id)}" data-k="${esc(s.id)}">${esc(s.tekst)}</a></li>`).join("")}</ol>` : ""}</li>`).join("")}</ol>`;

    $("#verslag-vak", main).innerHTML = `
      <div class="verslag">
        <aside class="verslag-zij" aria-label="Inhoud van het verslag">
          <label class="field zoekveld">Zoeken in het verslag<input id="vq" type="search" autocomplete="off" placeholder="bijv. annealing" data-invoer="vzoek"></label>
          <p class="src m0" id="vtel" aria-live="polite"></p>
          <details class="verslag-inhoud"${matchMedia("(min-width: 901px)").matches ? " open" : ""}><summary>Inhoud</summary>${inhoud}</details>
        </aside>
        <article class="card verslag-tekst" id="vtekst">${doc.html}</article>
      </div>`;
    const tekst = $("#vtekst", main), q = $("#vq", main);

    // Per les knoppen naar flashcards en oefentoets (als de les in de moduledata voorkomt).
    app.laden?.then(() => {
      if (signal.aborted) return;
      const namen = new Map((app.data?.lessen || []).map(l => [slug(`Les ${l.nr} – ${l.titel}`), `Les ${l.nr} – ${l.titel}`]));
      for (const h of tekst.querySelectorAll("h2")) {
        const les = namen.get(h.id);
        if (!les) continue;
        h.insertAdjacentHTML("afterend", `<p class="verslag-les-knoppen row">
          <a class="btn btn-klein" href="${link("flashcards", { les, modus: "les" })}">Flashcards van deze les</a>
          <a class="btn btn-klein" href="${link("toets", { les })}">Oefentoets over deze les</a>
          <a class="btn btn-klein" href="${link("begrippen", { les })}">Kaarten</a></p>`);
      }
    }).catch(() => {});

    // Inhoudsopgave volgt mee met wat je leest.
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) {
        main.querySelectorAll(".inhoud-lijst a[aria-current]").forEach(a => a.removeAttribute("aria-current"));
        main.querySelector(`.inhoud-lijst a[data-k="${CSS.escape(e.target.id)}"]`)?.setAttribute("aria-current", "true");
      }
    }, { rootMargin: "-15% 0px -75% 0px" });
    tekst.querySelectorAll("h2,h3").forEach(h => io.observe(h));
    signal.addEventListener("abort", () => io.disconnect());

    const ga = id => {
      const el = id && document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: "start" });
      el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true });
    };
    const zoek = woord => {
      tekst.querySelectorAll("mark").forEach(mk => mk.replaceWith(mk.textContent));
      tekst.normalize();
      const w = woord.trim();
      if (w.length < 2) { $("#vtel", main).textContent = ""; return; }
      markeer(tekst, w);
      const n = tekst.querySelectorAll("mark").length;
      $("#vtel", main).textContent = n ? `${n} ${n === 1 ? "keer" : "keer"} gevonden` : "Niet gevonden";
      if (n) { tekst.querySelector("mark").scrollIntoView({ block: "center" }); say(`${n} keer gevonden`); }
    };
    let wacht = null;
    acties(main, {
      vzoek: el => { clearTimeout(wacht); wacht = setTimeout(() => { zoek(el.value); zetParams({ q: el.value || "" }); }, 250); }
    }, signal);
    main.addEventListener("click", e => {
      const a = e.target.closest(".inhoud-lijst a[data-k]");
      if (!a) return;
      e.preventDefault(); zetParams({ k: a.dataset.k }); ga(a.dataset.k);
      if (matchMedia("(max-width: 900px)").matches) a.closest("details").open = false;
    }, { signal });

    const toepassen = p => { if (p.q) { q.value = p.q; zoek(p.q); } else if (p.k) requestAnimationFrame(() => ga(p.k)); };
    zetUpdate(p => { if (p.k) ga(p.k); if ((p.q || "") !== q.value) { q.value = p.q || ""; zoek(q.value); } });
    toepassen(params);
  }
};
