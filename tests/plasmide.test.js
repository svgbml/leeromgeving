// Tests voor de plasmidebouwer: de didactische regels uit les 2, 4 en 5 van "DNA kraak de code".
import { test } from "node:test";
import assert from "node:assert/strict";
import { ONDERDELEN, SOORTEN, OPDRACHTEN, onderdeel, opdracht, controleer, lengte } from "../src/domain/plasmide.js";

// Hulpjes: alleen de koppen van de fouten / waarschuwingen, dat leest prettiger in een assert.
const van = (r, soort) => r.bevindingen.filter(b => b.soort === soort).map(b => b.kop);
const fouten = (ids, opd = "vrij") => van(controleer(ids, opd), "fout");
const letop = (ids, opd = "vrij") => van(controleer(ids, opd), "letop");
const infos = (ids, opd = "vrij") => van(controleer(ids, opd), "info");

// ---------- gegevens ----------
test("elk onderdeel heeft uitleg, valkuil, een bestaande soort en een bron-kaart", () => {
  for (const o of ONDERDELEN) {
    assert.ok(o.id && o.naam && o.lang, `id/naam/lang bij ${o.id}`);
    assert.ok(o.uitleg && o.waarom && o.valkuil, `uitleg/waarom/valkuil bij ${o.id}`);
    assert.ok(SOORTEN.some(s => s.id === o.soort), `soort "${o.soort}" bij ${o.id}`);
    assert.ok(["pro", "euk", "beide"].includes(o.gastheer), `gastheer bij ${o.id}`);
    assert.match(o.bron, /^dna-\d{3}$/, `bron bij ${o.id}`);
    assert.ok(o.bp > 0, `bp bij ${o.id}`);
  }
  assert.equal(new Set(ONDERDELEN.map(o => o.id)).size, ONDERDELEN.length, "dubbele id's");
  assert.equal(onderdeel("ori").rol, "ori");
  assert.equal(onderdeel("bestaat-niet"), null);
});

test("het voorbeeldantwoord van elke opdracht is foutloos", () => {
  for (const o of OPDRACHTEN) {
    const r = controleer(o.voorbeeld, o.id);
    assert.deepEqual(van(r, "fout"), [], `opdracht ${o.id}`);
    assert.ok(r.klaar, `opdracht ${o.id} niet klaar`);
    assert.ok(r.aantal.goed >= 3, `opdracht ${o.id} heeft te weinig bevestigingen`);
  }
});

test("een onbekende opdracht valt terug op vrij bouwen, onbekende onderdelen worden genegeerd", () => {
  assert.equal(opdracht("bestaat-niet").id, "vrij");
  assert.deepEqual(fouten(["ori", "marker", "prom-pro", "onzin"]), []);
});

// ---------- plasmide-basis ----------
test("leeg plasmide: ORI, marker en promotor ontbreken, en is nooit klaar", () => {
  const r = controleer([], "vrij");
  assert.deepEqual(van(r, "fout"), ["Geen ORI", "Geen selectiemarker", "Geen promotor"]);
  assert.equal(r.klaar, false);
});

test("MCS moet vlak achter de promotor liggen", () => {
  assert.deepEqual(fouten(["ori", "marker", "prom-pro", "mcs"], "klonering"), []);
  assert.deepEqual(fouten(["ori", "marker", "mcs", "prom-pro"], "klonering"), ["MCS staat vóór de promotor"]);
  // Een RBS of startcodon mag ertussen, een gen niet.
  assert.deepEqual(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "mcs"], "klonering"), []);
  assert.deepEqual(fouten(["ori", "marker", "prom-pro", "term", "mcs"], "klonering"), ["MCS ligt niet vlak achter de promotor"]);
});

test("klonering zonder MCS is fout; met de vier elementen volgt de VB2.1-bevestiging", () => {
  assert.ok(fouten(["ori", "marker", "prom-pro"], "klonering").includes("Geen MCS"));
  const r = controleer(["prom-pro", "mcs", "ori", "marker"], "klonering");
  assert.ok(van(r, "goed").includes("De vier minimale elementen zitten erin"));
  assert.ok(van(r, "info").includes("Van kloneren naar expressie"));
});

// ---------- gastheer ----------
test("een bacteriële promotor werkt niet in een eukaryote cel, en omgekeerd", () => {
  assert.ok(fouten(["ori", "marker", "prom-pro", "kozak", "atg", "gen", "stop", "polya"], "humaan")
    .includes("Prokaryote promotor (lac, T7) past niet bij de gastheer"));
  assert.ok(fouten(["ori", "marker", "prom-euk", "rbs", "atg", "gen", "stop", "term"], "ecoli")
    .includes("Eukaryote promotor (CMV, SV40) past niet bij de gastheer"));
});

