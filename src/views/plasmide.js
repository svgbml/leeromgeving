// Plasmidebouwer (module "DNA kraak de code"): zelf een plasmide in elkaar zetten, de app controleert
// het en legt per bevinding uit waarom het klopt of niet. De regels staan in src/domain/plasmide.js.
// Opbouw van het scherm: opdracht kiezen · circulaire plasmidekaart · palet · constructie in leesrichting
// (met de transcriptie- en eiwitspanen eromheen) · uitleg van het gekozen onderdeel · uitslag · naslag.
import { esc } from "../domain/text.js";
import { app } from "../core/store.js";
import { $, acties, say, toast } from "../core/dom.js";
import { link, zetParams } from "../core/router.js";
import { confetti } from "../ui/motion.js";
import { ONDERDELEN, SOORTEN, OPDRACHTEN, onderdeel, opdracht, controleer, lengte, GASTHEERNAAM } from "../domain/plasmide.js";

const SLEUTEL = id => `leeromgeving:plasmide:${id}`;
const GASTHEERKORT = { pro: "prokaryoot", euk: "eukaryoot", beide: "pro + euk" };
const BEVINDING = { fout: "Fout", letop: "Let op", goed: "Goed", info: "Ter info" };

// ---------- opslag per module en per opdracht ----------
function laadStaat(modId) {
  try {
    const raw = JSON.parse(localStorage.getItem(SLEUTEL(modId)) || "{}");
    const uit = {};
    for (const o of OPDRACHTEN) {
      const v = raw[o.id];
      if (Array.isArray(v)) uit[o.id] = v.filter(x => onderdeel(x)).slice(0, 40);
    }
    return uit;
  } catch { return {}; }
}
const bewaarStaat = (modId, alles) => { try { localStorage.setItem(SLEUTEL(modId), JSON.stringify(alles)); } catch {} };

// ---------- circulaire plasmidekaart ----------
const CX = 340, CY = 282, R = 150, DIK = 26, GAT = 2.4, MINHOEK = 9;
const rad = g => (g - 90) * Math.PI / 180;
const punt = (r, g) => [CX + r * Math.cos(rad(g)), CY + r * Math.sin(rad(g))];
const nr = n => n.toFixed(1);

function boog(r, g1, g2) {
  const [x1, y1] = punt(r, g1), [x2, y2] = punt(r, g2);
  return `M${nr(x1)} ${nr(y1)}A${r} ${r} 0 ${g2 - g1 > 180 ? 1 : 0} 1 ${nr(x2)} ${nr(y2)}`;
}

// Verdeelt de 360 graden over de onderdelen: elk minstens MINHOEK, de rest naar verhouding van de bp.
function verdeel(delen) {
  const vrij = 360 - delen.length * GAT;
  const bpTot = delen.reduce((n, d) => n + d.bp, 0) || 1;
  const extra = Math.max(0, vrij - delen.length * MINHOEK);
  const vast = delen.length * MINHOEK > vrij;
  let g = GAT / 2;
  return delen.map(d => {
    const hoek = vast ? vrij / delen.length : MINHOEK + extra * (d.bp / bpTot);
    const s = { d, g1: g, g2: g + hoek, mid: g + hoek / 2, hoek };
    g += hoek + GAT;
    return s;
  });
}

