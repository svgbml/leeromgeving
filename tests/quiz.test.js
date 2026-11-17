import { test } from "node:test";
import assert from "node:assert/strict";
import { createQuizGenerator, kernpunten, mask, toetsbaar, GEEN, MIX_STD } from "../src/domain/quiz.js";
import { plain } from "../src/domain/text.js";
import { seeded, laad, modules } from "./helpers.js";

const kaart = (uitleg, extra = {}) => ({ id: "k", begrip: "Test", onderwerp: "O", uitleg, ...extra });

test("kernpunten: lijst wordt per item een kernpunt, zonder losse <ul>", () => {
  const k = kernpunten(kaart("<ul><li>eerste punt</li><li>tweede punt</li><li>derde punt</li></ul>"));
  assert.deepEqual(k, ["eerste punt", "tweede punt", "derde punt"]);
});

test("kernpunten: dubbele regeleinden scheiden alinea's", () => {
  assert.equal(kernpunten(kaart("Alinea een.<br><br>Alinea twee.")).length, 2);
});

test("kernpunten: zinnen, korte zinnen plakken aan de vorige", () => {
  const k = kernpunten(kaart("Dit is een lange eerste zin over iets belangrijks. Kort. Dit is weer een lange tweede zin met inhoud."));
  assert.equal(k.length, 2);
  assert.match(k[0], /Kort\.$/);
});

test("kernpunten: maximaal vier", () => {
  const li = Array.from({ length: 9 }, (_, i) => `<li>punt nummer ${i}</li>`).join("");
  const k = kernpunten(kaart(`<ul>${li}</ul>`));
  assert.ok(k.length >= 2 && k.length <= 4, `${k.length} kernpunten`);
  assert.match(k.join(" "), /punt nummer 8/, "niets mag wegvallen bij het samenvoegen");
});

test("mask streept het begrip en de delen ervan weg", () => {
  const t = mask({ begrip: "Ribosoom (70S)", uitleg: "Het ribosoom (70S) maakt eiwitten." });
  assert.doesNotMatch(t, /ribosoom/i);
  assert.match(t, /_______/);
});

test("toetsbaar: lesinfo en organisatie-onderwerpen vallen af", () => {
  assert.equal(toetsbaar({ onderwerp: "SMA" }), true);
  assert.equal(toetsbaar({ onderwerp: "SMA", lesinfo: true }), false);
  assert.equal(toetsbaar({ onderwerp: "Opzet" }), false);
  assert.equal(toetsbaar({ onderwerp: "Toetsing" }), false);
});

for (const mod of modules()) {
  const data = laad(mod.bestand);

  test(`${mod.id}: een toets bevat nooit lesinfo-kaarten`, () => {
    const gen = createQuizGenerator({ data, random: seeded(3) });
    const verboden = new Set(data.begrippen.filter(b => !toetsbaar(b)).map(b => b.id));
    for (let i = 0; i < 25; i++) {
      const { items } = gen.buildItems(data.begrippen, 40, MIX_STD);
      for (const it of items) assert.ok(!verboden.has(it.id), `${it.id} is lesinfo`);
      for (const it of items) if (it.kind === "mc") for (const o of it.opts) assert.ok(!verboden.has(o.id), `afleider ${o.id} is lesinfo`);
      for (const it of items) if (it.kind === "koppel") for (const id of it.ids) assert.ok(!verboden.has(id), `koppel ${id} is lesinfo`);
    }
  });

  test(`${mod.id}: geldige toets met de gevraagde lengte en geen dubbele vragen`, () => {
    const gen = createQuizGenerator({ data, random: seeded(11) });
    const { items } = gen.buildItems(data.begrippen, 30, MIX_STD);
    assert.equal(items.length, 30);
    assert.equal(new Set(items.map(i => i.id)).size, 30);
    for (const it of items) {
      assert.ok(it.punten >= 1 && it.punten <= 4);
      if (["koppel", "volgorde", "rekenen", "aanwijs"].includes(it.kind)) { assert.ok(it.punten <= 2); continue; }
      if (it.kind === "mc") {
        assert.equal(it.punten, 1);
        assert.ok(it.opts.length >= 4 && it.opts.length <= 5);
        assert.ok(it.opts.some(o => o.id === it.correct) || it.correct === GEEN);
        if (it.correct === GEEN) assert.ok(!it.opts.some(o => o.id === it.id), "bij 'geen van' mag het juiste antwoord er niet tussen staan");
        assert.equal(new Set(it.opts.map(o => o.id)).size, it.opts.length);
      } else assert.equal(it.punten, it.kern.length);
    }
  });

  test(`${mod.id}: casusdeelvragen staan bij elkaar en op volgorde A, B, C`, () => {
    const gen = createQuizGenerator({ data, random: seeded(5) });
    const { items } = gen.buildItems(data.begrippen, 40, { mc: 0, open: 0, casus: 100 });
    let vorige = null;
    for (const it of items.filter(i => i.casus)) {
      if (vorige && vorige.casus.gid === it.casus.gid) assert.equal(it.casus.i, vorige.casus.i + 1);
      else assert.equal(it.casus.letter, "A");
      vorige = it;
    }
  });
}

test("dna-kraak-de-code: vragen over lesopzet en toetsdata komen niet meer voor", () => {
  const data = laad("data/jaar-2/periode-2/dna-kraak-de-code.json");
  const gen = createQuizGenerator({ data, random: seeded(1) });
  const les1 = data.begrippen.filter(b => b.les && b.les.startsWith("Les 1 "));
  for (let i = 0; i < 50; i++) {
    for (const it of gen.buildItems(les1, 13, MIX_STD).items) {
      assert.doesNotMatch(plain(gen.byId(it.id).begrip), /bijeenkomsten|wanneer zijn de toetsen|welke lessen horen bij|presentatie voldoen/i);
    }
  }
});

test("vraagkaarten: meerkeuze-opties zijn niet afgekapt (lengte verraadt het antwoord niet)", () => {
  const data = laad("data/jaar-2/periode-2/dna-kraak-de-code.json");
  const gen = createQuizGenerator({ data, random: seeded(9) });
  for (let i = 0; i < 20; i++) {
    for (const it of gen.buildItems(data.begrippen, 20, { mc: 100, open: 0, casus: 0 }).items) {
      if (it.kind !== "mc") continue;
      for (const o of it.opts) if (o.id !== GEEN) assert.doesNotMatch(o.text, /…$/);
    }
  }
});

test("pickWeighted: kaarten die vaak fout gingen komen vaker terug", () => {
  const data = laad("data/jaar-1/periode-1/de-cel.json");
  const zwak = data.begrippen[0].id;
  const gen = createQuizGenerator({ data, weightOf: id => id === zwak ? 50 : 1, random: seeded(2) });
  let n = 0;
  for (let i = 0; i < 40; i++) if (gen.buildItems(data.begrippen, 10, { mc: 100, open: 0, casus: 0 }).items.some(it => it.id === zwak)) n++;
  assert.ok(n > 30, `zwakke kaart kwam ${n}/40 keer voor`);
});
