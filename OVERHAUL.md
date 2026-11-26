# Overhaul: van theorie-app naar hele opleiding

**Stand 26-11-2026.** B0 (v1.1.0), B1 (v1.1.1), B2 (v1.1.2), B3 (v1.2.0) en B4 (v1.3.0) zijn
gebouwd. Elke route uit de vleugeltabel heeft nu een eigen scherm; alleen B5 (samenhang) staat
nog open.

Drie dingen die de bron niet heeft, en die daarom niet gebouwd zijn:

- **Inleverdata.** Geen van de 582 opgehaalde Brightspace-items heeft een datum; die staan in de
  opdrachteigenschappen en de cursusagenda, en die zijn niet meegekomen. Het aftellen van 3.4 is
  daarom niet gebouwd: het scherm zegt dat Brightspace de enige plek is waar de deadline klopt.
  Dat geldt ook voor de PPO-tab Deadlines: het informatiedocument noemt wel de fase en de periode,
  maar geen datum.
- **Samenvattingen van de projectcolleges (3.7).** De PowerPoints van het project zijn niet
  gedownload, dus er is geen slidetekst om samen te vatten. Het scherm toont de cursuspagina's die
  er wél zijn en zegt wat ontbreekt.
- **Een koppeling tussen een PPO-eis en een opdracht (4.2).** De opleiding zegt wélke soorten
  bewijs meetellen, niet welk stuk bij welke pijler hoort. Je hangt je werk dus zelf aan een
  pijler; het afvinken gaat daarna automatisch via de opdrachtstatus.

Ook niet elke module heeft projectkeuzes: alleen de Cel, Eiwitten in de praktijk en Eiwitten in
interactie hebben mappen die *Project &lt;naam&gt;* heten. Waar die ontbreken blijft de lijst leeg.

Nu is de app één ding per module: theoriekaarten uit de slides (LU1). De opleiding is drie dingen:
**LU1 theorie**, **LU2 lab**, **LU3 project** — plus **PPO/portfolio**, dat over alle modules heen loopt.
Dit plan maakt van elke module drie vleugels en zet PPO ernaast, zonder de theoriekant te veranderen.

---

## 1. Nieuwe structuur

```
Leeromgeving BML
├── Module (jaar · periode)           ← de modulekiezer blijft wat hij is
│   ├── Theorie   (LU1)   ongewijzigd: Vandaag, Begrippen, Flashcards, Oefentoets, Video's, Verslag
│   ├── Lab       (LU2)   Voorbereiding · Stoffen · Protocollen · Analyse
│   └── Project   (LU3)   per project: Verhaal · Doel & hypothese · Protocollen ·
│                          Inleveren · Rubrics · Opdrachten · Samenvattingen
└── PPO (modulevrij)      Eisen · Bewijsstukken · Deadlines
```

Twee keuzes die de app onthoudt:

| Keuze | Sleutel | Gedrag |
| --- | --- | --- |
| Module | `leeromgeving:module` (bestaat al) | zoals nu |
| Vleugel | `leeromgeving:vleugel` | laatst gebruikte vleugel per module |
| Project | `leeromgeving:project` | **eenmalig kiezen**, daarna nooit meer vragen; knop "ander project" op elke projectpagina en in Instellingen |

De projectkeuze wordt per module opgeslagen (`{ "dna-ontrafeld": "waterkwaliteit" }`), niet globaal —
in jaar 2 hoort een ander project bij een andere module.

---

## 2. Routing

De router splitst nu op `?` en kent één pad. Hij krijgt één segment extra:

```
#/begrippen                 → theorie (geen prefix; bestaande links en bladwijzers blijven werken)
#/lab/voorbereiding?les=2
#/lab/stoffen
#/project/doel
#/project/opdrachten?nr=3
#/ppo/eisen
```

`lees()` geeft `{ vleugel, route, params }`; schermen worden geregistreerd als `"lab:stoffen"`.
Theorie is de standaardvleugel, dus elke bestaande URL, test en sneltoets blijft geldig.
Sneltoetsen worden `g` + vleugelletter + pagina (`g l s` = lab → stoffen), met `?` als overzicht.

