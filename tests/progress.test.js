import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseProg, leesExport, emptyProg, verhuisProg } from "../src/domain/progress.js";
import { moduleSummary, zwaksteGroepen } from "../src/domain/stats.js";

test("normaliseProg: rommel wordt een lege voortgang", () => {
  for (const x of [null, 42, "tekst", [], { cards: "x", history: {} }]) assert.deepEqual(normaliseProg(x), emptyProg());
});

test("normaliseProg: geldige velden blijven, kapotte kaarten vallen af", () => {
  const p = normaliseProg({
    cards: { a: { iv: 3, ef: 2.5, reps: 2, lapses: 0, due: 100 }, b: { iv: 1 }, c: null },
    quiz: { a: { ok: 2, no: 1, p: 3, m: 4 } },
    history: [{ date: "2026-11-01", per: {} }, { kapot: true }],
    newDay: { day: "2026-11-17", n: 4 }, limiet: 25, mix: { mc: 10 }
  });
  assert.deepEqual(Object.keys(p.cards), ["a"]);
  assert.deepEqual(p.quiz.a, { ok: 2, no: 1, p: 3, m: 4 });
  assert.equal(p.history.length, 1);
  assert.equal(p.limiet, 25);
  assert.deepEqual(p.mix, { mc: 10 });
});

test("leesExport: controleert de module", () => {
  assert.equal(leesExport({ module: "a", prog: {} }, "a").ok, true);
  assert.match(leesExport({ module: "b", prog: {} }, "a").fout, /andere module/);
  assert.equal(leesExport({ foo: 1 }, "a").ok, false);
});

const KAARTEN = [
  { id: "1", onderwerp: "A" }, { id: "2", onderwerp: "A" }, { id: "3", onderwerp: "B" },
  { id: "4", onderwerp: "Opzet" }, { id: "5", onderwerp: "B", lesinfo: true }
];
const NOW = Date.UTC(2026, 10, 17, 12);

test("moduleSummary telt alleen toetsbare kaarten", () => {
  const prog = normaliseProg({
    cards: {
      1: { iv: 10, ef: 2.5, reps: 3, lapses: 0, due: NOW + 1e9 },
      2: { iv: 1, ef: 2.5, reps: 1, lapses: 5, due: NOW - 1 },
      5: { iv: 1, ef: 2.5, reps: 1, lapses: 0, due: NOW - 1 }
    },
    newDay: { day: "2026-11-17", n: 10 },
    history: [{ date: "2026-11-16", per: {}, punten: 5, maxPunten: 10 }]
  });
  prog.cards["2~r"] = { iv: 0, reps: 0, lapses: 0, due: NOW - 5 };  // omgekeerde kaart telt mee als klaar
  prog.cards["5~c1"] = { iv: 0, reps: 0, lapses: 0, due: NOW - 5 }; // lesinfo-kaart niet
  const s = moduleSummary(KAARTEN, prog, NOW, "2026-11-17");
  assert.equal(s.totaal, 3);
  assert.equal(s.gezien, 2);
  assert.equal(s.beheerst, 1);
  assert.equal(s.due, 2);
  assert.equal(s.moeilijk, 1);
  assert.equal(s.nieuw, 1); // limiet 15 - 10 gedaan = 5, maar er is maar 1 ongeziene kaart
  assert.equal(s.laatsteToets.cijfer, 5.5);
});

test("moduleSummary: nieuwe dag geeft de volle limiet terug", () => {
  const prog = normaliseProg({ newDay: { day: "2026-11-16", n: 15 } });
  assert.equal(moduleSummary(KAARTEN, prog, NOW, "2026-11-17").nieuw, 3);
});

test("zwaksteGroepen sorteert op percentage en negeert weinig data", () => {
  const prog = normaliseProg({ quiz: {
    1: { ok: 1, no: 3, p: 1, m: 4 }, 2: { ok: 0, no: 0 },
    3: { ok: 3, no: 1, p: 3, m: 4 }, 4: { ok: 0, no: 9, p: 0, m: 9 }
  } });
  const z = zwaksteGroepen(KAARTEN, prog);
  assert.deepEqual(z.map(g => g.groep), ["A", "B"]);
  assert.equal(z[0].pct, 25);
});

// ---------- een opgeheven module in een andere schuiven ----------

test("verhuisProg hernoemt alles wat op kaart-id is gesleuteld", () => {
  const hernoem = id => id.replace(/^cel-/, "celbio-");
  const oud = {
    cards: { "cel-001": { iv: 3, reps: 2, lapses: 0, due: 123, ef: 2.5 } },
    quiz: { "cel-001": { ok: 4, no: 1 } },
    sterren: { "cel-002": true },
    notities: { "cel-003": "let op de mitose" },
    fouten: { "cel-004": true },
    antwoorden: { "cel-005": [{ d: "2026-01-01", t: "antwoord", p: 2, max: 3 }] },
    types: { open: { n: 4, p: 8, m: 12 } },
    t: 50
  };
  const uit = verhuisProg(oud, null, hernoem);
  assert.ok(uit.cards["celbio-001"], "de herhaling is mee verhuisd");
  assert.equal(uit.cards["cel-001"], undefined, "het oude id blijft niet staan");
  assert.equal(uit.quiz["celbio-001"].ok, 4);
  assert.equal(uit.sterren["celbio-002"], true);
  assert.equal(uit.notities["celbio-003"], "let op de mitose");
  assert.equal(uit.fouten["celbio-004"], true);
  assert.equal(uit.antwoorden["celbio-005"].length, 1);
});

test("verhuisProg laat de ontvangende module winnen", () => {
  // De cel houdt zijn eigen kaart-id's; botsen kan dus niet, maar als het ooit gebeurt mag de
  // module die blijft bestaan niet overschreven worden.
  const uit = verhuisProg(
    { cards: { "x-1": { iv: 1, reps: 1, lapses: 0, due: 1, ef: 2.5 } }, notities: { "x-1": "oud" } },
    { cards: { "x-1": { iv: 9, reps: 9, lapses: 0, due: 999, ef: 2.5 } }, notities: { "x-1": "nieuw" } },
    id => id
  );
  assert.equal(uit.cards["x-1"].due, 999);
  assert.equal(uit.notities["x-1"], "nieuw");
});

test("verhuisProg telt de vraagtypen op en houdt de nieuwste tijdstempel", () => {
  const uit = verhuisProg(
    { types: { open: { n: 2, p: 4, m: 6 } }, t: 10 },
    { types: { open: { n: 3, p: 6, m: 9 }, mc: { n: 1, p: 1, m: 1 } }, t: 99 },
    id => id
  );
  assert.deepEqual(uit.types.open, { n: 5, p: 10, m: 15 });
  assert.deepEqual(uit.types.mc, { n: 1, p: 1, m: 1 });
  assert.equal(uit.t, 99);
});

test("verhuisProg voegt de toetsgeschiedenis samen op datum", () => {
  const h = (date, ok) => ({ date, ok, n: 10, per: { "Les 1": { ok, n: 10 } } });
  const uit = verhuisProg(
    { history: [h("2026-01-01", 5), h("2026-03-01", 7)] },
    { history: [h("2026-02-01", 6)] },
    id => id
  );
  assert.deepEqual(uit.history.map(x => x.date), ["2026-01-01", "2026-02-01", "2026-03-01"]);
});

test("verhuisProg gaat niet onderuit op lege of kapotte invoer", () => {
  for (const kapot of [null, undefined, "nee", 3]) {
    const uit = verhuisProg(kapot, kapot, id => id);
    assert.deepEqual(uit.cards, {});
    assert.deepEqual(uit.history, []);
  }
});
