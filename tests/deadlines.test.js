// De inlever- en toetsmomenten per module.
//
// Het gevoeligste punt: de tabel van de opleiding mengt datums, weken en lessen door elkaar.
// Alleen bij een echte datum mag er afgeteld worden; een week omrekenen zou een deadline
// verzinnen. Daar gaan de meeste tests hieronder over.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  activiteitenVan, perLeeruitkomst, metDatum, dagenTot, termijnTekst, eerstvolgende, samenvatting
} from "../src/domain/deadlines.js";

const lees = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8"));
const data = lees("data/jaar-2/periode-2/dna-kraak-de-code.deadlines.json");
const NU = new Date("2026-11-24T10:00:00");

test("lezers geven een lege lijst bij kapotte data", () => {
  for (const kapot of [null, undefined, {}, { activiteiten: "nee" }]) {
    assert.deepEqual(activiteitenVan(kapot), []);
    assert.deepEqual(metDatum(kapot), []);
    assert.deepEqual(perLeeruitkomst(kapot), []);
    assert.equal(eerstvolgende(kapot), null);
  }
});

test("perLeeruitkomst groepeert in de volgorde van de tabel", () => {
  const groepen = perLeeruitkomst(data);
  assert.deepEqual(groepen.map(g => g.lu), ["LU1", "LU2", "LU3"]);
  for (const g of groepen) {
    assert.ok(g.onderdeel, `${g.lu} heeft geen onderdeelnaam`);
    assert.equal(g.ec, 5);
    assert.ok(g.rijen.length >= 3);
  }
});

test("een regel met een onbekende leeruitkomst valt niet weg", () => {
  const groepen = perLeeruitkomst({ activiteiten: [{ lu: "PPO", toets: "iets" }] });
  assert.equal(groepen.length, 1);
  assert.equal(groepen[0].lu, "overig");
});

test("alleen regels met soort datum tellen als datum", () => {
  const datums = metDatum(data);
  assert.ok(datums.length >= 2, "de tabel noemt minstens twee echte datums");
  for (const a of datums) {
    assert.equal(a.soort, "datum");
    assert.ok(!Number.isNaN(new Date(a.datum).getTime()), `${a.toets} heeft een onbruikbare datum`);
  }
  // Oplopend, zodat eerstvolgende de eerste kan pakken.
  for (let i = 1; i < datums.length; i++) {
    assert.ok(new Date(datums[i].datum) >= new Date(datums[i - 1].datum));
  }
});

test("dagenTot rekent in kalenderdagen, niet in uren", () => {
  // Een deadline om 23:59 vanavond is vandaag, niet "over 0 komma iets dagen".
  assert.equal(dagenTot("2026-11-24T23:59", NU), 0);
  assert.equal(dagenTot("2026-11-25T00:01", NU), 1);
  assert.equal(dagenTot("2026-11-23T23:59", NU), -1);
  assert.equal(dagenTot("niet een datum", NU), null);
});

test("termijnTekst telt alleen af bij een echte datum", () => {
  // Een week blijft een week: er wordt geen datum van gemaakt.
  assert.equal(termijnTekst({ soort: "week", termijn: "week 4" }, NU), "week 4");
  assert.equal(termijnTekst({ soort: "les", termijn: "2 dagen na elke les" }, NU), "2 dagen na elke les");
  assert.equal(termijnTekst({ soort: "geen", termijn: null }, NU), "geen termijn genoemd");
  // Bij een datum wel.
  const maak = datum => ({ soort: "datum", datum, termijn: "donderdag 26 november 23:59u" });
  assert.match(termijnTekst(maak("2026-11-26T23:59"), NU), /over 2 dagen$/);
  assert.match(termijnTekst(maak("2026-11-25T23:59"), NU), /morgen$/);
  assert.match(termijnTekst(maak("2026-11-24T23:59"), NU), /vandaag$/);
  assert.match(termijnTekst(maak("2026-11-20T23:59"), NU), /geweest$/);
});

test("eerstvolgende slaat een deadline over die al geweest is", () => {
  const laat = new Date("2026-12-01T10:00:00");
  const eerste = eerstvolgende(data, NU);
  assert.ok(eerste, "op 24 november staat er nog een deadline open");
  assert.ok(dagenTot(eerste.datum, NU) >= 0);
  // Na het projectplan blijft de eindopdracht van januari over.
  const later = eerstvolgende(data, laat);
  assert.ok(later && new Date(later.datum) > new Date(eerste.datum));
});

test("samenvatting blijft kort genoeg voor een overzichtsregel", () => {
  for (const a of activiteitenVan(data)) {
    assert.ok(samenvatting(a).length <= 60, `${a.toets} geeft een te lange samenvatting`);
    assert.ok(samenvatting(a).includes(a.lu), "de leeruitkomst hoort erin te staan");
  }
});

// ---------- de data zelf ----------

test("het deadlinebestand zegt waar het vandaan komt", () => {
  for (const veld of ["_bron", "_betrouwbaarheid", "_wat"]) {
    assert.ok(data[veld], `${veld} ontbreekt`);
  }
  assert.match(data._bron, /Brightspace/);
});

test("elke activiteit is compleet en consistent", () => {
  for (const a of activiteitenVan(data)) {
    assert.ok(a.toets, "activiteit zonder naam");
    assert.ok(a.beoordeling, `${a.toets} zegt niet hoe het beoordeeld wordt`);
    assert.ok(["datum", "week", "les", "geen"].includes(a.soort), `${a.toets}: rare soort ${a.soort}`);
    // Een datumregel moet een datum hebben; de andere soorten juist niet.
    if (a.soort === "datum") assert.ok(a.datum, `${a.toets} heet een datum te hebben`);
    else assert.equal(a.datum, undefined, `${a.toets} is geen datumregel maar heeft wel een datum`);
    // Waar de opleiding geen termijn noemt staat er null, geen verzonnen tekst.
    if (a.soort === "geen") assert.equal(a.termijn, null);
    else assert.ok(a.termijn, `${a.toets} heeft geen termijn`);
  }
});

test("de genoemde datum en de tekst van de opleiding spreken elkaar niet tegen", () => {
  // Een typefout in het jaartal is hier makkelijk gemaakt en moeilijk te zien.
  const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december"];
  for (const a of metDatum(data)) {
    const d = new Date(a.datum);
    const dag = String(d.getDate());
    assert.ok(a.termijn.includes(dag), `${a.toets}: "${a.termijn}" noemt dag ${dag} niet`);
    const maand = MAANDEN[d.getMonth()];
    assert.ok(a.termijn.toLowerCase().includes(maand.slice(0, 3)),
      `${a.toets}: "${a.termijn}" noemt maand ${maand} niet`);
  }
});
