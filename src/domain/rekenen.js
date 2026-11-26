// Rekenvragen (#25): sjablonen met getallen die per poging anders zijn.
// Elk sjabloon geeft { vraag, antwoord, eenheid, marge (relatief), uitwerking }.
// `modules` bepaalt bij welke modules het sjabloon hoort.

const r = (rng, a, b, stap = 1) => a + Math.floor(rng() * ((b - a) / stap + 1)) * stap;
const kies = (rng, lijst) => lijst[Math.floor(rng() * lijst.length)];
export const fmt = (x, d = 2) => {
  if (!Number.isFinite(x)) return String(x);
  const abs = Math.abs(x);
  const s = abs !== 0 && (abs >= 1e5 || abs < 1e-3) ? x.toExponential(d).replace("e+", " × 10^").replace("e-", " × 10^-") : (+x.toFixed(d)).toString();
  return s.replace(".", ",");
};

export const SJABLONEN = [
  { id: "verdunning", titel: "Verdunnen (C1·V1 = C2·V2)", modules: ["biomoleculen-labveiligheid", "eiwitten-in-de-praktijk", "dna-ontrafeld", "dna-kraak-de-code", "de-cel"],
    maak(rng) {
      const c1 = kies(rng, [1, 2, 5, 10, 20, 50]), c2 = kies(rng, [0.1, 0.2, 0.25, 0.5, 1]) * (c1 >= 10 ? 1 : 0.1) * 10 / 10;
      const v2 = kies(rng, [10, 20, 25, 50, 100, 250]);
      const c2m = Math.min(c2, c1 / 2), v1 = c2m * v2 / c1;
      return { vraag: `Je hebt een stockoplossing van <b>${fmt(c1)} M</b>. Hoeveel mL stock heb je nodig voor <b>${v2} mL</b> van <b>${fmt(c2m)} M</b>?`,
        antwoord: v1, eenheid: "mL", marge: 0.02, uitwerking: `V1 = C2·V2 / C1 = ${fmt(c2m)} × ${v2} / ${fmt(c1)} = ${fmt(v1)} mL` };
    } },
  { id: "molariteit", titel: "Molariteit uit massa", modules: ["biomoleculen-labveiligheid", "eiwitten-in-de-praktijk", "de-cel"],
    maak(rng) {
      const [stof, mw] = kies(rng, [["NaCl", 58.44], ["glucose", 180.16], ["Tris", 121.14], ["KCl", 74.55], ["EDTA (dinatrium, dihydraat)", 372.24]]);
      const m = r(rng, 1, 40) / 2, v = kies(rng, [100, 250, 500, 1000]);
      const mol = m / mw / (v / 1000);
      return { vraag: `Je lost <b>${fmt(m)} g ${stof}</b> (M = ${fmt(mw)} g/mol) op tot <b>${v} mL</b>. Wat is de concentratie in mM?`,
        antwoord: mol * 1000, eenheid: "mM", marge: 0.02, uitwerking: `n = ${fmt(m)} / ${fmt(mw)} = ${fmt(m / mw, 4)} mol; c = n / V = ${fmt(m / mw, 4)} / ${fmt(v / 1000, 3)} L = ${fmt(mol * 1000)} mM` };
    } },
  { id: "a260", titel: "DNA-concentratie uit A260", modules: ["dna-ontrafeld", "dna-kraak-de-code", "biomoleculen-labveiligheid"],
    maak(rng) {
      const a = r(rng, 5, 95) / 100, verd = kies(rng, [10, 20, 50, 100]);
      const [soort, f] = kies(rng, [["dubbelstrengs DNA", 50], ["RNA", 40], ["enkelstrengs DNA", 33]]);
      const c = a * f * verd;
      return { vraag: `Een ${verd}× verdund monster ${soort} heeft A260 = <b>${fmt(a)}</b>. Wat is de concentratie van het onverdunde monster in µg/mL? (1 A260 = ${f} µg/mL)`,
        antwoord: c, eenheid: "µg/mL", marge: 0.02, uitwerking: `c = A260 × ${f} × verdunning = ${fmt(a)} × ${f} × ${verd} = ${fmt(c)} µg/mL` };
    } },
  { id: "ddct", titel: "Relatieve expressie (2^−ΔΔCt)", modules: ["dna-kraak-de-code", "dna-ontrafeld"],
    maak(rng) {
      const ctDoelB = r(rng, 220, 300) / 10, ctRefB = r(rng, 160, 200) / 10, ctDoelC = ctDoelB + r(rng, -30, 30) / 10, ctRefC = ctRefB + r(rng, -5, 5) / 10;
      const dd = (ctDoelB - ctRefB) - (ctDoelC - ctRefC), fold = Math.pow(2, -dd);
      return { vraag: `Behandeld: Ct doelgen <b>${fmt(ctDoelB, 1)}</b>, Ct referentiegen <b>${fmt(ctRefB, 1)}</b>. Controle: Ct doelgen <b>${fmt(ctDoelC, 1)}</b>, Ct referentiegen <b>${fmt(ctRefC, 1)}</b>. Wat is de fold change (2^−ΔΔCt)?`,
        antwoord: fold, eenheid: "×", marge: 0.03, uitwerking: `ΔCt behandeld = ${fmt(ctDoelB - ctRefB, 1)}; ΔCt controle = ${fmt(ctDoelC - ctRefC, 1)}; ΔΔCt = ${fmt(dd, 1)}; 2^−ΔΔCt = ${fmt(fold)}` };
    } },
  { id: "pcr-kopieen", titel: "Kopieën na PCR-cycli", modules: ["dna-ontrafeld", "dna-kraak-de-code"],
    maak(rng) {
      const n0 = kies(rng, [10, 50, 100, 500, 1000]), cycli = r(rng, 10, 30);
      const n = n0 * Math.pow(2, cycli);
      return { vraag: `Je begint met <b>${n0}</b> kopieën en doet <b>${cycli}</b> cycli met 100% efficiëntie. Hoeveel kopieën heb je dan?`,
        antwoord: n, eenheid: "kopieën", marge: 0.01, uitwerking: `N = N0 × 2^n = ${n0} × 2^${cycli} = ${fmt(n)}` };
    } },
  { id: "kopieaantal", titel: "Kopieaantal uit massa DNA", modules: ["dna-ontrafeld", "dna-kraak-de-code"],
    maak(rng) {
      const ng = kies(rng, [1, 5, 10, 25, 50, 100]), bp = kies(rng, [3000, 4500, 5400, 6000, 10000, 48502]);
      const k = ng * 6.022e23 / (bp * 650 * 1e9);
      return { vraag: `Hoeveel kopieën zitten er in <b>${ng} ng</b> van een plasmide van <b>${bp} bp</b>? (gemiddeld 650 g/mol per bp)`,
        antwoord: k, eenheid: "kopieën", marge: 0.02, uitwerking: `kopieën = ng × 6,022·10²³ / (bp × 650 × 10⁹) = ${fmt(k)}` };
    } },
  { id: "kve", titel: "KVE/mL uit een verdunningsreeks", modules: ["de-cel", "biomoleculen-labveiligheid"],
    maak(rng) {
      const kol = r(rng, 30, 280), verd = kies(rng, [1e3, 1e4, 1e5, 1e6, 1e7]), vol = kies(rng, [0.1, 0.2, 1]);
      const kve = kol / (vol * (1 / verd));
      return { vraag: `Op de plaat van de <b>10^-${Math.log10(verd)}</b>-verdunning tel je <b>${kol}</b> kolonies; je hebt <b>${fmt(vol)} mL</b> uitgeplaat. Hoeveel KVE/mL zat er in het oorspronkelijke monster?`,
        antwoord: kve, eenheid: "KVE/mL", marge: 0.02, uitwerking: `KVE/mL = kolonies / (volume × verdunning) = ${kol} / (${fmt(vol)} × 10^-${Math.log10(verd)}) = ${fmt(kve)}` };
    } },
  { id: "generatietijd", titel: "Generatietijd", modules: ["de-cel"],
    maak(rng) {
      const n0 = kies(rng, [1e3, 1e4, 1e5]), t = kies(rng, [60, 90, 120, 180, 240]), g = r(rng, 3, 8);
      const nt = n0 * Math.pow(2, g), gt = t / g;
      return { vraag: `Een cultuur groeit in <b>${t} minuten</b> van <b>${fmt(n0)}</b> naar <b>${fmt(nt)}</b> cellen. Wat is de generatietijd in minuten?`,
        antwoord: gt, eenheid: "min", marge: 0.02, uitwerking: `n = log2(${fmt(nt)} / ${fmt(n0)}) = ${g} generaties; g = ${t} / ${g} = ${fmt(gt)} min` };
    } },
  { id: "henderson", titel: "Buffer: Henderson-Hasselbalch", modules: ["biomoleculen-labveiligheid", "de-cel", "eiwitten-in-de-praktijk"],
    maak(rng) {
      const [zuur, pka] = kies(rng, [["azijnzuur", 4.76], ["Tris", 8.07], ["fosfaat (H₂PO₄⁻)", 7.21], ["HEPES", 7.5]]);
      const base = r(rng, 1, 20) / 10, z = r(rng, 1, 20) / 10;
      const ph = pka + Math.log10(base / z);
      return { vraag: `Een ${zuur}-buffer (pKa = ${fmt(pka)}) bevat <b>${fmt(base)} M</b> base en <b>${fmt(z)} M</b> zuur. Wat is de pH?`,
        antwoord: ph, eenheid: "", marge: 0.005, uitwerking: `pH = pKa + log([base]/[zuur]) = ${fmt(pka)} + log(${fmt(base)}/${fmt(z)}) = ${fmt(ph)}` };
    } },
  { id: "lambert-beer", titel: "Lambert-Beer", modules: ["biomoleculen-labveiligheid", "eiwitten-in-de-praktijk", "de-cel"],
    maak(rng) {
      const eps = kies(rng, [6220, 15400, 43824, 1.5e4]), a = r(rng, 10, 150) / 100, l = 1;
      const c = a / (eps * l) * 1e6;
      return { vraag: `A = <b>${fmt(a)}</b>, ε = <b>${fmt(eps, 0)} M⁻¹·cm⁻¹</b>, weglengte 1 cm. Wat is de concentratie in µM?`,
        antwoord: c, eenheid: "µM", marge: 0.02, uitwerking: `c = A / (ε·l) = ${fmt(a)} / ${fmt(eps, 0)} = ${fmt(c / 1e6, 6)} M = ${fmt(c)} µM` };
    } },
  { id: "kalibratielijn", titel: "Concentratie uit een kalibratielijn", modules: ["eiwitten-in-de-praktijk", "de-cel", "biomoleculen-labveiligheid"],
    maak(rng) {
      const a = r(rng, 20, 90) / 1000, b = r(rng, 0, 50) / 1000, y = r(rng, 20, 90) / 100;
      const x = (y - b) / a;
      return { vraag: `De kalibratielijn is <b>y = ${fmt(a, 3)}x + ${fmt(b, 3)}</b> (y = absorptie, x in µg/mL). Je monster heeft A = <b>${fmt(y)}</b>. Wat is de concentratie in µg/mL?`,
        antwoord: x, eenheid: "µg/mL", marge: 0.02, uitwerking: `x = (y − b) / a = (${fmt(y)} − ${fmt(b, 3)}) / ${fmt(a, 3)} = ${fmt(x)} µg/mL` };
    } },
  { id: "ligatie", titel: "Ligatie: hoeveelheid insert", modules: ["dna-kraak-de-code", "dna-ontrafeld"],
    maak(rng) {
      const vng = kies(rng, [25, 50, 100]), vbp = kies(rng, [3000, 4000, 5400]), ibp = kies(rng, [500, 800, 1000, 1500, 2000]), ratio = kies(rng, [1, 3, 5]);
      const ing = vng * ibp / vbp * ratio;
      return { vraag: `Je ligeert <b>${vng} ng</b> vector (${vbp} bp) met een insert van ${ibp} bp in een molaire verhouding insert:vector = <b>${ratio}:1</b>. Hoeveel ng insert heb je nodig?`,
        antwoord: ing, eenheid: "ng", marge: 0.02, uitwerking: `ng insert = ng vector × (bp insert / bp vector) × ${ratio} = ${vng} × ${ibp}/${vbp} × ${ratio} = ${fmt(ing)} ng` };
    } },
  { id: "standaarddeviatie", titel: "Gemiddelde en variatiecoëfficiënt", modules: ["biomoleculen-labveiligheid", "de-cel"],
    maak(rng) {
      const n = 4, xs = Array.from({ length: n }, () => r(rng, 80, 120) / 10);
      const gem = xs.reduce((s, x) => s + x, 0) / n;
      const sd = Math.sqrt(xs.reduce((s, x) => s + (x - gem) ** 2, 0) / (n - 1));
      return { vraag: `Metingen: <b>${xs.map(x => fmt(x, 1)).join("; ")}</b>. Wat is de variatiecoëfficiënt (VC = s / gemiddelde × 100%)?`,
        antwoord: sd / gem * 100, eenheid: "%", marge: 0.03, uitwerking: `gemiddelde = ${fmt(gem, 3)}; s (n−1) = ${fmt(sd, 3)}; VC = ${fmt(sd / gem * 100)}%` };
    } }
];

export const sjablonenVoor = moduleId => SJABLONEN.filter(s => s.modules.includes(moduleId));

// "1,5", "1.5", "1,5e3", "1,5 × 10^3" en "1 500" worden allemaal begrepen.
export function leesGetal(s) {
  let t = String(s ?? "").trim().replace(/\s+/g, "").replace(/×10\^/i, "e").replace(/x10\^/i, "e").replace(/\*10\^/, "e");
  if (/,\d/.test(t) && /\.\d{3}/.test(t)) t = t.replace(/\./g, "");
  t = t.replace(",", ".");
  const x = Number(t);
  return t && Number.isFinite(x) ? x : NaN;
}
export const goedGerekend = (invoer, antwoord, marge) => {
  const x = leesGetal(invoer);
  if (!Number.isFinite(x)) return false;
  return Math.abs(x - antwoord) <= Math.max(Math.abs(antwoord) * marge, 1e-9);
};
