// Samenhang tussen de vleugels (OVERHAUL.md > B5): wat er per module open staat, hoe ver je per
// vleugel bent, en zoeken over alle vleugels heen. Puur, zodat tests/samenhang.test.js dit
// zonder browser kan nalopen.
//
// Stap 5.1 vraagt om één tijdlijn met herhalingen, labsessies, inleverdata en PPO-deadlines.
// Een tijdlijn kan hier niet: er zijn geen datums. Geen van de 582 opgehaalde Brightspace-items
// heeft er een, en het PPO-document noemt alleen fases en periodes. Wat wél kan is de vraag
// waar een tijdlijn voor bedoeld was — "wat moet ik nog doen?" — per vleugel beantwoorden. Dat
// is wat deze module berekent; de schermen zeggen erbij dat de ordening niet op datum is.
import { experimentenVan, sessiesVan, sessieSleutel, expSleutel } from "./lab.js";
import { opdrachtenVan } from "./project.js";
import { teltAlsBewijs } from "./ppo.js";

// ---------- stand per vleugel (5.2) ----------

// Theorie: beheerste kaarten. Komt uit moduleSummary, dus hier alleen doorgeven.
const deel = (gedaan, totaal) => ({
  gedaan, totaal, pct: totaal ? Math.round(gedaan / totaal * 100) : null
});

export function labStand(lab, vinkjesVanModule = {}) {
  const sessies = sessiesVan(lab);
  let totaal = 0, gedaan = 0;
  for (const s of sessies) {
    const gezet = vinkjesVanModule[sessieSleutel(s)] || {};
    for (const e of experimentenVan(s)) {
      totaal++;
      if (gezet[expSleutel(e)]) gedaan++;
    }
  }
  return { ...deel(gedaan, totaal), sessies: sessies.length };
}

export function projectStand(project, statusVanModule = {}) {
  const opdrachten = opdrachtenVan(project).filter(o => !o.herkansing);
  const af = opdrachten.filter(o => teltAlsBewijs(statusVanModule[o.id])).length;
  return { ...deel(af, opdrachten.length), herkansingen: opdrachtenVan(project).length - opdrachten.length };
}

/** De drie vleugels van één module naast elkaar, plus één getal over de hele module.
 *
 * Het totaal is niet het gemiddelde van de percentages: een module met 400 kaarten en 6
 * opdrachten zou dan voor de helft op die 6 opdrachten leunen. Het telt de onderdelen op, zodat
 * het getal zegt welk deel van al je werk in deze module klaar is. Vleugels zonder werk
 * (lab nog niet omgezet, module zonder project) doen niet mee in plaats van als 0% te tellen.
 */
export function moduleStand({ theorie, lab, project }) {
  const delen = { theorie, lab, project };
  let gedaan = 0, totaal = 0;
  const meegeteld = [];
  for (const [naam, d] of Object.entries(delen)) {
    if (!d || !d.totaal) continue;
    gedaan += d.gedaan;
    totaal += d.totaal;
    meegeteld.push(naam);
  }
  return { ...delen, samen: { ...deel(gedaan, totaal), vleugels: meegeteld } };
}

// ---------- open werk (5.1) ----------

/** Wat er in deze module buiten de theorie nog open staat.
 *
 * `herhalen` komt van de kaartenkant en wordt alleen doorgegeven, zodat een scherm alle vier de
 * getallen uit één bron kan halen. Een vleugel zonder data levert 0 en geen onzin.
 */
export function openWerk({ modId, titel, herhalen = 0, lab, project, vinkjes = {}, status = {} }) {
  const l = labStand(lab, vinkjes[modId] || {});
  const p = projectStand(project, status[modId] || {});
  return {
    modId,
    titel,
    herhalen,
    labSessies: l.sessies,
    labOpen: Math.max(0, l.totaal - l.gedaan),
    projectOpen: Math.max(0, p.totaal - p.gedaan),
    projectTotaal: p.totaal,
    // Of er iets te doen is. Labsessies zonder afvinklijst tellen niet als werk: dan is er geen
    // uitwerking om bij te houden.
    iets: Boolean(herhalen || (l.totaal - l.gedaan) || (p.totaal - p.gedaan))
  };
}

