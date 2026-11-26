// PPO (Professionele en Persoonlijke Ontwikkeling) uit data/ppo/ppo.json: de hulpjes die Eisen,
// Bewijsstukken en Deadlines delen. Puur, zodat tests/ppo.test.js ze zonder browser kan nalopen.
//
// PPO is modulevrij: het loopt over alle modules en jaren heen. Dat bepaalt twee dingen hier:
//  - bewijs komt uit álle modules samen, niet uit de module die bovenaan de app staat;
//  - een bewijsstuk wordt bewaard als "<module>:<opdracht>", zodat twee modules met dezelfde
//    opdrachtnaam elkaar niet overschrijven.
//
// Wat de bron NIET heeft (zie _ontbreekt in het databestand): een koppeling tussen een eis en
// een opdracht, en inleverdata. De opleiding zegt wélke soorten bewijs meetellen, niet welk
// bewijs bij welke pijler hoort. Die keuze is dus aan jou en wordt lokaal bewaard; dit bestand
// verzint er geen.

export const pijlersVan = ppo => (Array.isArray(ppo?.pijlers) ? ppo.pijlers : []);
export const fasesVan = ppo => (Array.isArray(ppo?.fases) ? ppo.fases : []);
export const bewijssoortenVan = ppo => (Array.isArray(ppo?.portfolio?.bewijssoorten) ? ppo.portfolio.bewijssoorten : []);
export const portfoliovormenVan = ppo => (Array.isArray(ppo?.portfolio?.vormen) ? ppo.portfolio.vormen : []);

// De fase van een studiejaar. Geen jaar gekozen of een jaar dat de bron niet kent: dan null,
// zodat een scherm kan zeggen dat het die fase niet heeft in plaats van de eerste te tonen.
export const faseVanJaar = (ppo, jaar) =>
  fasesVan(ppo).find(f => f.jaar === Number(jaar)) || null;

// Een statuswaarde geldt als bewijs zodra het werk de deur uit is. "bezig" is dat niet: dan heb
// je nog niets om te laten zien.
export const BEWIJS_STATUSSEN = ["ingeleverd", "beoordeeld"];
export const teltAlsBewijs = status => BEWIJS_STATUSSEN.includes(status);

// De sleutel waaronder een bewijsstuk wordt bewaard. Module erbij, want opdracht-id's zijn per
// module uniek en niet daarbuiten ("labjournaal" bestaat in meerdere modules).
export const bewijsSleutel = (modId, opdrachtId) => `${modId}:${opdrachtId}`;
export const splitsSleutel = sleutel => {
  const i = String(sleutel || "").indexOf(":");
  return i < 0 ? { modId: "", opdrachtId: "" } : { modId: sleutel.slice(0, i), opdrachtId: sleutel.slice(i + 1) };
};

/** Alle opdrachten van alle modules als één lijst, met hun status.
 *
 * `perModule` is { modId: projectdata } en `statussen` is { modId: { opdrachtId: status } },
 * precies zoals de store ze bewaart. Een module zonder projectdata levert niets op in plaats
 * van een fout.
 */
export function alleOpdrachten(perModule = {}, statussen = {}, modules = []) {
  const titelVan = new Map(modules.map(m => [m.id, m.titel]));
  const uit = [];
  for (const [modId, data] of Object.entries(perModule)) {
    for (const o of (Array.isArray(data?.opdrachten) ? data.opdrachten : [])) {
      const status = statussen[modId]?.[o.id] || "te doen";
      uit.push({
        sleutel: bewijsSleutel(modId, o.id),
        modId,
        moduleTitel: titelVan.get(modId) || modId,
        opdrachtId: o.id,
        titel: o.titel,
        vorm: o.vorm || null,
        herkansing: Boolean(o.herkansing),
        status,
        telt: teltAlsBewijs(status)
      });
    }
  }
  return uit;
}

/** Het bewijs per pijler, met wat er al binnen is en wat nog niet.
 *
 * `gekoppeld` is { pijlerId: { "<module>:<opdracht>": true } }. Een koppeling naar een opdracht
 * die niet meer bestaat (de data is opnieuw gegenereerd) verdwijnt niet stil: hij komt terug in
 * `verdwenen`, zodat het scherm erover kan vertellen in plaats van stil minder te tonen.
 */
export function bewijsPerPijler(pijlers = [], gekoppeld = {}, opdrachten = []) {
  const opSleutel = new Map(opdrachten.map(o => [o.sleutel, o]));
  return pijlers.map(p => {
    const sleutels = Object.keys(gekoppeld[p.id] || {}).filter(k => gekoppeld[p.id][k]);
    const gevonden = sleutels.filter(k => opSleutel.has(k)).map(k => opSleutel.get(k));
    return {
      pijler: p,
      gekoppeld: gevonden,
      // Automatisch afgevinkt: deze staan op ingeleverd of beoordeeld (B4, stap 4.3).
      binnen: gevonden.filter(o => o.telt),
      onderweg: gevonden.filter(o => !o.telt),
      verdwenen: sleutels.filter(k => !opSleutel.has(k))
    };
  });
}

// Hoeveel pijlers hebben al minstens één bewijsstuk binnen? Dat is de stand die PPO zelf
// hanteert: het portfolio is geen cijfer, maar je wilt wel zien of een pijler nog leeg is.
export function pijlerStand(perPijler = []) {
  const gevuld = perPijler.filter(p => p.binnen.length);
  return {
    gevuld: gevuld.length,
    totaal: perPijler.length,
    leeg: perPijler.filter(p => !p.gekoppeld.length).map(p => p.pijler.naam)
  };
}

// Wanneer een fase beoordeeld wordt, voor zover de bron dat zegt. Er staan geen datums in, dus
// dit is de tekst van de opleiding en geen deadline om op af te tellen.
export const beoordelingVan = fase => (fase?.beoordeling || "").trim();
export const heeftDatums = ppo => fasesVan(ppo).some(f => f.datum || f.deadline);
