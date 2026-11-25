# Eiwitten in de praktijk – Lab

Jaar 1 · Periode 3 · 27 onderwerpen uit de collegeslides.

*Dit verslag bevat alleen de lessen van de labvleugel (LU2) van deze module. De bron staat bij elk onderdeel.*

## Les 10 – ELISA-resultaten verwerken

23 onderdelen · Praktijk.

### ELISA-resultaten verwerken

#### \| 2

- ELISA: Een laboratoriumtechniek voor de detectie van antigenen/antilichamen.

- Data: Bestaat uit categorische en continue variabelen.

- Belang: Correcte dataverwerking leidt tot betrouwbare resultaten.

*Bron: Resultaat verwerking ELISA.pptx, slide 2.*

#### \| 4

- Plaat indeling

- 1 | 2 | 3 | 4 | 5 | 6

- A | St 1 | St 2 | St 3 | St 4 | St 5 | St 6

- B | St 1 | St 2 | St3 | St 4 | St 5 | St 6

- C | MA onv | MA onv | MA 5x | MA 5x | MA 100x | MA 100x

- D | MB onv | MB onv | MB 5x | MB 5x | MB 100x | MB 100x

- E | Blok controle (pos) | Blok controle (pos) | Blok controle (pos) | Blok controle (neg) | Blok controle (neg) | Blok controle (neg)

- F | blanco | blanco | blanco | Cntrl1 | Cntrl1 | Cntrl1

- G | Cntrl2 | Cntrl2 | Cntrl2 | Cntrl3 | Cntrl3 | Cntrl3

*Bron: Resultaat verwerking ELISA.pptx, slide 4.*

#### Controles: welke en waarom?

- Rij | Coating | Blok | 1e Ab | 2e Ab | TMB | Verwacht signal (hoog of laag) | Controle waarop

- A/B | Standaard | V | V | V | V

- C/D | Monster | V | V | V | V

- E1/3 | - | - | V | V | V | binding 2e Ab aan 1e Ab en max sign

- E4/6 | - | V | V | V | V | Werking blokstap

- F1/3 | - | V | V | V | V | Blanco

- F4/6 | Standaard | v | - | V | V | Aspecifieke binding tussen Ag en 2e Ab

- G1/3 | 1e Antilichaam | V | - | V | V | Binding tussen 1e en 2e Ab

- G4/6 | - | - | - | V | V | Werking HRP

> **Aanvulling.** Kun je uitprinten en uitdelen zodat ze dit kunnen maken met wat welke controle is voor welke stap

*Bron: Resultaat verwerking ELISA.pptx, slide 5.*

#### Concentratie bepalen

Concentratie zegt iets over de hoeveelheid van de te bepalen stof in een monster  kwantitatief - Kalibratielijn (standaard, concentratie bepaling van een eiwit)

*Bron: Resultaat verwerking ELISA.pptx, slide 9.*

#### Resultaat verwerking:

- Zet de meetwaarden in een logische tabel

- Maak een kalibratielijn van de standaard reeks en voeg de R2 toe aan de grafiek.

*Bron: Resultaat verwerking ELISA.pptx, slide 10.*

#### Maak een kalibratielijn van de standaard reeks

- Zet de concentratie (x-as) uit tegen de extinctie (y-as): - pak het lineaire gebied

- Voeg de R2 toe aan de grafiek

- Zorg dat de assen logisch zijn opgebouwd met de juiste titels

*Bron: Resultaat verwerking ELISA.pptx, slide 11.*

#### R2 :Verklaarde variantie door het model

- R2 = Een index om te bepalen hoe goed jouw model past bij de verzamelde data. Dus: hoe goed komt de voorspelde data uit het model overeen met jouw waargenomen data? Hoe hoger de R2 hoe meer de variantie in de data voorspeld wordt door het model.

- Met andere woorden: de respons (y waarde (extinctie)) wordt in dit geval voor 96,5% (=R2) verklaard door de concentratie blauw.

- Concentratie koperzout (mmol/L) | Extincties

- 5 | 0,05

- 10 | 0,23

- 20 | 0,3

- 30 | 0,7

- 40 | 0,9

- 50 | 1

*Bron: Resultaat verwerking ELISA.pptx, slide 12.*

