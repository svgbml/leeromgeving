// Oefentoets-generator. Opgezet naar het model van de officiële Remindo-oefentoetsen:
// punten per vraag, casussen met deelvragen A/B/C/D, open vragen met puntenschaal.
// Pure logica: krijgt de moduledata en een weegfunctie mee, raakt geen DOM of opslag aan.
import { plain, kort, shuffle, woorden } from "./text.js";
import { sjablonenVoor, goedGerekend } from "./rekenen.js";

export const MIX_STD = { mc: 45, open: 25, casus: 15, koppel: 8, volgorde: 4, rekenen: 3, aanwijs: 4 };
export const TYPEN = ["mc", "open", "casus", "koppel", "volgorde", "rekenen", "aanwijs"];
export const TYPENAAM = { mc: "Meerkeuze", open: "Open vraag", casus: "Casus", koppel: "Koppelen", volgorde: "Volgorde", rekenen: "Rekenen", aanwijs: "Aanwijzen" };
export const LETTERS = "ABCDEFGH";
export const GEEN = "__geenvan__";
export const VAAG = /^(deel|onderdeel|opgave|overig|algemeen|inleiding|diversen)\b/i;
export const META = /^(opzet|toets(ing|en)?|organisatie|planning|beoordeling|rooster)\b/i;

// Kaarten over de organisatie van de module (aantal lessen, toetsdata, huiswerk, inloggen)
// horen niet in een toets of flashcardsessie. Ze zijn gemarkeerd met "lesinfo": true
// (zie tools/markeer_lesinfo.py); onderwerpen als "Opzet" of "Toetsing" vallen ook af.
export const toetsbaar = b => !!b && !b.lesinfo && !META.test(b.onderwerp || "");

const termVan = b => plain(b.begrip).toLowerCase().replace(/\s*\(.*\)\s*/g, "").trim();

// Begrip wegstrepen in de uitleg, voor de invulvraag.
export function mask(b) {
  const parts = b.begrip.replace(/\(([^)]+)\)/g, ",$1,").split(/[,\/=+–]| en | of /).map(s => s.trim()).filter(s => s.length >= 3);
  let t = b.uitleg;
  for (const p of parts.sort((a, c) => c.length - a.length)) t = t.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "_______");
  return t;
}

