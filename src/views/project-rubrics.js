// Project > Rubrics: waarop je werk beoordeeld wordt, met zelfbeoordeling (OVERHAUL.md > B3, 3.5).
//
// De drie formulieren van de opleiding hebben elk een andere vorm (zie tools/rubrics.py), en dat
// is hier zichtbaar in plaats van weggepoetst:
//   rubric            criteria met per niveau een beschrijving. Hier kun je jezelf inschalen en
//                     zien wat er mist voor het niveau erboven.
//   afvinkformulier   de niveaukolommen zijn in het origineel leeg; de assessor kruist aan. Er
//                     staat dus geen beschrijving per niveau, en die verzinnen we niet.
//   vaardigheden      een monitoringsformulier met omschrijvingen, geen niveaus.
// De rapportage-rubric draagt _onzeker: samengevoegde cellen verschuiven de kolommen, dus de
// koppeling tekst → niveau is niet betrouwbaar. Dat staat met zoveel woorden op het scherm,
// want anders zou je hier een cijfer op baseren.
import { esc } from "../domain/text.js";
import { projectenVan, kiesProject, rubricsVan, niveauBoven } from "../domain/project.js";
import { projectKiezer, projectSub, herkomst, keuzeActies } from "../ui/projectkeuze.js";
import { app, laadVleugelData, laadRubric, projectKeuze, zetProjectKeuze } from "../core/store.js";
import { $, acties } from "../core/dom.js";

const SOORT_UITLEG = {
  rubric: "Een rubric: per criterium staat beschreven wat elk niveau betekent.",
  afvinkformulier: "Een afvinkformulier: de assessor kruist een niveau aan. Het origineel heeft geen "
    + "beschrijving per niveau, dus die staat hier ook niet.",
  vaardigheden: "Een monitoringsformulier: vaardigheden met een omschrijving, zonder niveaus."
};

// Eén criterium van een echte rubric: de niveaus om jezelf in te schalen, plus wat erboven mist.
function criterium(rubric, c, i) {
  const niveaus = Array.isArray(rubric.niveaus) ? rubric.niveaus : [];
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
      `<li>${esc(t.tekst)}${Number.isFinite(t.kolom) ? ` <span class="src">kolom ${t.kolom}</span>` : ""}</li>`
    ).join("")}</ul>` : ""}
  </li>`;
}

export default {
  async mount({ main, signal }) {
    const m = app.mod;
    main.innerHTML = `<h1>Rubrics</h1><p class="sub">Project · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Rubrics laden…</p>`;

    let data = null, rubrics = [];
    try {
      data = await laadVleugelData(m, "project");
      rubrics = await Promise.all(rubricsVan(data).map(id => laadRubric(id).then(r => ({ id, r }))));
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

            ${(r.criteria || []).length ? `<ul class="kernlijst" data-rubric="${esc(id)}">
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
};