test("RBS is prokaryoot, Kozak en IRES zijn eukaryoot", () => {
  const pro = fouten(["ori", "marker", "prom-pro", "kozak", "atg", "gen", "stop", "term"], "ecoli");
  assert.ok(pro.includes("Geen RBS"));
  assert.ok(pro.includes("Kozak in een prokaryoot"));
  assert.ok(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "ires", "atg", "gfp", "stop", "term"], "ecoli")
    .includes("IRES in een prokaryoot"));
  assert.ok(fouten(["ori", "marker", "prom-euk", "rbs", "atg", "gen", "stop", "polya"], "humaan")
    .includes("RBS in een eukaryoot"));
});

test("een polyA-signaal in een bacterie en een terminator in een humane cel kloppen niet", () => {
  assert.ok(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "polya"], "ecoli")
    .includes("PolyA-signaal (eukaryoot) past niet bij de gastheer"));
  assert.ok(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "term"], "humaan")
    .includes("Transcriptieterminator (prokaryoot) past niet bij de gastheer"));
});

test("zonder Kozak is het alleen een waarschuwing, niet fout", () => {
  const ids = ["ori", "marker", "prom-euk", "atg", "gen", "stop", "polya"];
  assert.deepEqual(fouten(ids, "humaan"), []);
  assert.ok(letop(ids, "humaan").includes("Geen Kozak-sequentie"));
});

// ---------- volgorde: transcriptie en translatie ----------
test("translatie-elementen liggen bínnen de transcriptie-elementen", () => {
  assert.ok(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "term", "stop"], "ecoli")
    .includes("Elementen achter het einde van de transcriptie"));
  assert.ok(fouten(["ori", "marker", "rbs", "atg", "prom-pro", "gen", "stop", "term"], "ecoli")
    .includes("Elementen vóór de promotor"));
});

test("RBS en Kozak liggen stroomopwaarts van het startcodon", () => {
  assert.ok(fouten(["ori", "marker", "prom-pro", "atg", "rbs", "gen", "stop", "term"], "ecoli")
    .includes("RBS staat achter het startcodon"));
  assert.ok(fouten(["ori", "marker", "prom-euk", "atg", "kozak", "gen", "stop", "polya"], "humaan")
    .includes("Kozak staat achter het startcodon"));
});

test("zonder terminator, startcodon of stopcodon is er geen expressie", () => {
  const r = fouten(["ori", "marker", "prom-pro", "rbs", "gen"], "ecoli");
  assert.ok(r.includes("Geen terminator"));
  assert.ok(r.includes("Geen startcodon"));
  assert.ok(r.includes("Geen stopcodon"));
  assert.ok(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop"], "humaan").includes("Geen polyA-signaal"));
});

test("een gen vóór de promotor of achter het stopcodon valt buiten het eiwit", () => {
  assert.ok(fouten(["ori", "marker", "gen", "prom-pro", "rbs", "atg", "stop", "term"], "ecoli")
    .includes("Coderend DNA staat vóór de promotor"));
  assert.ok(fouten(["ori", "marker", "prom-pro", "rbs", "gen", "atg", "stop", "term"], "ecoli")
    .includes("Startcodon staat achter het coderende DNA"));
});

// ---------- tags en fusies ----------
test("een stopcodon vóór een C-terminale tag is de klassieke fout", () => {
  const fout = fouten(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "his", "stop", "term"], "his-c");
  assert.ok(fout.includes("Stopcodon vóór HIS"));
  // Zonder dat extra stopcodon, en met de TEV-site ertussen, klopt het wel.
  assert.deepEqual(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "tev", "his", "stop", "term"], "his-c"), []);
});

test("C-terminaal gevraagd maar N-terminaal gebouwd wordt afgekeurd", () => {
  const fout = fouten(["ori", "marker", "prom-pro", "rbs", "atg", "his", "tev", "gen", "stop", "term"], "his-c");
  assert.ok(fout.includes("HIS-tag staat N-terminaal"));
});

test("N-terminale fusie: tag met het startcodon ervóór, gen erna", () => {
  assert.deepEqual(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gfp", "gen", "stop", "polya"], "n-gfp"), []);
  assert.ok(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "gfp", "stop", "polya"], "n-gfp")
    .includes("GFP-reporter staat C-terminaal"));
  // Een tweede ATG tussen tag en gen is niet fout, maar overbodig.
  const ids = ["ori", "marker", "prom-euk", "kozak", "atg", "gfp", "atg", "gen", "stop", "polya"];
  assert.deepEqual(fouten(ids, "n-gfp"), []);
  assert.ok(letop(ids, "n-gfp").includes("Extra startcodon tussen tag en gen"));
});

test("een translationele fusie levert één eiwit op en wordt zo benoemd", () => {
  assert.ok(infos(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "his", "stop", "term"], "ecoli")
    .includes("Translationele fusie"));
});

test("de TEV-site moet tussen de CDS en de tag liggen", () => {
  assert.ok(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "tev", "gen", "his", "stop", "term"], "his-c")
    .includes("TEV-site ligt niet tussen twee coderende delen"));
  assert.ok(fouten(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "his", "stop", "term"], "his-c")
    .includes("Geen TEV-site"));
});

