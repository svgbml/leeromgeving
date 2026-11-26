// Project > Rubrics: waarop je werk beoordeeld wordt, met zelfbeoordeling (OVERHAUL.md > B3, 3.5).
//
// De drie formulieren van de opleiding hebben elk een andere vorm (zie tools/rubrics.py), en dat
// is hier zichtbaar in plaats van weggepoetst:
//   rubric            criteria met per niveau een beschrijving. Hier kun je jezelf inschalen en
//                     zien wat er mist voor het niveau erboven.
//   afvinkformulier   de niveaukolommen zijn in het origineel leeg; de assessor kruist aan. Er
//                     staat dus geen beschrijving per niveau, en die verzinnen we niet.
//   vaardigheden      een monitoringsformulier met omschrijvingen, geen niveaus.
//   scoreformulier    het officiele toetsformulier: punten per onderdeel, geen niveaus. Je kunt
//                     je hier niet inschalen; wat je wel ziet is hoe de punten verdeeld zijn.
//   checklist         een VLD/NVD-lijst voor een praktijktoets: alles moet voldaan zijn.
//   schaalformulier   criteria met een schaal (1 t/m 5, of NEE/JA) die de beoordelaar aankruist.
//                     Wat elk cijfer betekent staat niet in het origineel, dus ook niet hier.
// De rapportage-rubric draagt _onzeker: samengevoegde cellen verschuiven de kolommen, dus de
// koppeling tekst → niveau is niet betrouwbaar. Dat staat met zoveel woorden op het scherm,
// want anders zou je hier een cijfer op baseren.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, rubricsVan, niveauBoven, kanInschalen, rangVan } from "../domain/project.js";
import { projectKiezer, projectSub, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, laadRubric, projectKeuze, zetProjectKeuze } from "../core/store.js";
import { open as kluisOpen } from "../core/kluis.js";
import { slotKaart, slotActies } from "../ui/slot.js";
import { $, acties } from "../core/dom.js";

const SOORT_UITLEG = {
  rubric: "Een rubric: per criterium staat beschreven wat elk niveau betekent.",
  afvinkformulier: "Een afvinkformulier: de assessor kruist een niveau aan. Het origineel heeft geen "
    + "beschrijving per niveau, dus die staat hier ook niet.",
  vaardigheden: "Een monitoringsformulier: vaardigheden met een omschrijving, zonder niveaus.",
  scoreformulier: "Het officiële toetsformulier: per onderdeel hoeveel punten er te halen zijn en "
    + "wanneer het voldoende is. Geen niveaus, dus ook geen zelfinschaling.",
  checklist: "Een VLD/NVD-lijst: elk onderdeel moet voldaan zijn, er wordt niets gewogen.",
  schaalformulier: "Per criterium kruist de beoordelaar een cijfer op een schaal aan. Wat elk "
    + "cijfer betekent staat niet in het formulier, dus hier ook niet."
};

// Criteria met een schaal: gegroepeerd per hoofdstuk, met de schaal als tekst erachter.
function schaallijst(r) {
  const perHoofdstuk = new Map();
  for (const c of r.criteria || []) {
    const k = c.hoofdstuk || "Overig";
    if (!perHoofdstuk.has(k)) perHoofdstuk.set(k, []);
    perHoofdstuk.get(k).push(c);
  }
  return [...perHoofdstuk].map(([kop, lijst]) => `<div class="score-onderdeel">
    <h3>${esc(kop)}</h3>
    <ul class="feiten">${lijst.map(c => `<li>${esc(c.criterium)}
      <span class="src">${esc((c.schaal || []).join(" · "))}</span></li>`).join("")}</ul>
  </div>`).join("");
}

// Het toetsformulier: de puntenverdeling is hier de informatie. Een onderdeel kan meer dan één
// criterium hebben (het origineel voegt die cellen samen), dus de kop staat erboven.
function scoretabel(r) {
  const perOnderdeel = new Map();
  for (const c of r.criteria || []) {
    if (!perOnderdeel.has(c.onderdeel)) perOnderdeel.set(c.onderdeel, []);
    perOnderdeel.get(c.onderdeel).push(c);
  }
  return [...perOnderdeel].map(([onderdeel, lijst]) => `<div class="score-onderdeel">
    <h3>${esc(onderdeel || "Onderdeel")}${lijst[0]?.vorm ? ` <span class="src">${esc(lijst[0].vorm)}</span>` : ""}</h3>
    <ul class="feiten">${lijst.map(c => `<li>${esc(c.criterium)}
      <span class="src">${c.score_min === c.score_max
        ? esc(c.score_min) : `${esc(c.score_min)}–${esc(c.score_max)} punten`}</span></li>`).join("")}</ul>
  </div>`).join("");
}

