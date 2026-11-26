// Het slot voor de schermen met lesmateriaal van de opleiding.
//
// De site staat openbaar; de handleidingen en beoordelingsformulieren staan daarom versleuteld in
// de repo (zie tools/versleutel.js). Dit is het schermpje dat om het wachtwoord vraagt. Eén keer
// per tabblad: daarna onthoudt de kluis de sleutel tot je het tabblad sluit.
import { esc } from "../domain/text.js";
import { ontgrendel } from "../core/kluis.js";
import { $, acties, say } from "../core/dom.js";

export const slotKaart = wat => `<div class="card slot">
  <h2>Hier staat lesmateriaal van de opleiding</h2>
  <p class="m0">Achter dit slot: ${esc(wat)}. Versleuteld, omdat de code van deze site openbaar op
    GitHub staat en dit materiaal van de opleiding is. Typ het wachtwoord om het te lezen.</p>
  <p class="row m0 slot-rij">
    <label class="field">Wachtwoord
      <input type="password" data-slot="wachtwoord" autocomplete="current-password"
        aria-describedby="slot-stand" enterkeyhint="go">
    </label>
    <button type="button" class="btn btn-primary" data-actie="ontgrendel">Openen</button>
  </p>
  <p class="src" id="slot-stand" role="status">Je typt dit één keer per tabblad. De sleutel blijft
    in dit tabblad en gaat niet mee in de synchronisatie.</p>
</div>`;

// Hangt het slot aan een scherm. `klaar` wordt aangeroepen zodra de kluis open is, zodat het
// scherm zichzelf opnieuw kan tekenen.
export function slotActies(root, { signal, klaar }) {
  const melden = tekst => { const p = $("#slot-stand", root); if (p) p.textContent = tekst; };
  let bezig = false;

  const proberen = async el => {
    if (bezig) return;                 // tweemaal tegelijk afleiden duurt dubbel zo lang
    bezig = true;
    try { await poging(el); } finally { bezig = false; }
  };

  const poging = async el => {
    const veld = $("[data-slot=wachtwoord]", root);
    const wachtwoord = veld?.value?.trim();
    if (!wachtwoord) { melden("Vul eerst het wachtwoord in."); veld?.focus(); return; }
    if (el) el.disabled = true;
    melden("Bezig met openen…");
    let gelukt = false;
    try { gelukt = await ontgrendel(wachtwoord); }
    catch { gelukt = false; }
    if (signal?.aborted) return;
    if (el) el.disabled = false;
    if (gelukt) { say("Geopend"); klaar(); return; }
    melden("Dat wachtwoord klopt niet.");
    if (veld) { veld.value = ""; veld.focus(); }
  };

  acties(root, { ontgrendel: el => proberen(el) }, signal);
  // Enter in het veld doet hetzelfde als de knop; zonder dit is het op een telefoon onhandig.
  root.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches("[data-slot=wachtwoord]")) {
      e.preventDefault();
      proberen($("[data-actie=ontgrendel]", root));
    }
  }, { signal });
}
