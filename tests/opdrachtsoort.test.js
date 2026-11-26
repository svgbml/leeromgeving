import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { soortVan } from "../src/domain/opdrachtsoort.js";

const RECEPTEN = JSON.parse(readFileSync("data/opdracht-recepten.json", "utf8")).recepten;
const soort = (titel, vorm) => soortVan(RECEPTEN, { titel, vorm })?.recept.id;

test("recepten: compleet en zonder dubbele id", () => {
  const ids = new Set();
  for (const r of RECEPTEN) {
    assert.ok(!ids.has(r.id), `dubbele id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.naam && r.wat?.length > 40, `naam en wat: ${r.id}`);
    assert.ok(r.stappen?.length >= 4, `te weinig stappen: ${r.id}`);
    assert.ok((r.woorden || []).length || (r.vormen || []).length, `niets om op te herkennen: ${r.id}`);
  }
});

test("de titel weegt zwaarder dan de vorm", () => {
  // Vorm "opdracht", maar het is rekenwerk.
  assert.equal(soort("Huiswerk statistiek 6.2", "opdracht"), "data");
  assert.equal(soort("praktijktoets - Excelbestand", ""), "praktijktoets");
  assert.equal(soort("Praktijkverslag - Biomoleculen in de praktijk", "verslag"), "verslag");
  assert.equal(soort("LU3 Presentatie troubleshoot plan", "presentatie"), "presentatie");
});

test("bij gelijkspel in de titel beslist de vorm", () => {
  // "troubleshooting" raakt presentatie, "opdracht" raakt opdracht: de vorm hakt de knoop door.
  assert.equal(soort("troubleshooting opdracht", "opdracht"), "opdracht");
});

test("een vorm zonder herkenbare titel kiest alsnog een recept", () => {
  assert.equal(soort("LU2.3", "labjournaal"), "labjournaal");
  assert.equal(soort("Inleveren week 4", "plan"), "plan");
});

test("niets herkend geeft niets terug, in plaats van een willekeurig recept", () => {
  assert.equal(soortVan(RECEPTEN, { titel: "Zeven", vorm: "" }), null);
  assert.equal(soortVan([], { titel: "Verslag" }), null);
  assert.equal(soortVan(RECEPTEN, null), null);
});

test("elke echte opdracht in de data wordt herkend", () => {
  const mods = JSON.parse(readFileSync("data/modules.json", "utf8")).modules;
  const zonder = [];
  for (const m of mods) {
    const pad = m.bestand.replace(".json", ".project.json");
    if (!existsSync(pad)) continue;
    for (const o of JSON.parse(readFileSync(pad, "utf8")).opdrachten || []) {
      if (!soortVan(RECEPTEN, o)) zonder.push(`${m.id}/${o.titel}`);
    }
  }
  assert.deepEqual(zonder, [], `geen soort gevonden voor: ${zonder.join(", ")}`);
});
