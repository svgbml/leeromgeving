# Ideeën: functies en performance

**Stand 17-11-2026:** alle nummers zijn gebouwd, behalve 43, 44, 47, 48, 54 en 61 (niet gekozen) en 65 (zie daar).
32 is af: alle 71 slidebestanden hebben een link en openen in de app. Zeg welke nummers je nog wilt ("voeg 43 en 54 toe"). Grootte: **S** = een paar uur, **M** = een dag, **L** = meerdere dagen.
Alles blijft statisch (GitHub Pages, geen server) tenzij er "server" bij staat.

---

## A. Leren en herhalen

1. **FSRS-herhaalschema** (M): het moderne algoritme van Anki in plaats van SM-2 → ±20–30% minder herhalingen voor hetzelfde onthouden. Past achter `src/domain/srs.js`.
2. **Omgekeerde kaarten** (S): uitleg → begrip als tweede richting → dubbel zoveel oefening uit dezelfde data.
3. **Typ-het-antwoord-modus** (M): begrip intypen, met tolerantie voor typfouten (Levenshtein) → actiever dan alleen omdraaien.
4. **Clozekaarten** (M): `{{c1::…}}` in een uitleg maakt invulkaarten → goed voor reeksen en definities.
5. **Ongedaan maken** (S): `Z` draait de laatste beoordeling terug → minder frustratie bij een misklik.
6. **Kaart markeren met ster** (S): plus filter "Gemarkeerd" in lijst, flashcards en toets.
7. **Eigen notitie per kaart** (S): ezelsbruggetje onder de uitleg, alleen voor jou → meegenomen in export.
8. **Herhalen over alle modules** (M): één sessie met alle kaarten die klaarstaan → jaar 2 bouwt voort op jaar 1.
9. **"Leer deze les"-modus** (S): vanuit een les direct alle nieuwe kaarten van die les, zonder daglimiet.
10. **Slimme volgorde** (S): nieuwe kaarten in de volgorde van de slides in plaats van willekeurig → bouwt logisch op.
11. **Verwante kaarten** (M): onder elke kaart "zie ook" met kaarten die dezelfde termen noemen → verbanden zien.
12. **Begrippen automatisch linken** (M): komt een ander begrip in de uitleg voor, dan wordt het een link met popover.
13. **Moeilijke kaarten herschrijven** (S): een kaart die 4× fout ging krijgt een melding "maak hem kleiner" plus een knop om een notitie toe te voegen.
14. **Dagdoel** (S): "vandaag 30 kaarten" met een ring die volloopt op Vandaag.

## B. Oefentoets