---

## 3. Datamodel

Alles blijft statische JSON/Markdown op GitHub Pages, met JSON Schema + validatie in CI, zoals nu.

```
data/
├── modules.json                      ← krijgt per module een "vleugels"-blok
├── jaar-1/periode-1/
│   ├── de-cel.json                   ← theorie, ongewijzigd
│   ├── de-cel.lab.json               ← labsessies van deze module
│   └── de-cel.project.json           ← welke projecten bij deze module horen
├── stoffen.json                      ← centrale stoffenbibliotheek (één keer, hergebruikt)
├── protocollen/<id>.md               ← één protocol = één bestand, hergebruikt door lab én project
├── projecten/<project-id>/
│   ├── project.json                  ← verhaal, doel, hypothese, protocollen, opdrachten, rubrics
│   ├── verhaal.md
│   ├── samenvattingen/<college>.md   ← slides → samenvatting, zoals de LU1-verslagen
│   └── rubrics/<opdracht>.json
└── ppo/
    ├── ppo.json                      ← eisen, bewijsstukken, deadlines
    └── eisen.md
```

**`modules.json` per module erbij:**

```json
"vleugels": {
  "theorie": { "bestand": "data/jaar-1/periode-1/de-cel.json", "verslag": "data/verslagen/de-cel.md" },
  "lab":     { "bestand": "data/jaar-1/periode-1/de-cel.lab.json" },
  "project": { "bestand": "data/jaar-1/periode-1/de-cel.project.json" }
}
```

De oude velden `bestand` en `verslag` blijven als alias voor `vleugels.theorie` werken, zodat de
migratie in één stap kan maar niet hoeft.

**Labsessie (`*.lab.json`):**

```json
{ "sessies": [{
  "nr": 1, "titel": "Gramkleuring", "datum": "2026-09-18", "duur": "3 uur",
  "voorbereiding": { "samenvatting": "…", "waarom": "…", "kaarten": ["lab-001"], "toets": ["lab-v-001"] },
  "stoffen": ["kristalviolet", "lugol", "ethanol-96", "safranine"],
  "protocollen": ["gramkleuring"],
  "analyse": { "uitleg": "…", "eisen": [{ "id": "a1", "tekst": "Foto van elk preparaat met vergroting" }] }
}]}
```

**Stof (`stoffen.json`), één keer invullen en overal hergebruikt:**

```json
{ "id": "ethanol-96", "naam": "Ethanol 96%", "cas": "64-17-5",
  "ghs": ["GHS02", "GHS07"], "signaal": "Gevaar",
  "h": ["H225", "H319"], "p": ["P210", "P280", "P305+P351+P338"],
  "pbm": ["handschoenen (nitril)", "veiligheidsbril"],
  "opslag": "brandkast", "afval": "organisch oplosmiddel", "bron": "SDS Merck 2024" }
```

Zo staat elke stof op één plek: verander je een H-zin, dan klopt hij in alle modules.
De bestaande `veiligheidsanalyse`-skill kan de eerste vulling schrijven.

---

## 4. Wat de kennisgraaf hierover zei

Op 25-11-2026 is de hele repo door `/graphify` gehaald (2.248 knopen, 4.937 randen, 154 clusters).
Twee uitkomsten veranderen dit plan, dus ze staan vóór de roadmap:

**1. Lab- en projectstof zit al ín de theoriedecks.** `eiwitten-in-de-praktijk` is Les 1–6 theorie en
Les 7–11 onderzoeksplan, materiaal en methode, ELISA-verwerking en microscopiefotografie — inclusief
een veiligheidsanalyse met CAS-nummers en H-codecategorieën. `celbiologie-datavaardigheden` is Les 1–5
celbiologie en Les 6–12 datavaardigheden en chemie. De vleugels bestaan dus al in de inhoud; ze zijn
alleen nergens als zodanig gemarkeerd. Daarom is er een aparte batch **B1 (inhoud splitsen)**: dat is
geen bijzaak van B0, maar het meeste handwerk van de hele overhaul.

