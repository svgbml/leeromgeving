import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { herkenTechnieken, sessieTekst } from "../src/domain/analyse.js";

const BIB = JSON.parse(readFileSync("data/analyse-recepten.json", "utf8"));

test("recepten: elk recept heeft herkenning, stappen en formules", () => {
  assert.ok(BIB.recepten.length >= 5);
  const ids = new Set();
  for (const r of BIB.recepten) {
    assert.ok(r.id && r.naam, `id en naam: ${r.id}`);
    assert.ok(!ids.has(r.id), `dubbele id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.herkenning?.length, `herkenning: ${r.id}`);
    assert.ok(r.stappen?.length >= 3, `stappen: ${r.id}`);
    for (const f of r.formules || []) assert.ok(f.naam && f.formule && f.uitleg, `formule in ${r.id}`);
  }
  for (const f of BIB.basis.formules) assert.ok(f.naam && f.formule && f.uitleg);
});

test("herkent een techniek uit de experimentnamen", () => {
  const sessie = { titel: "Lab 1: PCR", experimenten: [{ naam: "PCR voor beginners" }] };
  const gevonden = herkenTechnieken(BIB.recepten, sessieTekst(sessie));
  assert.equal(gevonden[0].recept.id, "pcr");
});

test("de best passende techniek staat vooraan", () => {
  const sessie = {
    titel: "Miniprep",
    experimenten: [{ naam: "Plasmide isolatie", apparatuur: ["nanodrop"], stoffen: ["ethanol-96"] }]
  };
  const tekst = sessieTekst(sessie, "Meet de A260 en A280 en bepaal de zuiverheid van je DNA.");
  assert.equal(herkenTechnieken(BIB.recepten, tekst)[0].recept.id, "nucleinezuur-kwantificering");
});

test("geen techniek zonder treffer, en nooit meer dan het maximum", () => {
  assert.deepEqual(herkenTechnieken(BIB.recepten, "appels en peren"), []);
  const alles = BIB.recepten.flatMap(r => r.herkenning).join(" ");
  assert.equal(herkenTechnieken(BIB.recepten, alles, 3).length, 3);
});

test("lege invoer valt niet om", () => {
  assert.deepEqual(herkenTechnieken(undefined, undefined), []);
  assert.equal(typeof sessieTekst(null), "string");
});
