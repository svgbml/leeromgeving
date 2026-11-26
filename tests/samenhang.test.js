// Samenhang (B5): de stand per vleugel, wat er open staat en het zoeken over de vleugels heen.
import test from "node:test";
import assert from "node:assert/strict";
import {
  labStand, sessieGedaan, projectStand, moduleStand, openWerk, ppoOpen, zoekBuitenTheorie
} from "../src/domain/samenhang.js";

const LAB = {
  sessies: [
    { titel: "Labveiligheid", bron: "week1.docx", stoffen: ["natrium-hydroxide"],
      experimenten: [{ naam: "1A" }, { naam: "1B" }] },
    { titel: "Leren pipetteren", bron: "week2.docx", stoffen: [],
      experimenten: [{ naam: "Algemeen" }] }
  ]
};
const PROJECT = {
  projecten: [{ id: "oncologie", naam: "Oncologie" }],
  opdrachten: [
    { id: "rapportage", titel: "LU3 Rapportage", vorm: "verslag" },
    { id: "plan", titel: "Projectplan" },
    { id: "rapportage-herkansing", titel: "LU3 Rapportage herkansing", herkansing: true }
  ]
};
const PPO = {
  pijlers: [{ id: "ik", naam: "Ik", vraag: "Wat zijn je kwaliteiten?" }],
  fases: [{ nr: 2, jaar: 2, titel: "Wat past bij mij?", beoordeling: "Assessment met je begeleider." }]
};
const MODULES = [{ id: "m1", titel: "Module een" }];

test("labStand telt sessies die je als uitgewerkt hebt gemarkeerd", () => {
  const leeg = labStand(LAB, {});
  assert.equal(leeg.totaal, 2);
  assert.equal(leeg.gedaan, 0);
  assert.equal(leeg.sessies, 2);
  assert.equal(leeg.pct, 0);

  // De markering staat op de sessiebron, niet op plek in de lijst.
  const half = labStand(LAB, { "week1.docx": { sessie: true } });
  assert.equal(half.gedaan, 1);
  assert.equal(half.pct, 50);
});

test("labStand houdt de oude afvinklijst per experiment geldig", () => {
  // Het Analyse-scherm vinkte eerst elk experiment af. Wie dat deed, mag die voortgang houden;
  // één van de twee experimenten is niet genoeg.
  assert.equal(labStand(LAB, { "week1.docx": { "1A": true } }).gedaan, 0);
  assert.equal(labStand(LAB, { "week1.docx": { "1A": true, "1B": true } }).gedaan, 1);
  assert.equal(sessieGedaan({ experimenten: [] }, {}), false);
});

test("labStand geeft pct null als er niets te doen is, niet 0", () => {
  // 0% en "niets te doen" zijn niet hetzelfde: een module zonder omgezette handleidingen
  // moet niet als achterstand op je dashboard staan.
  const geen = labStand({ sessies: [] }, {});
  assert.equal(geen.totaal, 0);
  assert.equal(geen.pct, null);
  assert.equal(labStand(null, {}).pct, null);
});

test("projectStand laat herkansingen buiten de teller", () => {
  const stand = projectStand(PROJECT, { rapportage: "ingeleverd" });
  assert.equal(stand.totaal, 2, "de herkansing hoort niet in de noemer");
  assert.equal(stand.gedaan, 1);
  assert.equal(stand.herkansingen, 1);
  // "bezig" is niet af.
  assert.equal(projectStand(PROJECT, { rapportage: "bezig" }).gedaan, 0);
  assert.equal(projectStand(PROJECT, { rapportage: "beoordeeld" }).gedaan, 1);
});

test("moduleStand telt onderdelen op in plaats van percentages te gemiddelden", () => {
  const stand = moduleStand({
    theorie: { gedaan: 200, totaal: 400, pct: 50 },
    lab: labStand(LAB, { "week1.docx": { sessie: true } }),
    project: projectStand(PROJECT, {})
  });
  // 200+1+0 van 400+2+2 = 201/404
  assert.equal(stand.samen.gedaan, 201);
  assert.equal(stand.samen.totaal, 404);
  assert.equal(stand.samen.pct, 50);
  assert.deepEqual(stand.samen.vleugels, ["theorie", "lab", "project"]);
});

test("moduleStand laat een vleugel zonder werk buiten het totaal", () => {
  // Anders drukt een module zonder project het getal omlaag terwijl er niets te doen is.
  const stand = moduleStand({
    theorie: { gedaan: 5, totaal: 10, pct: 50 },
    lab: labStand({ sessies: [] }, {}),
    project: projectStand({ opdrachten: [] }, {})
  });
  assert.equal(stand.samen.totaal, 10);
  assert.equal(stand.samen.pct, 50);
  assert.deepEqual(stand.samen.vleugels, ["theorie"]);
});

