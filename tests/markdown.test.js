import { test } from "node:test";
import assert from "node:assert/strict";
import { markdown, slug } from "../src/domain/markdown.js";

test("koppen krijgen een id en komen in de inhoudsopgave", () => {
  const { html, koppen } = markdown("## **Les 3 – PCR en primer design**\n\n### Toets jezelf\n\n### Toets jezelf");
  assert.equal(koppen[0].tekst, "Les 3 – PCR en primer design");
  assert.equal(koppen[0].id, "les-3-pcr-en-primer-design");
  assert.equal(koppen[2].id, "toets-jezelf-2");
  assert.match(html, /<h2 id="les-3-pcr-en-primer-design">Les 3 – PCR en primer design<\/h2>/);
});

test("html in de bron wordt tekst, opmaak wordt omgezet", () => {
  const { html } = markdown("Een <script>x</script> en **vet**, *cursief* en `a*b*c`.");
  assert.ok(!html.includes("<script>"));
  assert.match(html, /<strong>vet<\/strong>/);
  assert.match(html, /<em>cursief<\/em>/);
  assert.match(html, /<code>a\*b\*c<\/code>/);
});

test("alleen http(s)-links", () => {
  assert.match(markdown("[NCBI](https://www.ncbi.nlm.nih.gov)").html, /<a href="https:\/\/www.ncbi.nlm.nih.gov" target="_blank" rel="noopener">NCBI<\/a>/);
  assert.ok(!markdown("[x](javascript:alert(1))").html.includes("<a "));
});

test("backslash-escapes uit Google Docs verdwijnen", () => {
  assert.match(markdown("DNA\\_208 en 5\\-10").html, /DNA_208 en 5-10/);
});

test("lijsten, ook genummerd en genest", () => {
  const { html } = markdown("1.  Eén\n2.  Twee\n    - a\n    - b\n3.  Drie");
  assert.equal(html, "<ol><li>Eén</li><li>Twee<ul><li>a</li><li>b</li></ul></li><li>Drie</li></ol>");
});

test("tabellen", () => {
  const { html } = markdown("| Enzym | Plek |\n| --- | --- |\n| NdeI | 484 |");
  assert.match(html, /<th scope="col">Enzym<\/th>/);
  assert.match(html, /<td>NdeI<\/td><td>484<\/td>/);
});

test("tabel uit Google Docs: lege kop, :-: scheiding, kop in eerste rij", () => {
  const { html } = markdown("|  |  |\n| :-: | :-: |\n| \\*\\*Enzym\\*\\* | \\*\\*Banden\\*\\* |\n| NdeI | 1 |\n\nNa de tabel.");
  assert.match(html, /<th scope="col">Enzym<\/th><th scope="col">Banden<\/th>/);
  assert.match(html, /<td>NdeI<\/td><td>1<\/td>/);
  assert.match(html, /<p>Na de tabel.<\/p>/);
});

test("slug is stabiel", () => assert.equal(slug("Les 14 – Van SNP naar functioneel proteïnedomein"), "les-14-van-snp-naar-functioneel-proteinedomein"));
