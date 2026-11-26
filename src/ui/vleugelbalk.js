// Vleugelkiezer boven de tabbalk, en de tabbalk die per vleugel wisselt (OVERHAUL.md › B0).
// De theorietabs blijven de statische <nav> uit index.html: die staat er bij het eerste beeld al,
// houdt zijn iconen en hoeft nooit opnieuw getekend te worden. De andere vleugels krijgen een
// tweede <nav> die JS vult. Zo staat elke tabbalk precies één keer in de code.
import { VLEUGELS, tabsVan, routeVan, STANDAARD_VLEUGEL } from "../domain/vleugels.js";
import { esc } from "../domain/text.js";
import { $ } from "../core/dom.js";

// Iconen voor de lab-, project- en PPO-tabs; de theorietabs hebben de hunne in index.html.
const ICOON = {
  voorbereiding: '<path d="M6 3h12v5l-4 4 4 4v5H6v-5l4-4-4-4z"/>',
  stoffen: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10"/>',
  protocollen: '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h5"/>',
  analyse: '<path d="M4 19V9M10 19V5M16 19v-6M21 19H3"/>',
  verhaal: '<path d="M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5zM19 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  doel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  inleveren: '<path d="M12 3v12M8 11l4 4 4-4M4 19h16"/>',
  rubrics: '<path d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14"/>',
  opdrachten: '<path d="M5 6h14M5 12h14M5 18h14M3 6h.01M3 12h.01M3 18h.01"/>',
  eisen: '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 12l2 2 4-4"/>',
  bewijs: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  deadlines: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 11h16"/>'
};

export function tekenVleugelkiezer(huidige) {
  const vak = $("#vleugelkiezer");
  if (!vak) return;
  vak.innerHTML = Object.entries(VLEUGELS).map(([id, v]) =>
    `<a class="vleugel" href="#/${esc(routeVan(id, tabsVan(id)[0].id))}" data-vleugel="${esc(id)}"${
      id === huidige ? ' aria-current="true"' : ""}>${esc(v.naam)}<span class="vleugel-lu">${esc(v.lu)}</span></a>`).join("");
}

let getekend = null;
export function tekenTabs(vleugel) {
  const vast = $("#tabs-theorie"), eigen = $("#tabs-vleugel");
  if (!vast || !eigen) return;
  const theorie = vleugel === STANDAARD_VLEUGEL;
  vast.hidden = !theorie;
  eigen.hidden = theorie;
  if (theorie || vleugel === getekend) return;
  eigen.innerHTML = tabsVan(vleugel).map(t => {
    const route = routeVan(vleugel, t.id);
    return `<a href="#/${esc(route)}" data-route="${esc(route)}">${
      ICOON[t.id] ? `<svg aria-hidden="true" viewBox="0 0 24 24">${ICOON[t.id]}</svg>` : ""
      }<span class="tab-t">${esc(t.t)}</span>${t.kort ? `<span class="tab-k">${esc(t.kort)}</span>` : ""}</a>`;
  }).join("");
  getekend = vleugel;
}