const checklijst = r => (r.groepen || []).map(g => `<div class="score-onderdeel">
  <h3>${esc(g.groep)}</h3>
  <ul class="feiten">${(g.handelingen || []).map(h => `<li>${esc(h)}</li>`).join("")}</ul>
</div>`).join("");

// Eén criterium van een echte rubric: de niveaus om jezelf in te schalen, plus wat erboven mist.
function criterium(rubric, c, i) {
  // Alleen inschalen waar de niveaus een volgorde hebben. Staat er "Gemiddeld conform
  // verwachting 7" naast "Goed 8", dan is niet te zeggen wat hoger is zonder te gokken.
  const niveaus = kanInschalen(rubric) ? rubric.niveaus : [];
  const kop = [c.hoofdstuk, c.criterium].filter(Boolean).join(" · ") || `Criterium ${i + 1}`;
  return `<li>
    <p class="m0"><strong>${esc(kop)}</strong>${c.gewicht ? ` <span class="src">weegt ${c.gewicht}</span>` : ""}</p>
    ${niveaus.length ? `<label class="field">Waar sta je?
      <select data-wijzig="niveau" data-k="${i}">
        <option value="">— nog niet ingeschaald —</option>
        ${niveaus.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}
      </select></label>
      <p class="src" data-boven="${i}"></p>` : ""}
    ${(c.teksten || []).length ? `<ul class="feiten">${c.teksten.map(t =>
      `<li>${t.niveau ? `<strong>${esc(t.niveau)}:</strong> ` : ""}${esc(t.tekst)}${
        Number.isFinite(t.kolom) ? ` <span class="src">kolom ${t.kolom}</span>` : ""}</li>`
    ).join("")}</ul>` : ""}
  </li>`;
}

export default {
  async mount(ctx) {
    // Het slot tekent dit scherm opnieuw zodra de kluis open is; daarom staat alles in één
    // functie die zichzelf opnieuw kan aanroepen.
    return toon(ctx);
  }
};

