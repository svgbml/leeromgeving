// De projectvleugel (LU3) uit <module>.project.json: de hulpjes die de zeven projectschermen
// delen. Puur, zodat tests/project.test.js ze zonder browser kan nalopen.
//
// Drie dingen uit de data bepalen hoe deze functies zich gedragen (zie _betrouwbaarheid en
// _ontbreekt in het databestand):
//  - niet elke module heeft projectkeuzes. Waar de cursus geen mappen "Project <naam>" heeft,
//    is projecten[] leeg; dat is een leeg veld en geen fout, dus niets hier doet alsof er een
//    keuze te maken valt.
//  - er zijn geen inleverdata. Geen enkel item in de bron heeft een datum, dus er is niets om
//    mee af te tellen. De schermen noemen de vorm en de herkansing, geen deadline.
//  - doel en hypothese staan niet in de bron. Die schrijf je zelf; de app bewaart ze lokaal.
import { kort } from "./text.js";

export const projectenVan = project => (Array.isArray(project?.projecten) ? project.projecten : []);
export const opdrachtenVan = project => (Array.isArray(project?.opdrachten) ? project.opdrachten : []);
export const rubricsVan = project => (Array.isArray(project?.rubrics) ? project.rubrics : []);
export const algemeenVan = project => (Array.isArray(project?.algemeen) ? project.algemeen : []);

// Het gekozen project. De bewaarde keuze is een id; bestaat die niet meer (de data is opnieuw
// gegenereerd, een map is hernoemd), dan valt hij terug op het eerste project in plaats van een
// leeg scherm te geven. Geeft null als de module geen projectkeuzes heeft.
export function kiesProject(projecten = [], id) {
  if (!projecten.length) return null;
  return projecten.find(p => p.id === id) || projecten[0];
}

// Is de bewaarde keuze nog geldig? De schermen gebruiken dit om te zeggen dát er is
// teruggevallen, zodat een stille wissel niet voor een eigen keuze wordt aangezien.
export const keuzeGeldig = (projecten = [], id) => Boolean(id) && projecten.some(p => p.id === id);

// Op welk project mag een scherm filteren? Alleen op een keuze die van jou is. kiesProject valt
// voor de wéérgave terug op het eerste project, maar daarop filteren zou de opdrachten van een
// project tonen dat je niet gekozen hebt. Heeft de module één project, dan is er niets te kiezen
// en is dat het antwoord; anders null tot je kiest.
export function keuzeId(projecten = [], gekozen) {
  if (keuzeGeldig(projecten, gekozen)) return gekozen;
  return projecten.length === 1 ? projecten[0].id : null;
}

// De opdrachten die bij dit project horen: de algemene (project: null) plus die van deze keuze.
// Een opdracht zonder project hoort bij iedereen; alleen de opdrachten van een ánder project
// vallen weg.
export function opdrachtenVoor(project, projectId) {
  return opdrachtenVan(project).filter(o => !o.project || o.project === projectId);
}

// Herkansingen horen niet in het rijtje "te doen": je komt er pas aan toe als het eerste niet
// gehaald is. Daarom apart, en niet gefilterd weg.
export const splitsHerkansingen = opdrachten => ({
  gewoon: opdrachten.filter(o => !o.herkansing),
  herkansingen: opdrachten.filter(o => o.herkansing)
});

export const STATUSSEN = ["te doen", "bezig", "ingeleverd", "beoordeeld"];
export const STANDAARD_STATUS = "te doen";

export const statusGeldig = s => STATUSSEN.includes(s);
export const volgendeStatus = s => STATUSSEN[Math.min(STATUSSEN.indexOf(s) + 1, STATUSSEN.length - 1)];

// Hoeveel opdrachten in welke status staan, voor de balk op Opdrachten en voor PPO (B4), dat
// bewijs uit "ingeleverd" haalt.
export function statusTelling(opdrachten = [], status = {}) {
  const uit = Object.fromEntries(STATUSSEN.map(s => [s, 0]));
  for (const o of opdrachten) {
    const s = statusGeldig(status[o.id]) ? status[o.id] : STANDAARD_STATUS;
    uit[s] += 1;
  }
  return { ...uit, totaal: opdrachten.length, af: uit.ingeleverd + uit.beoordeeld };
}

// De alinea's van een projectpagina, afgekapt voor een kaart. De eerste alinea is bij deze
// bron vaak de titel herhaald; die laten we staan, want weghalen raadt naar de opmaak.
export const paginasVan = p => (Array.isArray(p?.paginas) ? p.paginas : []);
export const samenvatting = (pagina, lengte = 220) =>
  kort((paginasVan(pagina)[0]?.alineas || []).join(" ") || "", lengte);

// De volgorde van de niveaus verschilt per formulier: de rapportage-rubric gaat van goed naar
// onvoldoende, het afvinkformulier Presentatie van onvoldoende naar zeer goed. "Erboven" is
// daarom niet de vorige of de volgende in de lijst, maar het eerstvolgende hogere niveau volgens
// deze woorden. Een niveau dat hier niet in staat krijgt geen rang; dan zegt niveauBoven niets
// in plaats van de verkeerde kant op te wijzen.
const RANG = new Map([
  ["onvoldoende", 0], ["matig", 1], ["voldoende", 2], ["goed", 3], ["zeer goed", 4]
]);
const rang = n => RANG.get(String(n || "").trim().toLowerCase());

// Wat mist er voor het niveau erboven? Alleen te zeggen waar de rubric per niveau een
// beschrijving heeft; het afvinkformulier heeft die niet (zie _vorm), dus daar komt het niveau
// wel terug en de tekst niet, in plaats van dat er iets verzonnen wordt.
export function niveauBoven(rubric, criterium, huidig) {
  const niveaus = Array.isArray(rubric?.niveaus) ? rubric.niveaus : [];
  const nu = rang(huidig);
  if (nu === undefined) return null;
  const hoger = niveaus.filter(n => rang(n) !== undefined && rang(n) > nu)
    .sort((a, b) => rang(a) - rang(b));
  const doel = hoger[0];
  if (!doel) return null;
  const tekst = criterium?.niveaus?.[doel];
  return tekst ? { niveau: doel, tekst } : { niveau: doel, tekst: null };
}
