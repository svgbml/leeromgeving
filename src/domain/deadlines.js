// De inlever- en toetsmomenten van een module, uit <module>.deadlines.json.
//
// Deze data komt van de pagina "Activiteiten deadlines" die de opleiding per module bijhoudt.
// Niet elke regel is een datum: de tabel noemt soms een week ("week 4"), soms een les ("2 dagen
// na elke les") en soms een echte datum. Dat onderscheid is hier bewaard in het veld `soort`,
// want alleen bij `datum` valt er iets af te tellen. Een week omrekenen naar een datum zou een
// deadline verzinnen die de opleiding niet geeft, en dat is bij een assessment de duurste fout
// die deze app kan maken.
import { kort } from "./text.js";

export const activiteitenVan = d => (Array.isArray(d?.activiteiten) ? d.activiteiten : []);

export const LEERUITKOMSTEN = ["LU1", "LU2", "LU3"];

// Per leeruitkomst, in de volgorde van de tabel. Een regel zonder bekende LU komt achteraan
// onder "overig" in plaats van weg te vallen.
export function perLeeruitkomst(data) {
  const uit = new Map(LEERUITKOMSTEN.map(lu => [lu, []]));
  for (const a of activiteitenVan(data)) {
    const lu = LEERUITKOMSTEN.includes(a.lu) ? a.lu : "overig";
    if (!uit.has(lu)) uit.set(lu, []);
    uit.get(lu).push(a);
  }
  return [...uit].filter(([, rijen]) => rijen.length).map(([lu, rijen]) => ({
    lu,
    onderdeel: rijen[0]?.onderdeel || "",
    ec: rijen[0]?.ec ?? null,
    rijen
  }));
}

// Alleen de regels met een echte datum, oplopend. Hier kan wél mee gerekend worden.
export const metDatum = data => activiteitenVan(data)
  .filter(a => a.soort === "datum" && a.datum)
  .sort((a, b) => new Date(a.datum) - new Date(b.datum));

/** Hoeveel dagen tot deze datum, gerekend vanaf het begin van vandaag.
 *
 * Kalenderdagen, niet uren: een deadline om 23:59 vanavond is "vandaag" en niet "over 0,9 dag".
 * Geeft null bij een onbruikbare datum, zodat een scherm niets toont in plaats van NaN.
 */
export function dagenTot(datum, nu = new Date()) {
  const d = new Date(datum);
  if (Number.isNaN(d.getTime())) return null;
  const dag = x => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.round((dag(d) - dag(nu)) / 86400000);
}

// Hoe een termijn in woorden leest. Voor een datum telt hij af; voor een week of een les geeft
// hij terug wat de opleiding schreef, zonder er een datum van te maken.
export function termijnTekst(activiteit, nu = new Date()) {
  if (activiteit?.soort !== "datum" || !activiteit.datum) {
    return activiteit?.termijn || "geen termijn genoemd";
  }
  const n = dagenTot(activiteit.datum, nu);
  if (n === null) return activiteit.termijn || "";
  if (n < 0) return `${activiteit.termijn} — geweest`;
  if (n === 0) return `${activiteit.termijn} — vandaag`;
  if (n === 1) return `${activiteit.termijn} — morgen`;
  return `${activiteit.termijn} — over ${n} dagen`;
}

// De eerstvolgende deadline met een datum die nog niet geweest is.
export function eerstvolgende(data, nu = new Date()) {
  return metDatum(data).find(a => dagenTot(a.datum, nu) >= 0) || null;
}

// Korte regel voor een overzicht elders in de app.
export const samenvatting = (activiteit, lengte = 60) =>
  kort(`${activiteit?.lu || ""} ${activiteit?.toets || ""}`.trim(), lengte);