// ---------- mono- en polycistronisch ----------
test("twee eiwitten uit één transcript lukt in een eukaryoot alleen met een IRES", () => {
  const zonder = ["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "atg", "gfp", "stop", "polya"];
  assert.ok(fouten(zonder, "transcriptioneel").includes("Twee eiwitten zonder IRES in een eukaryoot"));
  const met = ["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "ires", "atg", "gfp", "stop", "polya"];
  assert.deepEqual(fouten(met, "transcriptioneel"), []);
  assert.ok(infos(met, "transcriptioneel").includes("Transcriptionele fusie, multicistronisch"));
});

test("na een IRES hoort een eigen startcodon, en er moet iets achter staan", () => {
  assert.ok(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "ires", "gfp", "stop", "polya"], "transcriptioneel")
    .includes("Geen startcodon na de IRES"));
  assert.ok(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "ires", "polya"], "transcriptioneel")
    .includes("Niets achter de IRES"));
});

test("prokaryoten zijn polycistronisch: twee cistrons mogen, maar elk met eigen RBS", () => {
  const ids = ["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "atg", "gfp", "stop", "term"];
  assert.deepEqual(fouten(ids, "ecoli"), []);
  assert.ok(letop(ids, "ecoli").includes("Tweede cistron zonder eigen RBS"));
  const goed = ["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "rbs", "atg", "gfp", "stop", "term"];
  assert.deepEqual(letop(goed, "ecoli"), []);
});

// ---------- plasmidetypes ----------
test("shuttle vector: twee ORI's, en de marker moet in beide gastheren werken", () => {
  assert.ok(fouten(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "polya"], "shuttle")
    .includes("Nog geen shuttle vector"));
  const r = controleer(["ori", "ori2", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "polya"], "shuttle");
  assert.deepEqual(van(r, "fout"), []);
  assert.ok(van(r, "goed").includes("Twee ORI's"));
  assert.ok(van(r, "letop").includes("Marker moet in beide gastheren werken"));
});

test("een tweede ORI buiten een shuttle-opdracht geeft een waarschuwing", () => {
  assert.ok(letop(["ori", "ori2", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "polya"], "humaan")
    .includes("Tweede ORI zonder noodzaak"));
});

// ---------- overige ----------
test("vrij bouwen waarschuwt als je prokaryote en eukaryote elementen mengt", () => {
  assert.ok(letop(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "polya"], "vrij")
    .includes("Prokaryote en eukaryote elementen gemengd"));
  assert.deepEqual(letop(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "term"], "vrij"), []);
});

test("dubbele unieke onderdelen worden gemeld", () => {
  assert.ok(letop(["ori", "ori", "marker", "prom-pro", "mcs"], "vrij").includes("ORI staat er 2× in"));
  assert.ok(letop(["ori", "marker", "prom-pro", "rbs", "atg", "gen", "gen", "stop", "term"], "vrij")
    .includes("leptine staat er 2× in"));
});

test("klonering vraagt geen RBS of stopcodon: zonder expressie geen expressie-eisen", () => {
  assert.deepEqual(fouten(["prom-pro", "mcs", "ori", "marker"], "klonering"), []);
});

test("bevindingen staan op ernst gesorteerd en de telling klopt", () => {
  const r = controleer(["prom-pro", "polya", "gen"], "vrij");
  const soorten = r.bevindingen.map(b => b.soort);
  const orde = { fout: 0, letop: 1, goed: 2, info: 3 };
  assert.deepEqual(soorten.map(s => orde[s]), [...soorten.map(s => orde[s])].sort((a, c) => a - c));
  for (const s of ["fout", "letop", "goed", "info"]) {
    assert.equal(r.aantal[s], r.bevindingen.filter(b => b.soort === s).length, s);
  }
  assert.ok(r.bevindingen.every(b => b.kop && b.tekst));
});

test("lengte telt de onderdelen op bij een vaste backbone", () => {
  assert.equal(lengte([]), 2000);
  assert.equal(lengte(["atg", "stop"]), 2006);
  assert.equal(lengte(["ori", "onzin"]), 2700);
});

test("bij een stopcodon midden in de fusie volgt geen tweede, tegenstrijdige melding", () => {
  const ids = ["ori", "marker", "prom-pro", "rbs", "atg", "gen", "stop", "his", "stop", "term"];
  const r = controleer(ids, "his-c");
  assert.ok(van(r, "fout").includes("Stopcodon vóór HIS"));
  // Geen groen vinkje voor de positie van de tag, en geen tweede verhaal over cistrons.
  assert.ok(!van(r, "goed").some(k => k.includes("terminaal")), van(r, "goed").join(" | "));
  assert.deepEqual(van(r, "letop"), []);
  // Hetzelfde in een eukaryoot: alleen de stopcodon-fout, niet ook "twee eiwitten zonder IRES".
  const euk = controleer(["ori", "marker", "prom-euk", "kozak", "atg", "gen", "stop", "gfp", "stop", "polya"], "humaan");
  assert.deepEqual(van(euk, "fout"), ["Stopcodon vóór GFP"]);
});