// Het antwoordmodel opsplitsen in kernpunten; elk kernpunt is één punt waard (maximaal vier).
export function kernpunten(b) {
  let delen = b.uitleg
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "||")
    .replace(/<\/li>/gi, "||").replace(/<li>/gi, "")
    .replace(/<br\s*\/?>\s*(?=[•\-–])/gi, "||")
    .split("||").map(s => s.trim()).filter(Boolean);
  if (delen.length < 2) {
    // Eén blok: op zinnen splitsen, korte stukjes weer aan de vorige zin plakken.
    const zinnen = b.uitleg.split(/(?<=[.!?])\s+(?=[A-Z0-9“„'"<])/).map(s => s.trim()).filter(Boolean);
    delen = [];
    for (const z of zinnen) {
      if (delen.length && plain(z).length < 30) delen[delen.length - 1] += " " + z;
      else delen.push(z);
    }
  }
  delen = delen.map(s => s.replace(/^<\/?(ul|ol)>/gi, "").replace(/<\/?(ul|ol)>$/gi, "").replace(/^[•\-–]\s*/, "").replace(/<br\s*\/?>/gi, " ").trim()).filter(s => plain(s).length > 2);
  if (delen.length > 4) {
    const per = Math.ceil(delen.length / 4), samen = [];
    for (let i = 0; i < delen.length; i += per) samen.push(delen.slice(i, i + per).join(" "));
    delen = samen;
  }
  if (!delen.length) delen = [b.uitleg];
  return delen.slice(0, 4);
}

// Stappen van een procedure (#23): alleen een genummerde lijst (<ol>) in de uitleg, met echte zinnetjes.
// De meeste volgordevragen komen uit data/volgordes.json (zelf geschreven procedures per module).
const lijstItems = html => [...html.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m => m[1]);
export function stappen(b) {
  const ol = (b.uitleg || "").match(/<ol>([\s\S]*?)<\/ol>/i);
  if (!ol) return [];
  const items = lijstItems(ol[1]).map(x => kort(x, 140).replace(/^(stap\s*)?\d+[.):]\s*/i, ""));
  const zin = x => (x.match(/\p{L}{2,}/gu) || []).length >= 3;
  return items.length >= 3 && items.length <= 6 && items.every(zin) && new Set(items).size === items.length ? items : [];
}

// Hulp bij open vragen (#21): welke inhoudswoorden van elk kernpunt staan in het getypte antwoord?
// Woorden tellen als gevonden bij een gelijk begin van vijf letters (meervoud, vervoeging).
export function kernHints(kern, tekst) {
  const stam = w => w.slice(0, 5);
  const mijnStam = new Set(woorden(tekst).map(stam));
  return kern.map(k => {
    const ws = [...new Set(woorden(k))];
    const gevonden = ws.filter(w => mijnStam.has(stam(w)));
    return { gevonden, dekking: ws.length ? gevonden.length / ws.length : 0, voorstel: ws.length > 0 && gevonden.length / ws.length >= 0.5 };
  });
}

// Afleiders rangschikken (#20, #71): hetzelfde onderwerp, dezelfde les en overlappende woorden eerst.
// Ook gebruikt door tools/build.js om de lijst vooraf te berekenen.
export function rangschikAfleiders(alle, b, n = 12, sets = null) {
  const set = x => sets?.get(x.id) || new Set(woorden(`${x.begrip} ${x.uitleg}`));
  const mijn = set(b);
  const uitleg = plain(b.uitleg).toLowerCase();
  const scores = [];
  for (const x of alle) {
    if (x.id === b.id) continue;
    const t = termVan(x);
    if (t && uitleg.includes(t)) continue;   // staat het afleider-begrip in de uitleg, dan is het niet fout
    const ander = set(x);
    let gedeeld = 0; for (const w of mijn) if (ander.has(w)) gedeeld++;
    const sc = (x.onderwerp === b.onderwerp ? 3 : 0) + (b.les && x.les === b.les ? 1.5 : 0) + 6 * gedeeld / (mijn.size + ander.size - gedeeld || 1);
    scores.push([sc, x.id]);
  }
  return scores.sort((a, c) => c[0] - a[0]).slice(0, n).map(([, id]) => id);
}

// Score van een automatisch na te kijken vraag (alles behalve open).
export function nakijken(it) {
  switch (it.kind) {
    case "mc": return it.answer === it.correct ? it.punten : 0;
    case "koppel": {
      const goed = it.paren.filter(p => it.antwoord?.[p.id] === p.id).length;
      return goed === it.paren.length ? it.punten : goed >= it.paren.length / 2 ? 1 : 0;
    }
    case "volgorde": {
      const a = it.antwoord || [];
      const goed = a.filter((k, i) => k === i).length;
      return goed === it.stappen.length ? it.punten : goed >= Math.ceil(it.stappen.length / 2) ? 1 : 0;
    }
    case "rekenen": return goedGerekend(it.invoer, it.antwoordGetal, it.marge) ? it.punten : 0;
    case "aanwijs": return it.answer === it.doel ? it.punten : 0;
    default: return null;
  }
}

/**
 * @param {{ data: object, weightOf?: (id:string)=>number, random?: ()=>number }} opts
 */
export function createQuizGenerator({ data, weightOf = () => 1, random = Math.random }) {
  // Alleen toetsbare kaarten leveren vragen, afleiders en achtergrond.
  const alle = data.begrippen.filter(toetsbaar);
  const isVraag = data.kaarttype === "vraag";
  const ids = new Map(data.begrippen.map(b => [b.id, b]));
  const byId = id => ids.get(id);
  const mix = a => shuffle(a, random);

  function pickWeighted(p, n) {
    const out = [], rest = p.slice();
    while (out.length < n && rest.length) {
      const tot = rest.reduce((s, b) => s + weightOf(b.id), 0); let r = random() * tot, i = 0;
      for (; i < rest.length - 1; i++) { r -= weightOf(rest[i].id); if (r <= 0) break; }
      out.push(rest.splice(i, 1)[0]);
    }
    return out;
  }

  function makeOpen(b) {
    const prompt = isVraag ? b.begrip : `Leg uit wat wordt bedoeld met <b>${plain(b.begrip)}</b>.`;
    const kern = kernpunten(b);
    return { id: b.id, kind: "open", variant: "open", prompt, kern, punten: kern.length, behaald: null, answer: null, tekst: "", gemist: [] };
  }

  // Afleiders: een kaart is bruikbaar als hij niet de vraag zelf is en zijn begrip niet in de uitleg staat.
  // De beste kandidaten komen uit data.afleiders (vooraf berekend door tools/build.js) of worden hier
  // gerangschikt; uit de top acht wordt willekeurig gekozen, zodat de toets niet steeds gelijk is.
  const alleIds = new Map(alle.map(b => [b.id, b]));
  // Vooraf berekend door tools/build.js: data.afl[i] = volgnummers van de beste afleiders van kaart i.
  const volgnr = data.afl ? new Map(data.begrippen.map((b, i) => [b.id, i])) : null;
  const vooraf = b => { const l = volgnr && data.afl[volgnr.get(b.id)]; return Array.isArray(l) && l.length ? l.map(i => data.begrippen[i]?.id) : null; };
  function afleiders(b) {
    const uitleg = plain(b.uitleg).toLowerCase();
    const bruikbaar = x => x && x.id !== b.id && !(termVan(x) && uitleg.includes(termVan(x)));
    const lijst = (vooraf(b) || rangschikAfleiders(alle, b)).map(id => alleIds.get(id)).filter(bruikbaar);
    const top = [...mix(lijst.slice(0, 8)), ...lijst.slice(8)];
    const gekozen = new Set(top.map(x => x.id));
    const alles = [...top, ...mix(alle.filter(x => bruikbaar(x) && !gekozen.has(x.id)))];
    return { zelfde: alles.filter(x => x.onderwerp === b.onderwerp), anders: alles.filter(x => x.onderwerp !== b.onderwerp), alles };
  }
  // Bij vraagkaarten zijn de opties antwoorden; kies afleiders van vergelijkbare lengte,
  // anders verraadt het langste antwoord het juiste.
  function opLengte(b, kandidaten) {
    const L = plain(b.uitleg).length;
    const dichtbij = kandidaten.slice().sort((x, y) => Math.abs(plain(x.uitleg).length - L) - Math.abs(plain(y.uitleg).length - L));
    return mix(dichtbij.slice(0, 8)).concat(dichtbij.slice(8));
  }

  function makeMC(b) {
    const { zelfde, anders, alles } = afleiders(b);
    const voorraad = isVraag ? [...opLengte(b, alles.slice(0, 12)), ...alles.slice(12)] : alles;
    // De officiële toets wisselt af tussen vier en vijf antwoordopties.
    const distract = voorraad.slice(0, voorraad.length >= 4 && random() < 0.45 ? 4 : 3);
    if (distract.length < 3) return makeOpen(b);
    const r = random();
    const antwoordTekst = x => plain(x.uitleg);

    // "Welke hoort NIET bij ...?" — drie uit hetzelfde onderwerp, één eruit.
    if (!isVraag && r < 0.15 && zelfde.length >= 3 && anders.length >= 1) {
      const binnen = zelfde.slice(0, zelfde.length >= 4 && random() < 0.45 ? 4 : 3), buiten = anders[0];
      const opts = mix([...binnen, buiten]).map(x => ({ id: x.id, text: x.begrip }));
      return { id: b.id, kind: "mc", variant: "behalve", onderwerpLabel: b.onderwerp,
        prompt: `De volgende begrippen horen allemaal bij <b>${b.onderwerp}</b>, <b><u>behalve</u></b>`,
        opts, correct: buiten.id, punten: 1, behaald: null, answer: null };
    }
    // "Geen van de andere antwoorden" is het juiste antwoord.
    if (r >= 0.15 && r < 0.27) {
      const opts = mix(distract.map(x => ({ id: x.id, text: isVraag ? antwoordTekst(x) : x.begrip })));
      opts.push({ id: GEEN, text: `Geen van de andere ${distract.length} antwoorden.` });
      return { id: b.id, kind: "mc", variant: "geenvan",
        prompt: isVraag ? b.begrip : "Welk begrip hoort bij deze omschrijving?",
        intro: isVraag ? "" : mask(b),
        opts, correct: GEEN, punten: 1, behaald: null, answer: null };
    }
    if (isVraag) {
      const opts = mix([b, ...distract]).map(x => ({ id: x.id, text: antwoordTekst(x) }));
      return { id: b.id, kind: "mc", variant: "antwoord", prompt: b.begrip, opts, correct: b.id, punten: 1, behaald: null, answer: null };
    }
    const variant = random() < 0.6 ? "invul" : "omschrijving";
    const opts = mix([b, ...distract]).map(x => ({ id: x.id, text: variant === "invul" ? x.begrip : kort(x.uitleg, 220) }));
    return { id: b.id, kind: "mc", variant,
      prompt: variant === "invul" ? "Welk begrip hoort bij deze omschrijving?" : `Wat is de juiste omschrijving van <b>${plain(b.begrip)}</b>?`,
      intro: variant === "invul" ? mask(b) : "", opts, correct: b.id, punten: 1, behaald: null, answer: null };
  }

  // --- koppelen (#24): vier begrippen aan vier omschrijvingen ---
  function makeKoppel(groep) {
    const paren = groep.map(b => ({ id: b.id, term: plain(b.begrip), oms: kort(b.uitleg, 150) }));
    return { id: groep[0].id, ids: groep.map(b => b.id), kind: "koppel", prompt: "Koppel elk begrip aan de juiste omschrijving.",
      paren, opties: mix(paren.map(x => ({ id: x.id, text: x.oms }))), antwoord: {}, punten: 2, behaald: null, answer: null };
  }
  // --- volgorde (#23): uit een kaart met een genummerde lijst, of een procedure uit data/volgordes.json ---
  const procedures = (data.volgordes || []).filter(v => (v.stappen || []).length >= 3);
  function makeVolgorde(bron) {
    const st = bron.stappen || stappen(bron);
    let start = mix(st.map((_, i) => i));
    if (start.every((k, i) => k === i)) start = start.slice().reverse();
    const proc = !!bron.stappen;
    return { id: proc ? `volg:${bron.id}` : bron.id, kind: "volgorde",
      prompt: `Zet de stappen van <b>${proc ? bron.titel : plain(bron.begrip)}</b> in de juiste volgorde.`,
      stappen: st, antwoord: start, punten: 2, behaald: null, answer: null,
      ...(proc ? { groep: "Procedures", aanvulling: true } : {}) };
  }
  // --- rekenen (#25) ---
  const sjablonen = sjablonenVoor(data.id);
  function makeRekenen(tpl) {
    const v = tpl.maak(random);
    return { id: `rek:${tpl.id}`, kind: "rekenen", titel: tpl.titel, prompt: v.vraag, antwoordGetal: v.antwoord, eenheid: v.eenheid,
      marge: v.marge, uitwerking: v.uitwerking, invoer: "", punten: 2, behaald: null, answer: null, groep: "Rekenen" };
  }
  // --- aanwijzen in een figuur (#26) ---
  const figuren = (data.figuren || []).filter(f => (f.vlakken || []).length >= 2);
  function makeAanwijs(fig, vlak) {
    return { id: `fig:${fig.id}:${vlak.id}`, kind: "aanwijs", prompt: `Klik in de figuur op: <b>${vlak.label}</b>`,
      figuur: { src: fig.src, alt: fig.alt, titel: fig.titel, bron: fig.bron || "" }, vlakken: fig.vlakken, doel: vlak.id,
      uitleg: vlak.uitleg || "", punten: 1, behaald: null, answer: null, groep: fig.titel };
  }

  // --- casussen ---
  function achtergrondBij(b, items) {
    const bruikbaar = x => x.les === b.les && !items.includes(x) && !META.test(x.onderwerp || "");
    const zelfdeOnderwerp = alle.filter(x => bruikbaar(x) && x.onderwerp === b.onderwerp);
    const zelfdeLes = alle.filter(x => bruikbaar(x) && x.onderwerp !== b.onderwerp);
    return [...mix(zelfdeOnderwerp), ...mix(zelfdeLes)].slice(0, 2).map(x => isVraag
      ? `<b>${plain(x.begrip)}</b> ${kort(x.uitleg, 220)}`
      : `<b>${plain(x.begrip)}</b> — ${kort(x.uitleg, 220)}`);
  }
  const bucketsVan = p => {
    const buckets = {};
    for (const b of p) if (!META.test(b.onderwerp || "")) (buckets[`${b.les || ""}||${b.onderwerp}`] ||= []).push(b);
    return Object.values(buckets).filter(v => v.length >= 2);
  };
  function casusGroepen(p) {
    if (Array.isArray(data.casussen) && data.casussen.length) {
      return mix(data.casussen
        .map(c => ({ titel: c.titel, tekst: c.tekst, achtergrond: c.achtergrond || [], afbeelding: c.afbeelding || null,
                     bron: c.bron || "", items: c.vragen.map(byId).filter(b => b && p.includes(b)) }))
        .filter(c => c.items.length >= 2));
    }
    return mix(bucketsVan(p)).map(v => {
      const items = mix(v).slice(0, Math.min(4, v.length));
      const b = items[0];
      const lesTitel = (b.les || "").replace(/^Les\s*\d+\s*[–-]\s*/, "").trim();
      // "Deel B" of "Opgaven" zegt niets; val dan terug op de titel van de les.
      const thema = VAAG.test(b.onderwerp) ? (lesTitel || b.onderwerp) : b.onderwerp;
      const waar = b.les ? `, onderdeel van <b>${plain(b.les)}</b>` : "";
      return {
        titel: `Casus · ${thema}`,
        tekst: `Deze casus gaat over <b>${plain(thema)}</b>${waar}. Je loopt de stappen na die daarbij horen: de deelvragen gaan over dezelfde situatie en bouwen op elkaar voort.`,
        achtergrond: achtergrondBij(b, items),
        afbeelding: null,
        bron: b.bron_bestand || "",
        items
      };
    });
  }

  // Stelt een toets samen van n vragen uit pool p met verdeling mIn (gewichten per type, zie MIX_STD).
  function buildItems(pool, n, mIn) {
    const p = pool.filter(toetsbaar);
    const m = Object.assign(Object.fromEntries(TYPEN.map(t => [t, 0])), mIn);
    const voorraad = typeVoorraad(p);
    const aanpassing = [];
    // Typen zonder voorraad vallen af; hun deel gaat naar meerkeuze en open.
    for (const t of ["casus", "koppel", "volgorde", "rekenen", "aanwijs"]) {
      if (m[t] > 0 && !voorraad[t]) {
        if (m[t] >= 10) aanpassing.push(`geen ${{ casus: "casus", koppel: "koppel", volgorde: "volgorde", rekenen: "reken", aanwijs: "aanwijs" }[t]}vragen in deze selectie`);
        m.mc += m[t] * 0.6; m.open += m[t] * 0.4; m[t] = 0;
      }
    }
    const extra = (m.rekenen ? 1000 : 0) + (m.aanwijs ? voorraad.aanwijs : 0);
    n = Math.min(n, p.length + extra);
    // Verdeling met de grootste-restmethode, zodat de aantallen precies optellen tot n.
    const tot = TYPEN.reduce((s, t) => s + m[t], 0) || 1;
    const ruw = TYPEN.map(t => [t, n * m[t] / tot]);
    const aantal = Object.fromEntries(ruw.map(([t, x]) => [t, Math.floor(x)]));
    let over = n - Object.values(aantal).reduce((s, x) => s + x, 0);
    for (const [t] of ruw.slice().sort((a, b) => (b[1] % 1) - (a[1] % 1))) { if (over <= 0) break; if (m[t] > 0) { aantal[t]++; over--; } }
    aantal.mc += over;

    const items = [], gebruikt = new Set();
    const vrij = b => !gebruikt.has(b.id);

    let gezet = 0, gid = 0;
    if (aantal.casus >= 2) {
      for (const g of casusGroepen(p)) {
        if (gezet >= aantal.casus) break;
        const neem = g.items.filter(vrij).slice(0, Math.min(aantal.casus - gezet, 4));
        if (neem.length < 2) continue;
        gid++;
        const deel = neem.map((b, i) => {
          gebruikt.add(b.id);
          // Binnen een casus wisselen meerkeuze- en open deelvragen elkaar af.
          const it = i % 2 === 1 ? makeOpen(b) : makeMC(b);
          it.casus = { gid, titel: g.titel, tekst: g.tekst, achtergrond: g.achtergrond || [], afbeelding: g.afbeelding || null,
            bron: g.bron || "", letter: LETTERS[i], i: i + 1, n: neem.length };
          return it;
        });
        const punten = deel.reduce((s, x) => s + x.punten, 0);
        deel.forEach(x => x.casus.punten = punten);
        items.push(...deel);
        gezet += neem.length;
      }
    }
    let tekort = aantal.casus - gezet;
    if (tekort > 0 && aantal.casus) aanpassing.push("te weinig samenhangende vragen voor alle casussen");

    let k = 0;
    if (aantal.koppel) {
      for (const g of mix(koppelGroepen(p))) {
        if (k >= aantal.koppel) break;
        const vrijG = mix(g.filter(vrij)); if (vrijG.length < 4) continue;
        const groep = vrijG.slice(0, 4); groep.forEach(b => gebruikt.add(b.id));
        items.push(makeKoppel(groep)); k++;
      }
      tekort += aantal.koppel - k;
    }
    let v = 0;
    if (aantal.volgorde) {
      for (const bron of mix([...procedures, ...p.filter(b => vrij(b) && stappen(b).length)])) {
        if (v >= aantal.volgorde) break;
        if (!bron.stappen) gebruikt.add(bron.id);
        items.push(makeVolgorde(bron)); v++;
      }
      tekort += aantal.volgorde - v;
    }
    if (aantal.rekenen) {
      const tpls = mix(sjablonen);
      for (let i = 0; i < aantal.rekenen; i++) items.push(makeRekenen(tpls[i % tpls.length]));
    }
    if (aantal.aanwijs) {
      const vlakken = mix(figuren.flatMap(f => f.vlakken.map(vl => [f, vl])));
      const nA = Math.min(aantal.aanwijs, vlakken.length);
      for (let i = 0; i < nA; i++) items.push(makeAanwijs(...vlakken[i]));
      tekort += aantal.aanwijs - nA;
    }
    const nMc = aantal.mc + Math.ceil(tekort / 2), nOpen = aantal.open + Math.floor(tekort / 2);

    const rest = p.filter(vrij);
    const los = pickWeighted(rest, Math.min(nMc + nOpen, rest.length));
    let mcOver = nMc;
    for (const b of los) {
      if (mcOver > 0) {
        const it = makeMC(b);
        if (it.kind === "open" && !aanpassing.includes("te weinig afleiders voor meerkeuze")) aanpassing.push("te weinig afleiders voor meerkeuze");
        items.push(it); mcOver--;
      } else items.push(makeOpen(b));
    }

  // Casusdeelvragen blijven bij elkaar en op volgorde; de blokken worden geschud.
    const blokken = [], perCasus = {};
    for (const it of items) {
      if (it.casus) { (perCasus[it.casus.gid] ||= []).push(it); if (perCasus[it.casus.gid].length === 1) blokken.push(perCasus[it.casus.gid]); }
      else blokken.push([it]);
    }
    return { items: mix(blokken).flat(), aanpassing };
  }

  // Hoeveel kaarten kunnen welk vraagtype opleveren? Meerkeuze heeft drie bruikbare afleiders
  // nodig, een casus minstens twee kaarten met dezelfde les en hetzelfde onderwerp.
  // Groepen van minstens vier kaarten met hetzelfde onderwerp (alleen begripmodules).
  function koppelGroepen(p) {
    if (isVraag) return [];
    const per = {};
    for (const b of p) if (!META.test(b.onderwerp || "")) (per[b.onderwerp] ||= []).push(b);
    return Object.values(per).filter(g => g.length >= 4);
  }

  function typeVoorraad(pool = alle) {
    const alle = pool;
    const termen = alle.map(termVan);
    const mc = alle.filter((b, i) => {
      const tekst = plain(b.uitleg).toLowerCase();
      let n = 0;
      for (let j = 0; j < alle.length; j++) {
        if (j === i || (termen[j] && tekst.includes(termen[j]))) continue;
        if (++n >= 3) return true;
      }
      return false;
    }).length;
    const casus = bucketsVan(alle).reduce((s, v) => s + v.length, 0);
    const koppel = koppelGroepen(alle).reduce((s, g) => s + Math.floor(g.length / 4), 0);
    const volgorde = alle.filter(b => stappen(b).length).length + procedures.length;
    return { mc, open: alle.length, casus, koppel, volgorde, rekenen: sjablonen.length ? 99 : 0,
      aanwijs: figuren.reduce((s, f) => s + f.vlakken.length, 0) };
  }

  return { buildItems, makeMC, makeOpen, makeKoppel, makeVolgorde, makeRekenen, casusGroepen, typeVoorraad, byId, toetsbareKaarten: alle, sjablonen, figuren };
}