async function toon({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Rubrics</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Rubrics laden…</p>`;

    let data = null, rubrics = [];
    try {
      data = await laadVleugelData(m, "project");
    } catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De rubrics konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    // De formulieren zelf staan versleuteld in de repo: openbaar lesmateriaal is niet de
    // bedoeling. Zonder wachtwoord laat dit scherm alleen het slot zien.
    const ids = rubricsVan(data);
    if (ids.length && !await kluisOpen()) {
      if (signal.aborted) return;
      main.innerHTML = `<h1>Rubrics</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
        <div id="slot-vak">${slotKaart(
          `${ids.length} beoordelingsformulier${ids.length === 1 ? "" : "en"} van deze module`)}</div>`;
      slotActies($("#slot-vak", main), { signal, klaar: () => toon({ main, signal }) });
      return;
    }

    try {
      rubrics = await Promise.all(ids.map(id => laadRubric(id).then(r => ({ id, r }))));
    } catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De rubrics konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const projecten = projectenVan(data);
    let open = false;
    // Je inschaling per rubric en criterium. Alleen voor dit bezoek: het is een hulpmiddel om te
    // zien wat er mist, geen beoordeling om te bewaren.
    const ingeschaald = new Map();

    const teken = () => {
      const gekozen = projectKeuze(m?.id);
      const project = kiesProject(projecten, gekozen);

      main.innerHTML = `
        <h1>Rubrics</h1>
        <p class="sub">${projectSub(m, project, projecten, gekozen)}</p>
        ${projectKiezer(projecten, project, gekozen, { open })}

        ${!rubrics.length ? `<div class="card">
          <p class="m0">Voor deze module staan er nog geen beoordelingsformulieren in de data.</p>
          <p class="src">De formulieren van Eiwitten in interactie zijn omgezet (zie
            <code>data/rubrics/</code>); de andere modules nog niet.</p>
        </div>` : rubrics.map(({ id, r }) => !r ? `<div class="card">
            <p class="m0" role="alert">De data noemt rubric <code>${esc(id)}</code>, maar dat bestand
              bestaat niet.</p>
          </div>` : `<div class="card">
            <h2>${esc(r.titel || id)}</h2>
            <p class="src">${esc(SOORT_UITLEG[r.soort] || r.soort || "")}</p>
            ${r._onzeker ? `<p class="waarschuwing" role="alert">${esc(r._onzeker)}</p>` : ""}
            ${r._vorm ? `<p class="src">${esc(r._vorm)}</p>` : ""}
            ${(r.niveaus || []).length && !kanInschalen(r) ? `<p class="src">Niveaus op dit
              formulier: ${r.niveaus.map(esc).join(" · ")}. Ze staan hier zonder volgorde, omdat
              het origineel niet zegt hoe ze zich tot elkaar verhouden.</p>` : ""}

            ${r.leeruitkomst ? `<h3>Wat je moet kunnen</h3><p class="m0">${esc(r.leeruitkomst)}</p>` : ""}
            ${(r.bewijslast || []).length ? `<h3>Wat je oplevert</h3>
              <ul class="feiten">${r.bewijslast.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}

            ${r.soort === "scoreformulier" ? scoretabel(r) : ""}
            ${r.soort === "schaalformulier" ? schaallijst(r) : ""}
            ${r.soort === "checklist" ? `${r.inleiding ? `<p class="m0">${esc(r.inleiding)}</p>` : ""}
              ${checklijst(r)}
              ${r.afronding ? `<p class="src">${esc(r.afronding)}</p>` : ""}` : ""}

            ${!["scoreformulier", "schaalformulier"].includes(r.soort) && (r.criteria || []).length ? `<ul class="kernlijst" data-rubric="${esc(id)}">
              ${r.criteria.map((c, i) => criterium(r, c, i)).join("")}</ul>` : ""}

            ${(r.vaardigheden || []).length ? `<ul class="feiten">${r.vaardigheden.map(v =>
              `<li><strong>${esc(v.vaardigheid)}</strong> — ${esc(v.uitleg)}</li>`).join("")}</ul>` : ""}

            ${r.bron ? `<p class="src">Uit <code>${esc(r.bron)}</code> van de opleiding.</p>` : ""}
          </div>`).join("")}

        ${herkomst(data)}`;

      // De inschaling van dit bezoek terugzetten na een hertekening.
      for (const [k, waarde] of ingeschaald) {
        const sel = main.querySelector(`[data-rubric="${k.split("|")[0]}"] select[data-k="${k.split("|")[1]}"]`);
        if (sel) { sel.value = waarde; meldBoven(sel); }
      }
    };

    // Wat mist er voor het niveau erboven? Alleen te zeggen als de rubric dat per niveau beschrijft.
    const meldBoven = sel => {
      const lijst = sel.closest("[data-rubric]");
      const rubric = rubrics.find(x => x.id === lijst?.dataset.rubric)?.r;
      const i = Number(sel.dataset.k);
      const doel = sel.closest("li")?.querySelector(`[data-boven="${i}"]`);
      if (!doel || !rubric) return;
      if (!sel.value) { doel.textContent = ""; return; }
      if (rangVan(rubric, sel.value) === undefined) {
        doel.textContent = "Dit formulier zegt niet hoe dit niveau zich tot de andere verhoudt.";
        return;
      }
      const boven = niveauBoven(rubric, rubric.criteria?.[i], sel.value);
      if (!boven) { doel.textContent = "Dit is het hoogste niveau."; return; }
      doel.textContent = boven.tekst
        ? `Voor ${boven.niveau}: ${boven.tekst}`
        : `Voor ${boven.niveau} staat in dit formulier geen beschrijving; de assessor kruist aan.`;
    };

    acties(main, {
      ...keuzeActies({ modId: m?.id, zetKeuze: zetProjectKeuze, zetOpen: v => { open = v; }, hertekenen: teken }),
      niveau: el => {
        const lijst = el.closest("[data-rubric]");
        ingeschaald.set(`${lijst?.dataset.rubric}|${el.dataset.k}`, el.value);
        meldBoven(el);
      }
    }, signal);

    teken();
}
