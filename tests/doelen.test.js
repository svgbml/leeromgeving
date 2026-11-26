// Doel en hypothese per sessie en per project: de data moet op de sessies en de projecten passen,
// anders staat er straks een doel bij het verkeerde experiment.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { sessieDoel, projectSuggestie } from "../src/domain/doelen.js";

const lees = p => JSON.parse(readFileSync(p, "utf8"));
const MODULES = lees("data/modules.json").modules;

test("elke labsessie van een module met doelen heeft een doel", () => {
  for (const m of MODULES) {
    const dpad = `data/doelen/${m.id}.json`;
    const lpad = m.bestand.replace(".json", ".lab.json");
    if (!existsSync(dpad) || !existsSync(lpad)) continue;
    const doelen = lees(dpad), sessies = lees(lpad).sessies || [];
    for (let i = 0; i < sessies.length; i++) {
      const d = sessieDoel(doelen, i);
      assert.ok(d, `${m.id} sessie ${i} heeft geen doel`);
      assert.ok(d.doel?.length > 20, `${m.id} sessie ${i}: doel te kort`);
      // Een vaardigheidsles heeft geen hypothese, maar altijd wel uitleg waaraan je je werk meet.
      assert.ok(d.onderbouwing?.length > 40, `${m.id} sessie ${i}: onderbouwing te kort`);
      assert.ok(d.hypothese === null || d.hypothese?.length > 20,
        `${m.id} sessie ${i}: hypothese is leeg maar niet null`);
    }
    // Geen doelen voor sessies die niet bestaan: dan is er iets verschoven.
    for (const s of doelen.sessies || []) {
      assert.ok(s.sessie < sessies.length, `${m.id}: doel voor sessie ${s.sessie} die niet bestaat`);
    }
  }
});

test("elk project met doelen bestaat ook echt, en andersom", () => {
  for (const m of MODULES) {
    const dpad = `data/doelen/${m.id}.json`;
    const ppad = m.bestand.replace(".json", ".project.json");
    if (!existsSync(dpad) || !existsSync(ppad)) continue;
    const doelen = lees(dpad), projecten = lees(ppad).projecten || [];
    for (const p of projecten) {
      const s = projectSuggestie(doelen, p.id);
      assert.ok(s, `${m.id}: project ${p.id} heeft geen suggestie`);
      assert.ok(s.doel && s.hypothese && s.onderbouwing, `${m.id}/${p.id}: suggestie niet compleet`);
    }
    const ids = new Set(projecten.map(p => p.id));
    for (const s of doelen.projecten || []) {
      assert.ok(ids.has(s.id), `${m.id}: suggestie voor onbekend project ${s.id}`);
    }
  }
});

test("zoeken valt niet om op ontbrekende data", () => {
  assert.equal(sessieDoel(null, 0), null);
  assert.equal(sessieDoel({ sessies: [] }, 0), null);
  assert.equal(projectSuggestie(undefined, "x"), null);
});
