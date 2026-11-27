// Meldingen worden in de browser bewaard; hier staat een kleine localStorage zodat de regels
// eromheen (nieuwste eerst, lege melding telt niet, tekst om te kopiëren) te testen zijn.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const opslag = new Map();
globalThis.localStorage = {
  getItem: k => (opslag.has(k) ? opslag.get(k) : null),
  setItem: (k, v) => opslag.set(k, String(v)),
  removeItem: k => opslag.delete(k)
};

const { meldingen, bewaarMelding, wisMelding, wisMeldingen, alsTekst, aantalMeldingen,
  openstaand, verstuur, verstuurOpenstaand, verzendenMogelijk } =
  await import("../src/domain/meldingen.js");

beforeEach(() => opslag.clear());

test("bewaarMelding: zet de nieuwste melding vooraan", () => {
  bewaarMelding({ titel: "Eerste", tekst: "klopt niet" });
  bewaarMelding({ titel: "Tweede", tekst: "ook niet" });
  assert.deepEqual(meldingen().map(m => m.titel), ["Tweede", "Eerste"]);
  assert.equal(aantalMeldingen(), 2);
});

test("bewaarMelding: zonder tekst is er niets te melden", () => {
  assert.equal(bewaarMelding({ titel: "Leeg", tekst: "   " }), null);
  assert.equal(bewaarMelding({ titel: "Leeg" }), null);
  assert.equal(aantalMeldingen(), 0);
});

test("bewaarMelding: de context gaat mee, want anders is een melding niet na te trekken", () => {
  const m = bewaarMelding({ titel: "Fout in kaart k1", tekst: "vijf stappen, geen vier",
    context: "**Kaart:** k1", kaart: "k1", module: "De cel", soort: "kaart" });
  assert.equal(m.kaart, "k1");
  assert.equal(m.module, "De cel");
  assert.equal(m.soort, "kaart");
  assert.ok(m.tijd && !Number.isNaN(Date.parse(m.tijd)));
});

test("wisMelding en wisMeldingen", () => {
  const a = bewaarMelding({ titel: "A", tekst: "x" });
  bewaarMelding({ titel: "B", tekst: "y" });
  wisMelding(a.id);
  assert.deepEqual(meldingen().map(m => m.titel), ["B"]);
  wisMeldingen();
  assert.equal(aantalMeldingen(), 0);
});

test("rommel in de opslag levert een lege lijst op, geen uitzondering", () => {
  opslag.set("leeromgeving:meldingen", "{geen json");
  assert.deepEqual(meldingen(), []);
  opslag.set("leeromgeving:meldingen", '{"niet":"een lijst"}');
  assert.deepEqual(meldingen(), []);
});

test("alsTekst: elke melding komt met titel, tekst en context in de uitvoer", () => {
  bewaarMelding({ titel: "Fout in kaart k1", tekst: "vijf stappen", context: "**Kaart:** k1" });
  const t = alsTekst();
  assert.match(t, /## Fout in kaart k1/);
  assert.match(t, /vijf stappen/);
  assert.match(t, /\*\*Kaart:\*\* k1/);
  wisMeldingen();
  assert.match(alsTekst(), /Geen meldingen/);
});

// --- versturen naar het verzamelpunt -------------------------------------------------
// De weg naar het verzamelpunt wordt met een eigen fetch getest, zodat er geen netwerk aan te
// pas komt en de Google Sheet van de beheerder geen testregels krijgt. Of MELD_ENDPOINT gevuld
// is, hangt af van de inrichting; beide gevallen horen te kloppen.
const antwoord = (tekst, ok = true) => ({ ok, text: async () => tekst });

test("verstuur: een melding die aankomt, staat daarna niet meer open", async t => {
  if (!verzendenMogelijk()) return t.skip("geen verzamelpunt ingesteld");
  const m = bewaarMelding({ titel: "A", tekst: "x" });
  let verstuurdNaar = null;
  const ok = await verstuur(m, (url, opties) => {
    verstuurdNaar = { url, body: JSON.parse(opties.body), type: opties.headers["Content-Type"] };
    return antwoord('{"ok":true}');
  });
  assert.equal(ok, true);
  assert.equal(openstaand().length, 0, "de melding hoort als verstuurd gemarkeerd te zijn");
  assert.equal(meldingen()[0].verstuurd, true, "en blijft als eigen kopie staan");
  assert.equal(verstuurdNaar.body.tekst, "x");
  assert.ok(verstuurdNaar.body.melder, "een kenmerk per browser hoort mee te gaan");
  // text/plain scheelt een preflight-verzoek, dat een Apps Script web-app niet beantwoordt.
  assert.match(verstuurdNaar.type, /^text\/plain/);
});

test("verstuur: wat niet aankomt, blijft openstaan", async t => {
  if (!verzendenMogelijk()) return t.skip("geen verzamelpunt ingesteld");
  const m = bewaarMelding({ titel: "B", tekst: "y" });
  assert.equal(await verstuur(m, () => { throw new Error("offline"); }), false);
  assert.equal(await verstuur(m, () => antwoord("", false)), false);
  // Een inlogpagina van Google is wel een geldig antwoord, maar geen opgeslagen melding.
  assert.equal(await verstuur(m, () => antwoord("<!DOCTYPE html>")), false);
  assert.deepEqual(openstaand().map(x => x.id), [m.id]);
});

test("verstuurOpenstaand: telt wat weg is en wat blijft staan", async t => {
  if (!verzendenMogelijk()) return t.skip("geen verzamelpunt ingesteld");
  bewaarMelding({ titel: "C", tekst: "1" });
  bewaarMelding({ titel: "D", tekst: "2" });
  let n = 0;
  const uitslag = await verstuurOpenstaand(() => antwoord(++n === 1 ? '{"ok":true}' : "nee"));
  assert.deepEqual(uitslag, { gelukt: 1, mislukt: 1 });
  assert.equal(openstaand().length, 1);
});

test("verstuur: zonder ingesteld verzamelpunt gaat er geen verzoek uit", async t => {
  if (verzendenMogelijk()) return t.skip("er is een verzamelpunt ingesteld");
  const m = bewaarMelding({ titel: "A", tekst: "x" });
  let geroepen = false;
  assert.equal(await verstuur(m, () => { geroepen = true; }), false);
  assert.equal(geroepen, false);
  assert.equal(openstaand().length, 1, "de melding blijft openstaan");
});

test("een nieuwe melding staat open tot hij is aangekomen", () => {
  const m = bewaarMelding({ titel: "B", tekst: "y" });
  assert.equal(m.verstuurd, false);
  assert.deepEqual(openstaand().map(x => x.id), [m.id]);
});

test("alsTekst zegt per melding of hij verstuurd is", () => {
  bewaarMelding({ titel: "C", tekst: "z" });
  assert.match(alsTekst(), /nog niet verstuurd/);
});
