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
  openstaand, verstuur, verzendenMogelijk } =
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
// MELD_ENDPOINT is leeg in de repo (de URL hoort bij de Google Sheet van de beheerder), dus
// verstuur() hoort dan niets te doen en niets stuk te maken. De weg ernaartoe wordt getest met
// een eigen fetch, zodat er geen netwerk aan te pas komt.
test("verstuur: zonder ingesteld verzamelpunt gebeurt er niets", async () => {
  const m = bewaarMelding({ titel: "A", tekst: "x" });
  let geroepen = false;
  assert.equal(await verstuur(m, () => { geroepen = true; }), false);
  assert.equal(geroepen, false, "zonder endpoint mag er geen verzoek uitgaan");
  assert.equal(verzendenMogelijk(), false);
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