**2. De stoffentaxonomie bestaat al.** `biomoleculen-labveiligheid` onderwijst SDS rubriek 2, H-zinnen,
gevarenpictogram, signaalwoord, voorzorgsmaatregelen, PBM en de vier afvalstromen (zuur, basisch,
halogeenarm, halogeenrijk). `data/stoffen.json` moet die veldnamen overnemen in plaats van eigen te
verzinnen, en elk veld op de pagina Stoffen kan linken naar de theoriekaart die het uitlegt.

Twee datafoutjes die de graaf en passant vond, los van deze overhaul: in
`eiwitten-in-de-praktijk.md` noemen alle `#### Kernvraag`-blokken van Les 2–6 de pptx van Les 1 als
bron, en in `celbiologie-datavaardigheden.md` doen álle Kernvraag-kaarten dat. Ziet eruit als een
sjabloonfout in de generator.

---

## 5. Roadmap in batches

Zes batches. Elke batch is apart af te maken en te deployen; binnen een batch kunnen de stappen
meestal dezelfde dag. **Afhankelijk van** zegt welke batch eerst klaar moet zijn.

### B0 · Fundament — *niets zichtbaars, alles erna hangt eraan*
Afhankelijk van: niets · **8–12 uur**

| # | Stap | Werk |
| --- | --- | --- |
| 0.1 | Router: vleugelsegment in `lees()`, schermen als `"lab:stoffen"` | 2 u |
| 0.2 | `vleugels`-blok in `modules.json`, met alias naar de oude `bestand`/`verslag` | 1 u |
| 0.3 | Vleugelkiezer in de header + tabbalk die per vleugel wisselt | 3 u |
| 0.4 | `store.js`: `kiesVleugel()`, `kiesProject()`, voortgang per vleugel gescheiden | 2 u |
| 0.5 | JSON Schema's + `tools/validate-data.js` uitbreiden, lege lab/project-bestanden | 2 u |
| 0.6 | E2E-test: elke bestaande theorie-URL werkt nog precies hetzelfde | 1 u |

### B1 · Inhoud splitsen — *het echte werk, zie §4*
Afhankelijk van: B0 · **12–20 uur, plus 1–3 uur per module**

| # | Stap | Werk |
| --- | --- | --- |
| 1.1 | Per les een `vleugel`-veld ("theorie", "lab", "project") in de moduledata | 2 u |
| 1.2 | `tools/` aanpassen zodat opnieuw genereren dat veld niet wist (via `.overrides.json`) | 3 u |
| 1.3 | De 7 bestaande modules doorlopen en elke les indelen | 1–3 u per module |
| 1.4 | Verslagen per vleugel genereren in plaats van één lange | 3 u |
| 1.5 | De twee bronvermelding-sjabloonfouten uit §4 herstellen | 2 u |

### B2 · Lab — *de grootste winst voor jou*
Afhankelijk van: B0, B1 · **16–24 uur**

| # | Stap | Werk |
| --- | --- | --- |
| 2.1 | `data/stoffen.json` met de veldnamen uit `biomoleculen-labveiligheid` | 3 u |
| 2.2 | Pagina **Stoffen**: GHS-pictogrammen, H/P-zinnen, PBM, afval; filter sessie/module | 4 u |
| 2.3 | Elk stofveld linken naar de theoriekaart die het uitlegt | 2 u |
| 2.4 | **Protocollen** als Markdown via de bestaande renderer + begrip-popovers | 4 u |
| 2.5 | **Voorbereiding**: samenvatting plus flashcards en toets op een eigen labdeck | 4 u |
| 2.6 | **Analyse**: uitwerkuitleg met `rekenen.js` plus afvinkbare eisenlijst | 4 u |
| 2.7 | Stoffen per protocol invullen (doorlopend, per labsessie) | 20 min per sessie |

### B3 · Project
Afhankelijk van: B0, B1, B2 (hergebruikt protocollen) · **16–24 uur**

