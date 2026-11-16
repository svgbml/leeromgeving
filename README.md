# Leeromgeving BML

Toegankelijke studiewebsite per Avans-module: **begrippenlijst**, **flashcards** (spaced repetition), **oefentoetsen** (meerkeuze, optioneel met tijdslimiet) en **voortgang** per onderwerp.

Live: https://svgbml.github.io/leeromgeving/

## Modules
| Module | Periode | Kaarten | Soort | Herkomst |
|---|---|---|---|---|
| Biomoleculen en labveiligheid | Jaar 1 · Periode 1 | 401 | begrip → uitleg | automatisch uit 18 slidedecks |
| De cel – LU1 Microbiologie | Jaar 1 · Periode 1 | 133 | begrip → uitleg | met de hand geschreven |
| Celbiologie en datavaardigheden | Jaar 1 · Periode 2 | 325 | begrip → uitleg | automatisch uit 12 slidedecks |
| Eiwitten in de praktijk | Jaar 1 · Periode 3 | 292 | begrip → uitleg | automatisch uit 11 slidedecks |
| DNA ontrafeld | Jaar 1 · Periode 4 | 263 | begrip → uitleg | automatisch uit 13 slidedecks |
| DNA kraak de code | Jaar 2 · Periode 2 | 398 | vraag → antwoord | uit eigen flashcards |

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
- **Casus** – deelvragen A, B, C, D bij één situatie, met meerkeuze en open door elkaar. Boven elke deelvraag blijft staan: waar de casus over gaat en bij welke les die hoort, het totaal aantal punten, **Achtergrond uit de lesstof** (twee feiten uit kaarten van dezelfde les die zelf geen deelvraag zijn), een eventuele figuur, en een link naar de slides van die les.

De verdeling stel je per toets in met drie schuiven. Kan een type niet gevuld worden (te weinig afleiders of te weinig samenhangende vragen), dan verdeelt de toets het over de andere types en meldt dat bij het resultaat. Het cijfer is 1 + 9 × (punten / maximum).

Een module kan eigen casussen meeleveren via `casussen[]` in het moduledata-bestand:

```json
{ "titel": "Casus · Southern blot",
  "tekst": "Je hebt genomisch DNA geknipt met EcoRI en ...",
  "achtergrond": ["De probe is gelabeld met ...", "..."],
  "afbeelding": { "src": "img/southern-blot.png", "alt": "Schema van een Southern blot",
                  "bijschrift": "Eigen schema, naar Les 7" },
  "bron": "Les_7_hybridisatie_DNA_module_jaar_2_periode_2_docentenversie.docx",
  "vragen": ["dna-123", "dna-124"] }
```

Zonder die lijst stelt de toets casussen zelf samen uit kaarten die dezelfde les en hetzelfde onderwerp
delen; de achtergrond komt dan uit andere kaarten van die les. Kaarten over lesopzet of toetsindeling
worden daarbij overgeslagen.

Zet een eigen figuur in `img/` en verwijs ernaar met `afbeelding.src`. Figuren uit de collegeslides staan
niet in deze repo (auteursrecht); daarvoor verwijst de casus naar het slidebestand zelf.

## Voortgang
Naast gezien/beheerst per les of onderwerp staan er twee tabellen:

- **Per vraagtype** – hoeveel kaarten elk type kunnen opleveren ("In database"), hoeveel vragen van dat type
  je hebt gehad, en het percentage behaalde punten. Meerkeuze vraagt drie bruikbare afleiders, een
  casusdeelvraag minstens twee kaarten met dezelfde les en hetzelfde onderwerp; daarom verschillen de aantallen.
- **Per les of onderwerp** – aantal kaarten, gezien, beheerst, hoeveel ervan in een toets zijn gevraagd en
  het percentage behaalde punten.

## Kaarten uit slides genereren
`tools/build_slidekaarten.py` maakt uit geëxtraheerde slidetekst een moduledata-bestand: per inhoudelijke
slide één kaart, titel als begrip en de bullets als uitleg. Organisatorische slides (programma, leerdoelen,
huiswerk), figuurbijschriften, literatuurverwijzingen en dubbele slides vallen af; sectiekoppen en de
agenda-slide leveren het onderwerp. De tekst komt uit `tools/extract.py` (python-pptx), die per slide titel,
bullets, tabellen en notities uitleest. Deze kaarten volgen de slides letterlijk — naslag, geen herschrijving.

## Bronnen en slides
Elke kaart noemt het bronbestand. Staat dat bestand in `slides` van de moduledata, dan is de bronvermelding
een link naar dat bestand in Google Drive (gedeeld als "iedereen met de link kan lezen"). De casus gebruikt
dezelfde link onder **Hulpmiddel**.

## Toegankelijkheid
Semantische HTML, skip-link, volledige toetsenbordbediening (flashcards: spatie = omdraaien, 1–4 = beoordelen), zichtbare focus, ARIA-live-meldingen, voldoende kleurcontrast in licht en donker thema.
