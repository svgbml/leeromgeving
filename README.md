# Leeromgeving BML

Toegankelijke studiewebsite per Avans-module: **Vandaag**-overzicht over alle modules, **begrippenlijst**, **flashcards** (spaced repetition), **oefentoetsen** (meerkeuze, open en casus, optioneel met tijdslimiet), **voortgang** per onderwerp, een **verslag** om na te lezen en **video-uitleg** per les.

Live: https://svgbml.github.io/leeromgeving/

## Modules
| Module | Periode | Kaarten | Soort | Herkomst |
|---|---|---|---|---|
| Biomoleculen en labveiligheid | Jaar 1 · Periode 1 | 465 | begrip → uitleg | automatisch uit 18 slidedecks + kernvragen |
| De cel – LU1 Microbiologie | Jaar 1 · Periode 1 | 157 | begrip → uitleg | met de hand geschreven + kernvragen |
| Celbiologie en datavaardigheden | Jaar 1 · Periode 2 | 368 | begrip → uitleg | automatisch uit 12 slidedecks + kernvragen |
| Eiwitten in de praktijk | Jaar 1 · Periode 3 | 330 | begrip → uitleg | automatisch uit 11 slidedecks + kernvragen |
| DNA ontrafeld | Jaar 1 · Periode 4 | 305 | begrip → uitleg | automatisch uit 13 slidedecks + kernvragen |
| Eiwitten in interactie | Jaar 2 · Periode 1 | 140 | begrip → uitleg | uit 4 slidedecks (LU1) en het werkplan van het project |
| DNA kraak de code | Jaar 2 · Periode 2 | 670 | vraag → antwoord | uit eigen flashcards + kernvragen uit het verslag |

Data staat per periode in `data/jaar-<j>/periode-<p>/`.

## Hoe het werkt
- Statische site (HTML/CSS/JS, geen build-stap), installeerbaar als app (PWA) en offline bruikbaar.
- Data per module in `data/jaar-<j>/periode-<p>/<module>.json`; lijst van modules in `data/modules.json`.
- Twee kaartsoorten: begripkaarten (meerkeuzetoets) en vraagkaarten (`kaarttype: "vraag"`, zelftoets met open vragen).
- Elk begrip: `uitleg` (wat op de slide staat), `aanvulling` (extra uitleg, niet letterlijk op de slide) en bron (bestand + slidenummers).
- Voortgang staat in `localStorage` van de browser; exporteren/importeren via de pagina Voortgang.
- Deploy: GitHub Actions bouwt `_site/` en zet die op GitHub Pages bij elke push naar `main`, na tests.

## Module toevoegen
1. Maak `data/jaar-<j>/periode-<p>/<id>.json` volgens `data/schema/module.schema.json`
   (voorbeeld: `data/jaar-1/periode-1/de-cel.json`; uit slides: `tools/build_slidekaarten.py`).
2. Voeg de module toe aan `data/modules.json`.
3. Markeer organisatorische kaarten: `python tools/markeer_lesinfo.py --schrijf` (zie hieronder).
4. Controleer: `npm run check`. De service worker bouwt `npm run build` vanzelf.

## Lesinfo: kaarten die niet in de toets horen
Slides bevatten ook organisatie: hoeveel bijeenkomsten er zijn, wanneer de toetsen zijn, huiswerk,
deadlines, inloggen op Brightspace/Knowingo/LabArchives, eisen aan een presentatie. Zulke kaarten krijgen
`"lesinfo": true`. Ze komen **niet** in de oefentoets (ook niet als afleider of achtergrond bij een casus)
en niet in de flashcards, en tellen niet mee in de voortgang. In de begrippenlijst staan ze verborgen
achter "Ook lesinfo tonen".

`tools/markeer_lesinfo.py` zet de markering op basis van vaste regels; zonder `--schrijf` laat het alleen
zien wat er zou veranderen. Klopt een regel niet voor een kaart, zet die dan in `WEL` of `NIET` in het script.
Onderwerpen als "Opzet" of "Toetsing" vallen in de app ook zonder markering af.

