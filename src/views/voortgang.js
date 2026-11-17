// Voortgang van de gekozen module.
import { esc, rich, plain, cijfer, cijferTekst, kort } from "../domain/text.js";
import { isKnown, isLeech, localDay } from "../domain/srs.js";
import { TYPEN, TYPENAAM } from "../domain/quiz.js";
import { leesExport } from "../domain/progress.js";
import { app, prog, bewaar, vervangProg, wisProg, flush } from "../core/store.js";
import { $, acties, say, download, datumTijd } from "../core/dom.js";
import { link } from "../core/router.js";
import { meters } from "../ui/motion.js";
import { sparkline } from "../ui/grafiek.js";
import { laadExtra } from "../ui/kaart-extra.js";

export default {
  async mount({ main, signal }) {
    await laadExtra();
    const teken = () => render(main);
    teken();
    acties(main, {
      meerantw: el => { $("#antwlijst", main).innerHTML = antwoorden().map(antwKaart).join(""); el.remove(); },
      wisantw: el => bevestig(el, () => { prog().antwoorden = {}; bewaar(); say("Bewaarde antwoorden gewist"); teken(); }),
      wisfouten: el => bevestig(el, () => { prog().fouten = {}; bewaar(); say("Foutenboek leeg"); teken(); }),
      exp: () => { flush(); download(`voortgang-${app.mod.id}-${localDay()}.json`, JSON.stringify({ module: app.mod.id, prog: prog() }, null, 1)); },
      reset: el => bevestig(el, () => { wisProg(app.mod.id); app.flash = null; app.quiz = null; say("Voortgang gewist"); teken(); }),
      imp: async (el, e) => {
        const file = e.target.files?.[0]; if (!file) return;
        let res;
        try { res = leesExport(JSON.parse(await file.text()), app.mod.id); } catch { res = { ok: false, fout: "Dit bestand is geen geldige JSON." }; }
        if (!res.ok) { $("#impmsg", main).textContent = `Importeren mislukt: ${res.fout}`; e.target.value = ""; return; }
        vervangProg(app.mod.id, res.prog); app.flash = null; app.quiz = null;
        teken(); $("#impmsg", main).textContent = "Voortgang geïmporteerd."; say("Voortgang geïmporteerd");
      }
    }, signal);
  }
};

function bevestig(el, doe) {
  if (el.dataset.confirm) doe();
  else { el.dataset.confirm = "1"; el.textContent = "Klik nogmaals om te wissen"; el.focus(); }
}
const isVraag = () => app.data.kaarttype === "vraag";
const groep = b => (isVraag() && b.les) ? b.les : b.onderwerp;
function antwoorden() {
  return Object.entries(prog().antwoorden || {}).map(([id, lijst]) => ({ b: app.gen.byId(id), lijst }))
    .filter(x => x.b && x.lijst.length).sort((x, y) => new Date(y.lijst.at(-1).d) - new Date(x.lijst.at(-1).d));
}
const antwKaart = x => `<article class="card"><h3 class="term">${rich(plain(x.b.begrip))}</h3>
  ${x.lijst.slice().reverse().map(p => `<div class="poging"><p class="src m0">${datumTijd(p.d)} · <strong>${p.p}/${p.max} punten</strong></p><p class="tekst pre">${esc(p.t) || "<em>leeg gelaten</em>"}</p></div>`).join("")}
  <details><summary>Antwoordmodel</summary><div class="tekst">${rich(x.b.uitleg)}</div></details></article>`;