**SST (total sum of squares)= Hoe groot is de spreiding ten opzichte van een basismodel (in dit geval het gemiddelde)?**

- SSR (residual sum of squares)= Hoe groot is de spreiding ten opzichte van regressielijn?

- Als het gekozen model (regressielijn) een goede fit heeft, dan is de Ssres klein!

- Dan zijn liggen de gemeten waarden heel dicht op de regressielijn.

*Bron: Resultaat verwerking ELISA.pptx, slide 13.*

#### Verklaarde en onverklaarde variantie door het model

- Totale variantie ten opzichte van het gemiddelde (SSTotaal ) bestaat uit 2 delen:

- Totale Kwadratensom tov gemiddelde

- Kwadratensom verklaard door regressie

- Kwadratensom niet verklaard door regressie

- waarbij:

- = Gemiddelde y-waarde

- = Geobserveerde (gemeten) y waarden

- = geschatte y waarde per gegeven xi waarde door het model

- Verklaard door het model

- Niet verklaard door het model

> **Aanvulling.** 2 causes of variation: Variation around mean Y is explained by the variation that is caused by the model (explained variation) and by the variation that is explained by the error of the measurement (the unexplained variation)

*Bron: Resultaat verwerking ELISA.pptx, slide 14.*

#### SST berekenen

- Concentratie Blauw (mmol/L) | Extincties

- 5 | 0,05

- 10 | 0,23

- 20 | 0,3

- 30 | 0,7

- 40 | 0,9

- 50 | 1

- gemiddelde | 0,53

- Observatie - gemiddelde (SE)

- -0,468

- -0,288

- -0,218

- 0,182

- 0,382

- 0,482

- Deviatie (SE^2)

- 0,219

- 0,083

- 0,048

- 0,033

- 0,146

- 0,232

- 0,761

*Bron: Resultaat verwerking ELISA.pptx, slide 16.*

#### SSResidual berekenen

- Concentratie Blauw (mmol/L) | Extincties | Voorspelling y = 0,022x-0,0373

- 5 | 0,05 | 0,073

- 10 | 0,23 | 0,183

- 20 | 0,3 | 0,403

- 30 | 0,7 | 0,623

- 40 | 0,9 | 0,843

- 50 | 1 | 1,063

- Observatie - voorspelling (SE) | Deviatie (SE^2)

- -0,023 | 0,001

- 0,047 | 0,002

- -0,103 | 0,011

- 0,077 | 0,006

- 0,057 | 0,003

- -0,063 | 0,004

- 0,027

*Bron: Resultaat verwerking ELISA.pptx, slide 17.*

#### Bereken R2 voor de kalibratielijn Zie Excelsheet in BS tabblad “R^2 berekening”.

- waarbij:

- = Gemiddelde y-waarde

- = Geobserveerde (gemeten) y waarden

- = geschatte y waarde per gegeven xi waarde door het model

*Bron: Resultaat verwerking ELISA.pptx, slide 19.*

### ELISA standaardreeks – bereken de R2

- A | B | C | D | E | F | blanco

- Conc mg/L | 5 | 2,5 | 1,25 | 0,625 | 0,3125 | 0,15625 | 0

- respons | 0,622 | 0,7295 | 0,5845 | 0,4035 | 0,3355 | 0,2365 | 0,216

*Bron: Resultaat verwerking ELISA.pptx, slide 21.*

### Voorbeeld Kalibratielijn

#### Conclusies

- Wat is de R2 van de standaardreeks? Is er nauwkeurig gewerkt?

- Wat is de concentratie Enterotoxine in monster A en B?

*Bron: Resultaat verwerking ELISA.pptx, slide 23.*

#### Discussie

- Komen de resultaten overeen met je hypotheses? Waarom wel/niet?

- Verklaar de resultaten van de controles

- Wat kun je doen om het experiment te verbeteren?

*Bron: Resultaat verwerking ELISA.pptx, slide 24.*

#### Herhaling categorische data

- Categorische data is nominaal of ordinaal

- Nominaal:

- gevallen hebben verschillende scores

- Jan heeft een hond en Piet een kat

- Persoon A heeft 2 X-chromosomen en persoon B heeft een X- en Y-chromosoom.