function kaartSvg(ids, sel) {
  const delen = ids.map(onderdeel).filter(Boolean);
  const kb = (lengte(ids) / 1000).toFixed(1).replace(".", ",");
  const ticks = Array.from({ length: 72 }, (_, i) => i * 5).map(g => {
    const lang = g % 45 === 0;
    const [x1, y1] = punt(R + DIK / 2 + 6, g), [x2, y2] = punt(R + DIK / 2 + (lang ? 13 : 9), g);
    return `<line x1="${nr(x1)}" y1="${nr(y1)}" x2="${nr(x2)}" y2="${nr(y2)}" class="pl-tick${lang ? " lang" : ""}"/>`;
  }).join("");

  const segmenten = verdeel(delen);
  const vlakken = segmenten.map((s, i) => {
    const richting = (s.d.rol === "promotor" || s.d.codeert) && s.hoek >= 12;
    const g2 = richting ? s.g2 - 3.4 : s.g2;
    const [px, py] = punt(R, s.g2 + 0.2);
    const [ax, ay] = punt(R + DIK / 2, g2), [bx, by] = punt(R - DIK / 2, g2);
    return `<g class="pl-seg pl-s-${s.d.soort}${i === sel ? " aan" : ""}" data-actie="kiesDeel" data-i="${i}">
      <title>${esc(s.d.lang)}</title>
      ${i === sel ? `<path d="${boog(R, s.g1 - 0.6, s.g2 + 0.6)}" class="pl-halo"/>` : ""}
      <path d="${boog(R, s.g1, g2)}" class="pl-vlak"/>
      ${richting ? `<polygon points="${nr(ax)} ${nr(ay)} ${nr(px)} ${nr(py)} ${nr(bx)} ${nr(by)}" class="pl-vlak-vol"/>` : ""}
    </g>`;
  }).join("");

  const labels = segmenten.map((s, i) => {
    const rechts = Math.cos(rad(s.mid)) >= -0.02;
    const [x1, y1] = punt(R + DIK / 2 + 2, s.mid), [x2, y2] = punt(R + DIK / 2 + 26, s.mid);
    const hx = x2 + (rechts ? 12 : -12);
    return `<g class="pl-label pl-s-${s.d.soort}${i === sel ? " aan" : ""}" data-actie="kiesDeel" data-i="${i}">
      <path d="M${nr(x1)} ${nr(y1)}L${nr(x2)} ${nr(y2)}L${nr(hx)} ${nr(y2)}" class="pl-leader"/>
      <text x="${nr(hx + (rechts ? 5 : -5))}" y="${nr(y2 + 4)}" text-anchor="${rechts ? "start" : "end"}">${esc(s.d.naam)}</text>
    </g>`;
  }).join("");

  const omschrijving = delen.length
    ? `Plasmidekaart met ${delen.length} onderdelen, met de klok mee: ${delen.map(d => d.lang).join(", ")}.`
    : "Lege plasmidekaart: nog geen onderdelen geplaatst.";

  // Bijgesneden rond de ring plus de labels eromheen, zodat de kaart de kaartbreedte goed vult.
  return `<svg viewBox="80 80 520 408" class="pl-svg" role="img" aria-label="${esc(omschrijving)}">
    ${ticks}
    <circle cx="${CX}" cy="${CY}" r="${R}" class="pl-ring"/>
    <circle cx="${CX}" cy="${CY}" r="${R - DIK / 2}" class="pl-rand"/>
    <circle cx="${CX}" cy="${CY}" r="${R + DIK / 2}" class="pl-rand"/>
    ${vlakken}
    ${labels}
    <text x="${CX}" y="${CY - 6}" class="pl-mid-naam" text-anchor="middle">pLEP</text>
    <text x="${CX}" y="${CY + 18}" class="pl-mid-bp" text-anchor="middle">${delen.length ? `± ${kb} kb` : "nog leeg"}</text>
    <text x="${CX}" y="${CY + 38}" class="pl-mid-n" text-anchor="middle">${delen.length} onderdeel${delen.length === 1 ? "" : "en"}</text>
  </svg>`;
}

// ---------- constructie in leesrichting, met de spanen eromheen ----------
// Rij 1 = transcriptie-eenheid (promotor t/m terminator), rij 2 = de onderdelen, rij 3 = de eiwitten.
function spanen(delen) {
  const uit = [];
  const prom = delen.findIndex(d => d.rol === "promotor");
  let term = -1;
  for (let i = delen.length - 1; i >= 0; i--) if (delen[i].rol === "terminator") { term = i; break; }
  if (prom >= 0 && term > prom) uit.push({ rij: 1, van: prom, tot: term, soort: "tx", tekst: "transcriptie-eenheid → mRNA" });

  const eiwitten = [];
  delen.forEach((d, i) => {
    if (d.rol !== "start") return;
    if (eiwitten.some(e => i <= e.tot)) return; // dit ATG ligt al binnen een eerder leesraam
    let eind = -1;
    for (let j = i + 1; j < delen.length; j++) if (delen[j].rol === "stop") { eind = j; break; }
    eiwitten.push({ van: i, tot: eind === -1 ? delen.length - 1 : eind, open: eind === -1 });
  });
  eiwitten.forEach((e, k) => uit.push({
    rij: 3, van: e.van, tot: e.tot, soort: e.open ? "open" : "eiwit",
    tekst: e.open ? "leesraam zonder stopcodon" : `eiwit${eiwitten.length > 1 ? ` ${k + 1}` : ""}`
  }));
  return uit;
}

