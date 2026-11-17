// Zet de bestaande DNA2-flashcards (decks.js uit het artifact) om naar het moduleformaat van de site.
// De inhoud wordt niet overgetypt: dit script leest het opgeslagen toolresultaat en transformeert het.
const fs = require("fs");

const RAW = process.argv[2];
const OUT = process.argv[3];

let txt = fs.readFileSync(RAW, "utf8");
const open = txt.match(/<untrusted-document-[0-9a-f]+>/);
if (!open) throw new Error("beginmarkering niet gevonden");
const close = txt.match(/<\/untrusted-document-[0-9a-f]+>/);
let js = txt.slice(open.index + open[0].length, close ? close.index : undefined);

// decks.js definieert MODULE en DECKS met const; in een functiescope evalueren en teruggeven.
const { MODULE, DECKS } = new Function(js + "\nreturn { MODULE, DECKS };")();

// Bronbestand per les (bestandsnamen uit Avans slides/Jaar 2/Periode 2).
const BRON = {
  1: ["Les_1_Voorkennis_DNA_2627_periode_1.pptx"],
  2: ["Les_2_Plasmiden_2627_periode_1_docentenversie.pptx"],
  3: ["Les_3_PCR_and_primer_design_2627_periode_1_docentenversie.pptx", "Les_3_Primer_design_2627_periode_1_docentenversie.docx"],
  4: ["Les_4_Features_en_kloneringsstrategieen_I_2627_periode_1_docentenversie.pptx", "Les_4_Michel_slides.pptx"],
  5: ["Les_5_kloneringsstrategieen_en_meer_2627_periode_1_docentenversie.pptx"],
  6: ["Les_6_Sanger_DNA_sequencing_2627_periode_1_docentenversie.pptx"],
  7: ["Les_7_hybridisatie_DNA_module_jaar_2_periode_2_docentenversie.docx"],
  8: ["Les_8_Real-time_PCR_2627_periode_1_docentenversie.pptx"],
  9: ["Les_9_NGS_sequencing_2627_periode_1_docentenversie.pptx"],
  10: [],
  11: ["Les_11_databases.pptx"],
  12: ["Les_12_BLAST.pptx"],
  13: ["Les12_phylogeny.pptx"],
  14: ["SNPs_lecture.pptx"]
};

// Alleen opmaak-tags toestaan; al het andere wordt als tekst getoond.
const TOEGESTAAN = /^(b|i|u|em|strong|br|sup|sub|ul|ol|li|p)$/i;
// HTML-entiteiten uit de bronkaarten omzetten naar echte tekens. Zonder deze stap belandt
// bijvoorbeeld "&eacute;" letterlijk in de data en toont de site "&eacute;" in plaats van "é".
const ENTITEITEN = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", shy: "",
  mdash: "—", ndash: "–", bull: "•", hellip: "…", middot: "·", prime: "′", Prime: "″",
  larr: "←", rarr: "→", harr: "↔", uarr: "↑", darr: "↓",
  times: "×", divide: "÷", minus: "−", plusmn: "±", deg: "°", micro: "µ", permil: "‰",
  le: "≤", ge: "≥", ne: "≠", asymp: "≈", equiv: "≡", infin: "∞", sum: "∑", radic: "√",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", lambda: "λ", mu: "μ",
  pi: "π", sigma: "σ", Sigma: "Σ", omega: "ω", Omega: "Ω", phi: "φ", psi: "ψ", theta: "θ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", yacute: "ý",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  agrave: "à", egrave: "è", igrave: "ì", ograve: "ò", ugrave: "ù",
  acirc: "â", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
  auml: "ä", euml: "ë", iuml: "ï", ouml: "ö", uuml: "ü", Auml: "Ä", Euml: "Ë", Ouml: "Ö", Uuml: "Ü",
  ccedil: "ç", ntilde: "ñ", szlig: "ß", oslash: "ø", aring: "å", ae: "æ",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d", sbquo: "\u201a", bdquo: "\u201e",
  laquo: "«", raquo: "»", copy: "©", reg: "®", trade: "™", euro: "€", pound: "£", frac12: "½", frac14: "¼",
  sup1: "¹", sup2: "²", sup3: "³"
};
function entiteiten(t) {
  return String(t)
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, naam) => naam in ENTITEITEN ? ENTITEITEN[naam] : m);
}
function schoon(html) {
  if (!html) return "";
  // Tags eerst opschonen, daarna pas entiteiten: anders kan "&lt;b&gt;" alsnog een tag worden.
  return entiteiten(String(html)
    .replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (m, tag, attr) => {
      if (!TOEGESTAAN.test(tag)) return "";
      return m.startsWith("</") ? `</${tag.toLowerCase()}>` : `<${tag.toLowerCase()}>`;
    })
    .replace(/\s+$/g, ""))
    .trim();
}
function platteTekst(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const begrippen = [];
const lessen = [];
let n = 0;
const gezien = new Map();
let dubbel = 0;

for (const deck of DECKS) {
  const lesTitel = `Les ${deck.nr} – ${deck.titel}`;
  lessen.push({ nr: deck.nr, titel: deck.titel, toets: deck.toets || "", aantal: (deck.kaarten || []).length });
  for (const k of deck.kaarten || []) {
    const vraag = schoon(k.v);
    const sleutel = platteTekst(vraag).toLowerCase();
    if (gezien.has(sleutel)) { dubbel++; continue; }   // identieke vraag uit een andere les overslaan
    gezien.set(sleutel, true);
    n++;
    begrippen.push({
      id: `dna-${String(n).padStart(3, "0")}`,
      module: "DNA kraak de code",
      type: "vraag",
      les: lesTitel,
      les_nr: deck.nr,
      toets: deck.toets || "",
      onderwerp: k.tag || "Overig",
      begrip: vraag,
      uitleg: schoon(k.a),
      aanvulling: "",
      bron_bestand: (BRON[deck.nr] || [])[0] || "",
      bron_slides: []
    });
  }
}

const uit = {
  id: "dna-kraak-de-code",
  titel: "DNA kraak de code",
  module: `${MODULE.naam} (${MODULE.code})`,
  periode: "Jaar 2 · Periode 2",
  jaar: 2,
  periode_nr: 2,
  kaarttype: "vraag",
  lessen,
  bronnen: Object.values(BRON).flat(),
  begrippen
};
fs.writeFileSync(OUT, JSON.stringify(uit, null, 1));
console.log(`kaarten: ${n}, dubbel overgeslagen: ${dubbel}, lessen: ${lessen.length}`);
console.log(lessen.map(l => `${l.nr}:${l.aantal}`).join(" "));
const perTag = {};
begrippen.forEach(b => perTag[b.onderwerp] = (perTag[b.onderwerp] || 0) + 1);
console.log("onderwerpen:", Object.keys(perTag).length);
