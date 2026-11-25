// Lab > Stoffen: wat je deze sessie in handen krijgt, met pictogram, H- en P-zinnen, PBM en afvalvat.
// De gegevens komen uit data/stoffen.json; een labsessie noemt alleen de id's (OVERHAUL.md > B2).
import { esc } from "../domain/text.js";
import { GHS, stoffenVoor, pbmVan, afvalGroepen, ongecontroleerd } from "../domain/stoffen.js";
import { sessiesVan, kiesSessie, sessieLabel, weekVan, stofIdsVan } from "../domain/lab.js";
import { app, laadStoffen, laadVleugelData } from "../core/store.js";
import { $, acties } from "../core/dom.js";
import { zetParams } from "../core/router.js";

// Ruitje met symbool; het symbool is ASCII-vrij gehouden en komt uit de SVG hieronder.
const SYMBOOL = {
  GHS01: '<circle cx="24" cy="26" r="4"/><path d="M24 26l-7-9M24 26l9-7M24 26l-10 6M24 26l11 4M24 26l-3 10"/>',
  GHS02: '<path d="M24 12c1.5 5-3.5 6.5-3.5 11.5 0 3.5 2.5 6 2.5 6s-4.5-1-4.5-6c0 0-3 2.5-3 7.5 0 5 4 8.5 8.5 8.5s8.5-3.5 8.5-8.5C32.5 22 24 20 24 12z"/>',
  GHS03: '<circle cx="24" cy="32" r="4"/><path d="M24 12c1 5-2 7-2 10 0 2 1 4 1 4"/><path d="M15 36h18"/>',
  GHS04: '<rect x="18" y="14" width="12" height="22" rx="6"/><path d="M24 10v4"/>',
  GHS05: '<path d="M13 15h8v6l-5 2zM18 24l-3 10h11l-3-10z"/><path d="M28 14h8l-2 12M30 28c0 4 2 7 4 7s4-3 4-7"/>',
  GHS06: '<circle cx="24" cy="21" r="8"/><circle cx="21" cy="20" r="1.6" fill="#fff"/><circle cx="27" cy="20" r="1.6" fill="#fff"/><path d="M16 32l16 6M32 32l-16 6"/>',
  GHS07: '<path d="M24 13v14" stroke-width="4"/><circle cx="24" cy="34" r="2.4"/>',
  GHS08: '<path d="M24 12a9 9 0 0 1 0 18 9 9 0 0 1 0-18z"/><path d="M15 34h18"/>',
  GHS09: '<path d="M12 32h24M16 36c4-2 8-2 12 0"/><path d="M22 14c3 4 3 10 0 14"/>'
};
const ruit = code => `<svg class="ghs-ruit" viewBox="0 0 48 48" role="img" aria-label="${esc(GHS[code]?.naam || code)}">
  <title>${esc(GHS[code]?.naam || code)}</title>
  <rect x="24" y="2.5" width="30.4" height="30.4" transform="rotate(45 24 2.5)" fill="#fff" stroke="#d1261c" stroke-width="3.2"/>
  <g fill="none" stroke="#1a1a1a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${SYMBOOL[code] || ""}</g></svg>`;

const pictogrammen = s => (s.pictogrammen || []).length
  ? `<span class="ghs-rij">${s.pictogrammen.map(ruit).join("")}</span>`
  : `<span class="src">geen pictogram</span>`;

function rij(s) {
  if (s.onbekend) {
    return `<tr><td colspan="6"><strong>${esc(s.naam)}</strong> <span class="tag tag-extra">onbekende stof</span>
      <div class="src m0">Deze sessie noemt id "${esc(s.id)}", maar die staat niet in data/stoffen.json.</div></td></tr>`;
  }
  return `<tr>
    <th scope="row"><strong>${esc(s.naam)}</strong>${s.cmr ? ` <span class="tag tag-extra">CMR</span>` : ""}
      ${s.gecontroleerd ? "" : `<span class="tag tag-info" title="Nog niet tegen de SDS nagelopen">ongecontroleerd</span>`}
      ${s.cas ? `<div class="src m0">CAS ${esc(s.cas)}</div>` : ""}</th>
    <td>${pictogrammen(s)}${s.signaalwoord ? `<div class="src m0">${esc(s.signaalwoord)}</div>` : ""}</td>
    <td>${(s.h || []).map(h => `<code>${esc(h)}</code>`).join(" ") || "<span class='src'>–</span>"}</td>
    <td>${(s.p || []).map(p => `<code>${esc(p)}</code>`).join(" ") || "<span class='src'>–</span>"}</td>
    <td>${(s.pbm || []).map(esc).join(", ") || "<span class='src'>–</span>"}</td>
    <td>${s.afvalvat ? esc(s.afvalvat) : "<span class='src'>–</span>"}</td>
  </tr>`;
}

