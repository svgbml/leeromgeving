import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { VLEUGELS, vleugelVan, routeVan, tabsVan, isVleugelRoute } from "../src/domain/vleugels.js";
import { modules } from "./helpers.js";

test("vleugelVan: zonder voorvoegsel is het theorie", () => {
  for (const r of ["vandaag", "begrippen", "flashcards", "toets", "videos", "verslag", "voortgang", "instellingen"]) {
    assert.equal(vleugelVan(r), "theorie");
  }
});

test("vleugelVan: het eerste segment is de vleugel", () => {
  assert.equal(vleugelVan("lab/stoffen"), "lab");
  assert.equal(vleugelVan("project/rubrics"), "project");
  assert.equal(vleugelVan("ppo/eisen"), "ppo");
});

test("vleugelVan: een onbekend voorvoegsel is geen vleugel", () => {
  assert.equal(vleugelVan("onzin/stoffen"), "theorie");
});

test("routeVan: bouwt het pad voor een tab in een vleugel", () => {
  // Theorie houdt zijn bestaande, voorvoegselloze paden, anders breken alle bestaande links.
  assert.equal(routeVan("theorie", "begrippen"), "begrippen");
  assert.equal(routeVan("lab", "stoffen"), "lab/stoffen");
  assert.equal(routeVan("ppo", "eisen"), "ppo/eisen");
});

test("tabsVan: elke vleugel heeft tabs en de eerste is de startpagina", () => {
  for (const [id, v] of Object.entries(VLEUGELS)) {
    assert.ok(tabsVan(id).length > 0, `${id} heeft geen tabs`);
    assert.equal(tabsVan(id)[0].id, v.tabs[0].id);
  }
});

test("tabsVan: onbekende vleugel geeft de theorietabs", () => {
  assert.deepEqual(tabsVan("onzin"), tabsVan("theorie"));
});

test("isVleugelRoute: herkent de routes die de app moet kennen", () => {
  assert.equal(isVleugelRoute("lab/stoffen"), true);
  assert.equal(isVleugelRoute("lab/bestaatniet"), false);
  assert.equal(isVleugelRoute("begrippen"), false, "theorieroutes staan al in de router");
});

test("alle vleugelroutes zijn uniek", () => {
  const alle = Object.keys(VLEUGELS).flatMap(v => tabsVan(v).map(t => routeVan(v, t.id)));
  assert.equal(new Set(alle).size, alle.length);
});

test("index.html toont precies de theorietabs uit de tabel", () => {
  // De tabs staan statisch in index.html voor het eerste beeld (geen layout shift) en worden
  // pas door JS vervangen bij een vleugelwissel. Deze test bewaakt dat die twee niet uit elkaar lopen.
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const start = html.indexOf('id="tabs-theorie"');
  assert.ok(start > 0, "index.html mist de statische theorie-tabbalk");
  const nav = html.slice(start, html.indexOf("</nav>", start));
  const inHtml = [...nav.matchAll(/data-route="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(inHtml, tabsVan("theorie").map(t => t.id));
});

// ---------- B1: de lessen zijn per vleugel gemarkeerd ----------
const overridesVan = m => {
  const pad = new URL(`../${m.bestand.replace(/\.json$/, ".overrides.json")}`, import.meta.url);
  try { return JSON.parse(readFileSync(pad, "utf8")); } catch { return {}; }
};

test("de vleugel van een les staat in de overrides, niet in de gegenereerde data", () => {
  // Anders wist opnieuw genereren uit de slides de hele indeling (zie tools/lib.js).
  for (const m of modules()) {
    const d = JSON.parse(readFileSync(new URL(`../${m.bestand}`, import.meta.url), "utf8"));
    for (const l of d.lessen || []) {
      assert.equal(l.vleugel, undefined, `${m.id} les ${l.nr}: vleugel hoort in de overrides`);
    }
  }
});

test("elke gemarkeerde les wijst naar een vleugel die de module heeft", () => {
  let gemarkeerd = 0;
  for (const m of modules()) {
    for (const [nr, over] of Object.entries(overridesVan(m).lessen || {})) {
      if (!over.vleugel) continue;
      gemarkeerd++;
      assert.ok(over.vleugel in VLEUGELS, `${m.id} les ${nr}: onbekende vleugel ${over.vleugel}`);
      assert.ok(!VLEUGELS[over.vleugel].modulevrij, `${m.id} les ${nr}: ${over.vleugel} is modulevrij`);
      assert.ok(m.vleugels.includes(over.vleugel), `${m.id} les ${nr}: ${over.vleugel} staat niet in modules.json`);
    }
  }
  assert.ok(gemarkeerd > 0, "er is geen enkele les ingedeeld");
});

test("modules.json: elke module zegt welke vleugels hij heeft", () => {
  for (const m of modules()) {
    assert.ok(Array.isArray(m.vleugels) && m.vleugels.length, `${m.id} mist vleugels`);
    assert.ok(m.vleugels.includes("theorie"), `${m.id} moet in elk geval theorie hebben`);
    for (const v of m.vleugels) assert.ok(v in VLEUGELS, `${m.id}: onbekende vleugel ${v}`);
  }
});

// Sinds B4 heeft elke vleugelroute een eigen scherm. Deze test leest app.js als tekst, want
// importeren zou de hele app opstarten: dan moet er een DOM zijn. Zo valt het op zodra iemand
// een tab aan de tabel toevoegt zonder scherm, of een scherm registreert dat geen tab heeft.
test("elke route uit de vleugeltabel heeft een scherm in app.js", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const blok = app.slice(app.indexOf("const INGERICHT"), app.indexOf("for (const route of vleugelRoutes()"));
  const geregistreerd = [...blok.matchAll(/"([a-z]+\/[a-z]+)":/g)].map(m => m[1]);

  const verwacht = [];
  for (const [vleugel, v] of Object.entries(VLEUGELS)) {
    if (vleugel === "theorie") continue;  // theorie houdt zijn voorvoegselloze routes
    for (const tab of v.tabs) verwacht.push(`${vleugel}/${tab.id}`);
  }

  assert.deepEqual([...geregistreerd].sort(), [...verwacht].sort());
  assert.equal(new Set(geregistreerd).size, geregistreerd.length, "een route staat twee keer in INGERICHT");
});