test("moduleStand zonder enig werk geeft pct null", () => {
  const stand = moduleStand({});
  assert.equal(stand.samen.pct, null);
  assert.deepEqual(stand.samen.vleugels, []);
});

test("openWerk vat samen wat er buiten de theorie open staat", () => {
  const w = openWerk({
    modId: "m1", titel: "Module een", herhalen: 7,
    lab: LAB, project: PROJECT,
    vinkjes: { m1: { "week1.docx": { "1A": true } } },
    status: { m1: { rapportage: "ingeleverd" } }
  });
  assert.equal(w.herhalen, 7);
  assert.equal(w.labSessies, 2);
  assert.equal(w.labOpen, 2);
  assert.equal(w.projectOpen, 1);
  assert.equal(w.iets, true);
});

test("openWerk zegt dat er niets is als er niets is", () => {
  const w = openWerk({
    modId: "m1", titel: "Module een", herhalen: 0,
    lab: { sessies: [] }, project: { opdrachten: [] }
  });
  assert.equal(w.iets, false);
  assert.equal(w.labOpen, 0);
  assert.equal(w.projectOpen, 0);
});

test("ppoOpen noemt de pijlers zonder bewijs dat binnen is", () => {
  const perPijler = [
    { pijler: { naam: "Ik" }, binnen: [{}] },
    { pijler: { naam: "Wij" }, binnen: [] }
  ];
  assert.deepEqual(ppoOpen(perPijler), { leeg: ["Wij"], totaal: 2 });
  assert.deepEqual(ppoOpen(), { leeg: [], totaal: 0 });
});

// ---------- zoeken ----------

const BRON = { modules: MODULES, lab: { m1: LAB }, project: { m1: PROJECT }, ppo: PPO };

test("zoeken vindt treffers in alle drie de vleugels", () => {
  assert.equal(zoekBuitenTheorie("labveiligheid", BRON)[0].vleugel, "lab");
  assert.equal(zoekBuitenTheorie("rapportage", BRON)[0].vleugel, "project");
  assert.equal(zoekBuitenTheorie("oncologie", BRON)[0].wat, "project");
  assert.equal(zoekBuitenTheorie("kwaliteiten", BRON)[0].vleugel, "ppo");
});

test("elk zoekresultaat draagt de route waar het te vinden is", () => {
  const sessie = zoekBuitenTheorie("pipetteren", BRON)[0];
  assert.equal(sessie.route, "lab/protocollen");
  assert.equal(sessie.params.sessie, 1, "de plek in de lijst, want sessienummers zijn niet uniek");
  const fase = zoekBuitenTheorie("past bij mij", BRON)[0];
  assert.equal(fase.route, "ppo/eisen");
  assert.equal(fase.params.jaar, 2);
});

test("een stof is ook te vinden zonder de streepjes van zijn sleutel", () => {
  const met = zoekBuitenTheorie("natrium-hydroxide", BRON);
  const zonder = zoekBuitenTheorie("natrium hydroxide", BRON);
  assert.equal(met.length, 1);
  assert.equal(zonder.length, 1);
  assert.equal(zonder[0].wat, "stof");
});

test("zoeken negeert accenten en hoofdletters", () => {
  const bron = { ...BRON, project: { m1: { opdrachten: [{ id: "x", titel: "Enzymkinetiek vóór de les" }] } } };
  assert.equal(zoekBuitenTheorie("VOOR DE LES", bron).length, 1);
});

test("één teken zoeken geeft niets, want dat raakt alles", () => {
  assert.deepEqual(zoekBuitenTheorie("a", BRON), []);
  assert.deepEqual(zoekBuitenTheorie("", BRON), []);
  assert.deepEqual(zoekBuitenTheorie("  ", BRON), []);
});

test("zoeken gaat niet onderuit op ontbrekende bronnen", () => {
  assert.deepEqual(zoekBuitenTheorie("verslag", {}), []);
  assert.deepEqual(zoekBuitenTheorie("verslag", { lab: { m1: null }, project: { m1: null }, ppo: null }), []);
});

test("een herkansing wordt als herkansing gemeld", () => {
  const r = zoekBuitenTheorie("rapportage", BRON);
  assert.ok(r.some(x => x.wat === "herkansing"), "de herkansing hoort vindbaar te zijn");
  assert.ok(r.some(x => x.wat === "opdracht"));
});

test("het aantal resultaten is begrensd", () => {
  const veel = { modules: MODULES, project: { m1: { opdrachten: Array.from({ length: 30 },
    (_, i) => ({ id: `o${i}`, titel: `Verslag ${i}` })) } } };
  assert.equal(zoekBuitenTheorie("verslag", veel).length, 8);
  assert.equal(zoekBuitenTheorie("verslag", veel, 3).length, 3);
});