function render(main) {
  const p = prog(), kaarten = app.gen.toetsbareKaarten;
  const groepen = [...new Set(kaarten.map(groep))];
  const rows = groepen.map(t => {
    const items = kaarten.filter(b => groep(b) === t);
    const seen = items.filter(b => p.cards[b.id]).length, known = items.filter(b => isKnown(p.cards[b.id])).length;
    let ok = 0, no = 0, pp = 0, m = 0, gehad = 0;
    items.forEach(b => { const q = p.quiz[b.id]; if (q) { gehad++; ok += q.ok; no += q.no; pp += q.p || 0; m += q.m || 0; } });
    const pct = m ? Math.round(pp / m * 100) : (ok + no ? Math.round(ok / (ok + no) * 100) : null);
    return { t, n: items.length, seen, known, gehad, pct };
  });
  const voorraad = app.gen.typeVoorraad();
  const typeRows = TYPEN.filter(k => voorraad[k] || p.types[k]).map(k => {
    const t = p.types[k] || { n: 0, p: 0, m: 0 };
    return { k, naam: k === "casus" ? "Casusdeelvraag" : TYPENAAM[k], voorraad: k === "rekenen" ? "∞" : voorraad[k], n: t.n, pct: t.m ? Math.round(t.p / t.m * 100) : null };
  });
  const tot = rows.reduce((a, r) => ({ n: a.n + r.n, known: a.known + r.known, seen: a.seen + r.seen }), { n: 0, known: 0, seen: 0 });
  const ids = new Set(kaarten.map(b => b.id));
  const due = Object.entries(p.cards).filter(([k, c]) => ids.has(k.split("~")[0]) && c.due <= Date.now()).length;
  const hard = kaarten.filter(b => isLeech(p.cards[b.id]));
  const hist = p.history.slice(-10).reverse();
  const cijfers = p.history.slice(-12).map(h => cijfer(h.punten ?? h.ok, h.maxPunten ?? h.n));
  const antw = antwoorden(), fouten = Object.keys(p.fouten).filter(id => ids.has(id));
  const sterren = Object.keys(p.sterren).filter(id => ids.has(id)).length, notities = Object.keys(p.notities).length;

  main.innerHTML = `
    <h1 style="view-transition-name:titel">Voortgang</h1>
    <p class="sub"><span style="view-transition-name:mod-${esc(app.mod.id)}">${esc(app.mod.titel)}</span> · “beheerst” = kaart komt pas over 7 dagen of later terug.</p>
    <div class="card"><p class="m0 mb"><strong>${tot.known}</strong> van ${tot.n} kaarten beheerst · ${tot.seen} gezien · ${due} klaar om te herhalen · ${sterren} gemarkeerd · ${notities} notities</p>
      <div class="meter" data-meter="beheerst-${esc(app.mod.id)}" role="progressbar" aria-label="Beheerst" aria-valuemin="0" aria-valuemax="${tot.n}" aria-valuenow="${tot.known}"><span style="width:${tot.n ? tot.known / tot.n * 100 : 0}%"></span></div></div>
    ${hard.length ? `<div class="card"><p class="m0 mb"><strong>${hard.length} moeilijke ${hard.length === 1 ? "kaart" : "kaarten"}</strong> — vier keer of vaker fout gegaan.</p>
      <a class="btn" href="${link("flashcards", { modus: "moeilijk" })}">Oefen alleen die kaarten</a></div>` : ""}
    ${fouten.length ? `<div class="card"><p class="m0 mb"><strong>Foutenboek: ${fouten.length}</strong> ${fouten.length === 1 ? "kaart" : "kaarten"} die in een toets fout gingen.</p>
      <div class="row"><a class="btn" href="#/toets">Naar de oefentoets</a><button type="button" class="btn" data-actie="wisfouten">Foutenboek leegmaken</button></div></div>` : ""}
    <h2>Cijfers</h2>
    ${cijfers.length >= 2 ? `<div class="card trend">${sparkline(cijfers, { b: 320, h: 70, label: "Cijfers van je laatste toetsen" })}<p class="src m0">Laatste ${cijfers.length} toetsen; de stippellijn is de 5,5.</p></div>` : ""}
    ${hist.length ? `<div class="tabelwrap" tabindex="0" role="region" aria-label="Laatste toetsen"><table><thead><tr><th scope="col">Datum</th><th scope="col">Punten</th><th scope="col">Cijfer</th><th scope="col">Zwakste</th></tr></thead><tbody>${hist.map(h => {
      const weak = Object.entries(h.per).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
      const pp = h.punten ?? h.ok, m = h.maxPunten ?? h.n;
      return `<tr><td>${datumTijd(h.date)}${h.examen ? ` <span class="tag">examen</span>` : ""}</td><td class="num">${pp}/${m}</td><td class="num">${cijferTekst(cijfer(pp, m))}</td><td>${weak ? esc(weak[0]) : "–"}</td></tr>`; }).join("")}</tbody></table></div>` : `<p>Nog geen toetsen gemaakt.</p>`}
    <h2>Per vraagtype</h2>
    <p class="src mt0">“In database” = hoeveel vragen van dit type de module kan maken.</p>
    <div class="tabelwrap" tabindex="0" role="region" aria-label="Vraagtypen"><table><thead><tr><th scope="col">Vraagtype</th><th scope="col">In database</th><th scope="col">Gehad</th><th scope="col">Goed</th></tr></thead>
    <tbody>${typeRows.map(r => `<tr><th scope="row">${esc(r.naam)}</th><td class="num">${r.voorraad}</td><td class="num">${r.n}</td><td class="num">${r.pct === null ? "–" : r.pct + "%"}</td></tr>`).join("")}</tbody></table></div>
    <h2>Per ${isVraag() ? "les" : "onderwerp"}</h2>
    <div class="tabelwrap" tabindex="0" role="region" aria-label="Per ${isVraag() ? "les" : "onderwerp"}"><table><thead><tr><th scope="col">${isVraag() ? "Les" : "Onderwerp"}</th><th scope="col">Kaarten</th><th scope="col">Gezien</th><th scope="col">Beheerst</th><th scope="col">Getoetst</th><th scope="col">Goed</th></tr></thead>
    <tbody>${rows.map(r => `<tr><th scope="row"><a href="${link("begrippen", isVraag() ? { les: r.t } : { t: r.t })}">${esc(r.t)}</a></th><td class="num">${r.n}</td><td class="num">${r.seen}</td><td class="num">${r.known}</td><td class="num">${r.gehad}</td><td class="num">${r.pct === null ? "–" : r.pct + "%"}</td></tr>`).join("")}
    <tr><th scope="row">Totaal</th><td class="num">${tot.n}</td><td class="num">${tot.seen}</td><td class="num">${tot.known}</td><td class="num">${rows.reduce((a, r) => a + r.gehad, 0)}</td><td></td></tr></tbody></table></div>
    ${antw.length ? `<h2>Mijn antwoorden</h2><p class="src mt0">${antw.length} ${antw.length === 1 ? "vraag" : "vragen"} met een bewaard antwoord, per vraag de laatste drie pogingen.</p>
      <div id="antwlijst">${antw.slice(0, 5).map(antwKaart).join("")}</div>
      <div class="row">${antw.length > 5 ? `<button type="button" class="btn" data-actie="meerantw">Toon alle ${antw.length}</button>` : ""}<button type="button" class="btn" data-actie="wisantw">Wis bewaarde antwoorden</button></div>` : ""}
    <h2>Opslag</h2>
    <p class="src mt0">Voortgang staat in deze browser. Automatisch synchroniseren tussen apparaten stel je in onder <a href="#/instellingen">Instellingen</a>.</p>
    <div class="row">
      <button type="button" class="btn" data-actie="exp">Exporteer voortgang</button>
      <label class="btn" for="imp">Importeer voortgang</label><input id="imp" type="file" accept="application/json,.json" class="visually-hidden" data-wijzig="imp">
      <button type="button" class="btn" data-actie="reset">Wis voortgang</button>
    </div>
    <p id="impmsg" class="src" role="status"></p>`;
  meters(main);
}
