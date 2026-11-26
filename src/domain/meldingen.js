// Meldingen: fouten in een kaart of een toetsvraag, hier opgeschreven in plaats van op GitHub.
//
// Een melding opende eerst een nieuw GitHub-issue. Dat werkt alleen als je op dat moment zin hebt
// in een tabblad met een inlogpagina, en je bent de kaart die je wilde melden kwijt voordat je
// terug bent. Dit houdt het in de site: je schrijft op wat er niet klopt, de melding komt in deze
// browser te staan, en bij Instellingen staan ze op een rij om te lezen, te kopiëren of te
// downloaden. De context (module, kaart-id, les, bron) gaat automatisch mee, want zonder die
// regels is een melding achteraf niet na te trekken.
//
// Opslag is localStorage, net als de voortgang; meldingen gaan niet mee in de synchronisatie,
// want ze gaan over de inhoud van de site en niet over wat jij geleerd hebt.
const SLEUTEL = "leeromgeving:meldingen";
const MAX = 200;              // meer dan dit is geen lijst meer maar een berg

const lees = () => {
  try {
    const v = JSON.parse(localStorage.getItem(SLEUTEL) || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};
const schrijf = lijst => {
  try { localStorage.setItem(SLEUTEL, JSON.stringify(lijst.slice(0, MAX))); return true; }
  catch { return false; }
};

/** Alle meldingen, de nieuwste eerst. */
export const meldingen = () => lees();

export const aantalMeldingen = () => lees().length;

/** Een melding opschrijven. `tekst` is wat de lezer zelf typt; de rest is context. */
export function bewaarMelding({ titel, tekst, context = "", soort = "kaart", module = "", kaart = "" }) {
  const schoon = String(tekst || "").trim();
  if (!schoon) return null;
  const melding = {
    id: `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    tijd: new Date().toISOString(),
    soort, module, kaart,
    titel: String(titel || "Melding").slice(0, 160),
    context: String(context || "").slice(0, 4000),
    tekst: schoon.slice(0, 4000)
  };
  schrijf([melding, ...lees()]);
  return melding;
}

export const wisMelding = id => schrijf(lees().filter(m => m.id !== id));
export const wisMeldingen = () => schrijf([]);

/** Alle meldingen als één stuk Markdown, om te kopiëren of te downloaden. */
export function alsTekst(lijst = lees()) {
  if (!lijst.length) return "Geen meldingen.\n";
  return lijst.map(m => `## ${m.titel}\n\n*${new Date(m.tijd).toLocaleString("nl-NL")}*`
    + `${m.module ? ` · ${m.module}` : ""}\n\n${m.context ? `${m.context}\n\n` : ""}`
    + `**Wat klopt er niet?**\n\n${m.tekst}\n`).join("\n---\n\n");
}
