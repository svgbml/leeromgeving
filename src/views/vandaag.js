// Vandaag: overzicht over alle modules. Gebruikt de kleine index (#63), dus de volledige kaarten
// van een module worden pas geladen als je hem opent (of als je met de muis op de knop staat, #78).
import { esc, cijferTekst } from "../domain/text.js";
import { moduleSummary } from "../domain/stats.js";
import { localDay } from "../domain/srs.js";
import { plan, prognose, reeks, langsteReeks, heatmap, week, dagenTot } from "../domain/planner.js";
import { app, prog, bewaar, instellingen, dagboek, toetsdata, zetToetsdatum, samenvattingKaarten, fetchData, kiesModule } from "../core/store.js";
import { $, acties, toast } from "../core/dom.js";
import { ga } from "../core/router.js";
import { telOp, meters } from "../ui/motion.js";
import { sparkline, heatmapSvg, ring, staafjes } from "../ui/grafiek.js";

export default {
  async mount({ main, signal }) {
    const inst = instellingen(), boek = dagboek(), vandaag = boek[localDay()] || { n: 0 };
    const datum = new Date().toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
    const volgorde = app.modules.slice().sort((a, b) => (a.jaar - b.jaar) || (a.periode_nr - b.periode_nr));
    const wk = week(boek), rk = reeks(boek), maandag = new Date().getDay() === 1;
    const td = toetsdata();
    const alleCards = app.modules.flatMap(m => Object.values(prog(m.id).cards));

    main.innerHTML = `
      <h1 style="view-transition-name:titel">Vandaag</h1>
      <p class="sub">${esc(datum)}</p>
      <div class="dash-boven">
        <div class="card dash-tot dash-held" id="dash-tot" aria-live="polite"><p class="held-kop">Herhaling van vandaag</p><p class="m0">Modules laden…</p></div>
        <div class="card dash-doel">
          ${ring(vandaag.n, inst.doel, { tekst: `${vandaag.n} van ${inst.doel} herhalingen vandaag` })}
          <div><p class="m0"><strong>Dagdoel</strong></p><p class="src m0">${vandaag.n} van ${inst.doel} herhalingen${vandaag.n >= inst.doel ? " · gehaald!" : ""}</p>
          <p class="src m0">${rk ? `<strong class="reeks">${rk} ${rk === 1 ? "dag" : "dagen"} op rij</strong>` : "Begin vandaag een reeks"} · langste ${langsteReeks(boek)}</p></div>
        </div>
      </div>
      ${(maandag || wk.n) ? `<div class="card week ${maandag ? "week-maandag" : ""}">
        <p class="m0"><strong>${maandag ? "Je week in het kort" : "Afgelopen 7 dagen"}</strong></p>
        <p class="m0">${wk.n} herhalingen · ${wk.nieuw} nieuwe kaarten · ${wk.dagen} van 7 dagen gestudeerd${wk.m ? ` · toetsen gemiddeld ${Math.round(wk.p / wk.m * 100)}%` : ""}</p>
        <p class="src m0" id="week-zwak"></p></div>` : ""}
      <h2>Per module</h2>
      <ul class="dash-grid" role="list">
        ${volgorde.map((m, i) => `<li class="card dash-card${m.id === app.mod.id ? " dash-huidig" : ""}" id="dash-${esc(m.id)}" style="--i:${i}" data-module="${esc(m.id)}">
          <p class="dash-per">${esc(m.periode)}</p>
          <h3 class="dash-titel" ${m.id === app.mod.id ? `style="view-transition-name:mod-${esc(m.id)}"` : ""}>${esc(m.titel)}</h3>
          <p class="src m0">Laden…</p></li>`).join("")}
      </ul>
      <div class="dash-onder">
        <section class="card"><h2 class="kop0">Studiedagen</h2>${heatmapSvg(heatmap(boek, 20))}
          <p class="src heat-leg">minder <span class="heat-0"></span><span class="heat-1"></span><span class="heat-2"></span><span class="heat-3"></span><span class="heat-4"></span> meer</p></section>
        <section class="card"><h2 class="kop0">Herhalingen komende week</h2>${staafjes(prognose(alleCards, 7))}
          <p class="src">Alle modules samen, inclusief kaarten die vandaag al klaarstaan.</p></section>
      </div>`;

    let klaar = 0, totDue = 0, totNieuw = 0, actief = 0, zwakste = [];
    const totaal = () => {
      const el = $("#dash-tot", main);
      if (!el || signal.aborted) return;
      const werk = totDue + totNieuw;
      const kop = `<p class="held-kop">Herhaling van vandaag</p>`;
      el.innerHTML = klaar < volgorde.length ? `${kop}<p class="m0">Modules laden… (${klaar} van ${volgorde.length})</p>`
        : werk ? `${kop}<p class="held-getal"><strong data-tel="${werk}">0</strong> <span>${werk === 1 ? "kaart" : "kaarten"} klaar in ${actief || 1} ${(actief || 1) === 1 ? "module" : "modules"}</span></p>
            <p class="held-chips"><span>${totDue} herhalen</span><span>${totNieuw} nieuw</span></p>
            <div class="row held-knoppen">${totDue ? `<button type="button" class="btn btn-primary" data-actie="alle">Herhaal alles (${totDue})</button>` : ""}
              <a class="btn" href="#/toets">Oefentoets maken</a></div>`
        : `${kop}<p class="held-getal klein"><strong>Alles bijgewerkt</strong></p><p class="m0">Er staan vandaag geen herhalingen klaar. Kies een module om nieuwe kaarten te leren of een oefentoets te maken.</p>`;
      el.querySelectorAll("[data-tel]").forEach(n => telOp(n, 0, +n.dataset.tel, 700));
      const wz = $("#week-zwak", main);
      if (wz && klaar === volgorde.length && zwakste.length) { const z = zwakste.sort((a, b) => a.pct - b.pct)[0]; wz.textContent = `Zwakste onderdeel: ${z.groep} (${z.pct}%, ${z.mod}).`; }
    };

    for (const m of volgorde) {
      samenvattingKaarten(m).then(k => {
        const p = prog(m.id), s = moduleSummary(k, p);
        klaar++; totDue += s.due; if (s.gezien) { totNieuw += s.nieuw; if (s.due + s.nieuw) actief++; }
        if (s.zwakste) zwakste.push({ ...s.zwakste, mod: m.titel });
        vul(m, s);
      }).catch(() => {
        klaar++;
        const el = main.querySelector(`#dash-${CSS.escape(m.id)} .src`);
        if (el) el.textContent = "Kon deze module niet laden.";
      }).finally(totaal);
    }

    function vul(m, s) {
      const el = main.querySelector(`#dash-${CSS.escape(m.id)}`);
      if (!el || signal.aborted) return;
      const pct = s.totaal ? Math.round(s.beheerst / s.totaal * 100) : 0;
      const begonnen = s.gezien > 0, werk = s.due + (begonnen ? s.nieuw : 0);
      const datumT = td[m.id], pl = plan({ ongezien: s.ongezien, toetsdatum: datumT });
      const limiet = prog(m.id).limiet ?? 15;
      el.innerHTML = `
        <p class="dash-per">${esc(m.periode)}${m.id === app.mod.id ? ` · <span class="tag">gekozen</span>` : ""}</p>
        <h3 class="dash-titel" ${m.id === app.mod.id ? `style="view-transition-name:mod-${esc(m.id)}"` : ""}>${esc(m.titel)}</h3>
        ${begonnen ? `
          <p class="dash-stats m0"><strong>${s.due}</strong> herhalen · <strong>${s.nieuw}</strong> nieuw${s.moeilijk ? ` · <span class="dash-moeilijk">${s.moeilijk} moeilijk</span>` : ""}</p>
          <div class="meter" data-meter="dash-${esc(m.id)}" role="progressbar" aria-label="Beheerst in ${esc(m.titel)}" aria-valuemin="0" aria-valuemax="${s.totaal}" aria-valuenow="${s.beheerst}"><span style="width:${pct}%"></span></div>
          <p class="src m0">${s.beheerst} van ${s.totaal} beheerst (${pct}%)</p>
          ${s.laatsteToets ? `<div class="dash-cijfer"><p class="src m0">Laatste toets: <strong class="${s.laatsteToets.cijfer >= 5.5 ? "goed" : "fout"}">${cijferTekst(s.laatsteToets.cijfer)}</strong></p>${sparkline(s.cijfers, { label: `Cijfers ${m.titel}` })}</div>` : ""}
          ${s.zwakste ? `<p class="src m0">Zwakste onderdeel: ${esc(s.zwakste.groep)} (${s.zwakste.pct}%)</p>` : ""}`
        : `<p class="src m0">Nog niet begonnen · ${s.totaal} kaarten</p>`}
        <details class="toetsdatum"${datumT ? " open" : ""}><summary>${datumT ? (pl.voorbij ? "Toets geweest" : `Toets over <strong>${pl.dagen}</strong> ${pl.dagen === 1 ? "dag" : "dagen"}`) : "Toetsdatum instellen"}</summary>
          <label class="field">Datum van de toets<input type="date" value="${esc(datumT || "")}" data-wijzig="datum" data-id="${esc(m.id)}"></label>
          ${pl && !pl.voorbij && s.ongezien ? `<p class="src m0">Om alle ${s.ongezien} nieuwe kaarten twee dagen voor de toets gezien te hebben: <strong>${pl.perDag} per dag</strong> (nu ${limiet}).</p>
            ${pl.perDag !== limiet ? `<button type="button" class="btn btn-klein" data-actie="plan" data-id="${esc(m.id)}" data-n="${pl.perDag}">Zet daglimiet op ${pl.perDag}</button>` : ""}` : ""}
        </details>
        <div class="row dash-knoppen">
          <button type="button" class="btn ${werk || !begonnen ? "btn-primary" : ""}" data-actie="open" data-id="${esc(m.id)}" data-naar="flashcards">${!begonnen ? "Beginnen" : werk ? `Herhalen (${werk})` : "Flashcards"}</button>
          <button type="button" class="btn" data-actie="open" data-id="${esc(m.id)}" data-naar="toets">Oefentoets</button>
        </div>`;
      meters(el);
    }

    acties(main, {
      open: async el => { await kiesModule(el.dataset.id); document.getElementById("module").value = el.dataset.id; ga(el.dataset.naar); },
      alle: () => { app.flash = null; ga("flashcards", { modus: "alle" }); },
      datum: el => { zetToetsdatum(el.dataset.id, el.value); toast(el.value ? "Toetsdatum opgeslagen" : "Toetsdatum verwijderd"); ga("vandaag"); },
      plan: el => { const p = prog(el.dataset.id); p.limiet = +el.dataset.n; bewaar(el.dataset.id); if (el.dataset.id === app.mod.id) app.flash = null; toast(`Daglimiet op ${el.dataset.n} gezet`); el.remove(); }
    }, signal);
    // Vooraf ophalen bij aanwijzen of focus (#78): de module staat al klaar als je klikt.
    const ophalen = e => { const li = e.target.closest?.("[data-module]"); if (li) fetchData(app.modules.find(x => x.id === li.dataset.module)); };
    main.addEventListener("pointerover", ophalen, { signal, passive: true });
    main.addEventListener("focusin", ophalen, { signal });
  }
};

export const dagenTotToets = id => dagenTot(toetsdata()[id]);
