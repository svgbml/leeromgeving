// Vaste waarden voor de hele app.

// Waar een melding ("Meld een fout") naartoe gaat. Een Google Apps Script web-app die er een
// regel bij zet in een Google Sheet; tools/meldingen-appsscript.gs is dat script en legt uit
// hoe je het inricht. Leeg betekent: niet ingesteld, meldingen blijven dan alleen in de
// browser van de melder staan (en zijn dus alleen te lezen als die ze doorstuurt).
// De URL staat in een openbare site, dus hij is geen geheim; zie het script voor wat dat betekent.
export const MELD_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxC3PA9J1J-Sy9Twz7gRLHlUPJvp8nH11Z09IJhsgkHnC2tWtsVKCyDlQFd6nGYZWN35A/exec";
export const SLEUTEL = {
  module: "leeromgeving:module",
  vleugel: "leeromgeving:vleugel",
  thema: "leeromgeving:thema",
  beweging: "leeromgeving:beweging",
  instellingen: "leeromgeving:instellingen",
  dagboek: "leeromgeving:dagboek",
  mijlpalen: "leeromgeving:mijlpalen",
  toetsdata: "leeromgeving:toetsdata",
  sync: "leeromgeving:sync",
  // De sleutel van de kluis. Staat in localStorage: je typt het wachtwoord één keer per
  // apparaat en pas "Vergrendelen" in Instellingen haalt hem weg.
  kluis: "leeromgeving:kluis",
  labvinkjes: "leeromgeving:labvinkjes",
  projectkeuze: "leeromgeving:projectkeuze",
  opdrachtstatus: "leeromgeving:opdrachtstatus",
  projectdoel: "leeromgeving:projectdoel",
  ppobewijs: "leeromgeving:ppobewijs",
  prog: id => `leeromgeving:${id}`,
  toets: id => `leeromgeving:toets:${id}`
};

// Standaardinstellingen; alles is aan te passen op de pagina Instellingen.
export const STANDAARD = {
  lettergrootte: 100,        // %
  lettertype: "plex",        // plex | atkinson | lexend
  contrast: false,           // hoog-contrastthema (#57)
  doel: 30,                  // herhalingen per dag (#14)
  retentie: 0.9,             // gewenste kans op onthouden (FSRS)
  richting: "voor",          // voor | achter | beide (#2)
  cloze: true,               // invulkaarten (#4)
  typen: false,              // antwoord typen bij omgekeerde en invulkaarten (#3)
  volgorde: "slides",        // slides | willekeurig (#10)
  norm: "lineair",           // lineair | cesuur (#22)
  cesuur: 55,
  gokcorrectie: false,
  examen: false,             // examensimulatie standaard aan (#15)
  autolinks: true,           // begrippen in uitleg linken (#12)
  videos: true               // video-uitleg tonen
};
