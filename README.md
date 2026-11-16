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

## Vraagtypes in de oefentoets
Opgezet naar het model van de officiële Remindo-toetsen: punten per vraag, een cijfer in plaats van een percentage, en een terugkoppelingsrapportage per onderdeel.

- **Meerkeuze** (1 punt, net als in de officiële toets) – vier of vijf antwoorden, één juist. Varianten: gewone vraag, invulvraag met weggelaten term, "… *behalve*" (de rest hoort bij het onderwerp, één niet) en "Geen van de andere antwoorden" als juist antwoord.
- **Open vraag** (1–4 punten) – je typt je antwoord in een tekstvak, bekijkt daarna het antwoordmodel en vinkt per kernpunt aan of het erin stond. Elk kernpunt is één punt, dus het puntenmodel laat zien waar het verschil tussen bijvoorbeeld 2 en 3 punten zit. Het antwoordmodel wordt automatisch in kernpunten gesplitst (alinea's, opsommingen of zinnen).
  Onder het tekstvak staat een woord- en tekenteller, zoals in de officiële toets.
  Getypte antwoorden worden bewaard: de laatste drie pogingen per vraag, zichtbaar onder Voortgang › Mijn antwoorden en meegenomen in de export. Bij een herhaling zie je je vorige antwoord boven het invoerveld.
- **Casus** – deelvragen A, B, C, D bij één situatie, met meerkeuze en open door elkaar; de casustekst en het totaal aantal punten blijven boven elke deelvraag staan.

De verdeling stel je per toets in met drie schuiven. Kan een type niet gevuld worden (te weinig afleiders of te weinig samenhangende vragen), dan verdeelt de toets het over de andere types en meldt dat bij het resultaat. Het cijfer is 1 + 9 × (punten / maximum).

Een module kan eigen casussen meeleveren via `casussen: [{titel, tekst, vragen: [kaart-id]}]` in het moduledata-bestand. Zonder die lijst stelt de toets casussen samen uit kaarten die dezelfde les en hetzelfde onderwerp delen.

## Toegankelijkheid
Semantische HTML, skip-link, volledige toetsenbordbediening (flashcards: spatie = omdraaien, 1–4 = beoordelen), zichtbare focus, ARIA-live-meldingen, voldoende kleurcontrast in licht en donker thema.
