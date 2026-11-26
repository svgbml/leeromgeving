// Doel en hypothese per labsessie en per project: suggesties uit data/doelen/<module>.json.
//
// De handleidingen schrijven het doel zelden uit en een hypothese nooit, terwijl de rubric er wel
// op beoordeelt. Deze suggesties zijn hier zelf geschreven op basis van de handleiding en de
// casus. Een vaardigheidsles heeft geen hypothese — daar staat hypothese op null en legt de
// onderbouwing uit waaraan je je eigen werk afmeet. Dat is eerlijker dan een hypothese verzinnen
// voor een les waarin niets te voorspellen valt.
export const sessieDoel = (doelen, i) =>
  (Array.isArray(doelen?.sessies) ? doelen.sessies : []).find(s => s.sessie === i) || null;

export const projectSuggestie = (doelen, projectId) =>
  (Array.isArray(doelen?.projecten) ? doelen.projecten : []).find(p => p.id === projectId) || null;
