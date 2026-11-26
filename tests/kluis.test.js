// De kluis: wat Node versleutelt, moet de browser kunnen ontsleutelen. Die twee kanten gebruiken
// verschillende bibliotheken (node:crypto en WebCrypto), dus dat is precies wat hier getest wordt.
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { sleutelUit, versleutel, nieuwWachtwoord, ITERATIES, CONTROLEZIN } from "../tools/versleutel.js";

const b64 = s => Uint8Array.from(Buffer.from(s, "base64"));

// Dezelfde stappen als src/core/kluis.js, met WebCrypto.
async function ontsleutelAlsBrowser(wachtwoord, zout, iteraties, blob) {
  const basis = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(wachtwoord), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(zout), iterations: iteraties, hash: "SHA-256" },
    basis, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const ruw = b64(blob);
  const plat = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ruw.slice(0, 12) }, key, ruw.slice(12));
  return new TextDecoder().decode(plat);
}

test("wat Node versleutelt, ontsleutelt de browser", async () => {
  const zout = randomBytes(16);
  const tekst = "## Labveiligheid\n\nEen protocol met accenten: één, ëé, µL.\n";
  const blob = versleutel(sleutelUit("wachtzin-met-streepjes-1234", zout), Buffer.from(tekst, "utf8"));
  const terug = await ontsleutelAlsBrowser("wachtzin-met-streepjes-1234", zout.toString("base64"), ITERATIES, blob);
  assert.equal(terug, tekst);
});

test("een fout wachtwoord ontsleutelt niet", async () => {
  const zout = randomBytes(16);
  const blob = versleutel(sleutelUit("goed-wachtwoord", zout), Buffer.from("geheim", "utf8"));
  await assert.rejects(() => ontsleutelAlsBrowser("fout-wachtwoord", zout.toString("base64"), ITERATIES, blob));
});

test("elk bestand krijgt zijn eigen IV", () => {
  const sleutel = sleutelUit("x", randomBytes(16));
  const a = versleutel(sleutel, Buffer.from("zelfde tekst"));
  const b = versleutel(sleutel, Buffer.from("zelfde tekst"));
  assert.notEqual(a, b, "tweemaal dezelfde ruis betekent een hergebruikte IV");
});

test("het manifest in de repo klopt met de bestanden ernaast", { skip: !existsSync("data/beveiligd/manifest.json") }, () => {
  const m = JSON.parse(readFileSync("data/beveiligd/manifest.json", "utf8"));
  assert.equal(m.afleiding.algoritme, "PBKDF2-SHA256");
  assert.ok(m.afleiding.iteraties >= 100000, "te weinig iteraties voor een openbaar bestand");
  assert.ok(m.controle, "zonder controlezin kan de app een fout wachtwoord niet herkennen");
  assert.ok(Object.keys(m.bestanden).length > 0);
  for (const [bron, doel] of Object.entries(m.bestanden)) {
    assert.ok(existsSync(doel), `${bron}: ${doel} ontbreekt`);
    // De naam mag de titel van de handleiding niet verraden.
    assert.match(doel, /^data\/beveiligd\/[0-9a-f]{20}\.enc$/);
  }
  assert.equal(CONTROLEZIN, "leeromgeving-bml");
});

test("het gemaakte wachtwoord is sterk genoeg voor openbare ruis", () => {
  // De versleutelde bestanden staan openbaar, dus het wachtwoord moet een offline aanval
  // overleven. Vijf woorden uit een lijst van vijftien is ~20 bits; daar moet genoeg toeval
  // achter zitten om samen boven de 80 uit te komen.
  const w = nieuwWachtwoord();
  const [woorden, toeval] = [w.split("-").slice(0, 5), w.split("-").at(-1)];
  assert.equal(woorden.length, 5);
  assert.match(toeval, /^[0-9a-f]{16}$/, "minstens 64 bits toeval achter de woorden");
  const bits = Math.log2(15 ** 5) + 64;
  assert.ok(bits > 80, `${bits.toFixed(1)} bits is te weinig`);
  // En twee keer vragen geeft niet twee keer hetzelfde.
  assert.notEqual(nieuwWachtwoord(), w);
});
