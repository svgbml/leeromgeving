// De projectvleugel (B3): het domein en de vorm van de gegenereerde data.
//
// De data komt uit tools/project.py en wordt opnieuw gegenereerd zodra de bron verandert.
// Daarom toetst dit niet op aantallen ("drie projecten"), maar op de afspraken waar de
// schermen op leunen: welke velden er zijn, dat id's uniek zijn en dat een verdwenen keuze
// niet in een leeg scherm eindigt.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  projectenVan, opdrachtenVan, rubricsVan, kiesProject, keuzeGeldig, keuzeId, opdrachtenVoor,
  splitsHerkansingen, STATUSSEN, STANDAARD_STATUS, statusGeldig, volgendeStatus,
  statusTelling, niveauBoven
} from "../src/domain/project.js";

const lees = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const modules = lees("data/modules.json").modules;

const projecten = [{ id: "oncologie", naam: "Oncologie" }, { id: "forensisch", naam: "Forensisch" }];

test("projectenVan: ontbrekende of kapotte data geeft een lege lijst", () => {
  for (const kapot of [null, undefined, {}, { projecten: null }, { projecten: "nee" }]) {
    assert.deepEqual(projectenVan(kapot), []);
    assert.deepEqual(opdrachtenVan(kapot), []);
    assert.deepEqual(rubricsVan(kapot), []);
  }
});

test("kiesProject: de bewaarde keuze wint", () => {
  assert.equal(kiesProject(projecten, "forensisch").id, "forensisch");
});

test("kiesProject: een verdwenen keuze valt terug op het eerste project", () => {
  assert.equal(kiesProject(projecten, "weggehaald").id, "oncologie");
  assert.equal(kiesProject(projecten, undefined).id, "oncologie");
});

test("kiesProject: een module zonder projectkeuzes geeft null", () => {
  assert.equal(kiesProject([], "oncologie"), null);
});

test("keuzeGeldig: onderscheidt een eigen keuze van een terugval", () => {
  assert.equal(keuzeGeldig(projecten, "forensisch"), true);
  assert.equal(keuzeGeldig(projecten, "weggehaald"), false);
  assert.equal(keuzeGeldig(projecten, undefined), false);
  assert.equal(keuzeGeldig([], "oncologie"), false);
});

test("keuzeId: er wordt alleen gefilterd op een keuze die van jou is", () => {
  // Niet gekozen: dan geen projectfilter, ook al valt de weergave terug op het eerste project.
  assert.equal(keuzeId(projecten, undefined), null);
  assert.equal(keuzeId(projecten, "weggehaald"), null);
  assert.equal(keuzeId(projecten, "forensisch"), "forensisch");
  // Eén project: er is niets te kiezen, dus dat is het antwoord.
  assert.equal(keuzeId([{ id: "shbg" }], undefined), "shbg");
  assert.equal(keuzeId([], undefined), null);
});

test("opdrachtenVoor: een opdracht zonder project hoort bij elke keuze", () => {
  const data = {
    opdrachten: [
      { id: "a", project: null }, { id: "b", project: "oncologie" }, { id: "c", project: "forensisch" }
    ]
  };
  assert.deepEqual(opdrachtenVoor(data, "oncologie").map(o => o.id), ["a", "b"]);
  assert.deepEqual(opdrachtenVoor(data, "forensisch").map(o => o.id), ["a", "c"]);
  // Zonder keuze blijven alleen de algemene over; geen enkele projectopdracht gokken.
  assert.deepEqual(opdrachtenVoor(data, null).map(o => o.id), ["a"]);
});

test("splitsHerkansingen: herkansingen staan apart, niet weggefilterd", () => {
  const { gewoon, herkansingen } = splitsHerkansingen([
    { id: "a" }, { id: "b", herkansing: true }
  ]);
  assert.deepEqual(gewoon.map(o => o.id), ["a"]);
  assert.deepEqual(herkansingen.map(o => o.id), ["b"]);
});

test("status: de standaard staat in de lijst en volgendeStatus blijft binnen de lijst", () => {
  assert.ok(STATUSSEN.includes(STANDAARD_STATUS));
  assert.equal(statusGeldig("bezig"), true);
  assert.equal(statusGeldig("klaar"), false);
  assert.equal(volgendeStatus("te doen"), "bezig");
  assert.equal(volgendeStatus("beoordeeld"), "beoordeeld");
});

test("statusTelling: een onbekende status telt als te doen", () => {
  const t = statusTelling([{ id: "a" }, { id: "b" }, { id: "c" }], { a: "ingeleverd", b: "onzin" });
  assert.equal(t.ingeleverd, 1);
  assert.equal(t["te doen"], 2);
  assert.equal(t.totaal, 3);
  assert.equal(t.af, 1);
});

