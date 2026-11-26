// De opdrachtwijzer: wat er in déze opdracht gevraagd wordt en hoe je hem maakt.
//
// De recepten in data/opdracht-recepten.json gaan over het sóórt werkstuk ("een verslag maak je
// zo"). Bij een opdracht die "Opdracht 1" heet, levert dat een algemeen stappenplan op dat je
// niets vertelt wat je niet al wist. Waar de opdrachttekst zelf beschikbaar is, staat in
// data/opdrachtwijzer/<module>.json per opdracht wat er echt gevraagd wordt: de vragen, wat je
// per vraag nodig hebt en waar het bij die vraag om draait. Dat is lesmateriaal van de opleiding
// en staat daarom versleuteld in de repo (zie tools/versleutel.js).
//
// Hier staat alleen hoe een opdracht aan zijn wijzer wordt gekoppeld; de wijzer zelf is data.
const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** De wijzer bij deze opdracht: eerst op id, dan op titel. Geen wijzer → null. */
export function wijzerVoor(wijzer, opdracht) {
  const lijst = Array.isArray(wijzer?.opdrachten) ? wijzer.opdrachten : [];
  if (!lijst.length || !opdracht) return null;
  const id = String(opdracht.id || "");
  const titel = norm(opdracht.titel);
  return lijst.find(w => w.id === id)
    || lijst.find(w => (w.ook_voor || []).includes(id))
    // De titel als vangnet: de id's komen uit de inleverlinks en kunnen per cursusjaar wisselen.
    || lijst.find(w => norm(w.id) === titel || norm(w.titel).startsWith(titel))
    || null;
}

/** Hoeveel van de opdrachten een eigen uitwerking hebben; de pagina zegt dat erbij. */
export const metWijzer = (wijzer, opdrachten = []) =>
  opdrachten.filter(o => wijzerVoor(wijzer, o)).length;