function tabel(lijst) {
  if (!lijst.length) return "";
  return `<div class="tabel-schuif" tabindex="0" role="region" aria-label="Stoffentabel"><table class="stoffen-tabel">
    <caption class="visually-hidden">Stoffen met hun gevaren, beschermingsmiddelen en afvalvat</caption>
    <thead><tr><th scope="col">Stof</th><th scope="col">Gevaar</th><th scope="col">H-zinnen</th>
      <th scope="col">Voorzorg (P)</th><th scope="col">PBM</th><th scope="col">Afvalvat</th></tr></thead>
    <tbody>${lijst.map(rij).join("")}</tbody></table></div>`;
}

const SELECTIES = { sessie: "Deze sessie", module: "Hele module", alles: "Alle stoffen" };

export default {
  async mount({ main, params, signal, zetUpdate }) {
    const m = app.mod;
    main.innerHTML = `<h1>Stoffen</h1><p class="sub">Lab · ${esc(m?.titel || "")}</p>
      <p class="loading" role="status">Stoffen laden…</p>`;

    let bibliotheek = [], lab = null;
    try { [bibliotheek, lab] = await Promise.all([laadStoffen(), laadVleugelData(m, "lab")]); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De stoffenlijst kon niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const sessies = sessiesVan(lab);
    const teken = () => {
      const keuze = sessies.length ? (params.sel || "sessie") : "alles";
      // Twee sessies kunnen hetzelfde nummer hebben (week 1 heeft er twee), dus de plek in de
      // lijst is de sleutel; de andere labschermen linken hierheen met dezelfde parameter.
      const i = kiesSessie(sessies, params.sessie);
      const sessie = sessies[i];

      let lijst;
      if (keuze === "alles") lijst = bibliotheek;
      else if (keuze === "module") lijst = stoffenVoor([...new Set(sessies.flatMap(stofIdsVan))], bibliotheek);
      else lijst = stoffenVoor(stofIdsVan(sessie), bibliotheek);

      const pbm = pbmVan(lijst.filter(s => !s.onbekend));
      const afval = afvalGroepen(lijst.filter(s => !s.onbekend));
      const nietNagelopen = ongecontroleerd(lijst.filter(s => !s.onbekend));

      main.innerHTML = `
        <h1>Stoffen</h1>
        <p class="sub">Lab · ${esc(m?.titel || "")}${sessies.length && keuze === "sessie" && sessie ? ` · ${weekVan(sessie) ? `${esc(weekVan(sessie))}: ` : `sessie ${i + 1}: `}${esc(sessie.titel || "")}` : ""}</p>

        ${nietNagelopen ? `<div class="card waarschuwing" role="alert">
          <p class="m0"><strong>${nietNagelopen} van ${lijst.length} stoffen is nog niet tegen de SDS nagelopen.</strong>
          Deze gegevens zijn een startpunt, geen veiligheidsinformatieblad. Concentratie, leverancier en formulering
          veranderen de H-zinnen. Controleer de fles die je vastpakt.</p></div>` : ""}

        <div class="row" role="group" aria-label="Welke stoffen">
          ${Object.entries(SELECTIES).filter(([k]) => k !== "sessie" || sessies.length).map(([k, t]) =>
            `<button type="button" class="btn btn-klein${k === keuze ? " btn-primary" : ""}" data-actie="kies" data-sel="${k}">${esc(t)}</button>`).join("")}
          ${sessies.length > 1 && keuze === "sessie" ? `<label class="field">Sessie
            <select data-invoer="sessie" aria-label="Labsessie kiezen">${sessies.map((s, n) =>
              `<option value="${n}"${n === i ? " selected" : ""}>${esc(sessieLabel(s, n))}</option>`).join("")}</select></label>` : ""}
        </div>

        ${!lijst.length ? `<div class="card"><p class="m0">${sessies.length
            ? "Deze sessie noemt nog geen stoffen."
            : "Deze module heeft nog geen labsessies. Zodra je ze invult in het <code>.lab.json</code>-bestand, staat hier per sessie wat je nodig hebt."}</p>
          <p class="src">Hierboven kun je wel de hele bibliotheek bekijken.</p></div>` : `
          <div class="grid-2">
            <div class="card"><h2>Wat trek je aan</h2>
              <p class="m0">${pbm.length ? pbm.map(esc).join(" · ") : "Geen PBM afgeleid uit deze stoffen."}</p></div>
            <div class="card"><h2>Afvalvaten</h2>
              ${afval.size ? `<ul class="m0">${[...afval].map(([vat, ss]) =>
                `<li><strong>${esc(vat)}</strong>: ${ss.map(s => esc(s.naam)).join(", ")}</li>`).join("")}</ul>`
                : `<p class="m0">Geen afvalvat ingevuld.</p>`}</div>
          </div>
          ${tabel(lijst)}`}

        <p class="src">Bron: data/stoffen.json. Een stof staat daar één keer, dus een correctie werkt in elke module door.</p>`;

      acties(main, {
        kies: el => { params = { ...params, sel: el.dataset.sel }; zetParams(params); teken(); },
        sessie: el => { params = { ...params, sessie: el.value }; zetParams(params); teken(); }
      }, signal);
    };

    zetUpdate(p => { params = p; teken(); });
    teken();
  }
};
