# Leeromgeving BML

Toegankelijke studiewebsite per Avans-module: **begrippenlijst**, **flashcards** (spaced repetition), **oefentoetsen** (meerkeuze, optioneel met tijdslimiet) en **voortgang** per onderwerp.

Live: https://svgbml.github.io/leeromgeving/

## Modules
| Module | Periode | Kaarten | Soort |
|---|---|---|---|
| De cel – LU1 Microbiologie | Jaar 1 · Periode 1 | 133 | begrip → uitleg |
| DNA kraak de code | Jaar 2 · Periode 2 | 398 (13 lessen) | vraag → antwoord |

Data staat per periode in `data/jaar-<j>/periode-<p>/`.

## Hoe het werkt
- Statische site (HTML/CSS/JS, geen build-stap), installeerbaar als app (PWA) en offline bruikbaar.
- Data per module in `data/jaar-<j>/periode-<p>/<module>.json`; lijst van modules in `data/modules.json`.
- Twee kaartsoorten: begripkaarten (meerkeuzetoets) en vraagkaarten (`kaarttype: "vraag"`, zelftoets met open vragen).
- Elk begrip: `uitleg` (wat op de slide staat), `aanvulling` (extra uitleg, niet letterlijk op de slide) en bron (bestand + slidenummers).
- Voortgang staat in `localStorage` van de browser; exporteren/importeren via de pagina Voortgang.
- Deploy: GitHub Actions → GitHub Pages bij elke push naar `main`.

## Module toevoegen
1. Maak `data/<id>.json` in hetzelfde formaat als `data/de-cel.json` (zie `tools/build_begrippen.py`).
2. Voeg de module toe aan `data/modules.json`.
3. Voeg het bestand toe aan de lijst in `sw.js` en verhoog de cacheversie.

## Uiterlijk
Thema **Labwit** (IBM Plex Sans, petrol-accent) met **donkere modus**: volgt standaard de systeeminstelling; de knop rechtsboven onthoudt je keuze per browser.

## Toegankelijkheid
Semantische HTML, skip-link, volledige toetsenbordbediening (flashcards: spatie = omdraaien, 1–4 = beoordelen), zichtbare focus, ARIA-live-meldingen, voldoende kleurcontrast in licht en donker thema.
