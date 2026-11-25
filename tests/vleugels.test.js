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

test("modules.json: elke module zegt welke vleugels hij heeft", () => {
  for (const m of modules()) {
    assert.ok(Array.isArray(m.vleugels) && m.vleugels.length, `${m.id} mist vleugels`);
    assert.ok(m.vleugels.includes("theorie"), `${m.id} moet in elk geval theorie hebben`);
    for (const v of m.vleugels) assert.ok(v in VLEUGELS, `${m.id}: onbekende vleugel ${v}`);
  }
});
