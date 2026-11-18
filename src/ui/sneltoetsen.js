// Overzicht van alle sneltoetsen (#51), te openen met "?".
import { dialoog } from "./kaart-extra.js";

export const SNELTOETSEN = [
  ["?", "Dit overzicht"],
  ["g v / g b / g f / g t / g p", "Naar Vandaag, Begrippen, Flashcards, Toets, Voortgang"],
  ["g m / g s", "Naar Video's, Verslag"],
  ["/", "Zoeken in de begrippenlijst"],
  ["spatie of Enter", "Flashcard omdraaien"],
  ["1 2 3 4", "Opnieuw, Moeilijk, Goed, Makkelijk"],
  ["z", "Laatste beoordeling ongedaan maken"],
  ["s", "Kaart markeren met een ster"],
  ["n", "Notitie bij de kaart"],
  ["f", "Focusmodus aan of uit (Esc stopt)"],
  ["Esc", "Dialoog of focusmodus sluiten"]
];

export function toonSneltoetsen() {
  dialoog(`<h2 class="kop0">Sneltoetsen</h2><table class="sneltoets-tabel"><tbody>${SNELTOETSEN.map(([t, w]) => `<tr><th scope="row"><kbd>${t}</kbd></th><td>${w}</td></tr>`).join("")}</tbody></table>`);
}
