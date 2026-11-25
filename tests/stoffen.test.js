import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GHS, AFVALVATEN, SIGNAALWOORDEN, stoffenVoor, pbmVan, ongecontroleerd, afvalGroepen } from "../src/domain/stoffen.js";

const alle = () => JSON.parse(readFileSync(new URL("../data/stoffen.json", import.meta.url), "utf8")).stoffen;

test("stoffenVoor: zoekt op id en houdt de volgorde van de sessie aan", () => {
  const lijst = [{ id: "b", naam: "B" }, { id: "a", naam: "A" }];
  assert.deepEqual(stoffenVoor(["a", "b"], lijst).map(s => s.naam), ["A", "B"]);
});

test("stoffenVoor: een onbekende id valt niet stil weg", () => {
  const lijst = [{ id: "a", naam: "A" }];
  const uit = stoffenVoor(["a", "weg"], lijst);
  assert.equal(uit.length, 2);
  assert.equal(uit[1].onbekend, true, "een onbekende stof moet zichtbaar blijven");
  assert.equal(uit[1].id, "weg");
});

test("pbmVan: bundelt de beschermingsmiddelen zonder dubbels", () => {
  const uit = pbmVan([
    { pbm: ["veiligheidsbril", "nitril handschoenen"] },
    { pbm: ["nitril handschoenen", "labjas"] },
    {}
  ]);
  assert.deepEqual(uit, ["veiligheidsbril", "nitril handschoenen", "labjas"]);
});

test("afvalGroepen: groepeert per afvalvat en laat lege vaten weg", () => {
  const uit = afvalGroepen([
    { naam: "A", afvalvat: "zuur" },
    { naam: "B", afvalvat: "halogeenrijk" },
    { naam: "C", afvalvat: "zuur" },
    { naam: "D" }
  ]);
  assert.deepEqual([...uit.keys()], ["zuur", "halogeenrijk"]);
  assert.deepEqual(uit.get("zuur").map(s => s.naam), ["A", "C"]);
});

test("ongecontroleerd: telt de stoffen die nog niet tegen de SDS zijn nagelopen", () => {
  assert.equal(ongecontroleerd([{ gecontroleerd: true }, { gecontroleerd: false }, {}]), 2);
});

// ---------- de echte data ----------
test("data/stoffen.json: elke stof is bruikbaar en verwijst naar bestaande codes", () => {
  const ids = new Set();
  for (const s of alle()) {
    assert.ok(s.id && /^[a-z0-9-]+$/.test(s.id), `ongeldige id ${s.id}`);
    assert.ok(!ids.has(s.id), `dubbele id ${s.id}`); ids.add(s.id);
    assert.ok(s.naam, `${s.id} mist een naam`);
    for (const g of s.pictogrammen || []) assert.ok(g in GHS, `${s.id}: onbekend pictogram ${g}`);
    for (const h of s.h || []) assert.match(h, /^H\d{3}[A-Za-z]*$/, `${s.id}: ongeldige H-zin ${h}`);
    for (const p of s.p || []) assert.match(p, /^P\d{3}(\+P\d{3})*$/, `${s.id}: ongeldige P-zin ${p}`);
    if (s.signaalwoord) assert.ok(SIGNAALWOORDEN.includes(s.signaalwoord), `${s.id}: ${s.signaalwoord}`);
    if (s.afvalvat) assert.ok(AFVALVATEN.includes(s.afvalvat), `${s.id}: onbekend afvalvat ${s.afvalvat}`);
    if (s.cas) assert.match(s.cas, /^\d{2,7}-\d{2}-\d$/, `${s.id}: ongeldig CAS-nummer ${s.cas}`);
  }
});

test("data/stoffen.json: niets staat als gecontroleerd zonder bronvermelding", () => {
  // Veiligheidsdata zonder bron is niet te vertrouwen; dan moet "gecontroleerd" false blijven.
  for (const s of alle()) {
    if (s.gecontroleerd) assert.ok(s.bron, `${s.id} staat als gecontroleerd maar heeft geen bron`);
  }
});