| # | Stap | Werk | Stand |
| --- | --- | --- | --- |
| 3.1 | Projectkeuze, één keer, per module bewaard, met "ander project" | 3 u | klaar |
| 3.2 | **Verhaal** en **Doel & hypothese** als Markdown-pagina's | 2 u | klaar; doel en hypothese typ je zelf, de bron heeft ze niet |
| 3.3 | **Protocollen** van het project (hergebruikt 2.4) | 1 u | klaar; verwijst naar `.lab.json`, geen tweede lijst |
| 3.4 | **Inleveren**: wat, wanneer, in welke vorm, met aftellen | 3 u | deels: wat en in welke vorm. Geen aftellen — de bron heeft geen datums |
| 3.5 | **Rubrics** met zelfbeoordeling en "wat mist voor het niveau erboven" | 5 u | klaar; de rapportage-rubric draagt een waarschuwing dat zijn niveaus niet betrouwbaar ontleed zijn |
| 3.6 | **Opdrachten** met status te doen / bezig / ingeleverd / beoordeeld | 3 u | klaar; status op opdracht-id, zodat B4 er bewijs uit kan lezen |
| 3.7 | **Samenvattingen** van de projectcolleges via `tools/extract.py` | 3 u | niet gebouwd: de PowerPoints van het project zijn niet opgehaald |

### B4 · PPO
Afhankelijk van: B3 (bewijs komt uit de opdrachtstatus) · **6–9 uur**

| # | Stap | Werk | Stand |
| --- | --- | --- | --- |
| 4.1 | `data/ppo/ppo.json` plus de pagina **Eisen** | 2 u | klaar; per studiejaar de fase, met de twijfel van de bron erbij |
| 4.2 | **Bewijsstukken**: per eis welke opdracht of verslag telt | 3 u | klaar, maar andersom dan gevraagd: zie hieronder |
| 4.3 | Automatisch afvinken zodra een opdracht op "ingeleverd" staat | 2 u | klaar |

Stap 4.2 is niet te bouwen zoals hij er staat: de bron **koppelt eisen niet aan opdrachten**. Het
informatiedocument zegt wélke soorten bewijs meetellen (verslagen, presentaties, feedback,
reflecties), niet welk stuk bij welke pijler hoort. Dat is ook inhoudelijk juist — hetzelfde
verslag kan bij *Ik* of bij *Wij* horen, afhankelijk van wat je eruit haalt. Dus hangt de student
zijn eigen werk aan een pijler, en 4.3 doet de rest: een opdracht die in de projectvleugel op
ingeleverd of beoordeeld staat, telt automatisch als bewijs. "bezig" niet — dan is er nog niets
te laten zien — en zulk werk staat apart als *onderweg*.

De tab **Deadlines** bestaat maar heeft niets om af te tellen: net als bij het project (3.4) staat
er in de bron geen enkele datum. Het scherm geeft per jaar wannéér er beoordeeld wordt, in de
woorden van de opleiding, en zegt dat Brightspace de enige plek is waar de datum klopt.

### B5 · Samenhang
Afhankelijk van: B2, B3, B4 · **9–13 uur**

| # | Stap | Werk |
| --- | --- | --- |
| 5.1 | **Vandaag** als één tijdlijn: herhalingen, labsessies, inleverdata, PPO-deadlines | 4 u |
| 5.2 | **Voortgang** per vleugel, met een rolletje over de hele module | 3 u |
| 5.3 | Zoeken over alle vleugels heen | 4 u |

---

## 6. Hoeveel werk is dit?

**Bouwwerk: ongeveer 70 tot 100 uur.** Dat is de som van de batches hierboven, zonder het invullen van
inhoud. Verdeeld over de batches:

| Batch | Uren | Aandeel |
| --- | --- | --- |
| B0 Fundament | 8–12 | klein, maar blokkeert alles |
| B1 Inhoud splitsen | 12–20 | grootste onzekerheid |
| B2 Lab | 16–24 | grootste opbrengst |
| B3 Project | 16–24 | grootste omvang |
| B4 PPO | 6–9 | klein |
| B5 Samenhang | 9–13 | afronding |

**Daarbovenop komt het invullen, en dat is geen bouwwerk maar typewerk.** Reken op 20 minuten per
stof, 30 tot 60 minuten per protocol, en 1 tot 3 uur per module om de lessen in te delen. Met 7
modules en pakweg 25 stoffen en 15 protocollen is dat nog eens 20 tot 35 uur, verspreid over het jaar.

