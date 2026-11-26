// PPO (B4): het domein en de vorm van data/ppo/ppo.json.
//
// Zoals bij de projectdata toetst dit niet op aantallen — de bron verandert — maar op de
// afspraken waar de schermen op leunen: welke velden er zijn, dat een koppeling naar verdwenen
// werk zichtbaar blijft, en dat alleen ingeleverd werk als bewijs telt.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  pijlersVan, fasesVan, bewijssoortenVan, portfoliovormenVan, faseVanJaar,
  BEWIJS_STATUSSEN, teltAlsBewijs, bewijsSleutel, splitsSleutel,
  alleOpdrachten, bewijsPerPijler, pijlerStand, beoordelingVan, heeftDatums
} from "../src/domain/ppo.js";

const lees = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const ppo = lees("data/ppo/ppo.json");

const PIJLERS = [{ id: "ik", naam: "Ik" }, { id: "wij", naam: "Wij" }];
const MODULES = [{ id: "m1", titel: "Module een" }, { id: "m2", titel: "Module twee" }];
const PERMODULE = {
  m1: { opdrachten: [{ id: "verslag", titel: "Verslag", vorm: "verslag" }, { id: "plan", titel: "Plan" }] },
  m2: { opdrachten: [{ id: "verslag", titel: "Ander verslag", herkansing: true }] }
};

test("lezers geven een lege lijst bij ontbrekende of kapotte data", () => {
  for (const kapot of [null, undefined, {}, { pijlers: "nee", fases: 3, portfolio: null }]) {
    assert.deepEqual(pijlersVan(kapot), []);
    assert.deepEqual(fasesVan(kapot), []);
    assert.deepEqual(bewijssoortenVan(kapot), []);
    assert.deepEqual(portfoliovormenVan(kapot), []);
  }
});

test("faseVanJaar geeft null voor een jaar dat de bron niet kent", () => {
  assert.equal(faseVanJaar(ppo, 1).jaar, 1);
  assert.equal(faseVanJaar(ppo, "2").jaar, 2);
  assert.equal(faseVanJaar(ppo, 9), null);
  assert.equal(faseVanJaar(ppo, undefined), null);
});

test("alleen ingeleverd of beoordeeld werk telt als bewijs", () => {
  assert.equal(teltAlsBewijs("ingeleverd"), true);
  assert.equal(teltAlsBewijs("beoordeeld"), true);
  // "bezig" is geen bewijs: dan heb je nog niets om te laten zien.
  assert.equal(teltAlsBewijs("bezig"), false);
  assert.equal(teltAlsBewijs("te doen"), false);
  assert.equal(teltAlsBewijs(undefined), false);
  assert.deepEqual(BEWIJS_STATUSSEN, ["ingeleverd", "beoordeeld"]);
});

test("de bewijssleutel bevat de module, want opdracht-id's zijn alleen daarbinnen uniek", () => {
  assert.equal(bewijsSleutel("m1", "verslag"), "m1:verslag");
  assert.notEqual(bewijsSleutel("m1", "verslag"), bewijsSleutel("m2", "verslag"));
  assert.deepEqual(splitsSleutel("m1:verslag"), { modId: "m1", opdrachtId: "verslag" });
  // Een id met een dubbele punt erin mag niet halverwege afbreken.
  assert.deepEqual(splitsSleutel("m1:deel:twee"), { modId: "m1", opdrachtId: "deel:twee" });
  assert.deepEqual(splitsSleutel("onzin"), { modId: "", opdrachtId: "" });
});

test("alleOpdrachten voegt de modules samen en hangt de status eraan", () => {
  const lijst = alleOpdrachten(PERMODULE, { m1: { verslag: "ingeleverd" } }, MODULES);
  assert.equal(lijst.length, 3);
  const verslag = lijst.find(o => o.sleutel === "m1:verslag");
  assert.equal(verslag.moduleTitel, "Module een");
  assert.equal(verslag.status, "ingeleverd");
  assert.equal(verslag.telt, true);
  // Zonder status staat alles op te doen en telt het niet.
  assert.equal(lijst.find(o => o.sleutel === "m1:plan").status, "te doen");
  assert.equal(lijst.find(o => o.sleutel === "m1:plan").telt, false);
  // De twee modules houden hun eigen "verslag" apart.
  assert.equal(lijst.filter(o => o.opdrachtId === "verslag").length, 2);
});

test("alleOpdrachten gaat niet onderuit op een module zonder projectdata", () => {
  assert.deepEqual(alleOpdrachten({ m1: null, m2: {} }, {}, MODULES), []);
  assert.deepEqual(alleOpdrachten(undefined, undefined, undefined), []);
});

