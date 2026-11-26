// De koppeling opdracht → uitwerking, en de vorm van de wijzerbestanden zelf.
//
// De wijzerbestanden staan buiten git (het zijn de opdrachten van de opleiding); staan ze er niet,
// dan slaat die test zichzelf over in plaats van rood te worden op een andere machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { wijzerVoor, metWijzer } from "../src/domain/opdrachtwijzer.js";

const WIJZER = {
  opdrachten: [
    { id: "opdracht-1", titel: "Opdracht 1 — kloneringsopdracht", wat: "x", stappen: ["a"] },
    { id: "opdracht-2", titel: "Opdracht 2", ook_voor: ["lu3-opdracht-2"], wat: "y", stappen: ["b"] }
  ]
};

test("wijzerVoor: koppelt op id", () => {
  assert.equal(wijzerVoor(WIJZER, { id: "opdracht-1", titel: "Opdracht 1" }).titel.startsWith("Opdracht 1"), true);
});

test("wijzerVoor: ook_voor laat één uitwerking bij meer inleverlinks horen", () => {
  assert.equal(wijzerVoor(WIJZER, { id: "lu3-opdracht-2", titel: "LU3 Opdracht 2" }).id, "opdracht-2");
});

test("wijzerVoor: de titel is het vangnet als de id niet past", () => {
  assert.equal(wijzerVoor(WIJZER, { id: "anders-genoemd", titel: "Opdracht 2" }).id, "opdracht-2");
});

test("wijzerVoor: zonder wijzer of zonder treffer is het null", () => {
  assert.equal(wijzerVoor(null, { id: "opdracht-1" }), null);
  assert.equal(wijzerVoor(WIJZER, { id: "presentatie", titel: "Presentatie Project" }), null);
  assert.equal(wijzerVoor(WIJZER, null), null);
});

test("metWijzer: telt de opdrachten met een eigen uitwerking", () => {
  const ops = [{ id: "opdracht-1" }, { id: "opdracht-2" }, { id: "presentatie-project", titel: "Presentatie" }];
  assert.equal(metWijzer(WIJZER, ops), 2);
  assert.equal(metWijzer(null, ops), 0);
});

test("elk wijzerbestand heeft per opdracht een id, uitleg en stappen", { skip: !existsSync("data/opdrachtwijzer") }, () => {
  const bestanden = readdirSync("data/opdrachtwijzer").filter(n => n.endsWith(".json"));
  assert.ok(bestanden.length, "geen wijzerbestanden gevonden");
  for (const naam of bestanden) {
    const d = JSON.parse(readFileSync(`data/opdrachtwijzer/${naam}`, "utf8"));
    assert.ok(d._bron, `${naam}: een wijzer zonder bronvermelding is niet na te trekken`);
    assert.ok(Array.isArray(d.opdrachten) && d.opdrachten.length, `${naam}: geen opdrachten`);
    for (const o of d.opdrachten) {
      assert.ok(o.id, `${naam}: een opdracht zonder id`);
      assert.ok(o.wat && o.wat.length > 40, `${naam} › ${o.id}: 'wat' is te kort om iets uit te leggen`);
      assert.ok(Array.isArray(o.stappen) && o.stappen.length >= 3, `${naam} › ${o.id}: minstens drie stappen`);
      for (const v of o.vragen || []) {
        assert.ok(v.vraag, `${naam} › ${o.id}: een vraag zonder tekst`);
        assert.ok(v.aanpak && v.aanpak.length > 40, `${naam} › ${o.id}: vraag zonder aanpak is een vraag zonder hulp`);
      }
    }
  }
});