**Wat de schatting kan laten ontsporen**, in volgorde van waarschijnlijkheid:
1. Stap 1.3 (lessen indelen) hangt ervan af hoe schoon de scheiding per module is. Bij
   `eiwitten-in-de-praktijk` ligt de grens netjes bij Les 7; bij een module waar lab- en theoriestof
   binnen één les door elkaar lopen, is het per kaart in plaats van per les, en dan verdubbelt het.
2. De rubrics (3.5) zijn alleen te bouwen als je ze digitaal hebt. Overtypen uit een pdf is 1 tot 2
   uur per rubric en staat niet in de telling.
3. De PPO-eisen (B4) zijn nu een aanname. Als het per periode verschilt in plaats van één vaste
   lijst, wordt B4 ongeveer anderhalf keer zo groot.

**De korte route**, als je niet alles wilt: B0 plus B2 geeft je de labvleugel en is 24 tot 36 uur.
Dat is het stuk dat je elke week gebruikt. Project en PPO kunnen daarna.

---

## 7. Extra suggesties

Dingen die je niet gevraagd hebt maar die er logisch bij horen. Zeg welke je wilt.

1. **Bench-modus voor protocollen** — stap voor stap, grote letters, afvinkbaar, met timers voor
   incubaties; blijft staan als je de telefoon wegstopt. Dit is waarvoor je zo'n pagina écht opent:
   met natte handschoenen naast de bank.
2. **Sessie-paspoort om mee te nemen** — één printbare A4 per labsessie: stoffen + GHS + protocol in
   het kort + wat je moet vastleggen. Werkt ook offline en op papier.
3. **Startklaar-check** — vóór een sessie: protocol gelezen ✓, voorbereidingstoets ≥ 80% ✓, stoffen
   bekeken ✓. Eén ring op Vandaag die volloopt, zodat je niet onvoorbereid binnenkomt.
4. **Rekenhulp in de voorbereiding** — verdunningen, molariteit, Ct-waarden met je eigen getallen;
   `rekenen.js` kan dit al, het moet alleen op de labpagina staan.
5. **Verslagskelet downloaden** — doel, hypothese, protocol en analyse-eisen samengevoegd tot een
   Markdown-opzet voor je labverslag. Scheelt elke keer hetzelfde overtypen.
6. **Rubric-zelfbeoordeling** — vink per criterium je niveau aan, zie een indicatief cijfer en precies
   wat er mist voor het niveau erboven. Dit is het verschil tussen een rubric lezen en hem gebruiken.
7. **Stoffenkaarten als flashcards** — "welke H-zin hoort bij fenol?" uit dezelfde bibliotheek.
   Nul extra data-invoer, en het is tentamenstof.
8. **Stof-waarschuwing bij protocollen** — een protocol toont bovenaan de pictogrammen van alles wat
   erin voorkomt, voordat je stap 1 leest.
9. **PBM-overzicht per sessie** — alles wat je aan moet trekken, uit de stoffen afgeleid, geen aparte lijst.
10. **Offline voorrang** — de PWA cachet vooruit: het gekozen project en de eerstvolgende labsessie.
    In een labkelder heb je geen bereik.
11. **Begrippen koppelen aan protocolstappen** — "annealing" in een PCR-protocol linkt naar de
    theoriekaart. Theorie en lab zijn dezelfde stof, de app behandelt ze nu als twee werelden.
12. **Projectlogboek** — korte dagelijkse aantekening per project, met datum; exporteerbaar als bijlage.
    PPO vraagt vaak om reflectie, en achteraf reconstrueren lukt nooit.

---

## 8. Open vragen

- Hoeveel labsessies per module, en hebben ze vaste data of zijn die per klas anders?
- Zijn de drie projecten gekoppeld aan vaste modules, of kies je er één voor het hele jaar?
- Heb je de rubrics digitaal (Word/PDF) of moeten die overgetypt worden?
- Komen de projectcolleges als pptx binnen, net als de LU1-slides? Dan kan `tools/extract.py` hergebruikt.
- Wat zijn de PPO-eisen precies — een vaste lijst competenties, of per periode anders?
