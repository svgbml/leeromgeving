# Een module toevoegen of verbeteren

Medestudenten kunnen kaarten aanleveren of fouten verbeteren. Zo werkt het.

## Een fout melden
Onder elke kaart en bij elke toetsvraag staat **Meld een fout**. Dat opent een venstertje in de site
zelf: je schrijft op wat er niet klopt, de kaartgegevens gaan automatisch mee en de melding komt bij
**Instellingen › Meldingen** te staan. Daar lees je ze terug, kopieer je ze in één keer of download je
ze als tekstbestand. De melding gaat daarnaast naar het verzamelpunt van de leeromgeving (een
Google Sheet, zie README › Meldingen verzamelen), zodat een melding vanaf de computer van een
medestudent ook aankomt. Lukt dat niet, dan blijft hij openstaan en gaat hij later alsnog weg.

## Een kaart verbeteren zonder de slides opnieuw te verwerken
Zet je verbetering in een correctiebestand naast de moduledata, bijvoorbeeld
`data/jaar-2/periode-2/dna-kraak-de-code.overrides.json`:

```json
{
  "kaarten":    { "dna-042": { "uitleg": "Betere uitleg …", "aanvulling": "…" } },
  "verwijderd": ["dna-099"],
  "nieuw":      [ { "id": "dna-900", "onderwerp": "…", "les": "Les 3 – PCR en primer design", "begrip": "…", "uitleg": "…" } ]
}
```
De build voegt dit samen met de gegenereerde kaarten, zodat je verbetering blijft staan als de kaarten
opnieuw uit de slides worden gemaakt.

## Een nieuwe module
1. Kopieer `data/voorbeeld/voorbeeld.json` naar `data/jaar-<j>/periode-<p>/<id>.json` en vul hem.
   Het formaat staat in `data/schema/module.schema.json`; je editor geeft dan ook hulp bij het typen.
2. Voeg de module toe aan `data/modules.json`.
3. Markeer kaarten over de organisatie van de module: `python tools/markeer_lesinfo.py --schrijf`.
4. Controleer: `npm run check` en `npm test`. Bekijk `npm run kwaliteit` voor verbeterpunten.

### Opmaak in kaarten
- Toegestaan: `<b> <i> <u> <em> <strong> <br> <sup> <sub> <ul> <ol> <li> <p>`.
- **Vetgedrukt** wordt automatisch een invulkaart; wil je zelf bepalen wat er weg moet, gebruik
  `{{c1::tekst}}` of `{{c1::tekst::hint}}`.
- Een genummerde lijst (`<ol>`) met zinnetjes kan een volgordevraag worden.
- Eigen figuren met aanklikbare vlakken: zie `figuren` in `data/jaar-1/periode-1/de-cel.json`.
  Gebruik geen figuren uit de collegeslides (auteursrecht).

### Slides
Zet per bronbestand een Drive-link in `slides`, in de vorm `https://drive.google.com/file/d/<id>/preview`
(niet `/view`). De app opent de slides dan in een eigen venster, zonder de Drive-pagina waarop de eigenaar
staat. `npm run check` keurt andere links af.

### Video's
`data/videos.json`: per module en les een lijst `{ "id", "titel", "kanaal", "duur", "taal" }`.
Het `id` is het deel na `watch?v=` in de YouTube-link.