test("bewijsPerPijler scheidt wat binnen is van wat nog onderweg is", () => {
  const opdrachten = alleOpdrachten(PERMODULE, { m1: { verslag: "beoordeeld", plan: "bezig" } }, MODULES);
  const perPijler = bewijsPerPijler(PIJLERS, { ik: { "m1:verslag": true, "m1:plan": true } }, opdrachten);
  const ik = perPijler.find(p => p.pijler.id === "ik");
  assert.deepEqual(ik.binnen.map(o => o.opdrachtId), ["verslag"]);
  assert.deepEqual(ik.onderweg.map(o => o.opdrachtId), ["plan"]);
  // Een pijler zonder koppelingen blijft leeg, niet gevuld met een gok.
  assert.deepEqual(perPijler.find(p => p.pijler.id === "wij").gekoppeld, []);
});

test("bewijsPerPijler verzwijgt een koppeling naar verdwenen werk niet", () => {
  // De projectdata wordt opnieuw gegenereerd; een opdracht kan verdwijnen. Dan moet het scherm
  // dat kunnen zeggen in plaats van stil één bewijsstuk minder te tonen.
  const opdrachten = alleOpdrachten(PERMODULE, {}, MODULES);
  const perPijler = bewijsPerPijler(PIJLERS, { ik: { "m1:weggehaald": true } }, opdrachten);
  const ik = perPijler.find(p => p.pijler.id === "ik");
  assert.deepEqual(ik.verdwenen, ["m1:weggehaald"]);
  assert.deepEqual(ik.gekoppeld, []);
});

test("een uitgevinkte koppeling telt niet mee", () => {
  const opdrachten = alleOpdrachten(PERMODULE, { m1: { verslag: "ingeleverd" } }, MODULES);
  const perPijler = bewijsPerPijler(PIJLERS, { ik: { "m1:verslag": false } }, opdrachten);
  assert.deepEqual(perPijler.find(p => p.pijler.id === "ik").gekoppeld, []);
});

test("pijlerStand noemt welke pijlers nog helemaal leeg zijn", () => {
  const opdrachten = alleOpdrachten(PERMODULE, { m1: { verslag: "ingeleverd" } }, MODULES);
  const stand = pijlerStand(bewijsPerPijler(PIJLERS, { ik: { "m1:verslag": true } }, opdrachten));
  assert.equal(stand.gevuld, 1);
  assert.equal(stand.totaal, 2);
  assert.deepEqual(stand.leeg, ["Wij"]);
});

// ---------- data/ppo/ppo.json ----------

test("ppo.json zegt waar het vandaan komt en wat eraan ontbreekt", () => {
  assert.ok(ppo._bron, "_bron ontbreekt");
  assert.ok(ppo._ontbreekt, "_ontbreekt ontbreekt; afgeleide data moet zeggen wat ze niet weet");
});

test("de vier pijlers hebben een id, een naam en een vraag", () => {
  const pijlers = pijlersVan(ppo);
  assert.ok(pijlers.length >= 4, "minder dan vier pijlers");
  assert.equal(new Set(pijlers.map(p => p.id)).size, pijlers.length, "dubbel pijler-id");
  for (const p of pijlers) {
    assert.ok(p.id && p.naam && p.vraag, `pijler ${p.id} is niet compleet`);
  }
});

test("elke fase heeft een jaar en zegt hoe er beoordeeld wordt", () => {
  const fases = fasesVan(ppo);
  assert.ok(fases.length >= 4);
  assert.equal(new Set(fases.map(f => f.jaar)).size, fases.length, "twee fases in hetzelfde jaar");
  for (const f of fases) {
    assert.equal(typeof f.jaar, "number", `fase ${f.nr} heeft geen jaartal`);
    assert.ok(beoordelingVan(f), `fase ${f.nr} zegt niet hoe er beoordeeld wordt`);
    // Studiepunten mogen onbekend zijn, maar niet geraden: dan staat er null.
    assert.ok(f.studiepunten === null || typeof f.studiepunten === "number", `fase ${f.nr} studiepunten`);
  }
});

test("een fase met een onzekere waarde draagt dat zelf", () => {
  // De bron zet een vraagteken achter de studiepunten van jaar 4; dat mag niet wegvallen.
  for (const f of fasesVan(ppo)) {
    if (f._onzeker) assert.ok(f._onzeker.length > 20, `fase ${f.nr}: _onzeker is te kort om iets te zeggen`);
  }
});

test("de bron heeft geen datums, dus er is niets om op af te tellen", () => {
  // Zodra dit faalt staan er wél datums in en kan Deadlines meer doen dan nu.
  assert.equal(heeftDatums(ppo), false);
});

test("ppo.json noemt geen e-mailadressen", () => {
  assert.equal(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(JSON.stringify(ppo)), false);
});