- Ordinaal:

- gevallen kunnen gerangschikt worden op scores

- Jan drinkt vaak bier en Piet soms.

*Bron: Resultaat verwerking ELISA.pptx, slide 25.*

#### Wat waren ook alweer de meetniveaus?

- Nominaal:

- gevallen hebben verschillende scores

- Jan heeft een hond en Piet een kat

- Persoon A heeft 2 X-chromosomen en persoon B heeft een X- en Y-chromosoom.

- Ordinaal:

- gevallen kunnen gerangschikt worden op scores

- Jan drinkt vaak bier en Piet soms.

- Interval:

- Heeft géén absoluut 0 punt.

- Temperatuur in °C.

- Of er is een vast verschil tussen getallen.

- Jan is in 1987 geboren en Piet in 1967; 20 jaar dus

- Ratio:

- Heeft een absoluut 0 punt.

- Temperatuur in Kelvin

- geval a is 2× zo (vul in) als geval bJan verdient 2x minder dan Piet

*Bron: Resultaat verwerking ELISA.pptx, slide 26.*

#### Meetniveau’s samenvatting

- Meetniveau Voorbeeld | Nominaal Sekse godsdienst | Ordinaal Beoordeling docenten Frequentie drankgebruik | Interval Geboortejaar Temperatuur (°C) | Ratio Salaris Lichaamslengte Temperatuur (K)

- Karakteristiek | Onderscheid | Onderscheid Ordening | Onderscheid Ordening Verschillen | Onderscheid Ordening Verschillen Verhoudingen blijven gelijk (betekenisvolle 0 punt)

- Rekenkundige bewering | Tellen Percentage | Tellen Percentage Hoger/lager | Tellen Percentage Hoger/lager Gemiddelde Spreiding | Tellen Percentage Hoger/lager Gemiddelde Spreiding Verhouding berekenen

- Variabele | Discreet | Discreet | Discreet continue | Discreet continue

> **Aanvulling.** Kelvin heeft een absoluut 0 punt. Celcius is 0 = kouder dan 1°C, maar het kan nog kouder.

*Bron: Resultaat verwerking ELISA.pptx, slide 27.*

#### ELISA en categorische data

- 2 behandelgroepen, A en B

- Onderzoek naar aanwezigheid van een antigen

- ELISA geeft de volgende resultaten: Als antigen aanwezig is dan een Positief resultaat; als antigen niet aanwezig dan Negatief resultaat.

- In totaal 100 samples; 50 uit groep A en 50 uit groep B

- Gebruik de chi-kwadraattoets om te analyseren of de verschilen tussen de groepen significant zijn

- Positief | Negatief

- Groep A | 30 | 20

- Groep B | 15 | 35

*Bron: Resultaat verwerking ELISA.pptx, slide 28.*

### | 33

#### Eiwitgrootte bepaalt de migratie

relatie afstand-molecuulgewicht in een SDS-PAGE gel.

*Bron: Resultaat verwerking ELISA.pptx, slide 34.*

### Kernvraag

#### Welke controles neem je mee in een ELISA en wat controleert elk van die wells?

- Standaardreeks: voor de kalibratielijn, en een well zonder coating maar met beide antilichamen toont de binding van het tweede aan het eerste antilichaam en het maximale signaal.

- Een well zonder coating mét blokstap controleert of de blokstap werkt, en een well zonder coating en zonder eerste antilichaam dient als blanco.

- Standaard zonder eerste antilichaam toont aspecifieke binding tussen antigeen en tweede antilichaam; alleen TMB zonder antilichamen controleert de werking van het HRP-substraat.

> **Aanvulling.** Zonder deze controles kun je een hoge of lage extinctie niet toeschrijven: je weet dan niet of het signaal van je antigeen komt of van aspecifieke binding.

*Bron: Resultaat verwerking ELISA.pptx.*

**Hoe bepaal je uit een ELISA de concentratie in je monster, en hoe beoordeel je of je kalibratielijn goed genoeg is?**

- Meet de extinctie van de standaardreeks, zet die uit tegen de bekende concentraties en bepaal de regressielijn y = ax + b.

- Vul de extinctie van je monster in die vergelijking in en reken terug naar de concentratie; vermenigvuldig daarna met de verdunningsfactor.

