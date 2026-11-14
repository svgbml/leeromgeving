"""Bouwt de begrippenlijst De cel (LU1 microbiologie) als JSON + CSV.
Velden: id, begrip, uitleg, onderwerp, bron (bestand + slide), aanvulling (niet letterlijk op slide, uit Brock/algemene kennis)."""
import json, csv

M1 = "Biochemie_Microbiologie 1 (2627) - student.pptx"
M2 = "Biochemie_Microbiologie 2 (2627) - student.pptx"
PAD = "Avans slides/Jaar 2/Periode 1/"

# (onderwerp, begrip, uitleg, bestand, slides, aanvulling)
B = [
# --- Inleiding & evolutie
("Inleiding & evolutie","Microbiologie","Wetenschap van alle levende organismen die te klein zijn om met het blote oog te zien: bacteriën, archaea, schimmels, gisten, protozoa, algen, virussen en prionen. In LU1 ligt de focus op bacteriën (bacteriologie).",M1,[15],""),
("Inleiding & evolutie","Drie domeinen (Woese)","Indeling van het leven in Bacteria, Archaea en Eukarya, voorgesteld door Woese e.a. (1990) op basis van rRNA-sequentievergelijking.",M1,[18,19],""),
("Inleiding & evolutie","Prokaryoot","Cel zonder celkern en zonder membraanomsloten organellen; bacteriën en archaea. Meestal ééncellig.",M1,[20,23],"Geen kernmembraan: DNA ligt in het nucleoïde."),
("Inleiding & evolutie","Eukaryoot","Cel met celkern en organellen; protisten, schimmels, planten en dieren.",M1,[20],""),
("Inleiding & evolutie","Archaea","Prokaryoten met celwanden zónder peptidoglycaan (bacteriën hebben wél peptidoglycaan). Voorbeelden: methanogenen, halofielen.",M1,[20],""),
# --- Celbouw
("Celbouw","Nucleoïde","Gebied in het cytoplasma van een bacterie waar het chromosoom ligt; niet omgeven door een membraan.",M1,[23],""),
("Celbouw","Ribosoom (70S)","Plaats van eiwitsynthese. Bacteriële ribosomen bestaan uit een 30S- en 50S-subeenheid en zijn een belangrijk aangrijpingspunt voor antibiotica.",M1,[23,42],"70S/30S/50S-nomenclatuur: Brock H2."),
("Celbouw","Periplasmatische ruimte (periplasma)","Ruimte tussen het cytoplasmamembraan en de buitenmembraan van Gram-negatieve bacteriën; bevat de dunne peptidoglycaanlaag en bindingseiwitten voor transport.",M1,[23,67,75],""),
("Celbouw","Oppervlakte/volume-verhouding (S/V)","Kleinere cellen hebben een hogere S/V-ratio en daardoor een grotere uitwisseling van voedingsstoffen. Bol r = 1 µm: S/V = 3; r = 2 µm: S/V = 1,5.",M1,[62],""),
("Celbouw","Celmorfologie – belang","Vorm/grootte bepaalt o.a. de opname van voedingsstoffen en de beweeglijkheid in een viskeuze omgeving of over een oppervlak (spiraalvormige bacteriën).",M1,[62],""),
# --- Morfologie
("Morfologie & Gram","Coccus","Bolvormige bacterie. Voorbeelden: Streptococcus, Enterococcus, Staphylococcus, Neisseria.",M1,[60,83],""),
("Morfologie & Gram","Staaf (bacil)","Staafvormige bacterie. Voorbeelden: Pseudomonas, Escherichia, Klebsiella, Salmonella, Enterobacter, Proteus, Citrobacter, Clostridium, Bacillus, Lactobacillus, Listeria.",M1,[60,83],""),
("Morfologie & Gram","Spirillum","Gekromde/spiraalvormige, starre bacterie. Voorbeelden: Vibrio, Campylobacter, Helicobacter.",M1,[60,83],""),
("Morfologie & Gram","Spirocheet","Lange, flexibele, kurkentrekkervormige bacterie. Voorbeelden: Treponema, Borrelia.",M1,[60,83],""),
("Morfologie & Gram","Budding and appendaged bacteria","Bacteriën met uitlopers (stalk/hypha) die zich via knopvorming delen. Voorbeeld: Rhodomicrobium.",M1,[27,61],"Budding is 'nice to know'."),
("Morfologie & Gram","Filamenteuze bacteriën","Bacteriën die lange draden vormen. Voorbeeld: Actinomyces.",M1,[61],""),
("Morfologie & Gram","Gramkleuring – kleur","Gram-positief kleurt paars; Gram-negatief kleurt roze/rood.",M1,[61],"Kleurverschil ontstaat door de dikte van de peptidoglycaanlaag (kristalviolet blijft in dikke laag)."),
("Morfologie & Gram","Morfologie en Gram niet altijd gerelateerd","Uit de vorm van een bacterie kun je niet afleiden of hij Gram-positief of -negatief is (bijv. staven komen in beide groepen voor).",M1,[83],""),
# --- Membraan & celwand
("Membraan & celwand","Cytoplasmamembraan","Dunne (6–8 nm) fosfolipide-dubbellaag met ingebedde eiwitten die het cytoplasma omringt. Vitale, selectief permeabele barrière; stabiel door H-bruggen en hydrofobe interacties, en flexibel.",M1,[64],""),
("Membraan & celwand","Functies cytoplasmamembraan","1) permeabiliteitsbarrière en transport; 2) eiwitanker (transport, bio-energetica, chemotaxis); 3) energieconservatie (proton motive force). Verder: elektronentransport, anker voor flagellen, afvalverwerking en vorming van endosporen.",M1,[65],""),
("Membraan & celwand","Proton motive force (PMF)","Protonengradiënt over het cytoplasmamembraan, opgebouwd door de elektronentransportketen; levert energie voor ATP-synthese, actief transport en flagelbeweging.",M2,[22,23],"Ook M1 slide 65 (energieconservatie)."),
("Membraan & celwand","Hopanoïden","Sterolachtige moleculen die het membraan van veel bacteriën stabiliseren. Sterolen (zoals cholesterol) komen niet voor bij prokaryoten, behalve bij Mycoplasma.",M1,[66],""),
("Membraan & celwand","Peptidoglycaan","Stevige laag van de celwand: glycaan-ruggengraat met peptide-zijketens die onderling verbonden zijn (bij S. aureus via een glycine-interbrug, bij E. coli direct via DAP). Gram+ ~90% van de wand, Gram− ~10%.",M1,[67,68],"Ruggengraat bestaat uit afwisselend N-acetylglucosamine (NAG) en N-acetylmuraminezuur (NAM) – Brock H2."),
("Membraan & celwand","Gram-positieve celwand","Dikke peptidoglycaanlaag op het cytoplasmamembraan, met teichoïnezuur en lipoteichoïnezuur (LTA); geen buitenmembraan.",M1,[67,68,69],""),
("Membraan & celwand","Gram-negatieve celwand","Dunne peptidoglycaanlaag in het periplasma, met daarbuiten een buitenmembraan met LPS, porines en lipoproteïne.",M1,[67,68,69],""),
("Membraan & celwand","Lipopolysacharide (LPS)","Onderdeel van de buitenmembraan van Gram-negatieven: beschermt tegen chemische stoffen, verhoogt de negatieve lading, stabiliseert het membraan en is van levensbelang (doelwit antibiotica). Bestaat o.a. uit lipide A (endotoxine) en de O-keten (O-antigeen).",M1,[70],""),
("Membraan & celwand","Endotoxine (lipide A)","Lipide-deel van LPS; veroorzaakt koorts bij de gastheer.",M1,[70],""),
("Membraan & celwand","O-antigeen (O-keten)","Polysacharideketen van LPS die door antistoffen van de gastheer herkend wordt; verschilt per stam (E. coli > 160 varianten).",M1,[70],""),
("Membraan & celwand","Lipoteichoïnezuur (LTA)","Komt voor bij Gram-positieven en heeft een soortgelijke functie als LPS.",M1,[70],""),
("Membraan & celwand","Porine","Kanaaleiwit in de buitenmembraan van Gram-negatieven waardoor kleine moleculen naar binnen kunnen.",M1,[67],"Functie: Brock H2."),
("Membraan & celwand","Kapsel","Polysacharidelaag om de celwand; beschermt tegen uitdroging en helpt ontsnappen aan fagocytose door het immuunsysteem.",M1,[71],""),
# --- Transport
("Transport","Passief transport","Transport zonder energie, mee met de concentratiegradiënt (diffusie, osmose). Bijv. gassen en kleine polaire moleculen: N2, O2, CO2, ethanol, H2O, ureum, maar ook antibiotica als penicilline en rifampicine.",M1,[73],""),
("Transport","Osmose","Passieve waterverplaatsing over een semipermeabel membraan op basis van osmolariteit (isotoon, hypertoon, hypotoon), al dan niet via eiwitten.",M1,[73],""),
("Transport","Actief transport","Kost energie (proton motive force, ATP-hydrolyse of energierijke verbindingen zoals PEP), gaat via transporteiwitten tegen de concentratiegradiënt in. Laat een bacterie concurreren als voeding schaars is.",M1,[74],""),
("Transport","Uniport, symport, antiport","Uniport: één molecuul in één richting. Symport: twee stoffen in dezelfde richting (co-transport). Antiport: twee stoffen in tegengestelde richting.",M1,[75],""),
("Transport","ABC-transporter","Actief transportsysteem dat ATP-hydrolyse gebruikt, met een periplasmatisch bindingseiwit dat de stof aanlevert.",M1,[75],""),
("Transport","Groepstranslocatie","Actief transport waarbij het substraat (bijv. glucose) tijdens de opname chemisch wordt veranderd: gefosforyleerd door fosfo-enolpyruvaat (PEP) tot glucose-6-fosfaat.",M1,[75],"Bekend als fosfotransferasesysteem (PTS) – Brock H2."),
# --- Speciale eigenschappen & beweeglijkheid
("Speciale eigenschappen","Endospore / sporulatie","'Slaapstand' van sommige Gram-positieve bacteriën om extreme omstandigheden te overleven; ideaal voor verspreiding via wind en water.",M1,[78],"Bekende sporenvormers: Bacillus, Clostridium."),
("Speciale eigenschappen","Fimbriae","Korte aanhangsels bij sommige Gram+ en veel Gram− bacteriën; helpen bij hechten aan cellen.",M1,[79],""),
("Speciale eigenschappen","Pili / sekspilus","Bij sommige Gram− bacteriën; voor beweging, hechting aan cellen (virulentiefactor) en DNA-overdracht (sekspilus).",M1,[79],""),
("Speciale eigenschappen","Flagel","Zweepstaart voor beweging en chemotaxis. Opbouw: filament (flagelline), haak en basaal lichaam met ringen (L, P, MS, C) in de celwand/membranen; Mot-eiwitten vormen de motor, Fli-eiwitten de schakelaar.",M1,[79,80,81],""),
("Speciale eigenschappen","Peritrich / monotrich","Peritrich: flagellen rondom de cel (bijv. E. coli). Monotrich: één flagel (bijv. Vibrio cholerae).",M1,[82],""),
("Speciale eigenschappen","Chemotaxis","Gerichte beweging van een bacterie naar of weg van een chemische stof.",M1,[79],""),
("Speciale eigenschappen","Swarming, twitching, gliding","Vormen van beweging: swarming = groepsbeweging met gebundelde flagellen (bijv. Proteus mirabilis op bloedagar, probleem in ziekenhuis); twitching = via uitschuiven en terugtrekken van pili; gliding = over een oppervlak zonder flagellen.",M1,[79,82],""),
# --- Groei
("Groei","Binaire deling","Ongeslachtelijke deling van een bacteriecel in twee identieke dochtercellen; lijkt op mitose.",M1,[24],""),
("Groei","Generatietijd (Td)","Tijd die een bacteriepopulatie nodig heeft om te verdubbelen. Verschilt per soort en medium: E. coli 17 min (glucose-zouten), S. aureus 27–30 min, M. tuberculosis 792–932 min.",M1,[24,26],""),
("Groei","Exponentiële groei – formule","Nn = N0 × 2^n, met n = aantal generaties (verstreken tijd / Td).",M1,[25],""),
("Groei","Groeicurve","Verloop van een batchcultuur in vier fasen: lagfase, exponentiële fase, stationaire fase en sterffase.",M1,[28],""),
("Groei","Lagfase","Aanpassingsfase na inoculatie: cellen bereiden zich voor, het aantal neemt nog niet toe.",M1,[28],"Uitleg fasen: Brock H4."),
("Groei","Exponentiële (log-)fase","Cellen delen met een constante generatietijd; het aantal verdubbelt per Td.",M1,[28],""),
("Groei","Stationaire fase","Groei en sterfte houden elkaar in evenwicht door uitputting van voedingsstoffen/ophoping van afval.",M1,[28],"Brock H4."),
("Groei","Sterffase","Het aantal levende cellen neemt af.",M1,[28],""),
("Groei","Optische dichtheid (OD) vs. levend kiemgetal","OD (troebelheid) meet alle cellen inclusief dode; het levend kiemgetal (viable count, in KVE) alleen levende cellen. In de sterffase daalt het kiemgetal eerder dan de OD.",M1,[28],""),
("Groei","Biofilm","Gemeenschap van bacteriën die aan een oppervlak hecht in een zelfgemaakte matrix ('nice to know').",M1,[27],"Definitie: Brock H4."),
# --- Kweek
("Kweek & media","Gedefinieerd medium","Voedingsmedium waarvan de exacte chemische samenstelling bekend is.",M1,[30,31],""),
("Kweek & media","Complex medium","Voedingsmedium waarvan de samenstelling niet exact bekend is (bijv. vleesextract, gistextract, pepton).",M1,[30,31],""),
("Kweek & media","Selectief medium","Bevat componenten die de groei van bepaalde bacteriën remmen.",M1,[33],""),
("Kweek & media","Differentieel medium","Bevat een indicator (vaak kleurstof) die via kleuromslag een specifieke (bio)chemische reactie van bacteriën zichtbaar maakt.",M1,[33],""),
("Kweek & media","Reinkweek","Cultuur die één soort bacterie bevat.",M1,[32],""),
("Kweek & media","Mengcultuur","Cultuur met meerdere soorten bacteriën.",M1,[32],""),
("Kweek & media","Contaminant","Ongewenste bacterie in een cultuur.",M1,[32],""),
("Kweek & media","KVE / CFU","Kolonievormende eenheden (colony forming units): maat voor levende bacteriën op vast medium, bepaald door kolonies te tellen.",M1,[32,34],""),
("Kweek & media","Vast vs. vloeibaar medium","Bacteriën kunnen in vloeibaar en op vast medium groeien; door toevoeging van agar ontstaat een vast medium waarop kolonies (losliggend, te beoordelen) worden gevormd.",M1,[32,34],""),
("Kweek & media","Bloedagar","Rijk medium voor o.a. Staphylococcus aureus en Proteus mirabilis.",M1,[30,35],"Toont hemolyse – Brock."),
("Kweek & media","MacConkey-agar","Medium voor Gram-negatieve staven, bijv. E. coli en Klebsiella pneumoniae.",M1,[30,35],"Selectief (galzouten/kristalviolet remmen Gram+) en differentieel (lactosefermentatie → roze kolonies)."),
("Kweek & media","Chocolade-agar","Medium voor veeleisende bacteriën zoals Haemophilus.",M1,[30,35],"Verhitte bloedagar – Brock."),
("Kweek & media","XLD-agar","Medium voor Salmonella.",M1,[35],"Selectief/differentieel voor Salmonella en Shigella."),
("Kweek & media","Chromogene agar","Differentieel medium waarbij bacteriesoorten door kleurstofvorming te herkennen zijn.",M1,[30],""),
# --- Controle op groei
("Controle op groei","Sterilisatie","Het doden of verwijderen van alle levende micro-organismen in een groeimedium. Methoden: hitte (autoclaaf), straling, filter.",M1,[38,39],""),
("Controle op groei","Inhibitie","Het beperken van microbiële groei.",M1,[38],""),
("Controle op groei","Decontaminatie","Behandeling van een object zodat het een veilig werkoppervlak wordt.",M1,[38],""),
("Controle op groei","Desinfectie","Verwijderen van alle pathogene bacteriën.",M1,[38],""),
("Controle op groei","Autoclaaf","Sterilisatie met stoom onder druk; het object moet gedurende de sterilisatietijd ~121 °C bereiken.",M1,[39],""),
("Controle op groei","Sterilants, desinfectants, sanitizers, antiseptica","Chemische antimicrobiële middelen voor extern gebruik, om groei van humane pathogenen in milieu en op het lichaam te voorkomen.",M1,[37],"Antisepticum = op levend weefsel; desinfectans = op levenloze objecten (Brock H8)."),
# --- Antibiotica
("Antibiotica & resistentie","Breed- en smalspectrum-antibiotica","Breedspectrum werkt tegen veel soorten (Gram+ én Gram−); smalspectrum tegen een beperkte groep.",M1,[42],""),
("Antibiotica & resistentie","Aangrijpingspunten antibiotica","Celwandsynthese (penicillines, cefalosporines, vancomycine, carbapenems); DNA-gyrase (quinolonen, ciprofloxacine); RNA-polymerase (rifampicine); eiwitsynthese 50S (erytromycine, chlooramfenicol, clindamycine) en 30S (tetracycline, streptomycine, gentamicine); foliumzuurmetabolisme (trimethoprim, sulfonamiden); membraan (polymyxines, daptomycine).",M1,[42],""),
("Antibiotica & resistentie","Bactericide","Antimicrobieel middel dat de bacterie doodt, bijv. penicilline (verzwakt celwand → cel barst door eigen osmotische druk).",M1,[44],""),
("Antibiotica & resistentie","Bacteriostatisch","Middel dat bacteriën niet doodt maar vermenigvuldiging remt, zodat het lichaam ze kan opruimen; bijv. tetracycline.",M1,[44],""),
("Antibiotica & resistentie","Bacteriolytisch","Middel dat bacteriën doodt door cellysis.",M1,[44],""),
("Antibiotica & resistentie","Resistentiemechanismen","De bacterie 1) mist het aangrijpingspunt, 2) is niet permeabel, 3) inactiveert het antibioticum (β-lactamase/ESBL), 4) modificeert het aangrijpingspunt (MRSA/mecA), 5) ontwikkelt 'nieuwe' biochemische routes om het antibioticum heen, 6) pompt het weg (efflux).",M1,[45],""),
("Antibiotica & resistentie","β-lactamase / ESBL","Enzym dat β-lactam-antibiotica (zoals penicillines) inactiveert; ESBL = extended-spectrum β-lactamase, bijv. bij E. coli.",M1,[45],""),
("Antibiotica & resistentie","MRSA / mecA-gen","Methicilline-resistente S. aureus: het mecA-gen zorgt voor een gewijzigd aangrijpingspunt.",M1,[45],"mecA codeert voor PBP2a, een penicillinebindend eiwit met lage affiniteit voor β-lactams."),
("Antibiotica & resistentie","Efflux(pomp)","Membraaneiwit dat het antibioticum actief de cel uit pompt.",M1,[45],""),
("Antibiotica & resistentie","MIC","Minimum Inhibitory Concentration: laagste concentratie antibioticum (mg/L) die groei remt; bepaald via verdunningsreeks of E-test.",M1,[46],""),
("Antibiotica & resistentie","S/I/R","Gevoeligheidsuitslag volgens EUCAST: S = gevoelig, I = gevoelig bij verhoogde blootstelling, R = resistent.",M1,[46],"Betekenis I: EUCAST-definitie."),
("Antibiotica & resistentie","Agardiffusiemethode","Antibioticumschijfjes op een met testorganisme beënte agarplaat; na 24–48 u geeft de remmingszone rond het schijfje de gevoeligheid aan (EUCAST).",M1,[46],""),
("Antibiotica & resistentie","E-test","Strip met een concentratiegradiënt antibioticum op agar; de MIC lees je af waar de ellipsvormige remmingszone de strip snijdt.",M1,[46],""),
# --- Biotech
("Biotechnologie","Biotechnologie","Het geheel van technieken waarbij biologische processen of organismen worden ingezet voor industriële, landbouwkundige, medische of milieutechnische doeleinden (incl. fermentatie, weefselkweek, gewasveredeling en de ontwikkeling van instrumenten/reagentia).",M2,[8,48],""),
("Biotechnologie","Rode, witte en groene biotechnologie","Rood: mens/dier en gezondheid. Wit: industrie en milieu. Groen: landbouw en voeding.",M2,[7,47],"Ook M1 slide 52."),
# --- Typen bacteriën
("Typen bacteriën","Psychrofiel","Groeit optimaal bij lage temperatuur (voorbeeld Polaromonas vacuolata, optimum ~4 °C).",M2,[12],""),
("Typen bacteriën","Mesofiel","Groeit optimaal bij gematigde temperatuur (voorbeeld E. coli, optimum ~39 °C).",M2,[12],""),
("Typen bacteriën","Thermofiel","Groeit optimaal bij hoge temperatuur (voorbeeld Geobacillus stearothermophilus, optimum ~60 °C).",M2,[12],""),
("Typen bacteriën","Hyperthermofiel","Groeit optimaal boven ~80 °C (voorbeelden Thermococcus celer ~88 °C, Pyrolobus fumarii ~106 °C).",M2,[12],""),
("Typen bacteriën","Acidofiel / neutrofiel / alkalifiel","Groeit optimaal bij lage pH / neutrale pH / hoge pH.",M2,[13],""),
("Typen bacteriën","Halofiel","Groeit het best bij verlaagde waterpotentiaal en heeft specifiek NaCl nodig.",M2,[14],""),
("Typen bacteriën","Extreem halofiel","Heeft hoge NaCl-concentraties (15–30%) nodig voor groei.",M2,[14],""),
("Typen bacteriën","Halotolerant","Verdraagt enige verlaging van de wateractiviteit, maar groeit het best zonder toegevoegde opgeloste stof.",M2,[14],""),
("Typen bacteriën","Obligaat aeroob","Heeft O2 nodig (bijv. Micrococcus luteus).",M2,[15],""),
("Typen bacteriën","Facultatief anaeroob","O2 niet nodig, maar groeit beter met O2 (bijv. E. coli); aerobe respiratie, anaerobe respiratie of fermentatie.",M2,[15],""),
("Typen bacteriën","Micro-aerofiel","Heeft O2 nodig, maar in lagere concentratie dan in de atmosfeer (bijv. Spirillum volutans).",M2,[15],""),
("Typen bacteriën","Aerotolerant anaeroob","Heeft geen O2 nodig en groeit er niet beter door (bijv. Streptococcus pyogenes); fermentatie.",M2,[15],""),
("Typen bacteriën","Obligaat anaeroob","O2 is schadelijk of dodelijk (bijv. Methanobacterium formicicum).",M2,[15],""),
("Typen bacteriën","Katalase en superoxidedismutase","Enzymen die toxische zuurstofvormen afbreken: superoxidedismutase zet superoxide om in H2O2 + O2; katalase zet H2O2 om in H2O + O2 (zichtbaar als belletjes in de katalasetest).",M2,[15],""),
# --- Metabolisme
("Metabolisme","Metabolisme = katabolisme + anabolisme","Katabolisme: afbraak van grotere moleculen tot kleinere, waarbij energie vrijkomt. Anabolisme: opbouw (biosynthese) van macromoleculen, kost energie.",M2,[17,20,27],""),
("Metabolisme","Energieproductie in bacteriën","Ook bacteriën maken ATP via glycolyse, citroenzuurcyclus (CAC/TCA) en oxidatieve fosforylering, net als eukaryote cellen.",M2,[18,19,21],""),
("Metabolisme","Elektronentransportketen in bacteriën","Bacteriën hebben geen mitochondriën: de elektronentransportketen zit in het cytoplasmamembraan en bouwt daar de proton motive force op.",M2,[22],""),
("Metabolisme","Oxidatieve fosforylering","ATP-vorming via elektronentransportketen + chemiosmose: protonen stromen terug via ATP-synthase.",M2,[23,29],""),
("Metabolisme","Substraatniveaufosforylering","ATP-vorming door directe overdracht van fosfaat van een substraat op ADP (in glycolyse en citroenzuurcyclus).",M2,[24,29],""),
("Metabolisme","ATP-opbrengst aerobe respiratie","Theoretisch 38 ATP per glucose bij bacteriën (glycolyse 8 + CAC 30); in de praktijk niet wezenlijk anders dan ~32 ATP in eukaryote cellen.",M2,[24],""),
("Metabolisme","Oxidatie en reductie","Oxidatie: verlies van elektronen (of waterstof). Reductie: opname van elektronen (of waterstof).",M2,[18],""),
("Metabolisme","Fermentatie","Energiewinning zonder elektronentransportketen; producten zijn o.a. melkzuur, ethanol + CO2, azijnzuur, propionzuur (toepassing in voedsel).",M2,[18,46],""),
("Metabolisme","Katabole diversiteit","Veel bacteriën gebruiken niet (alleen) koolhydraten: sommigen gebruiken CO2 als koolstofbron en licht of anorganische stoffen (bijv. Fe2+ → Fe3+) als bron voor elektronen/ATP.",M2,[26,28],""),
# --- Trofie
("Trofie","Fototroof","Gebruikt licht als energiebron.",M2,[32,34],""),
("Trofie","Chemotroof","Gebruikt chemische verbindingen als energiebron.",M2,[32,34],""),
("Trofie","Autotroof","Gebruikt CO2 als koolstofbron en maakt zelf organische stoffen.",M2,[34],""),
("Trofie","Heterotroof","Gebruikt organische verbindingen uit de omgeving als koolstofbron.",M2,[34],""),
("Trofie","Organotroof","Gebruikt organische stoffen als elektronenbron.",M2,[34],""),
("Trofie","Lithotroof","Gebruikt anorganische stoffen als elektronenbron (bijv. H2, NH3, Fe2+, H2S).",M2,[34],""),
("Trofie","Naamgeving trofie","Volgorde: energiebron – (koolstofbron) – elektronenbron, bijv. chemo-hetero-organotroof.",M2,[32,36],""),
("Trofie","Fotoautotroof","Licht, CO2, elektronen uit H2O of H2S. Voorbeeld: cyanobacteriën.",M2,[36],""),
("Trofie","Fotoheterotroof","Licht, organische koolstof en organische elektronenbron. Voorbeeld: paarse niet-zwavelbacteriën.",M2,[36],""),
("Trofie","Chemolithoautotroof","Chemische energie, CO2, anorganische elektronenbron. Voorbeelden: nitrificerende bacteriën, ijzeroxiderende bacteriën (Fe2+ → Fe3+), Thiobacillus thiooxidans.",M2,[32,36,37],""),
("Trofie","Chemoorganoheterotroof","Chemische energie, organische koolstof en organische elektronenbron. Voorbeeld: E. coli en veel pathogene bacteriën.",M2,[32,36],""),
# --- PHB-productie
("PHB & metabolic engineering","Bioplastic / PHA","Polyhydroxyalkanoaten (PHA's): biologisch geproduceerde plastics die fossiele plastics kunnen vervangen (verpakking, medische producten, agro-materialen). PHB en 3HB zijn PHA's.",M2,[51,56],""),
("PHB & metabolic engineering","PHB (poly-3-hydroxyboterzuur)","Polymeer dat bacteriën gebruiken als energieopslag; bruikbaar als vervanger van plastic.",M2,[51,61],""),
("PHB & metabolic engineering","phaA, phaB, phaC","Genen uit R. eutropha voor PHB-synthese: phaA = β-ketothiolase (2 acetyl-CoA → acetoacetyl-CoA), phaB = acetoacetyl-CoA-reductase (→ 3-hydroxybutyryl-CoA), phaC = PHB-synthase (→ PHB).",M2,[52,53],""),
("PHB & metabolic engineering","tesB (thioesterase)","E. coli-gen dat 3-hydroxybutyryl-CoA omzet in vrij 3-hydroxybutyraat (3HB), dat uitgescheiden wordt.",M2,[57,60],""),
("PHB & metabolic engineering","3HB (3-hydroxybutyraat)","Monomeervorm die de cel uitscheidt in het medium; oplossing voor het PHB-probleem omdat zuivering makkelijker en goedkoper is.",M2,[57,60,62],""),
("PHB & metabolic engineering","Probleem met PHB","PHB wordt in de cel opgeslagen, waardoor zuivering lastig is; oplossing: productie van het monomeer (3HB) dat in het medium wordt uitgescheiden.",M2,[58,62],""),
("PHB & metabolic engineering","Metabolic engineering","Genetische aanpassing van de bacterie om een product te maken, bijv. E. coli met PHB-genen uit R. eutropha.",M2,[52,61],""),
("PHB & metabolic engineering","Metabolic steering","Sturen van het metabolisme via groeicondities (temperatuur, pH, koolstofbron, osmolariteit, zuurstof) en keuze van de bacterie.",M2,[52],""),
("PHB & metabolic engineering","Ralstonia eutropha (Cupriavidus necator)","Bacterie die van nature PHB maakt; bron van de pha-genen.",M2,[61],""),
("PHB & metabolic engineering","VFA's","Volatile fatty acids (vluchtige vetzuren), bijv. acetaat of propionaat; grondstof voor PHA-productie.",M2,[56],""),
]

rows = []
for i, (ond, beg, uit, f, sl, aanv) in enumerate(B, 1):
    rows.append({
        "id": f"cel-{i:03d}", "module": "De cel – LU1 Microbiologie", "onderwerp": ond,
        "begrip": beg, "uitleg": uit, "aanvulling": aanv,
        "bron_bestand": PAD + f, "bron_slides": sl,
    })
json.dump({"module": "De cel – LU1 Microbiologie (Jaar 2 P1, 2026-27)",
           "bronnen": [PAD + M1, PAD + M2], "begrippen": rows},
          open("begrippen-de-cel.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
with open("begrippen-de-cel.csv", "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh, delimiter=";")
    w.writerow(["id", "onderwerp", "begrip", "uitleg", "aanvulling", "bron", "slides"])
    for r in rows:
        w.writerow([r["id"], r["onderwerp"], r["begrip"], r["uitleg"], r["aanvulling"],
                    r["bron_bestand"].split("/")[-1].replace(" - student.pptx", ""),
                    ", ".join(map(str, r["bron_slides"]))])
print(len(rows), "begrippen")