## Functies
- **Vandaag**: wat er klaarstaat over alle modules, dagdoel, reeks en heatmap van studiedagen, weekoverzicht,
  cijfertrend, toetsdatum met planner (hoeveel nieuwe kaarten per dag) en prognose voor de komende week.
- **Begrippen**: zoeken (ook op Engelse termen), filters in de URL, gemarkeerde kaarten, notities, begriplinks met
  uitleg in een popover, "zie ook", mindmap per les, compacte weergave, afdrukken, export naar CSV en Anki,
  video-uitleg per les en "Meld een fout" per kaart.
- **Flashcards**: FSRS (het herhaalschema van Anki), omgekeerde kaarten, invulkaarten, antwoord typen met
  typfouttolerantie, ongedaan maken, alle modules tegelijk herhalen, "leer deze les", filteren op meerdere
  lessen en onderwerpen tegelijk, nieuwe kaarten in slidevolgorde, hulp bij moeilijke kaarten, vegen op de
  telefoon en een focusmodus.
- **Oefentoets**: meerkeuze, open, casus, koppelen, volgorde, rekenen (getallen elke keer anders) en aanwijzen in
  een figuur; meerdere lessen en onderwerpen tegelijk selecteren; examensimulatie met navigatie en markeren;
  toets hervatten na herladen; foutenboek; zelfde vragen opnieuw; gedeelde toets via een link; hulp bij het
  nakijken van open vragen; normering met cesuur en gokcorrectie.
- **Synchroniseren** via een map (OneDrive/Drive) of een privé GitHub Gist, zonder server.
- **Weergave**: lettergrootte, Atkinson Hyperlegible of Lexend, hoog contrast, donkere modus, animaties aan of uit.
- **App**: installeerbaar, offline, melding bij een nieuwe versie, snelkoppelingen, tekst delen naar de app.

