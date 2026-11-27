/**
 * Verzamelpunt voor de meldingen uit de leeromgeving.
 *
 * De site is statisch en staat op GitHub Pages: er is geen server die iets kan opslaan. Dit
 * script is die server, in de kleinst mogelijke vorm. Het staat als web-app aan een Google
 * Sheet van jou vast; de site stuurt er een melding naartoe en dit script zet er een regel bij.
 * De melder hoeft niets te installeren en nergens in te loggen.
 *
 * INRICHTEN (eenmalig, ongeveer vijf minuten)
 *  1. Maak een lege Google Sheet, bijvoorbeeld "Leeromgeving – meldingen".
 *  2. Extensies › Apps Script. Plak dit bestand over Code.gs heen en sla op.
 *  3. Implementeren › Nieuwe implementatie › type Web-app.
 *       Uitvoeren als: ik (jouw account)
 *       Wie heeft toegang: iedereen       ← nodig, anders moet de melder inloggen
 *  4. Keur de rechten goed en kopieer de URL die eindigt op /exec.
 *  5. Zet die URL in src/core/config.js bij MELD_ENDPOINT en publiceer de site opnieuw.
 *
 * Wijzig je dit script later, implementeer dan een NIEUWE versie (Implementeren › Implementatie
 * beheren › potloodje › versie "Nieuw"), anders blijft de oude code draaien op dezelfde URL.
 *
 * WAT DIT WEL EN NIET IS
 * De URL staat in de broncode van een openbare site, dus iedereen die hem vindt kan regels
 * toevoegen. Dat is de prijs van "geen account nodig". Daarom: geen persoonsgegevens vragen,
 * lengtes afkappen, en een eenvoudige rem op de hoeveelheid. Komt er rommel binnen, verwijder
 * de regels en maak een nieuwe implementatie aan (nieuwe URL).
 */

var BLAD = 'meldingen';
var KOPPEN = ['ontvangen', 'tijd op het apparaat', 'soort', 'module', 'kaart', 'titel',
              'wat klopt er niet', 'context', 'versie', 'melder-id'];
var MAX_TEKST = 4000;      // zelfde grens als in de site
var MAX_PER_UUR = 60;      // ruim voor normaal gebruik, een rem op geautomatiseerde onzin

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var blad = blad_();

    if (teveel_(blad)) return uit_({ ok: false, reden: 'te veel meldingen in het laatste uur' });

    blad.appendRow([
      new Date(),
      kort_(body.tijd, 40),
      kort_(body.soort, 20),
      kort_(body.module, 120),
      kort_(body.kaart, 60),
      kort_(body.titel, 200),
      kort_(body.tekst, MAX_TEKST),
      kort_(body.context, MAX_TEKST),
      kort_(body.versie, 40),
      kort_(body.melder, 40)
    ]);
    return uit_({ ok: true });
  } catch (err) {
    return uit_({ ok: false, reden: String(err) });
  }
}

// Een GET is handig om te zien of de implementatie leeft; hij geeft niets van de inhoud prijs.
function doGet() {
  return uit_({ ok: true, dienst: 'leeromgeving-meldingen' });
}

function blad_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var blad = ss.getSheetByName(BLAD);
  if (!blad) {
    blad = ss.insertSheet(BLAD);
    blad.appendRow(KOPPEN);
    blad.setFrozenRows(1);
  }
  return blad;
}

function teveel_(blad) {
  var n = blad.getLastRow();
  if (n < MAX_PER_UUR + 1) return false;
  var eerste = blad.getRange(n - MAX_PER_UUR + 1, 1).getValue();
  return eerste instanceof Date && (new Date() - eerste) < 60 * 60 * 1000;
}

function kort_(waarde, max) {
  var s = waarde === undefined || waarde === null ? '' : String(waarde);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function uit_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
