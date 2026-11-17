// Tests voor de functies uit IDEEEN.md: kaarten, rekenen, planner, normering, nakijken en synchronisatie.
import { test } from "node:test";
import assert from "node:assert/strict";
import { clozes, sleutels, slideVolgorde, index, termenIn, verwant, vertaling, basisId, soortVan } from "../src/domain/kaarten.js";
import { SJABLONEN, sjablonenVoor, leesGetal, goedGerekend, fmt } from "../src/domain/rekenen.js";
import { plan, dagenTot, reeks, langsteReeks, heatmap, week, noteer, prognose, nieuweMijlpalen } from "../src/domain/planner.js";
import { gelijkenis, besteGelijkenis, cijferMetNorm, gokScore, woorden, seeded } from "../src/domain/text.js";
import { nakijken, kernHints, stappen, createQuizGenerator, MIX_STD } from "../src/domain/quiz.js";
import { samenvoegen, SYNC_VERSIE, emptyProg } from "../src/domain/progress.js";
import { laad, modules } from "./helpers.js";

// ---------- kaarten ----------
test("cloze: vetgedrukte woorden worden gaten (max 2)", () => {
  const c = clozes({ uitleg: "De <b>mitochondriën</b> maken <b>ATP</b> en <b>warmte</b>." });
  assert.equal(c.length, 2);
  assert.equal(c[0].antwoord, "mitochondriën");
  assert.match(c[0].vraag, /class="gat"/);
  assert.doesNotMatch(c[0].vraag, /mitochondriën/);
});
test("cloze: expliciete {{c1::…}} heeft voorrang, met hint", () => {
  const c = clozes({ uitleg: "PCR verdubbelt {{c1::DNA::molecuul}} per {{c2::cyclus}}." });
  assert.deepEqual(c.map(x => x.antwoord), ["DNA", "cyclus"]);
  assert.match(c[0].vraag, /\[molecuul\]/);
  assert.match(c[0].vraag, /cyclus/);
});
test("sleutels: richting en cloze; vraagkaarten worden niet omgekeerd", () => {
  const b = { id: "x1", uitleg: "met <b>vet</b> woord" };
  assert.deepEqual(sleutels(b, { richting: "beide", cloze: true }), ["x1", "x1~r", "x1~c1"]);
  assert.deepEqual(sleutels(b, { richting: "achter", cloze: false }), ["x1~r"]);
  assert.deepEqual(sleutels(b, { richting: "achter", cloze: false, kaarttype: "vraag" }), ["x1"]);
  assert.equal(basisId("x1~c1"), "x1"); assert.equal(soortVan("x1~r"), "omgekeerd");
});
test("slideVolgorde: op lesnummer en dan slidenummer", () => {
  const k = [{ id: "a", les: "Les 2 – x", bron_slides: [1] }, { id: "b", les: "Les 1 – y", bron_slides: [9] }, { id: "c", les: "Les 1 – y", bron_slides: [3] }];
  assert.deepEqual(slideVolgorde(k).map(b => b.id), ["c", "b", "a"]);
});
test("begriplinks en verwante kaarten in de echte module De cel", () => {
  const data = laad("data/jaar-1/periode-1/de-cel.json"), idx = index(data);
  const peri = data.begrippen.find(b => /Periplasmatische/.test(b.begrip));
  const hits = termenIn(idx, "Het peptidoglycaan ligt in de buitenmembraan van Gram-negatieven.", peri.id);
  assert.ok(hits.length >= 1, JSON.stringify(hits));
  const v = verwant(idx, peri.id, 4);
  assert.ok(v.length >= 2 && v.every(x => x.id !== peri.id));
});
test("woordenlijst: Nederlands of Engels begrip vindt de vertaling", () => {
  const lijst = laad("data/woordenlijst.json").termen;
  assert.equal(vertaling(lijst, { begrip: "Ribosoom (70S)" })?.[1], "Ribosome");
  assert.equal(vertaling(lijst, { begrip: "Peptidoglycan" })?.[0], "Peptidoglycaan");
});

// ---------- rekenen ----------
test("elk rekensjabloon geeft een eindig antwoord en keurt zijn eigen antwoord goed", () => {
  const rng = seeded(4);
  for (const s of SJABLONEN) for (let i = 0; i < 25; i++) {
    const v = s.maak(rng);
    assert.ok(Number.isFinite(v.antwoord) && v.antwoord > 0, `${s.id}: ${v.antwoord}`);
    assert.ok(goedGerekend(fmt(v.antwoord, 6), v.antwoord, v.marge), `${s.id} accepteert ${fmt(v.antwoord, 6)}`);
    assert.ok(!goedGerekend(String(v.antwoord * 1.5), v.antwoord, v.marge), `${s.id} keurt fout antwoord af`);
    assert.ok(v.vraag && v.uitwerking);
  }
});
test("leesGetal begrijpt komma, punt, wetenschappelijke notatie en duizendtallen", () => {
  assert.equal(leesGetal("1,5"), 1.5); assert.equal(leesGetal("1.5"), 1.5);
  assert.equal(leesGetal("1,5e3"), 1500); assert.equal(leesGetal("1,5 × 10^3"), 1500);
  assert.equal(leesGetal("1.500,25"), 1500.25); assert.ok(Number.isNaN(leesGetal("abc")));
});
test("rekensjablonen horen bij bestaande modules", () => {
  const ids = new Set(modules().map(m => m.id));
  for (const s of SJABLONEN) for (const m of s.modules) assert.ok(ids.has(m), `${s.id} → ${m}`);
  assert.ok(sjablonenVoor("dna-kraak-de-code").length >= 3);
});

