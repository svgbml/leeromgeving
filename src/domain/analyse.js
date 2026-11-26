// Hoe je labresultaten uitwerkt: welk stappenplan en welke formules bij een sessie horen.
//
// De handleidingen schrijven zelden op hoe je de uitkomst verwerkt; dat moet je zelf weten. Dit
// bestand koppelt een labsessie aan de recepten in data/analyse-recepten.json op de woorden die
// in de sessie voorkomen — de experimentnamen, de apparatuur en de protocoltekst. Zo staat er
// een stappenplan voor een techniek die je echt doet, en niet voor een techniek die niet in de
// sessie zit. Het blijft een suggestie: de eis is wat de handleiding en de rubric zeggen.
import { experimentenVan, apparatuurVan } from "./lab.js";

const norm = s => String(s ?? "").toLowerCase();

// Alles waar herkenningswoorden in gezocht worden. De protocoltekst is optioneel: die is er niet
// voor elke sessie, en zonder die tekst vinden de experimentnamen vaak al de juiste techniek.
export function sessieTekst(sessie, protocoltekst = "") {
  const exps = experimentenVan(sessie);
  return [
    sessie?.titel || "",
    ...exps.map(e => e.naam || ""),
    ...apparatuurVan(sessie),
    ...exps.flatMap(e => e.apparatuur || []),
    ...exps.flatMap(e => e.stoffen || []),
    protocoltekst
  ].join("\n");
}

// De recepten die bij deze tekst passen, de best passende eerst. Een recept telt mee zodra één
// herkenningswoord voorkomt; de volgorde is het aantal verschillende woorden dat raakt, omdat een
// techniek die vijf keer wordt aangeraakt eerder de hoofdzaak is dan een techniek met één woord.
export function herkenTechnieken(recepten = [], tekst = "", max = 4) {
  const hooi = norm(tekst);
  return (Array.isArray(recepten) ? recepten : [])
    .map(r => ({ recept: r, treffers: [...new Set((r.herkenning || []).filter(w => w && hooi.includes(norm(w))))] }))
    .filter(x => x.treffers.length)
    .sort((a, b) => b.treffers.length - a.treffers.length || a.recept.id.localeCompare(b.recept.id))
    .slice(0, max);
}
