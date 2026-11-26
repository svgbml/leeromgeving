// Vaste waarden voor de hele app.
export const REPO = "https://github.com/svgbml/leeromgeving";
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