// ---------- planner ----------
test("plan: kaarten verdeeld tot twee dagen voor de toets", () => {
  const nu = new Date(2026, 10, 17, 9);
  assert.deepEqual(plan({ ongezien: 100, toetsdatum: "2026-11-29", nu }), { dagen: 12, leerdagen: 10, perDag: 10, voorbij: false });
  assert.equal(plan({ ongezien: 5, toetsdatum: "2026-11-01", nu }).voorbij, true);
  assert.equal(dagenTot("2026-11-18", nu), 1);
});
test("reeks en langste reeks", () => {
  const b = {}; const nu = new Date(2026, 10, 17, 12);
  for (const d of ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-10", "2026-11-11"]) noteer(b, { n: 5 }, d);
  assert.equal(reeks(b, nu), 4);
  assert.equal(reeks(b, new Date(2026, 10, 18, 12)), 4, "vandaag nog niets gedaan: reeks vanaf gisteren");
  assert.equal(langsteReeks(b), 4);
});
test("heatmap is weken × 7 en begint op maandag", () => {
  const h = heatmap({}, 20, new Date(2026, 10, 17));
  assert.equal(h.length, 20); assert.ok(h.every(k => k.length === 7));
  assert.equal(new Date(h[0][0].dag + "T12:00").getDay(), 1);
});
test("week telt de laatste 7 dagen", () => {
  const b = {}; const nu = new Date(2026, 10, 17, 12);
  noteer(b, { n: 10, nieuw: 3 }, "2026-11-17"); noteer(b, { n: 4, p: 3, m: 4 }, "2026-11-12"); noteer(b, { n: 99 }, "2026-11-01");
  const w = week(b, nu);
  assert.equal(w.n, 14); assert.equal(w.nieuw, 3); assert.equal(w.dagen, 2); assert.equal(w.p, 3);
});
test("prognose zet te late kaarten op vandaag", () => {
  const nu = new Date(2026, 10, 17, 12).getTime();
  const p = prognose([{ due: nu - 1e9 }, { due: nu + 864e5 }, { due: nu + 30 * 864e5 }], 7, nu);
  assert.deepEqual(p.map(d => d.n), [1, 1, 0, 0, 0, 0, 0]);
});
test("mijlpalen: alleen nieuwe", () => {
  const m = nieuweMijlpalen({ beheerst: 120, besteCijfer: 8.2, reeks: 2, moduleCompleet: false, doelVandaag: true }, { "beheerst-100": "x" });
  assert.deepEqual(m.map(x => x.id).sort(), ["doel-gehaald", "eerste-8"]);
});

// ---------- tekst en normering ----------
test("gelijkenis: typfouten mogen, onzin niet", () => {
  assert.equal(gelijkenis("Ribosoom", "ribosoom"), 1);
  assert.ok(gelijkenis("ribosom", "ribosoom") >= 0.85);
  assert.ok(gelijkenis("mitochondrion", "ribosoom") < 0.5);
  assert.equal(besteGelijkenis("70S", "Ribosoom (70S)"), 1);
});
test("cijferMetNorm: cesuur geeft 5,5 bij de cesuur, 10 bij alles goed, 1 bij niets", () => {
  const n = { soort: "cesuur", cesuur: 55 };
  assert.equal(cijferMetNorm(55, 100, n), 5.5); assert.equal(cijferMetNorm(100, 100, n), 10); assert.equal(cijferMetNorm(0, 100, n), 1);
  assert.equal(cijferMetNorm(50, 100, {}), 5.5);
});
test("gokScore haalt verwachte gokpunten eraf", () => {
  assert.equal(gokScore(10, 20, 5), 20 * (5 / 15));
  assert.equal(gokScore(3, 20, 5), 0);
});
test("woorden: alleen inhoudswoorden", () => {
  assert.deepEqual(woorden("De cel en het ribosoom maken eiwitten"), ["ribosoom", "maken", "eiwitten"]);
});

// ---------- nakijken ----------
test("nakijken per vraagtype", () => {
  assert.equal(nakijken({ kind: "mc", answer: "a", correct: "a", punten: 1 }), 1);
  const paren = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  assert.equal(nakijken({ kind: "koppel", paren, antwoord: { a: "a", b: "b", c: "c", d: "d" }, punten: 2 }), 2);
  assert.equal(nakijken({ kind: "koppel", paren, antwoord: { a: "a", b: "b", c: "d", d: "c" }, punten: 2 }), 1);
  assert.equal(nakijken({ kind: "koppel", paren, antwoord: { a: "b" }, punten: 2 }), 0);
  assert.equal(nakijken({ kind: "volgorde", stappen: [1, 2, 3, 4], antwoord: [0, 1, 2, 3], punten: 2 }), 2);
  assert.equal(nakijken({ kind: "volgorde", stappen: [1, 2, 3, 4], antwoord: [0, 1, 3, 2], punten: 2 }), 1);
  assert.equal(nakijken({ kind: "rekenen", invoer: "12,5", antwoordGetal: 12.5, marge: 0.02, punten: 2 }), 2);
  assert.equal(nakijken({ kind: "aanwijs", answer: "lps", doel: "lps", punten: 1 }), 1);
  assert.equal(nakijken({ kind: "open" }), null);
});
test("kernHints stelt kernpunten voor waarvan de sleutelwoorden in het antwoord staan", () => {
  const h = kernHints(["Ribosomen maken eiwitten", "Bacteriële ribosomen bestaan uit twee subeenheden"], "In de cel maakt het ribosoom eiwit");
  assert.equal(h[0].voorstel, true); assert.ok(h[0].gevonden.includes("eiwitten"));
  assert.equal(h[1].voorstel, false);
});
test("stappen: alleen genummerde lijsten met echte zinnen", () => {
  assert.deepEqual(stappen({ uitleg: "<ol><li>Cellen lyseren met SDS</li><li>Eiwit verwijderen met proteinase</li><li>DNA neerslaan met ethanol</li></ol>" }).length, 3);
  assert.deepEqual(stappen({ uitleg: "<ol><li>0,125 mol/L</li><li>2 significante cijfers</li><li>0,13 mol/L</li></ol>" }), []);
});
test("aanwijsvragen uit de figuur van De cel", () => {
  const data = laad("data/jaar-1/periode-1/de-cel.json");
  const gen = createQuizGenerator({ data, random: seeded(3) });
  const { items } = gen.buildItems(data.begrippen, 6, { aanwijs: 100 });
  assert.equal(items.length, 6);
  assert.ok(items.every(i => i.kind === "aanwijs" && i.vlakken.some(v => v.id === i.doel)));
});
test("volgordevragen komen uit data.volgordes", () => {
  const data = laad("data/jaar-2/periode-2/dna-kraak-de-code.json");
  data.volgordes = laad("data/volgordes.json").volgordes.filter(v => v.modules.includes(data.id));
  const gen = createQuizGenerator({ data, random: seeded(8) });
  const { items } = gen.buildItems(data.begrippen, 5, { volgorde: 100 });
  assert.equal(items.length, 5);
  assert.ok(items.every(i => i.kind === "volgorde" && i.stappen.length >= 3 && i.groep === "Procedures"));
});
test("dezelfde seed geeft dezelfde toets (gedeelde link)", () => {
  const data = laad("data/jaar-1/periode-3/eiwitten-in-de-praktijk.json");
  const maak = () => createQuizGenerator({ data, random: seeded(1234) }).buildItems(data.begrippen, 20, MIX_STD).items.map(i => i.id + ":" + (i.opts || []).map(o => o.id).join(","));
  assert.deepEqual(maak(), maak());
});

// ---------- synchronisatie ----------
test("samenvoegen: per module wint de nieuwste, dagboek per dag het maximum", () => {
  const a = { ...emptyProg(), t: 100, cards: { x: { iv: 1, reps: 1, lapses: 0, due: 5 } } };
  const b = { ...emptyProg(), t: 200, cards: { y: { iv: 2, reps: 1, lapses: 0, due: 6 } } };
  const lokaal = { versie: SYNC_VERSIE, t: 100, modules: { m1: a, m2: a }, dagboek: { "2026-11-17": { n: 5 } } };
  const extern = { versie: SYNC_VERSIE, t: 200, modules: { m1: b, m3: b }, dagboek: { "2026-11-17": { n: 3, m: 4 }, "2026-11-16": { n: 1 } } };
  const { resultaat, gewijzigd } = samenvoegen(lokaal, extern);
  assert.deepEqual(gewijzigd.sort(), ["m1", "m3"]);
  assert.ok(resultaat.modules.m1.cards.y); assert.ok(resultaat.modules.m2.cards.x);
  assert.deepEqual(resultaat.dagboek["2026-11-17"], { n: 5, m: 4 });
  assert.equal(samenvoegen(lokaal, { versie: 99 }).gewijzigd.length, 0);
});