15. **Examensimulatie** (M): geen feedback tot het eind, vrij heen en terug, vragen markeren, één totale timer → zoals Remindo.
16. **Toets onderbreken en hervatten** (S): een lopende toets blijft bewaard na herladen (open bug #7).
17. **Foutenboek** (S): alles wat je fout had in één lijst, met de knop "zet in flashcards van vandaag".
18. **Toets opnieuw met dezelfde vragen** (S): "Probeer opnieuw" met exact dezelfde set → zie je groei.
19. **Gedeelde toets via link** (S): `#/toets?seed=…` geeft iedereen dezelfde vragen → oefenen met je studiegroep.
20. **Betere afleiders** (M): voorkeur voor kaarten uit dezelfde les met overlappende woorden → moeilijker en realistischer.
21. **Hulp bij open vragen** (M): sleutelwoorden van elk kernpunt die in je antwoord staan worden alvast aangevinkt → sneller en eerlijker nakijken.
22. **Normering instellen** (S): cesuur 55% of eigen norm, plus "gokcorrectie" voor meerkeuze.
23. **Vraagtype "zet in volgorde"** (M): stappen van een protocol (PCR, Western blot) slepen in de juiste volgorde.
24. **Vraagtype "koppel"** (M): vier begrippen aan vier omschrijvingen koppelen.
25. **Rekenvragen** (L): getallen per poging willekeurig (verdunningen, molariteit, Ct-waarden) met nakijken binnen een marge.
26. **Afbeeldingsvragen** (M): eigen figuren in `img/` met aanwijsvlakken ("klik op het periplasma").
27. **Toetsdatum + aftellen** (S): per module de toetsdatum; Vandaag toont "nog 12 dagen" en het tempo dat nodig is.
28. **Studieplanner** (M): verdeelt de nog niet geleerde kaarten over de dagen tot de toets.

## C. Inhoud en kwaliteit

29. **"Meld een fout" per kaart** (S): venstertje in de site zelf; de melding komt met id, module en tekst bij Instellingen › Meldingen te staan.
30. **Kwaliteitsrapport per module** (S): korte uitleg, dubbele begrippen, onderwerpen met < 4 kaarten, kaarten zonder bron → in CI.
31. **Handmatige correcties apart bewaren** (M): `<module>.overrides.json` zodat opnieuw genereren uit slides je fixes niet wist.
32. **Slidelinks invullen** (S): de vier modules zonder Drive-links (bug #11). *Gebouwd: alle 71 slidebestanden gekoppeld; ze openen in een afgeschermde viewer in de app zonder de Drive-pagina met de eigenaar (zie README › Slides en privacy).*
33. **Zoekresultaten markeren** (S): gevonden woord geel in de begrippenlijst.
34. **Filters in de URL** (S): `#/begrippen?les=3&q=dna` → herladen en delen werkt.
35. **Printversie** (S): nette begrippenlijst als pdf of op papier.
36. **Export naar Anki/CSV** (S): voor wie Anki al gebruikt.
37. **Woordenlijst Engels ↔ Nederlands** (M): veel slides mengen talen; toon de vertaling bij het begrip.
38. **Mindmap per les** (L): begrippen als netwerk via de automatische links uit 12.

## D. Motivatie

39. **Reeks (streak) en heatmap** (S): kalender met studiedagen, zoals GitHub → elke dag een beetje.
40. **Cijfertrend** (S): lijntje van je laatste toetsen per module.
41. **Mijlpalen** (S): korte felicitatie (met confetti) bij 100 beheerste kaarten, eerste 8+, 7 dagen op rij.
42. **Weekoverzicht** (S): maandag een samenvatting: geleerd, beheerst, zwakste onderwerp.
43. **Focus-timer** (S): pomodoro van 25 minuten bovenin, telt mee in de heatmap.

## E. Samen en synchronisatie

44. **Alle modules in één export** (S): één bestand voor alle voortgang, plus automatische back-up-herinnering.
45. **Sync via bestand** (M): File System Access API schrijft voortgang naar een map in OneDrive/Drive → automatisch op elk apparaat.
46. **Sync via GitHub Gist** (M): met een eigen token; geen server nodig.
47. **QR-code overzetten** (M): voortgang van laptop naar telefoon via een QR-code (gecomprimeerd).
48. **Studiegroep-scorebord** (L, server): gedeelde ranglijst per toets-seed.

## F. Interface en animaties

49. **Swipe op telefoon** (M): kaart naar links = Opnieuw, rechts = Goed, omhoog = Makkelijk, met meebewegende kaart.
50. **Onderste tabbalk op telefoon** (S): navigatie bij je duim; moduleknop in een uitschuifpaneel.
51. **Sneltoetsen-overzicht** (S): `?` toont alle toetsen.
52. **Echte 3D-flip** (S): voor- en achterkant tegelijk in de DOM, zodat de kaart echt omdraait in plaats van in te draaien.
53. **Gedeeld-element-overgang** (S): een dashboardkaart "vliegt" naar de module bij het openen (View Transitions met namen).
54. **Geluidseffecten** (S): zacht tikje bij goed en fout, standaard uit.
55. **Lettergrootte en dyslexievriendelijk lettertype** (S): instelling onder in de pagina.
56. **Focusmodus** (S): kop en voet verbergen tijdens flashcards en toets.
57. **Hoog-contrastthema** (S): naast licht en donker.

## G. App en offline

58. **Installeerknop** (S): "Zet op beginscherm" zodra de browser dat aanbiedt (`beforeinstallprompt`).
59. **PNG- en maskable-iconen** (S): iOS gebruikt geen SVG-icoon.
60. **"Nieuwe versie beschikbaar"** (S): melding met herlaadknop als de service worker een update heeft.
61. **Herinnering via melding** (M): dagelijkse notificatie "15 kaarten klaar" (Notification API, werkt als app geïnstalleerd is).
62. **Deel-doel** (S): tekst delen naar de app opent zoeken in de begrippenlijst (Web Share Target).

---

## H. Performance (gemeten op 17-11-2026)

Uitgangssituatie: zes moduledata-bestanden van samen **1,32 MB** (1,19 MB zonder inspringing), lettertype 92 kB.
Vandaag laadt **alle zes** voor de samenvatting. Een toets van 40 vragen bouwen kost 7–42 ms in Node
(op een telefoon reken ×3–5). Zoeken in 400 kaarten: 0,3–2,6 ms per toetsaanslag.

63. **Samenvatting apart** (M): CI schrijft per module een klein `index`-bestand (ids, onderwerpen, lessen, aantallen, lesinfo) → Vandaag laadt ±40 kB in plaats van 1,3 MB.
64. **Data zonder inspringing en zonder `module` per kaart** (S): −10% (−130 kB); de `module`-tekst staat nu op elke kaart (64 kB samen).
65. **Precompressie** (S): CI maakt `.br`-bestanden. *Niet gebouwd: GitHub Pages serveert geen eigen .br-bestanden; Pages comprimeert zelf al met gzip. Kan pas bij een andere host (bijv. Cloudflare Pages).*
66. **Lijst virtualiseren of `content-visibility: auto`** (S): de begrippenlijst tekent nu tot 400 kaarten in één keer; met `content-visibility` slaat de browser het tekenen buiten beeld over → snellere eerste weergave.
67. **Zoekindex vooraf** (S): `plain()` van elke kaart één keer berekenen bij het laden in plaats van per toetsaanslag.
68. **Event delegation** (S): één klik-luisteraar op `main` in plaats van luisteraars per knop na elke render.
69. **Gedeeltelijk hertekenen** (M): bij een flashcard alleen de kaart vervangen, niet kop, filters en meter.
70. **Toetsgenerator in een Web Worker** (M): bouwt de toets naast de pagina → geen hapering op trage telefoons.
71. **Afleiders vooraf berekenen** (M): CI bewaart per kaart de beste kandidaat-afleiders → `makeMC` wordt een opzoeking.
72. **Stale-while-revalidate** (S): data meteen uit de cache tonen en op de achtergrond verversen, in plaats van eerst het netwerk → direct openen, ook op slechte wifi.
73. **Alleen gekozen module vooraf cachen** (S): nu installeert de service worker alle 1,3 MB bij het eerste bezoek; beter: kern + gekozen module, de rest pas als je hem opent (of op wifi, met `navigator.connection`).
74. **Variabel lettertype** (S): één variabel Plex-bestand in plaats van vier gewichten (92 kB → ±50 kB), alleen 400 vooraf laden.
75. **localStorage minder vaak schrijven** (S): voortgang bij elke beoordeling helemaal opnieuw wegschrijven groeit mee met je geschiedenis; bundelen per seconde of naar IndexedDB.
76. **Prestatiebudget in CI** (S): Lighthouse CI faalt als de eerste weergave > 1,5 s of de data > grens → performance blijft goed.
77. **`modulepreload`** (S): `<link rel="modulepreload">` voor `src/domain/*.js` → de modules laden parallel in plaats van na elkaar.
78. **Prefetch van de volgende stap** (S): tijdens het lezen van een vraag de volgende alvast opbouwen.

## I. Ontwikkelen

79. **Views verder opsplitsen** (M): `begrippen`, `flashcards`, `toets` en `voortgang` als losse bestanden in `src/views/`, net als `vandaag.js`.
80. **End-to-end-tests** (M): Playwright klikt door dashboard, flashcards en toets in CI.
81. **Toegankelijkheidscontrole in CI** (S): axe-core op elke pagina.
82. **Voorbeeldmodule voor bijdragers** (S): kleine nep-module + uitleg, zodat medestudenten eigen modules kunnen aanleveren.
