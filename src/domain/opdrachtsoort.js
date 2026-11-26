// Welk soort opdracht is dit, en hoe maak je dat soort? De recepten staan in
// data/opdracht-recepten.json; hier staat alleen hoe een opdracht aan een recept wordt gekoppeld.
//
// De inleverlinks van de cursus geven een titel en soms een vorm, en verder niets: geen
// omschrijving, geen eisen. Op de titel is wel te zien wat voor soort werkstuk het is, en dát
// bepaalt hoe je het aanpakt. Een verslag maak je anders dan een journaal, hoe je project ook
// heet. De titel weegt zwaarder dan de vorm, want "Huiswerk statistiek" heeft vorm "opdracht"
// terwijl het een rekenopdracht is.
const norm = s => String(s ?? "").toLowerCase();

export function soortVan(recepten = [], opdracht) {
  const titel = norm(opdracht?.titel);
  const vorm = norm(opdracht?.vorm);
  let beste = null, besteScore = 0;
  for (const r of Array.isArray(recepten) ? recepten : []) {
    const treffers = (r.woorden || []).filter(w => w && titel.includes(norm(w)));
    const vormRaak = (r.vormen || []).some(v => v && norm(v) === vorm);
    // De vorm telt als halve treffer: hij beslist een gelijkspel tussen twee recepten en kan in
    // zijn eentje een recept kiezen voor een opdracht waarvan de titel niets prijsgeeft.
    const score = treffers.length + (vormRaak ? 0.5 : 0);
    if (score > besteScore) { beste = { recept: r, treffers, vormRaak }; besteScore = score; }
  }
  return beste;
}