- Beoordeel de lijn met R²: dat is de door het model verklaarde variantie, R² = (SST − SSR) / SST. Ligt je monster buiten het bereik van de standaardreeks, dan mag je niet extrapoleren maar moet je verdunnen en opnieuw meten.

> **Aanvulling.** SST is de spreiding ten opzichte van het gemiddelde, SSR de spreiding ten opzichte van de regressielijn; hoe kleiner SSR, hoe beter de fit.

*Bron: Resultaat verwerking ELISA.pptx.*

**Een ELISA geeft bij 50 monsters uit groep A 30 positief en 20 negatief, en bij 50 uit groep B 15 positief en 35 negatief. Welke toets gebruik je en waarom?**

- De uitslag is categorisch (positief of negatief) en je hebt aantallen per categorie, geen meetwaarden; de behandelgroep is ook categorisch.

- Je zet de vier aantallen in een kruistabel en gebruikt de chi-kwadraat-onafhankelijkheidstoets om te bepalen of de verdeling van positief en negatief samenhangt met de groep.

- De verwachte frequentie per cel is rijtotaal × kolomtotaal / totaal; hier bijvoorbeeld (50 × 45) / 100 = 22,5 positief per groep onder de nulhypothese van geen verschil.

> **Aanvulling.** Met twee rijen en twee kolommen is df = (2 − 1) × (2 − 1) = 1; alle verwachte frequenties zijn ruim boven 5, dus de toets mag.

*Bron: Resultaat verwerking ELISA.pptx.*

## Les 11 – Microscopiepreparaten fotograferen

4 onderdelen · Praktijk.

### Microscopiepreparaten fotograferen

#### Tips

- Noteer altijd de vergrotingsfactor (zet dat in de bestandsnaam..)

- let op dat je de totale vergroting opschrijft, dus bij 14X objectief is de totale vergroting 400X

- Geef altijd aan welk type histologische kleuring is uitgevoerd

- Geef altijd aan op welk orgaan de kleuring is uitgevoerd

- Geef ook aan van welk dier het materiaal afkomstig is (mn. als het niet humaan is)

- Let op de “white balance”.

> **Aanvulling.** Links is de foto te geel rechts is hij netjes

*Bron: week 3 LU2 tips_foto_mic_preparaten_NEW.pptx, slide 2.*

#### Don’ts

Maak GEEN “tabel/ figuur legenda’s, een dergelijke beschrijving zet je in de tekst van het resultatenhoofdstuk waarin je de resultaten beschrijft. Het is overbodig om een figuur EN een tabel te gebruiken om 1 resultaat te laten zien.

> **Aanvulling.** Crop fotos dit voorbeeld is niet juist

*Bron: week 3 LU2 tips_foto_mic_preparaten_NEW.pptx, slide 3.*

#### Do’s

- Nog een mooi voorbeeld gemaakt door onze eigen studenten (Brian Zantboer en Iris van Tetering, IHC met anti her2neu op borstkanker). Meest linkse plaatje is de neg controle waarbij het primaire ab niet is toegevoegd.

- De legenda is niet toegevoegd maar kijk een hoe knap ze in deze 3 losse (seriele) coupes ze elke keer weer hetzelfde gebied met het zelfde groepje tumor cellen hebben gevonden.

*Bron: week 3 LU2 tips_foto_mic_preparaten_NEW.pptx, slide 9.*

### Kernvraag

#### Wat moet je altijd vastleggen bij een microscopiefoto van een preparaat?

- De totale vergroting, niet alleen die van het objectief: bij een 40× objectief en een 10× oculair is de totale vergroting 400×. Zet die ook in de bestandsnaam.

- Welke histologische kleuring is gebruikt, op welk orgaan, en van welk dier het materiaal komt (vooral als het niet humaan is).

- Let op de witbalans, zodat de kleuren van de kleuring betrouwbaar te beoordelen zijn.

> **Aanvulling.** Zet de beschrijving in de tekst van je resultatenhoofdstuk, niet als figuurlegenda, en gebruik niet een figuur én een tabel voor hetzelfde resultaat.

*Bron: week 3 LU2 tips_foto_mic_preparaten_NEW.pptx.*