function stripHtml(ids, sel) {
  const delen = ids.map(onderdeel).filter(Boolean);
  if (!delen.length) {
    return `<p class="pl-leeg">Nog niets geplaatst. Kies hiernaast een onderdeel; het komt achter het onderdeel dat je geselecteerd hebt, of anders aan het eind.</p>`;
  }
  const vakken = delen.map((d, i) => `<button type="button" class="pl-chip pl-s-${d.soort}${i === sel ? " aan" : ""}" style="grid-area:2/${i + 1}/3/${i + 2}"
      data-actie="kiesDeel" data-i="${i}" aria-pressed="${i === sel}" title="${esc(d.lang)}">
      <span class="pl-chip-n">${esc(d.naam)}</span>
      <span class="visually-hidden">, ${esc(d.lang)}, plek ${i + 1} van ${delen.length}</span>
    </button>`).join("");
  const bogen = spanen(delen).map(s =>
    `<span class="pl-span pl-span-${s.soort}" style="grid-area:${s.rij}/${s.van + 1}/${s.rij + 1}/${s.tot + 2}"><span>${esc(s.tekst)}</span></span>`).join("");
  return `<div class="pl-strip-schuif"><div class="pl-strip" style="grid-template-columns:repeat(${delen.length},minmax(4rem,1fr))">${bogen}${vakken}</div></div>`;
}

// ---------- palet ----------
const gastheerTag = g => g === "beide" ? "" : `<span class="tag tag-${g === "pro" ? "info" : "extra"}">${GASTHEERKORT[g]}</span>`;

function paletHtml() {
  return SOORTEN.map(s => `
    <div class="pl-groep">
      <h3 class="pl-groep-k"><span class="pl-stip pl-s-${s.id}" aria-hidden="true"></span>${esc(s.naam)}</h3>
      <p class="pl-groep-u">${esc(s.uitleg)}</p>
      <div class="pl-knoppen">
        ${ONDERDELEN.filter(o => o.soort === s.id).map(o => `
          <button type="button" class="pl-add pl-s-${o.soort}" data-actie="voegToe" data-id="${o.id}">
            <span class="pl-add-n">${esc(o.naam)}</span>
            <span class="pl-add-l">${esc(o.lang)}</span>
          </button>`).join("")}
      </div>
    </div>`).join("");
}

// ---------- uitleg van één onderdeel ----------
function detailHtml(id) {
  const d = onderdeel(id);
  if (!d) {
    return `<div class="card pl-detail pl-detail-leeg"><p class="m0">Klik op een onderdeel in de kaart, in je constructie of in het palet om te lezen wat het doet, waarom je het nodig hebt en welke fout er vaak mee gemaakt wordt.</p></div>`;
  }
  return `<div class="card pl-detail pl-s-${d.soort}">
    <h2 class="kop0">${esc(d.lang)} ${gastheerTag(d.gastheer)}</h2>
    <dl class="pl-dl">
      <dt>Wat het is</dt><dd>${esc(d.uitleg)}</dd>
      <dt>Waarom je het nodig hebt</dt><dd>${esc(d.waarom)}</dd>
      <dt>Veelgemaakte fout</dt><dd>${esc(d.valkuil)}</dd>
    </dl>
    <p class="src m0">Hoort bij <a href="${link("begrippen", { id: d.bron })}">de kaart over ${esc(d.naam)}</a> · indicatief ${d.bp} bp</p>
  </div>`;
}

// ---------- uitslag ----------
function uitslagHtml(ids, opdId) {
  const r = controleer(ids, opdId);
  const n = r.aantal;
  const kop = r.klaar
    ? "Dit plasmide klopt"
    : `${n.fout} ${n.fout === 1 ? "fout" : "fouten"}${n.letop ? ` en ${n.letop} ${n.letop === 1 ? "waarschuwing" : "waarschuwingen"}` : ""}`;
  return `<div class="card pl-uitslag${r.klaar ? " klaar" : ""}">
    <h2 class="kop0" id="pl-u-kop" tabindex="-1">${esc(kop)}</h2>
    <p class="pl-balk" aria-hidden="true">${["fout", "letop", "goed", "info"].filter(s => n[s]).map(s => `<span class="pl-balk-${s}" style="flex:${n[s]}"></span>`).join("")}</p>
    <ul class="pl-bev" role="list">
      ${r.bevindingen.map(b => `<li class="pl-bev-i pl-b-${b.soort}">
        <span class="pl-bev-t">${BEVINDING[b.soort]}</span>
        <div><strong>${esc(b.kop)}</strong> ${esc(b.tekst)}${b.bron ? ` <a class="pl-bron" href="${link("begrippen", { id: b.bron })}">kaart</a>` : ""}</div>
      </li>`).join("")}
    </ul>
  </div>`;
}

