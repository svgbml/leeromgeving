// De drie vleugels per module (LU1 theorie, LU2 lab, LU3 project) plus PPO, dat modulevrij is.
// Eén tabel voor de navigatie, de router en de validatie; zie OVERHAUL.md.
//
// Theorie houdt bewust zijn voorvoegselloze paden (#/begrippen): elke bestaande link, bladwijzer,
// sneltoets en test blijft daardoor werken. De andere vleugels krijgen een segment: #/lab/stoffen.

export const VLEUGELS = {
  theorie: {
    naam: "Theorie", lu: "LU1",
    tabs: [
      { id: "vandaag", t: "Vandaag" },
      { id: "begrippen", t: "Begrippen", kort: "Lijst" },
      { id: "flashcards", t: "Flashcards", kort: "Leren" },
      { id: "toets", t: "Oefentoets", kort: "Toets" },
      // Hoort maar bij één module; app.js (PER_MODULE) verbergt de tab bij de andere.
      { id: "plasmide", t: "Plasmide", kort: "Bouwen", modules: ["dna-kraak-de-code"] },
      { id: "videos", t: "Video's", kort: "Video" },
      { id: "verslag", t: "Verslag" },
      { id: "voortgang", t: "Voortgang", kort: "Stand" }
    ]
  },
  lab: {
    naam: "Lab", lu: "LU2", lijst: "sessies",
    tabs: [
      { id: "voorbereiding", t: "Voorbereiding", kort: "Prep" },
      { id: "stoffen", t: "Stoffen" },
      { id: "protocollen", t: "Protocollen", kort: "Protocol" },
      { id: "analyse", t: "Analyse" }
    ]
  },
  project: {
    naam: "Project", lu: "LU3", lijst: "projecten",
    tabs: [
      { id: "verhaal", t: "Verhaal" },
      { id: "doel", t: "Doel & hypothese", kort: "Doel" },
      { id: "protocollen", t: "Protocollen", kort: "Protocol" },
      { id: "inleveren", t: "Inleveren" },
      { id: "rubrics", t: "Rubrics" },
      { id: "opdrachten", t: "Opdrachten" }
    ]
  },
  ppo: {
    naam: "PPO", lu: "portfolio", modulevrij: true,
    tabs: [
      { id: "eisen", t: "Eisen" },
      { id: "bewijs", t: "Bewijsstukken", kort: "Bewijs" },
      { id: "deadlines", t: "Deadlines" }
    ]
  }
};

export const STANDAARD_VLEUGEL = "theorie";

// Het eerste segment, maar alleen als het een bestaande vleugel is; anders theorie.
export function vleugelVan(route = "") {
  const kop = String(route).split("/")[0];
  return kop !== STANDAARD_VLEUGEL && kop in VLEUGELS ? kop : STANDAARD_VLEUGEL;
}

export const routeVan = (vleugel, tab) => (vleugel === STANDAARD_VLEUGEL ? tab : `${vleugel}/${tab}`);

export const tabsVan = vleugel => (VLEUGELS[vleugel] || VLEUGELS[STANDAARD_VLEUGEL]).tabs;

// De routes die B0 nieuw toevoegt: alles met een vleugelvoorvoegsel. De theorieroutes staan al
// in app.js geregistreerd en hoeven hier niet nog eens bij.
export const vleugelRoutes = () => Object.keys(VLEUGELS)
  .filter(v => v !== STANDAARD_VLEUGEL)
  .flatMap(v => tabsVan(v).map(t => routeVan(v, t.id)));

export const isVleugelRoute = route => vleugelRoutes().includes(route);

// Databestand van een vleugel, afgeleid van het theoriebestand: <id>.lab.json, <id>.project.json.
export const vleugelBestand = (theoriePad, vleugel) =>
  vleugel === STANDAARD_VLEUGEL ? theoriePad : theoriePad.replace(/\.json$/, `.${vleugel}.json`);
