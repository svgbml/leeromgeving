// Tijdelijk scherm voor de lab-, project- en PPO-pagina's: de navigatie werkt al (B0), de inhoud
// komt in B2 tot B4. Eén scherm bedient alle nieuwe routes; het leest welke pagina gevraagd is.
import { esc } from "../domain/text.js";
import { VLEUGELS, vleugelVan, tabsVan } from "../domain/vleugels.js";
import { app } from "../core/store.js";

const BATCH = { lab: "B2", project: "B3", ppo: "B4" };

export default {
  mount({ main }) {
    const route = app.route || "";
    const vleugel = vleugelVan(route);
    const tabId = route.split("/")[1] || "";
    const tab = tabsVan(vleugel).find(t => t.id === tabId);
    const v = VLEUGELS[vleugel];
    main.innerHTML = `
      <h1>${esc(tab?.t || v.naam)}</h1>
      <p class="sub">${esc(v.naam)}${v.modulevrij ? "" : ` · ${esc(app.mod?.titel || "")}`}</p>
      <div class="card">
        <p class="m0">Deze pagina is nog niet ingericht. De navigatie en de data-indeling staan er
        (batch B0); de inhoud volgt in batch ${esc(BATCH[vleugel] || "?")}.</p>
        <p class="src">Zie OVERHAUL.md voor wat hier komt te staan.</p>
      </div>`;
  }
};