// ---------- scherm ----------
export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    const alles = laadStaat(m.id);
    let opdId = OPDRACHTEN.some(o => o.id === params.opdracht) ? params.opdracht : "ecoli";
    let delen = alles[opdId] ? [...alles[opdId]] : [];
    let sel = -1, uitslag = false;

    main.innerHTML = `
      <h1 style="view-transition-name:titel">Plasmidebouwer</h1>
      <p class="sub"><span style="view-transition-name:mod-${esc(m.id)}">${esc(m.titel)}</span> · les 2, 4 en 5 · zet zelf een plasmide in elkaar en laat het nakijken</p>
      <div class="pl-opdrachten" role="group" aria-label="Kies een opdracht">
        ${OPDRACHTEN.map(o => `<button type="button" class="chip" data-actie="kiesOpdracht" data-id="${o.id}">${esc(o.kort)}</button>`).join("")}
      </div>
      <div class="card pl-opdracht" id="pl-opdracht"></div>
      <div class="pl-werk">
        <figure class="card pl-kaart" id="pl-kaart"></figure>
        <div class="card pl-palet">
          <h2 class="kop0">Onderdelen</h2>
          <p class="pl-groep-u">Een onderdeel komt achter het geselecteerde onderdeel te staan, of anders aan het eind.</p>
          ${paletHtml()}
        </div>
      </div>
      <section class="card pl-constructie" aria-labelledby="pl-c-kop">
        <h2 class="kop0" id="pl-c-kop">Je constructie, in leesrichting</h2>
        <div id="pl-strip"></div>
        <p class="src pl-wenk">De ORI en de selectiemarker mogen overal op de cirkel staan; bij de rest telt de volgorde. De balk erboven is de transcriptie-eenheid, de balk eronder het leesraam van een eiwit.</p>
        <div class="row pl-gereed">
          <button type="button" class="btn btn-klein" data-actie="links" id="pl-links">← Naar links</button>
          <button type="button" class="btn btn-klein" data-actie="rechts" id="pl-rechts">Naar rechts →</button>
          <button type="button" class="btn btn-klein" data-actie="weg" id="pl-weg">Verwijderen</button>
          <span class="pl-spacer"></span>
          <button type="button" class="btn btn-primary btn-klein" data-actie="controleer">Controleer plasmide</button>
          <button type="button" class="btn btn-klein" data-actie="voorbeeld">Toon een goed antwoord</button>
          <button type="button" class="btn btn-klein" data-actie="leeg">Leeg maken</button>
        </div>
      </section>
      <div id="pl-detail"></div>
      <div id="pl-uitslag"></div>
      <details class="card pl-naslag">
        <summary>Naslag: alle onderdelen op een rij</summary>
        ${SOORTEN.map(s => `
          <h3 class="pl-groep-k"><span class="pl-stip pl-s-${s.id}" aria-hidden="true"></span>${esc(s.naam)}</h3>
          <dl class="pl-dl">
            ${ONDERDELEN.filter(o => o.soort === s.id).map(o => `
              <dt>${esc(o.lang)} ${gastheerTag(o.gastheer)}</dt>
              <dd>${esc(o.uitleg)} <em>${esc(o.valkuil)}</em> <a href="${link("begrippen", { id: o.bron })}">kaart</a></dd>`).join("")}
          </dl>`).join("")}
      </details>`;

    const opdrachtKaart = $("#pl-opdracht", main), kaartVak = $("#pl-kaart", main), stripVak = $("#pl-strip", main);
    const detailVak = $("#pl-detail", main), uitslagVak = $("#pl-uitslag", main);

    const bewaar = () => { alles[opdId] = [...delen]; bewaarStaat(m.id, alles); };

    function tekenOpdracht() {
      const o = opdracht(opdId);
      for (const b of main.querySelectorAll("[data-actie=kiesOpdracht]")) b.setAttribute("aria-pressed", String(b.dataset.id === opdId));
      opdrachtKaart.innerHTML = `
        <h2 class="kop0">${esc(o.titel)}</h2>
        <p>${esc(o.vraag)}</p>
        <p class="src m0">${o.gastheer ? `Gastheer: ${esc(GASTHEERNAAM[o.gastheer])} · ` : ""}doel: ${o.doel === "klonering" ? "klonering" : o.doel === "expressie" ? "eiwitexpressie" : "vrij"}</p>`;
    }

    function teken() {
      kaartVak.innerHTML = kaartSvg(delen, sel);
      stripVak.innerHTML = stripHtml(delen, sel);
      detailVak.innerHTML = detailHtml(delen[sel]);
      for (const [knop, uit] of [["#pl-links", sel <= 0], ["#pl-rechts", sel < 0 || sel >= delen.length - 1], ["#pl-weg", sel < 0]]) {
        $(knop, main).disabled = uit;
      }
      if (uitslag) uitslagVak.innerHTML = uitslagHtml(delen, opdId);
    }

    function wijzig(nieuw, nieuweSel = sel) {
      delen = nieuw;
      sel = Math.min(nieuweSel, delen.length - 1);
      bewaar();
      teken();
    }

    function verwissel(stap) {
      if (sel < 0) return;
      const j = sel + stap;
      if (j < 0 || j >= delen.length) return;
      const kopie = [...delen];
      [kopie[sel], kopie[j]] = [kopie[j], kopie[sel]];
      wijzig(kopie, j);
      say(`${onderdeel(delen[j]).lang} staat nu op plek ${j + 1} van ${delen.length}`);
    }

    acties(main, {
      kiesOpdracht: el => {
        if (el.dataset.id === opdId) return;
        opdId = el.dataset.id;
        delen = alles[opdId] ? [...alles[opdId]] : [];
        sel = -1; uitslag = false; uitslagVak.innerHTML = "";
        zetParams({ opdracht: opdId });
        tekenOpdracht(); teken();
        say(`Opdracht: ${opdracht(opdId).titel}`);
      },
      voegToe: el => {
        if (delen.length >= 40) { toast("Veertig onderdelen is wel genoeg."); return; }
        const plek = sel < 0 ? delen.length : sel + 1;
        const kopie = [...delen];
        kopie.splice(plek, 0, el.dataset.id);
        wijzig(kopie, plek);
        say(`${onderdeel(el.dataset.id).lang} toegevoegd op plek ${plek + 1}`);
      },
      kiesDeel: el => {
        sel = +el.dataset.i;
        teken();
        say(`${onderdeel(delen[sel]).lang} gekozen, plek ${sel + 1} van ${delen.length}. De uitleg staat onder je constructie.`);
      },
      links: () => verwissel(-1),
      rechts: () => verwissel(1),
      weg: () => {
        if (sel < 0) return;
        const naam = onderdeel(delen[sel]).lang;
        const kopie = delen.filter((_, i) => i !== sel);
        wijzig(kopie, Math.min(sel, kopie.length - 1));
        say(`${naam} verwijderd`);
      },
      leeg: () => { if (delen.length) { wijzig([], -1); uitslag = false; uitslagVak.innerHTML = ""; say("Plasmide leeggemaakt"); } },
      voorbeeld: () => {
        wijzig([...opdracht(opdId).voorbeeld], -1);
        uitslag = true;
        uitslagVak.innerHTML = uitslagHtml(delen, opdId);
        toast("Dit is één goede oplossing; vaak kan het ook anders.");
      },
      controleer: () => {
        uitslag = true;
        const r = controleer(delen, opdId);
        uitslagVak.innerHTML = uitslagHtml(delen, opdId);
        const kop = $("#pl-u-kop", main);
        kop?.focus();
        if (r.klaar) confetti(kop);
      }
    }, signal);

    tekenOpdracht();
    teken();

    // Een link met ?opdracht=… wisselt zonder het scherm opnieuw op te bouwen.
    zetUpdate(p => {
      const nieuw = OPDRACHTEN.some(o => o.id === p.opdracht) ? p.opdracht : opdId;
      if (nieuw === opdId) return;
      opdId = nieuw;
      delen = alles[opdId] ? [...alles[opdId]] : [];
      sel = -1; uitslag = false; uitslagVak.innerHTML = "";
      tekenOpdracht(); teken();
    });
  }
};