test("niveauBoven: zonder beschrijving per niveau wordt er niets verzonnen", () => {
  const rubric = { niveaus: ["goed", "voldoende", "matig", "onvoldoende"] };
  // Het afvinkformulier Presentatie heeft lege niveaukolommen.
  const leeg = niveauBoven(rubric, { niveaus: {} }, "matig");
  assert.equal(leeg.niveau, "voldoende");
  assert.equal(leeg.tekst, null);
  // Met beschrijving komt die mee.
  const vol = niveauBoven(rubric, { niveaus: { voldoende: "Dit moet erin staan." } }, "matig");
  assert.equal(vol.tekst, "Dit moet erin staan.");
  // Het hoogste niveau heeft niets erboven.
  assert.equal(niveauBoven(rubric, {}, "goed"), null);
});

test("niveauBoven: wijst omhoog, welke kant de lijst ook op staat", () => {
  // De rapportage-rubric gaat van goed naar onvoldoende, het afvinkformulier Presentatie
  // van onvoldoende naar zeer goed. Beide moeten "voldoende" boven "matig" zetten.
  const aflopend = { niveaus: ["goed", "voldoende", "matig", "onvoldoende"] };
  const oplopend = { niveaus: ["onvoldoende", "matig", "voldoende", "goed", "zeer goed"] };
  assert.equal(niveauBoven(aflopend, {}, "matig").niveau, "voldoende");
  assert.equal(niveauBoven(oplopend, {}, "matig").niveau, "voldoende");
  // En de top is in beide lijsten de top.
  assert.equal(niveauBoven(aflopend, {}, "goed"), null);
  assert.equal(niveauBoven(oplopend, {}, "zeer goed"), null);
  assert.equal(niveauBoven(oplopend, {}, "goed").niveau, "zeer goed");
});

test("niveauBoven: een onbekend niveau levert geen gok op", () => {
  const rubric = { niveaus: ["goed", "voldoende", "uitmuntend"] };
  assert.equal(niveauBoven(rubric, {}, "uitmuntend"), null);
  assert.equal(niveauBoven(rubric, {}, ""), null);
  // Een onbekend niveau in de lijst wordt overgeslagen, niet als hoogste gezien.
  assert.equal(niveauBoven(rubric, {}, "voldoende").niveau, "goed");
});

// ---------- de gegenereerde data ----------

const projectbestanden = modules
  .map(m => ({ id: m.id, pad: m.bestand.replace(".json", ".project.json") }))
  .map(m => {
    try { return { ...m, data: lees(m.pad) }; } catch { return { ...m, data: null }; }
  })
  .filter(m => m.data);

test("er is minstens één projectbestand om tegen te toetsen", () => {
  assert.ok(projectbestanden.length > 0, "tools/project.py is nog niet gelopen");
});

test("elk projectbestand zegt waar het vandaan komt en wat eraan ontbreekt", () => {
  for (const { id, data } of projectbestanden) {
    assert.equal(data.vleugel, "project", `${id}: vleugel`);
    assert.equal(data.id, id, `${id}: id hoort bij de module`);
    for (const veld of ["_bron", "_betrouwbaarheid", "_ontbreekt", "_privacy"]) {
      assert.ok(data[veld], `${id}: ${veld} ontbreekt; afgeleide data moet zeggen wat ze niet weet`);
    }
  }
});

test("project-id's zijn uniek binnen een module, en elk project heeft een naam", () => {
  for (const { id, data } of projectbestanden) {
    const ids = projectenVan(data).map(p => p.id);
    assert.equal(new Set(ids).size, ids.length, `${id}: dubbele project-id`);
    for (const p of projectenVan(data)) {
      assert.ok(p.id && p.naam, `${id}: project zonder id of naam`);
      assert.ok(Array.isArray(p.paginas), `${id}: ${p.id} heeft geen paginas-lijst`);
    }
  }
});

test("opdracht-id's zijn uniek en elke status-sleutel is bruikbaar", () => {
  for (const { id, data } of projectbestanden) {
    const ids = opdrachtenVan(data).map(o => o.id);
    assert.equal(new Set(ids).size, ids.length, `${id}: dubbele opdracht-id`);
    for (const o of opdrachtenVan(data)) {
      assert.ok(o.id && o.titel, `${id}: opdracht zonder id of titel`);
      assert.equal(typeof o.herkansing, "boolean", `${id}: ${o.id} herkansing is geen boolean`);
    }
  }
});

test("een opdracht verwijst alleen naar een project dat de module heeft", () => {
  for (const { id, data } of projectbestanden) {
    const bekend = new Set(projectenVan(data).map(p => p.id));
    for (const o of opdrachtenVan(data)) {
      if (o.project) assert.ok(bekend.has(o.project), `${id}: ${o.id} wijst naar project ${o.project}`);
    }
  }
});

test("elke genoemde rubric bestaat en hoort bij deze module", () => {
  for (const { id, data } of projectbestanden) {
    for (const r of rubricsVan(data)) {
      const rubric = lees(`data/rubrics/${r}.json`);
      assert.equal(rubric.module, id, `${id}: rubric ${r} hoort bij ${rubric.module}`);
      assert.equal(rubric.vleugel, "project", `${id}: rubric ${r} is geen projectrubric`);
    }
  }
});

test("de projectdata noemt geen e-mailadressen", () => {
  for (const { id, data } of projectbestanden) {
    const tekst = JSON.stringify(data);
    assert.equal(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(tekst), false, `${id}: e-mailadres in de data`);
  }
});
