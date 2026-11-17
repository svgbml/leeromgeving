import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, rich, plain, kort, shuffle, cijfer, cijferTekst } from "../src/domain/text.js";
import { seeded } from "./helpers.js";

test("esc ontsnapt HTML", () => {
  assert.equal(esc(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  assert.equal(esc(null), "");
});

test("rich laat opmaak staan maar geen scripts of attributen", () => {
  assert.equal(rich("<b>vet</b> en <i>schuin</i><br>"), "<b>vet</b> en <i>schuin</i><br>");
  assert.equal(rich("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(rich('<b onclick="x">a</b>'), '&lt;b onclick=&quot;x&quot;&gt;a</b>');
});

test("rich laat entiteiten uit de data door", () => {
  assert.equal(rich("A &rarr; B"), "A &rarr; B");
});

test("plain haalt tags weg en zet entiteiten om, ook zonder DOM", () => {
  assert.equal(plain("<b>Na</b>Cl<br>&amp; H<sub>2</sub>O &#946; &rarr;"), "NaCl & H2O β →");
});

test("kort kapt af op een woordgrens", () => {
  assert.equal(kort("een twee drie vier", 12), "een twee…");
  assert.equal(kort("kort", 12), "kort");
});

test("shuffle behoudt alle elementen en is herhaalbaar met een seed", () => {
  const a = [1, 2, 3, 4, 5, 6];
  const x = shuffle(a, seeded(7)), y = shuffle(a, seeded(7));
  assert.deepEqual(x, y);
  assert.deepEqual([...x].sort(), a);
  assert.deepEqual(a, [1, 2, 3, 4, 5, 6]);
});

test("cijfer = 1 + 9 × punten / max", () => {
  assert.equal(cijfer(0, 10), 1);
  assert.equal(cijfer(10, 10), 10);
  assert.equal(cijferTekst(cijfer(5, 10)), "5,5");
  assert.equal(cijfer(0, 0), 1);
});