## Ontwikkelen
Draaien kan zonder build: de browser laadt `app.js` als ES-module (`npm run bron` en open http://localhost:4173).
De gedeployde site wordt gebouwd in `_site/` (`npm run build`): data samengevoegd met correcties, kleiner gemaakt,
met een index voor Vandaag, vooraf berekende afleiders en een service worker.

| Map / bestand | Inhoud |
|---|---|
| `app.js` | opstarten, sneltoetsen, mijlpalen |
| `src/core/` | opslag (`store.js`), router, synchroniseren, PWA, toets bouwen in een Web Worker |
| `src/domain/` | pure logica zonder DOM, getest: `srs.js` (FSRS), `quiz.js`, `kaarten.js`, `rekenen.js`, `planner.js`, `progress.js`, `stats.js`, `text.js` |
| `src/views/` | de schermen, pas geladen als je ze opent |
| `src/ui/` | animaties, grafiekjes, mindmap, vegen, kaartonderdelen |
| `data/` | moduledata, `volgordes.json` (procedures), `videos.json`, `woordenlijst.json`, `schema/`, `voorbeeld/` |
| `tools/` | build, datacontrole, kwaliteitsrapport, lesinfo markeren, iconen, testserver |
| `tests/` | unit-tests (`*.test.js`) en end-to-end-tests met toegankelijkheidscontrole (`e2e/`) |

```
npm test            # unit-tests
npm run check       # moduledata controleren
npm run kwaliteit   # verbeterpunten per module
npm run build       # _site bouwen
npm run e2e         # end-to-end en toegankelijkheid (na build)
npm run lighthouse  # prestatiebudget (na build)
```
GitHub Actions draait dit allemaal vóór elke deploy. Een module toevoegen of kaarten verbeteren: zie `BIJDRAGEN.md`.
Ideeën en wat er al gedaan is: `IDEEEN.md` en `DEVELOPMENT.md`.

## Slides en privacy
Elke kaart noemt het slidebestand waar hij vandaan komt. De slides staan in Google Drive, gedeeld als
"iedereen met de link kan bekijken". Een klik op de bron opent de slides **in de app**, in Drive's kale
voorbeeldweergave (`/preview`) in een afgeschermd frame:
- de Drive-pagina met de naam van de eigenaar wordt niet geopend;
- de knop "openen in nieuw venster" in de viewer werkt niet (het frame mag geen vensters openen);
- de app stuurt geen verwijzing (referrer) mee.

Wat dit **niet** afschermt: de bestands-id's staan in de openbare moduledata. Wie zo'n id zelf in een
Drive-adres plakt, ziet de eigenaar van het bestand. Volledig onzichtbaar blijf je alleen als een apart
Google-account (alleen voor de leeromgeving) eigenaar is van de bestanden. Zet de bestanden dan in dat
account, deel ze met "iedereen met de link", en vervang de links in `slides` van elke module.

## Video's
`data/videos.json` bevat per les twee tot vier video's (Nederlands en Engels), gekozen uit YouTube-zoekresultaten en
gecontroleerd. Ze spelen af via youtube-nocookie.com en laden pas als je op afspelen klikt. Bij elk onderwerp in de
begrippenlijst staat daarnaast een ▶-link die YouTube doorzoekt op dat onderwerp.
De tab **Video's** toont alle video's van de gekozen module bij elkaar, per les, met een chip om op één les te
filteren en per les zoeklinks naar YouTube. Staat "Video's" uit in Instellingen, dan toont de tab dat en verder niets.

## Verslag
De tab **Verslag** toont de uitgebreide samenvatting van de gekozen module (`data/verslagen/<module>.md`, pad in
`data/modules.json`) in de site zelf: inhoudsopgave per les, zoeken met markering en per les knoppen naar de
flashcards en de oefentoets. Voor DNA kraak de code is dat een eigen document; de andere verslagen maakt
`tools/maak-verslag.js` uit de kaarten van de module.

## Animaties
Paginawissels (View Transitions API), flashcards die inschuiven en omdraaien, antwoorden die oplichten of schudden,
een cijfer dat optelt, confetti bij een 8 of hoger of een afgeronde sessie, en doorlopende voortgangsbalken.
Onder in de pagina staat **Animaties: Zoals het systeem / Aan / Uit**. "Zoals het systeem" volgt
"beweging verminderen" van Windows, macOS, iOS of Android; met Uit werkt alles hetzelfde, alleen zonder beweging.

## Uiterlijk
Thema **Labwit** (IBM Plex Sans, zelf gehost in `fonts/` zodat het offline werkt; petrol-accent) met **donkere modus**: volgt standaard de systeeminstelling; de knop rechtsboven onthoudt je keuze per browser.

## Vraagtypes in de oefentoets
Opgezet naar het model van de officiële Remindo-toetsen: punten per vraag, een cijfer in plaats van een percentage, en een terugkoppelingsrapportage per onderdeel.

- **Meerkeuze** (1 punt, net als in de officiële toets) – vier of vijf antwoorden, één juist. Bij vraagkaarten
  staan de antwoorden voluit en zijn de afleiders ongeveer even lang, zodat de lengte het antwoord niet verraadt. Varianten: gewone vraag, invulvraag met weggelaten term, "… *behalve*" (de rest hoort bij het onderwerp, één niet) en "Geen van de andere antwoorden" als juist antwoord.
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
Elke kaart noemt het bronbestand; via `slides` in de moduledata opent een klik de slides in de app
(zie Slides en privacy). De casus gebruikt dezelfde viewer onder **Hulpmiddel**.

## Toegankelijkheid
Semantische HTML, skip-link, volledige toetsenbordbediening (flashcards: spatie = omdraaien, 1–4 = beoordelen), zichtbare focus, ARIA-live-meldingen, voldoende kleurcontrast in licht en donker thema.