// Pijlers zonder bewijs dat binnen is. PPO is modulevrij, dus dit staat los van de modules.
export function ppoOpen(perPijler = []) {
  const leeg = perPijler.filter(p => !p.binnen.length);
  return { leeg: leeg.map(p => p.pijler.naam), totaal: perPijler.length };
}

// ---------- zoeken over alle vleugels (5.3) ----------

const normaliseer = s => String(s || "").toLowerCase()
  .normalize("NFKD").replace(/[̀-ͯ]/g, "");

const raakt = (term, ...velden) => velden.some(v => normaliseer(v).includes(term));

/** Zoekt buiten de theorie: labsessies, stoffen, projecten, opdrachten, PPO-pijlers en -fases.
 *
 * De theoriekant heeft zijn eigen zoekveld op Begrippen en wordt hier niet overgedaan; deze
 * functie vult dat aan. Elk resultaat draagt zijn route, zodat het scherm er een link van maakt
 * zonder te hoeven weten waar iets hoort.
 *
 * `bron` is { modules: [{id,titel}], lab: {modId: data}, project: {modId: data}, ppo }.
 */
export function zoekBuitenTheorie(term, bron = {}, max = 8) {
  const t = normaliseer(term).trim();
  if (t.length < 2) return [];
  const uit = [];
  const titelVan = new Map((bron.modules || []).map(m => [m.id, m.titel]));

  for (const [modId, lab] of Object.entries(bron.lab || {})) {
    sessiesVan(lab).forEach((s, i) => {
      if (raakt(t, s.titel)) {
        uit.push({ vleugel: "lab", wat: "labsessie", titel: s.titel, modId,
          module: titelVan.get(modId) || modId, route: "lab/protocollen", params: { sessie: i } });
      }
      for (const stof of s.stoffen || []) {
        // Stof-id's zijn sleutels met streepjes ("natrium-hydroxide"); daarom ook zonder.
        if (raakt(t, stof, stof.replace(/-/g, " "))) {
          uit.push({ vleugel: "lab", wat: "stof", titel: stof.replace(/-/g, " "), modId,
            module: titelVan.get(modId) || modId, route: "lab/stoffen", params: { sel: "sessie", sessie: i } });
          break;
        }
      }
    });
  }

  for (const [modId, project] of Object.entries(bron.project || {})) {
    for (const p of (project?.projecten || [])) {
      if (raakt(t, p.naam)) {
        uit.push({ vleugel: "project", wat: "project", titel: p.naam, modId,
          module: titelVan.get(modId) || modId, route: "project/verhaal", params: {} });
      }
    }
    for (const o of opdrachtenVan(project)) {
      if (raakt(t, o.titel)) {
        uit.push({ vleugel: "project", wat: o.herkansing ? "herkansing" : "opdracht", titel: o.titel, modId,
          module: titelVan.get(modId) || modId, route: "project/opdrachten", params: {} });
      }
    }
  }

  for (const p of (bron.ppo?.pijlers || [])) {
    if (raakt(t, p.naam, p.vraag)) {
      // PPO is modulevrij: geen modId, dus een gewone link volstaat.
      uit.push({ vleugel: "ppo", wat: "pijler", titel: p.naam, modId: null, module: "PPO",
        route: "ppo/eisen", params: {} });
    }
  }
  for (const f of (bron.ppo?.fases || [])) {
    if (raakt(t, f.titel, f.centrale_vraag, f.beoordeling)) {
      uit.push({ vleugel: "ppo", wat: `jaar ${f.jaar}`, titel: f.titel, modId: null, module: "PPO",
        route: "ppo/eisen", params: { jaar: f.jaar } });
    }
  }

  // Dubbels eruit: dezelfde titel in dezelfde vleugel en module is één treffer.
  const gezien = new Set();
  return uit.filter(r => {
    const k = `${r.vleugel}|${r.module}|${r.titel}`;
    if (gezien.has(k)) return false;
    gezien.add(k);
    return true;
  }).slice(0, max);
}
