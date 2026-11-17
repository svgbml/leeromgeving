import { test } from "node:test";
import assert from "node:assert/strict";
import { grade, preview, isLeech, isKnown, localDay, ivText, migreer, retrievability, intervalVoor, nuHerhalen, DAY } from "../src/domain/srs.js";

const NOW = Date.UTC(2026, 10, 17, 12);

test("nieuwe kaart (FSRS-5): Opnieuw 1 min, Moeilijk 1 dag, Goed 3 dagen, Makkelijk 16 dagen", () => {
  assert.deepEqual([0, 1, 2, 3].map(g => preview(undefined, g, NOW)), [0, 1, 3, 16]);
});

test("intervalVoor(S, 0,9) = S: bij 90% retentie is het interval gelijk aan de stabiliteit", () => {
  for (const s of [1, 3.17, 10, 100]) assert.ok(Math.abs(intervalVoor(s, 0.9) - s) < 1e-9);
  assert.ok(Math.abs(retrievability(10, 10) - 0.9) < 1e-9);
});

test("Goed na het interval laat de stabiliteit groeien", () => {
  let c = grade(undefined, 2, NOW);
  assert.equal(c.iv, 3); assert.equal(c.due, NOW + 3 * DAY);
  const s1 = c.s;
  c = grade(c, 2, c.due);
  assert.ok(c.s > s1 * 2, `s ${s1} → ${c.s}`);
  assert.ok(c.iv > 3);
});

test("preview voorspelt precies wat grade doet", () => {
  let c, t = NOW;
  for (const g of [2, 2, 1, 3, 2, 0, 2, 3]) {
    const verwacht = preview(c, g, t);
    c = grade(c, g, t);
    assert.equal(c.iv, verwacht, `knop ${g}`);
    t = c.due + 3600e3;
  }
});

test("Opnieuw: lapse, stabiliteit omlaag, binnen een minuut terug", () => {
  let c = grade(undefined, 2, NOW); c = grade(c, 2, c.due);
  const voor = c;
  c = grade(c, 0, c.due);
  assert.equal(c.lapses, 1); assert.equal(c.iv, 0); assert.equal(c.reps, 0);
  assert.ok(c.s < voor.s); assert.equal(c.due - voor.due, 60e3);
});

test("moeilijkheid blijft tussen 1 en 10", () => {
  let c, t = NOW;
  for (let i = 0; i < 30; i++) { c = grade(c, 0, t); t += 2 * DAY; }
  assert.ok(c.d <= 10 && c.d >= 1);
  for (let i = 0; i < 30; i++) { c = grade(c, 3, t); t = c.due; }
  assert.ok(c.d >= 1 && c.iv <= 365);
});

test("hogere gewenste retentie geeft kortere intervallen", () => {
  let c = grade(undefined, 2, NOW); c = grade(c, 2, c.due);
  assert.ok(preview(c, 2, c.due, 0.95) < preview(c, 2, c.due, 0.85));
});

test("oude SM-2-kaarten worden omgezet en gaan gewoon door", () => {
  const oud = { iv: 20, ef: 2.5, reps: 4, lapses: 1, due: NOW };
  const m = migreer(oud);
  assert.equal(m.s, 20); assert.ok(m.d >= 1 && m.d <= 10); assert.equal(m.last, NOW - 20 * DAY);
  const n = grade(oud, 2, NOW);
  assert.ok(n.iv > 20, `${n.iv}`);
  assert.equal(n.lapses, 1);
});

test("grade wijzigt de oude kaart niet", () => {
  const oud = grade(undefined, 2, NOW), kopie = { ...oud };
  grade(oud, 3, NOW + DAY);
  assert.deepEqual(oud, kopie);
});

test("nuHerhalen zet een kaart (of een nieuwe) op nu", () => {
  assert.equal(nuHerhalen(grade(undefined, 3, NOW), NOW + 5).due, NOW + 5);
  assert.equal(nuHerhalen(undefined, NOW).due, NOW);
});

test("moeilijk na 4 lapses, beheerst vanaf 7 dagen", () => {
  assert.equal(isLeech({ lapses: 3 }), false);
  assert.equal(isLeech({ lapses: 4 }), true);
  assert.equal(isKnown({ iv: 6 }), false);
  assert.equal(isKnown({ iv: 7 }), true);
});

test("localDay gebruikt de lokale datum, niet UTC", () => {
  assert.equal(localDay(new Date(2026, 0, 2, 0, 30)), "2026-01-02");
});

test("ivText", () => {
  assert.deepEqual([0, 1, 5, 45, 400].map(ivText), ["1 min", "1 dag", "5 dagen", "2 mnd", "1 jaar"]);
});
