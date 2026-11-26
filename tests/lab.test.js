import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  sessiesVan, kiesSessie, sessieLabel, experimentenVan, apparatuurVan,
  stappen, heeftOpruimen, sessieSleutel, expSleutel
} from "../src/domain/lab.js";
import { modules } from "./helpers.js";

const SESSIE = {
  nr: 1, week: 1, titel: "Labveiligheid", bron: "Experiment week 1 - Labveiligheid.docx",
  experimenten: [
    { naam: "1A", apparatuur: ["pH-meter"], aantal_stappen: 3, heeft_opruimen: true },
    { naam: "1B", apparatuur: ["pH-meter", "Weegschaal"], aantal_stappen: 0, heeft_opruimen: false }
  ]
};

test("sessiesVan: een module zonder labdata geeft een lege lijst", () => {
  assert.deepEqual(sessiesVan(null), []);
  assert.deepEqual(sessiesVan({}), []);
  assert.deepEqual(sessiesVan({ sessies: "nee" }), []);
  assert.equal(sessiesVan({ sessies: [SESSIE] }).length, 1);
});

test("kiesSessie: de plek in de lijst is de sleutel, geen sessienummer", () => {
  const sessies = [SESSIE, SESSIE, SESSIE];
  assert.equal(kiesSessie(sessies, "2"), 2);
  assert.equal(kiesSessie(sessies, "0"), 0);
  // Buiten de lijst, onzin of niets: terug naar de eerste sessie in plaats van een leeg scherm.
  assert.equal(kiesSessie(sessies, "9"), 0);
  assert.equal(kiesSessie(sessies, "-1"), 0);
  assert.equal(kiesSessie(sessies, "week 2"), 0);
  assert.equal(kiesSessie(sessies, undefined), 0);
  assert.equal(kiesSessie([], "1"), 0);
});

test("sessieLabel: nummert op plek, noemt de week en kapt een lange titel af", () => {
  assert.equal(sessieLabel(SESSIE, 0), "1. week 1 – Labveiligheid");
  // Niet elke handleiding noemt een week; dan blijft alleen de titel over.
  assert.equal(sessieLabel({ titel: "Praktijkles 1" }, 1), "2. Praktijkles 1");
  const lang = sessieLabel({ week: 7, titel: "In week 5 is een totaaleiwitbepaling uitgevoerd op het serum van de patiënt, vandaag de fosfatase" }, 10);
  assert.ok(lang.startsWith("11. week 7 – "));
  assert.ok(lang.endsWith("…"), "een titel uit de eerste documentregel moet afgekapt worden");
  assert.ok(lang.length < 90);
  assert.equal(sessieLabel({}, 0), "1. zonder titel");
});

test("experimentenVan: een sessie zonder experimenten breekt niets", () => {
  assert.deepEqual(experimentenVan(undefined), []);
  assert.deepEqual(experimentenVan({ experimenten: null }), []);
  assert.equal(experimentenVan(SESSIE).length, 2);
});

test("apparatuurVan: bundelt de hele sessie zonder dubbels, in de volgorde van de handleiding", () => {
  assert.deepEqual(apparatuurVan(SESSIE), ["pH-meter", "Weegschaal"]);
  assert.deepEqual(apparatuurVan({}), []);
});

test("stappen: telt op en zegt hoeveel experimenten niets opleverden", () => {
  // Het ontleden van de Word-documenten mist stappen; een scherm mag het totaal dus niet
  // als waarheid brengen en moet weten hoeveel experimenten op nul staan.
  assert.deepEqual(stappen(SESSIE), { totaal: 3, geteld: 1, zonder: 1 });
  assert.deepEqual(stappen({ experimenten: [{ aantal_stappen: 0 }, { aantal_stappen: 0 }] }), { totaal: 0, geteld: 0, zonder: 2 });
  assert.deepEqual(stappen({}), { totaal: 0, geteld: 0, zonder: 0 });
});

test("heeftOpruimen: één experiment met een opruimstap is genoeg", () => {
  assert.equal(heeftOpruimen(SESSIE), true);
  assert.equal(heeftOpruimen({ experimenten: [{ heeft_opruimen: false }] }), false);
  assert.equal(heeftOpruimen({}), false);
});

test("sleutels voor het afvinken hangen aan namen, niet aan de plek in de lijst", () => {
  // Zo blijft een afvinkje staan als de handleidingen opnieuw ontleed worden.
  assert.equal(sessieSleutel(SESSIE), "Experiment week 1 - Labveiligheid.docx");
  assert.equal(sessieSleutel({ titel: "Zonder bron" }), "Zonder bron");
  assert.equal(sessieSleutel({}), "");
  assert.equal(expSleutel(SESSIE.experimenten[0]), "1A");
  assert.equal(expSleutel({}), "");
});

// ---------- de echte labdata ----------
const labVan = m => {
  const pad = new URL(`../${m.bestand.replace(/\.json$/, ".lab.json")}`, import.meta.url);
  try { return JSON.parse(readFileSync(pad, "utf8")); } catch { return null; }
};

test("elke labsessie heeft genoeg velden om een scherm van te tekenen", () => {
  let sessies = 0;
  for (const m of modules()) {
    if (!(m.vleugels || []).includes("lab")) continue;
    for (const [i, s] of sessiesVan(labVan(m)).entries()) {
      sessies++;
      const waar = `${m.id} › sessie ${i + 1}`;
      assert.equal(typeof s.titel, "string", `${waar} mist een titel`);
      if (s.week !== undefined && s.week !== null) assert.ok(Number.isInteger(s.week), `${waar}: week moet een getal zijn`);
      assert.ok(Array.isArray(s.experimenten), `${waar} mist experimenten`);
      for (const e of s.experimenten) {
        assert.equal(typeof e.naam, "string", `${waar} heeft een experiment zonder naam`);
        assert.ok(Array.isArray(e.apparatuur), `${waar} › ${e.naam}: apparatuur moet een lijst zijn`);
      }
    }
  }
  assert.ok(sessies > 0, "er is geen enkele labsessie om op te bouwen");
});

test("een sessienummer is geen sleutel: de labdata heeft er dubbele", () => {
  // Deze test legt vast waarom de labschermen op plek in de lijst werken en niet op nr.
  const lab = labVan(modules().find(m => m.id === "biomoleculen-labveiligheid"));
  const nrs = sessiesVan(lab).map(s => s.nr);
  assert.ok(nrs.length > new Set(nrs).size, "als nummers uniek worden, kan de URL weer op nr");
});
