// Elke module heeft een verslag, en de leskoppen daarin komen overeen met de lessen van de module.
// Dat laatste is wat de knoppen "Flashcards van deze les" en "Oefentoets over deze les" laat werken:
// die koppelen op het id van de kop (slug van "Les <nr> – <titel>").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { markdown, slug } from "../src/domain/markdown.js";

const modules = JSON.parse(readFileSync("data/modules.json", "utf8")).modules;

test("elke module heeft een verslagbestand", () => {
  for (const m of modules) {
    assert.ok(m.verslag, `${m.id}: geen "verslag" in modules.json`);
    assert.ok(existsSync(m.verslag), `${m.id}: ${m.verslag} bestaat niet`);
    assert.ok(readFileSync(m.verslag, "utf8").length > 1000, `${m.id}: verslag is vrijwel leeg`);
  }
});

test("de leskoppen in het verslag horen bij lessen van de module", () => {
  for (const m of modules) {
    const data = JSON.parse(readFileSync(m.bestand, "utf8"));
    const labels = new Set((data.lessen || []).map(l => slug(`Les ${l.nr} – ${l.titel}`)));
    const koppen = markdown(readFileSync(m.verslag, "utf8")).koppen.filter(k => k.niveau === 2 && /^Les\s*\d/.test(k.tekst));
    assert.ok(koppen.length, `${m.id}: geen enkele leskop in het verslag`);
    const raak = koppen.filter(k => labels.has(k.id));
    assert.ok(raak.length >= Math.ceil(koppen.length * 0.7),
      `${m.id}: ${raak.length} van ${koppen.length} leskoppen sluiten aan op de lessen van de module`);
  }
});

test("geen persoonsgegevens in de verslagen", () => {
  for (const m of modules) {
    const t = readFileSync(m.verslag, "utf8");
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(t), `${m.id}: verslag bevat een e-mailadres`);
  }
});
