// Plasmidebouwer (module "DNA kraak de code", les 2, 4 en 5).
// Pure logica, geen DOM; de regels komen uit de kaarten van de module en staan getest in tests/plasmide.test.js.
//
// Een plasmide is hier een lijst onderdeel-id's in leesrichting: ["prom-pro", "rbs", "atg", "gen", "stop", "term"].
// Omdat een plasmide rond is, mogen de basis-features (ORI, selectiemarker) overal staan; voor de rest telt
// de volgorde, want daar zitten de didactische regels in: promotor vlak vóór de MCS, translatie-elementen
// bínnen de transcriptie-elementen, en geen stopcodon vóór een C-terminale tag.

// ---------- onderdelen ----------
// soort = groep in het palet; rol = waar de controle op kijkt; gastheer = pro | euk | beide;
// bp = indicatieve lengte, alleen om de cirkel realistisch te verdelen; bron = kaart-id in de module.
export const ONDERDELEN = [
  {
    id: "ori", naam: "ORI", lang: "Origin of replication (ORI)",
    soort: "basis", rol: "ori", gastheer: "beide", bp: 700, bron: "dna-021",
    uitleg: "DNA-sequentie die de replicatie van het plasmide start door de replicatie-machinerie van de gastheer aan te trekken.",
    waarom: "Zonder ORI wordt het plasmide niet vermenigvuldigd en is het na een paar celdelingen uit de cel verdwenen. De ORI bepaalt ook het copy number: hoeveel kopieën er per cel zitten.",
    valkuil: "Bij een narrow host range-plasmide hangt de ORI af van het Rep-eiwit van de gastheer. Hij werkt dus niet automatisch in elk organisme."
  },
  {
    id: "ori2", naam: "ORI 2", lang: "Tweede ORI, voor een andere gastheer",
    soort: "basis", rol: "ori2", gastheer: "beide", bp: 700, bron: "dna-035",
    uitleg: "Een tweede origin of replication, herkend door het Rep-eiwit van een ándere gastheer (Rep1 en Rep2).",
    waarom: "Hiermee wordt het plasmide een shuttle vector: opkweken in E. coli (snel, goedkoop, makkelijk te controleren) en daarna tot expressie brengen in gist of een humane cel.",
    valkuil: "Twee ORI's alleen is niet genoeg: de selectiemarker moet óók in beide gastheren werken."
  },
  {
    id: "marker", naam: "P+R", lang: "Selectiemarker met eigen promotor (AbR)",
    soort: "basis", rol: "marker", gastheer: "beide", bp: 1000, bron: "dna-024",
    uitleg: "Een resistentiegen met zijn eigen promotor erbij. Op een plasmidekaart staat dat als P+R.",
    waarom: "De meeste bacteriën nemen bij transformatie géén plasmide op. Met antibioticum in het medium groeien alleen de cellen die het plasmide wél hebben.",
    valkuil: "Een selectiemarker hoeft geen antibioticum te zijn. En let op het verschil tussen bactericide (dodend) en bacteriostatisch (groeiremmend) — sommige werken ook in andere celtypen en zijn dus buiten bacteriën bruikbaar."
  },
  {
    id: "mcs", naam: "MCS", lang: "Multiple cloning site",
    soort: "basis", rol: "mcs", gastheer: "beide", bp: 120, bron: "dna-023",
    uitleg: "Een kort stuk met unieke restrictie-enzymsites, waar je de insert (het gen van interesse) in bouwt.",
    waarom: "De sites moeten uniek zijn in het hele plasmide, anders knip je bij de digestie ook je vector stuk.",
    valkuil: "In een plasmide zit de promotor vlak vóór de MCS. Staat hij erachter, dan wordt je insert niet getranscribeerd."
  },
  {
    id: "prom-pro", naam: "P", lang: "Prokaryote promotor (lac, T7)",
    soort: "transcriptie", rol: "promotor", gastheer: "pro", bp: 300, bron: "dna-028",
    uitleg: "Hier binden het bacteriële RNA-polymerase en de transcriptiefactoren; de transcriptie begint.",
    waarom: "Drie dingen bepalen of een promotor geschikt is: hij past bij het organisme, zijn sterkte bepaalt hoeveel mRNA er komt, en hij is constitutief of induceerbaar (lac met IPTG, arabinose met arabinose).",
    valkuil: "Een bacteriële promotor werkt niet in een eukaryote cel. En een T7-promotor doet niets in een stam zonder T7-polymerase: de practicumstam JM109 is géén DE3-stam."
  },
  {
    id: "prom-euk", naam: "P euk", lang: "Eukaryote promotor (CMV, SV40)",
    soort: "transcriptie", rol: "promotor", gastheer: "euk", bp: 500, bron: "dna-028",
    uitleg: "Promotor die door de eukaryote transcriptiemachinerie herkend wordt; vaak constitutief, zoals CMV, of induceerbaar, zoals Tet-On met doxycycline.",
    waarom: "Een constitutieve promotor geeft expressie in alle weefsels; een induceerbare laat je het niveau en de timing regelen en geeft minder off-target-effecten.",
    valkuil: "CMV kan door methylering stilgelegd worden (silencing), waardoor de expressie na een tijd wegvalt. Induceerbare promotors zijn vaak een beetje lek."
  },
  {
    id: "term", naam: "TR", lang: "Transcriptieterminator (prokaryoot)",
    soort: "transcriptie", rol: "terminator", gastheer: "pro", bp: 150, bron: "dna-022",
    uitleg: "Markeert het einde van de transcriptie-eenheid; de transcriptiemachinerie laat hier los.",
    waarom: "Zonder terminator leest het polymerase door in de rest van het plasmide en maak je mRNA van dingen die je niet wilt.",
    valkuil: "Alles wat je wilt laten translateren moet vóór de terminator liggen: de translatie-elementen liggen bínnen de transcriptie-elementen."
  },
  {
    id: "polya", naam: "polyA", lang: "PolyA-signaal (eukaryoot)",
    soort: "transcriptie", rol: "terminator", gastheer: "euk", bp: 250, bron: "dna-022",
    uitleg: "Het signaal waar het eukaryote transcript geknipt wordt en de polyA-staart aan het mRNA komt.",
    waarom: "Het sluit de transcriptie-eenheid af en maakt het mRNA stabiel genoeg om naar het cytoplasma te gaan en getranslateerd te worden.",
    valkuil: "In een bacterie heeft een polyA-signaal geen functie; daar sluit je af met een transcriptieterminator."
  },
  {
    id: "rbs", naam: "RBS", lang: "RBS / Shine-Dalgarno (AGGAGG)",
    soort: "translatie", rol: "rbs", gastheer: "pro", bp: 20, bron: "dna-092",
    uitleg: "De ribosoombindingsplaats in prokaryoten. Ligt stroomopwaarts van het startcodon en trekt het ribosoom aan voor de translatie-initiatie.",
    waarom: "Vereist element in een prokaryoot expressieplasmide: zonder RBS bindt het ribosoom niet en komt er geen eiwit, hoeveel mRNA je ook maakt.",
    valkuil: "De practicumstam JM109 heeft zelf geen RBS; die moet dus in je plasmide zitten. In een eukaryote cel doet een RBS niets."
  },
  {
    id: "kozak", naam: "Kozak", lang: "Kozak-sequentie (A/GCCACCAUGG)",
    soort: "translatie", rol: "kozak", gastheer: "euk", bp: 20, bron: "dna-092",
    uitleg: "Een motief rónd het startcodon AUG dat efficiënte en accurate translatie-initiatie bevordert in eukaryoten.",
    waarom: "Geen vereist element zoals een RBS, maar het verhoogt de opbrengst en voorkomt dat het ribosoom het eerste AUG overslaat.",
    valkuil: "Kozak ligt om het AUG heen, niet ver stroomopwaarts, en is geen vervanging voor een RBS in een bacterie."
  },
  {
    id: "ires", naam: "IRES", lang: "Internal ribosome entry site",
    soort: "translatie", rol: "ires", gastheer: "euk", bp: 550, bron: "dna-093",
    uitleg: "Een structuur in het mRNA waar het ribosoom midden in het transcript kan instappen.",
    waarom: "Prokaryoten maken polycistronische mRNA's, eukaryoten monocistronische. Wil je in een eukaryoot twee eiwitten uit één transcript, dan zet je een IRES ertussen.",
    valkuil: "De expressie ná de IRES is in de praktijk lager. En na de IRES hoort een eigen startcodon: het ribosoom stapt daar in en begint bij het eerste AUG."
  },
  {
    id: "atg", naam: "ATG", lang: "Startcodon (ATG)",
    soort: "translatie", rol: "start", gastheer: "beide", bp: 3, bron: "dna-020",
    uitleg: "Het codon waar de translatie begint; het eerste aminozuur is altijd methionine. In prokaryoten kunnen ook GTG en TTG als start dienen.",
    waarom: "Het startcodon bepaalt het leesraam van alles wat erna komt.",
    valkuil: "Een ATG bínnen een CDS codeert gewoon voor methionine en begint geen nieuw eiwit. Let bij een fusie op het frame: één nucleotide te veel of te weinig geeft een frameshift."
  },
  {
    id: "stop", naam: "stop", lang: "Stopcodon (TAA, TAG, TGA)",
    soort: "translatie", rol: "stop", gastheer: "beide", bp: 3, bron: "dna-088",
    uitleg: "Hier laat het ribosoom het mRNA los en is het eiwit af.",
    waarom: "Elk eiwit heeft er precies één nodig, aan het einde van zijn eigen leesraam.",
    valkuil: "Een stopcodon vóór een C-terminale tag is de klassieke fout: de translatie stopt dan vóór de tag en je mist hem in het eiwit."
  },
  {
    id: "gen", naam: "leptine", lang: "Gen van interesse (leptine-CDS)",
    soort: "codering", rol: "gen", gastheer: "beide", bp: 500, codeert: true, bron: "dna-089",
    uitleg: "De coding sequence die je tot expressie wilt brengen: alleen het deel dat werkelijk voor het eiwit codeert.",
    waarom: "Een CDS-fusie (alleen exons) hangt alleen van de promotor af; neem je het hele gen met introns mee, dan speelt ook intronregulatie mee.",
    valkuil: "Bij een C-terminale fusie moet het eigen stopcodon van het gen eruit; bij een N-terminale fusie mag het eigen startcodon eruit, want het fusie-eiwit start bij de tag."
  },
  {
    id: "gfp", naam: "GFP", lang: "GFP-reporter",
    soort: "codering", rol: "reporter", gastheer: "beide", bp: 720, codeert: true, bron: "dna-095",
    uitleg: "Groen fluorescerend eiwit: een reporter die laat zien wáár en wannéér een gen tot expressie komt.",
    waarom: "Translationeel gefuseerd zie je waar het eíwit zich bevindt; transcriptioneel (met eigen start- en stopcodon) zie je waar de promótor actief is.",
    valkuil: "Een fusie-eiwit kan de functie of de lokalisatie van je eiwit verstoren. Kies dan een transcriptionele fusie, zodat de twee eiwitten gescheiden blijven."
  },
  {
    id: "his", naam: "HIS", lang: "HIS-tag",
    soort: "codering", rol: "tag", gastheer: "beide", bp: 60, codeert: true, bron: "dna-088",
    uitleg: "Een korte reeks histidines waarmee je het eiwit uit een mengsel vist: pull-down, immunoprecipitatie en affiniteitszuivering.",
    waarom: "De tag moet in hetzelfde leesraam als het eiwit zitten, N-terminaal of C-terminaal.",
    valkuil: "Bij leptine kan de HIS-tag alleen C-terminaal, omdat leptine wordt uitgescheiden en de N-terminus daarbij deels wordt afgeknipt."
  },
  {
    id: "tev", naam: "TEV", lang: "TEV-proteasesite",
    soort: "codering", rol: "tev", gastheer: "beide", bp: 21, codeert: true, bron: "dna-094",
    uitleg: "Knipplek voor TEV-protease, een cysteïneprotease uit het Tobacco Etch Virus met zeer hoge sequentiespecificiteit.",
    waarom: "Zet je hem tússen de CDS en de tag, dan knip je de tag er na de zuivering weer af en houd je het eiwit zelf over.",
    valkuil: "Staat de TEV-site aan de verkeerde kant van de tag, dan knip je je eiwit los van de tag en gooi je het met de tag weg."
  }
];

export const SOORTEN = [
  { id: "basis", naam: "Plasmide-basis", uitleg: "Wat het plasmide zelf nodig heeft om te overleven en te kunnen worden gekloneerd. Waar ze op de cirkel staan maakt niet uit." },
  { id: "transcriptie", naam: "Transcriptie", uitleg: "Bepalen waar het RNA-polymerase begint en waar het weer loslaat." },
  { id: "translatie", naam: "Translatie", uitleg: "Bepalen waar het ribosoom instapt en waar het eiwit begint en eindigt. Deze liggen bínnen de transcriptie-elementen." },
  { id: "codering", naam: "Coderend", uitleg: "Alles wat in aminozuren wordt omgezet: je gen, reporters en tags. Binnen één eiwit moeten ze in hetzelfde leesraam liggen." }
];

const MAP = new Map(ONDERDELEN.map(o => [o.id, o]));
export const onderdeel = id => MAP.get(id) || null;

// ---------- opdrachten ----------
export const OPDRACHTEN = [
  {
    id: "vrij", titel: "Vrij bouwen", kort: "Vrij",
    vraag: "Bouw wat je wilt. De controle kijkt alleen of het plasmide als geheel klopt en waarschuwt als je prokaryote en eukaryote elementen mengt.",
    gastheer: null, doel: "vrij", voorbeeld: ["prom-pro", "rbs", "atg", "gen", "stop", "term", "ori", "marker"]
  },
  {
    id: "klonering", titel: "Minimaal kloneerplasmide", kort: "Klonering",
    vraag: "Bouw het plasmide dat je minimaal nodig hebt om een gen te kúnnen kloneren — nog niet om er eiwit van te maken.",
    gastheer: "pro", doel: "klonering", voorbeeld: ["prom-pro", "mcs", "ori", "marker"]
  },
  {
    id: "ecoli", titel: "Expressie in E. coli", kort: "E. coli",
    vraag: "Breng leptine tot expressie in E. coli. Houd er rekening mee dat de practicumstam JM109 zelf geen RBS heeft.",
    gastheer: "pro", doel: "expressie", voorbeeld: ["prom-pro", "rbs", "atg", "gen", "stop", "term", "ori", "marker"]
  },
  {
    id: "humaan", titel: "Expressie in een humane cel", kort: "Humane cel",
    vraag: "Breng leptine tot expressie in een humane cellijn.",
    gastheer: "euk", doel: "expressie", voorbeeld: ["prom-euk", "kozak", "atg", "gen", "stop", "polya", "ori", "marker"]
  },
  {
    id: "his-c", titel: "C-terminale HIS-tag met TEV", kort: "HIS + TEV",
    vraag: "Breng leptine tot expressie in E. coli met een HIS-tag erop om het eiwit op te zuiveren, en zorg dat je die tag er daarna weer af kunt knippen.",
    gastheer: "pro", doel: "expressie", fusie: { onderdeel: "his", kant: "C" }, tev: true,
    voorbeeld: ["prom-pro", "rbs", "atg", "gen", "tev", "his", "stop", "term", "ori", "marker"]
  },
  {
    id: "n-gfp", titel: "N-terminale GFP-fusie", kort: "GFP N-term",
    vraag: "Maak in een humane cel één fusie-eiwit waarbij GFP N-terminaal aan leptine zit, zodat je kunt zien waar het eiwit zich bevindt.",
    gastheer: "euk", doel: "expressie", fusie: { onderdeel: "gfp", kant: "N" },
    voorbeeld: ["prom-euk", "kozak", "atg", "gfp", "gen", "stop", "polya", "ori", "marker"]
  },
  {
    id: "transcriptioneel", titel: "Transcriptionele fusie met IRES", kort: "IRES",
    vraag: "Maak in een humane cel twéé losse eiwitten — leptine en GFP — uit één transcript, aangedreven door dezelfde promotor.",
    gastheer: "euk", doel: "expressie", twee: true,
    voorbeeld: ["prom-euk", "kozak", "atg", "gen", "stop", "ires", "atg", "gfp", "stop", "polya", "ori", "marker"]
  },
  {
    id: "shuttle", titel: "Shuttle vector", kort: "Shuttle",
    vraag: "Maak een plasmide dat je eerst opkweekt in E. coli en daarna tot expressie brengt in een humane cel.",
    gastheer: "euk", doel: "expressie", shuttle: true,
    voorbeeld: ["prom-euk", "kozak", "atg", "gen", "stop", "polya", "ori", "ori2", "marker"]
  }
];

const OPDRACHT_MAP = new Map(OPDRACHTEN.map(o => [o.id, o]));
export const opdracht = id => OPDRACHT_MAP.get(id) || OPDRACHT_MAP.get("vrij");

export const GASTHEERNAAM = { pro: "prokaryoot (E. coli)", euk: "eukaryoot (humane cel)" };

// ---------- controle ----------
// Geeft { bevindingen, klaar, aantal } terug. Een bevinding is
// { soort: "fout" | "letop" | "goed" | "info", kop, tekst, bron? }; soort bepaalt de kleur in het scherm.
export function controleer(ids, opdrachtId = "vrij") {
  const o = typeof opdrachtId === "string" ? opdracht(opdrachtId) : opdrachtId;
  const lijst = (Array.isArray(ids) ? ids : []).map((id, i) => ({ id, i, d: MAP.get(id) })).filter(x => x.d);
  const b = [];
  const voeg = (soort, kop, tekst, bron) => b.push(bron ? { soort, kop, tekst, bron } : { soort, kop, tekst });

  const rol = r => lijst.filter(x => x.d.rol === r);
  const eerste = r => rol(r)[0] || null;
  const naamLijst = xs => xs.map(x => x.d.naam).join(", ");

  const promotors = rol("promotor");
  const prom = promotors[0] || null;
  const terminators = rol("terminator");
  const term = terminators[terminators.length - 1] || null;
  const starts = rol("start");
  const stops = rol("stop");
  const mcs = eerste("mcs");
  const codes = lijst.filter(x => x.d.codeert);
  const expressie = o.doel === "expressie" || (o.doel === "vrij" && codes.length > 0);

  // --- plasmide-basis ---
  if (!rol("ori").length) {
    voeg("fout", "Geen ORI", "Zonder origin of replication wordt het plasmide niet gerepliceerd en is het na een paar celdelingen uit de cel verdwenen.", "dna-021");
  } else {
    voeg("goed", "ORI aanwezig", "Het plasmide kan zich in de gastheer vermenigvuldigen. De ORI bepaalt ook het copy number.", "dna-021");
  }

  if (!rol("marker").length) {
    voeg("fout", "Geen selectiemarker", "De meeste bacteriën nemen bij transformatie géén plasmide op. Zonder marker kun je de cellen mét plasmide niet uitselecteren.", "dna-024");
  } else {
    voeg("goed", "Selectiemarker aanwezig", "Met het bijbehorende antibioticum in het medium groeien alleen de cellen die het plasmide hebben opgenomen.", "dna-024");
  }

  if (o.doel === "klonering" && !mcs) {
    voeg("fout", "Geen MCS", "Zonder multiple cloning site heb je geen unieke restrictiesites om de insert in te bouwen.", "dna-023");
  }
  if (mcs && prom) {
    if (mcs.i < prom.i) {
      voeg("fout", "MCS staat vóór de promotor", "De promotor hoort vlak vóór de MCS, anders wordt je insert niet getranscribeerd.", "dna-023");
    } else {
      const tussen = lijst.filter(x => x.i > prom.i && x.i < mcs.i && x.d.soort !== "basis" && !["rbs", "kozak", "start"].includes(x.d.rol));
      if (tussen.length) {
        voeg("fout", "MCS ligt niet vlak achter de promotor", `Er staat nog ${naamLijst(tussen)} tussen de promotor en de MCS. In een plasmide zit de promotor vlak vóór de MCS.`, "dna-023");
      } else {
        voeg("goed", "Promotor vlak vóór de MCS", "Wat je in de MCS inbouwt, komt meteen achter de promotor en wordt dus getranscribeerd.", "dna-023");
      }
    }
  }

  // --- promotor ---
  if (!promotors.length) {
    voeg("fout", "Geen promotor", "Álle genen in een plasmide moeten door een promotor aangedreven worden. Geen promotor betekent geen transcriptie en dus geen eiwit.", "dna-028");
  } else {
    let mis = false;
    for (const p of promotors) {
      if (o.gastheer && p.d.gastheer !== "beide" && p.d.gastheer !== o.gastheer) {
        mis = true;
        voeg("fout", `${p.d.lang} past niet bij de gastheer`,
          o.gastheer === "euk"
            ? "Een bacteriële promotor werkt niet in een eukaryote cel: de eukaryote transcriptiemachinerie herkent hem niet."
            : "Een eukaryote promotor werkt niet in een bacterie. Kies een prokaryote promotor, bijvoorbeeld lac of T7.",
          "dna-028");
      }
    }
    if (!mis) voeg("goed", "Promotor aanwezig", `De transcriptie kan starten${o.gastheer ? `, en de promotor past bij de gastheer: ${GASTHEERNAAM[o.gastheer]}` : ""}.`, "dna-028");
  }

  if (prom && codes.length && codes[0].i < prom.i) {
    voeg("fout", "Coderend DNA staat vóór de promotor", `${codes[0].d.lang} ligt stroomopwaarts van de promotor en valt dus buiten het transcript.`, "dna-086");
  }

  // --- transcriptie-eenheid afsluiten ---
  if (expressie && !terminators.length) {
    voeg("fout", o.gastheer === "euk" ? "Geen polyA-signaal" : "Geen terminator",
      "Zonder einde van de transcriptie-eenheid laat de transcriptiemachinerie niet los en leest het polymerase door in de rest van het plasmide.", "dna-022");
  }
  for (const t of terminators) {
    if (o.gastheer && t.d.gastheer !== o.gastheer) {
      voeg("fout", `${t.d.lang} past niet bij de gastheer`,
        o.gastheer === "euk"
          ? "In een eukaryote cel sluit je de transcriptie-eenheid af met een polyA-signaal."
          : "Een polyA-signaal heeft in een bacterie geen functie; gebruik een transcriptieterminator.",
        "dna-022");
    }
  }

  // --- translatie-elementen liggen bínnen de transcriptie-elementen (dna-086) ---
  const binnen = x => x.d.soort === "translatie" || x.d.codeert;
  if (term) {
    const naTerm = lijst.filter(x => x.i > term.i && binnen(x));
    if (naTerm.length) {
      voeg("fout", "Elementen achter het einde van de transcriptie", `${naamLijst(naTerm)} ligt achter ${term.d.naam} en komt dus niet in het transcript. De translatie-elementen liggen bínnen de transcriptie-elementen.`, "dna-086");
    }
  }
  if (prom) {
    const voorProm = lijst.filter(x => x.i < prom.i && binnen(x));
    if (voorProm.length) {
      voeg("fout", "Elementen vóór de promotor", `${naamLijst(voorProm)} ligt stroomopwaarts van de promotor en wordt niet getranscribeerd.`, "dna-086");
    }
  }

  // --- ribosoombinding (dna-026, dna-092) ---
  const rbs = eerste("rbs"), kozak = eerste("kozak");
  if (expressie && o.gastheer === "pro") {
    if (!rbs) voeg("fout", "Geen RBS", "In een prokaryoot is de Shine-Dalgarno-sequentie een vereist element: zonder RBS bindt het ribosoom niet en komt er geen eiwit, hoeveel mRNA je ook maakt. JM109 heeft zelf geen RBS.", "dna-092");
    if (kozak) voeg("fout", "Kozak in een prokaryoot", "De Kozak-sequentie is eukaryoot. In een bacterie heb je een RBS (Shine-Dalgarno) nodig.", "dna-092");
    if (rol("ires").length) voeg("fout", "IRES in een prokaryoot", "Een IRES is eukaryoot. Prokaryoten maken polycistronische mRNA's: daar geef je elk cistron simpelweg zijn eigen RBS.", "dna-093");
  }
  if (expressie && o.gastheer === "euk") {
    if (rbs) voeg("fout", "RBS in een eukaryoot", "De RBS / Shine-Dalgarno-sequentie is prokaryoot en doet in een eukaryote cel niets. Daar bindt het ribosoom via de 5'-cap, geholpen door een Kozak-sequentie.", "dna-092");
    if (!kozak) voeg("letop", "Geen Kozak-sequentie", "Niet verplicht, maar een Kozak-motief rónd het ATG bevordert efficiënte en accurate translatie-initiatie en verhoogt de opbrengst.", "dna-092");
  }
  if (rbs && starts.length && rbs.i > starts[0].i) {
    voeg("fout", "RBS staat achter het startcodon", "De Shine-Dalgarno-sequentie ligt stroomopwaarts van het startcodon; daar trekt hij het ribosoom aan.", "dna-092");
  }
  if (kozak && starts.length && kozak.i > starts[0].i) {
    voeg("fout", "Kozak staat achter het startcodon", "De Kozak-sequentie ligt rónd het AUG, dus direct ervóór in je constructie.", "dna-092");
  }

  // --- start- en stopcodon (dna-020, dna-086) ---
  if (expressie) {
    if (!starts.length) voeg("fout", "Geen startcodon", "Zonder ATG weet het ribosoom niet waar het moet beginnen en ligt het leesraam niet vast.", "dna-020");
    if (!stops.length) voeg("fout", "Geen stopcodon", "Zonder stopcodon laat het ribosoom het mRNA niet los en is het eiwit niet af.", "dna-020");
    if (starts.length && codes.length && starts[0].i > codes[0].i) {
      voeg("fout", "Startcodon staat achter het coderende DNA", `${codes[0].d.lang} ligt vóór het ATG en wordt dus niet meegetranslateerd.`, "dna-086");
    }
    if (stops.length && codes.length && stops[stops.length - 1].i < codes[codes.length - 1].i) {
      voeg("fout", "Laatste coderende deel ligt achter het stopcodon", `${codes[codes.length - 1].d.lang} ligt achter het laatste stopcodon en komt niet in het eiwit.`, "dna-088");
    }
  }

  // --- stopcodon midden in een leesraam: de klassieke fout bij een C-terminale tag (dna-088) ---
  const foutStops = new Set();
  for (const s of stops) {
    const volgende = lijst.find(x => x.i > s.i && x.d.codeert);
    if (!volgende) continue;
    // Een IRES, promotor, RBS of nieuw startcodon na het stopcodon betekent: hier begint een nieuw eiwit.
    // Dan is het stopcodon juist goed. Staat er niets van dat alles, dan wilde je een fusie en gaat die mis.
    const tussen = lijst.filter(x => x.i > s.i && x.i < volgende.i);
    if (tussen.some(x => ["ires", "promotor", "rbs", "start"].includes(x.d.rol))) continue;
    foutStops.add(s.i);
    voeg("fout", `Stopcodon vóór ${volgende.d.naam}`,
      `De translatie stopt bij het stopcodon, dus ${volgende.d.lang} komt niet in het eiwit. Een stopcodon vóór een C-terminale tag is de klassieke fout; laat het stopcodon van het gen weg en zet er één ná de tag.`,
      "dna-088");
  }

  // --- eiwitten tellen: coderende blokken, gescheiden door een stopcodon ---
  const groepen = [];
  let huidig = [];
  for (const x of lijst) {
    if (x.d.codeert) huidig.push(x);
    else if (x.d.rol === "stop" && huidig.length) { groepen.push(huidig); huidig = []; }
  }
  if (huidig.length) groepen.push(huidig);

  // --- IRES: eigen startcodon erna (dna-093) ---
  for (const ir of rol("ires")) {
    const volgende = lijst.find(x => x.i > ir.i && x.d.codeert);
    if (!volgende) {
      voeg("fout", "Niets achter de IRES", "Een IRES is er om een tweede cistron te laten translateren; achter deze IRES staat geen coderend DNA.", "dna-093");
      continue;
    }
    if (!lijst.some(x => x.d.rol === "start" && x.i > ir.i && x.i < volgende.i)) {
      voeg("fout", "Geen startcodon na de IRES", "Het ribosoom stapt bij de IRES in en begint bij het eerste AUG. Zonder eigen startcodon komt het tweede eiwit niet van de band.", "dna-093");
    }
  }

  // --- mono- versus polycistronisch (dna-093) ---
  if (groepen.length >= 2) {
    for (let i = 1; i < groepen.length; i++) {
      const van = groepen[i - 1][groepen[i - 1].length - 1].i, tot = groepen[i][0].i;
      const tussen = lijst.filter(x => x.i > van && x.i < tot);
      // Is het scheidende stopcodon hierboven al als fout gemeld, dan wilde je geen twee eiwitten
      // maar een fusie; die fout is al uitgelegd en hoeft hier niet nog een tweede verhaal te krijgen.
      if (tussen.some(x => foutStops.has(x.i))) continue;
      const heeftIres = tussen.some(x => x.d.rol === "ires");
      const eigenPromotor = tussen.some(x => x.d.rol === "promotor");
      if (o.gastheer === "euk" && !heeftIres && !eigenPromotor) {
        voeg("fout", "Twee eiwitten zonder IRES in een eukaryoot", "Eukaryoten maken monocistronische mRNA's: één transcript geeft één eiwit. Wil je er twee uit één transcript, dan moet er een IRES tussen.", "dna-093");
      }
      if (o.gastheer === "pro" && !tussen.some(x => x.d.rol === "rbs") && !eigenPromotor) {
        voeg("letop", "Tweede cistron zonder eigen RBS", "Prokaryoten zijn polycistronisch, dat mag dus. Maar elk cistron heeft zijn eigen ribosoombindingsplaats nodig om getranslateerd te worden.", "dna-093");
      }
    }
  }

  // --- fusietype benoemen (dna-089, dna-090, dna-091) ---
  if (groepen.length === 1 && groepen[0].length >= 2) {
    voeg("info", "Translationele fusie", `${naamLijst(groepen[0])} liggen in één leesraam: er ontstaat één fusie-eiwit. Dat gebruik je als je wilt weten waar het eíwit zit of als je het wilt opzuiveren.`, "dna-089");
  }
  if (groepen.length >= 2 && rol("ires").length) {
    voeg("info", "Transcriptionele fusie, multicistronisch", "Eén promotor, één transcript, twee aparte eiwitten. Houd er rekening mee dat de expressie ná de IRES lager is.", "dna-090");
  }
  if (groepen.length >= 2 && promotors.length >= 2) {
    voeg("info", "Twee transcriptie-eenheden", "Elk gen heeft zijn eigen promotor, dus er zijn twee aparte transcripten. Dat is geen transcriptionele fusie: daarbij deelt de reporter de promotor van het gen.", "dna-090");
  }

  // --- tag N- of C-terminaal (dna-088, dna-131) ---
  if (o.fusie) {
    const t = eerste(MAP.get(o.fusie.onderdeel).rol), g = eerste("gen");
    const naam = MAP.get(o.fusie.onderdeel).lang;
    // Zit er een stopcodon tussen het gen en de tag, dan is dat hierboven al als fout gemeld:
    // de kant klopt dan misschien wel, maar het is geen fusie, dus geen groen vinkje erbij.
    const onderbroken = t && g && stops.some(s => s.i > Math.min(t.i, g.i) && s.i < Math.max(t.i, g.i));
    if (!t) {
      voeg("fout", `${naam} ontbreekt`, "De opdracht vraagt om deze fusie; zonder dit onderdeel kun je hem niet maken.", "dna-088");
    } else if (g && !onderbroken) {
      if (o.fusie.kant === "C" && t.i < g.i) {
        voeg("fout", `${naam} staat N-terminaal`, "De opdracht vraagt een C-terminale fusie: [promotor]; [gen mét startcodon, zónder stopcodon]; [tag mét stopcodon]. Bij leptine kan het ook niet anders, want leptine wordt uitgescheiden en de N-terminus wordt daarbij deels afgeknipt.", "dna-088");
      } else if (o.fusie.kant === "N" && t.i > g.i) {
        voeg("fout", `${naam} staat C-terminaal`, "De opdracht vraagt een N-terminale fusie: [promotor]; [tag mét startcodon]; [gen zónder eigen startcodon, mét stopcodon].", "dna-088");
      } else {
        voeg("goed", `${naam} staat ${o.fusie.kant}-terminaal`, o.fusie.kant === "C"
          ? "Volgorde goed: het gen eerst met zijn startcodon, daarna de tag, en het stopcodon helemaal achteraan."
          : "Volgorde goed: de tag eerst met het startcodon, daarna het gen, en het stopcodon achter het gen.", "dna-088");
        if (o.fusie.kant === "N" && starts.some(s => s.i > t.i && s.i < g.i)) {
          voeg("letop", "Extra startcodon tussen tag en gen", "Het gen hoeft geen eigen startcodon meer: het fusie-eiwit start bij de tag. Een in-frame ATG hier codeert gewoon voor methionine, maar het is overbodig.", "dna-020");
        }
      }
    }
  }

  // --- TEV-site (dna-094, dna-127) ---
  const tev = eerste("tev");
  if (o.tev && !tev) {
    voeg("fout", "Geen TEV-site", "Zonder knipplek voor TEV-protease kun je de tag er na de zuivering niet weer afhalen.", "dna-094");
  } else if (tev) {
    const rest = codes.filter(x => x.id !== "tev");
    const voor = rest.filter(x => x.i < tev.i), na = rest.filter(x => x.i > tev.i);
    if (!voor.length || !na.length) {
      voeg("fout", "TEV-site ligt niet tussen twee coderende delen", "De TEV-site hoort tússen de CDS en de tag; alleen dan knip je na de zuivering de tag eraf en houd je het eiwit over.", "dna-094");
    } else {
      voeg("goed", "TEV-site tussen CDS en tag", `Na de zuivering knipt TEV-protease tussen ${voor[voor.length - 1].d.naam} en ${na[0].d.naam}, en houd je het eiwit zonder tag over.`, "dna-094");
    }
  }

  // --- shuttle vector (dna-035, dna-036) ---
  const aantalOri = rol("ori").length + rol("ori2").length;
  if (o.shuttle) {
    if (aantalOri < 2) {
      voeg("fout", "Nog geen shuttle vector", "Een shuttle vector heeft twee ORI's: ori1 en ori2, elk herkend door het Rep-eiwit van een andere gastheer.", "dna-035");
    } else {
      voeg("goed", "Twee ORI's", "Het plasmide repliceert in beide gastheren: opkweken in E. coli, daarna tot expressie brengen in de eindgastheer.", "dna-035");
      voeg("letop", "Marker moet in beide gastheren werken", "Twee ORI's zijn niet genoeg: de selectiemarker moet ook in E. coli én in de eindgastheer werken. Antibiotica die bactericide of bacteriostatisch werken, werken soms ook in andere celtypen.", "dna-036");
    }
  } else if (rol("ori2").length) {
    voeg("letop", "Tweede ORI zonder noodzaak", "Een tweede ORI heb je alleen nodig voor een shuttle vector, als het plasmide in twee verschillende gastheren moet repliceren.", "dna-035");
  }

  // --- gemengde gastheer bij vrij bouwen ---
  if (!o.gastheer) {
    const pro = lijst.filter(x => x.d.gastheer === "pro"), euk = lijst.filter(x => x.d.gastheer === "euk");
    if (pro.length && euk.length) {
      voeg("letop", "Prokaryote en eukaryote elementen gemengd", `Je gebruikt ${naamLijst(pro)} (prokaryoot) naast ${naamLijst(euk)} (eukaryoot). Dat werkt alleen als je het bewust doet, zoals bij een shuttle vector met twee aparte cassettes.`, "dna-026");
    }
  }

  // --- dubbele onderdelen ---
  for (const id of ["ori", "marker", "mcs", "gen", "his", "tev", "ires"]) {
    const n = lijst.filter(x => x.id === id).length;
    if (n > 1) voeg("letop", `${MAP.get(id).naam} staat er ${n}× in`, `${MAP.get(id).lang} hoort maar één keer in het plasmide te zitten.`, MAP.get(id).bron);
  }

  // --- klonering: nog niet geschikt voor expressie (dna-027) ---
  if (o.doel === "klonering") {
    const vier = ["ori", "marker", "mcs", "promotor"].every(r => rol(r).length);
    if (vier) voeg("goed", "De vier minimale elementen zitten erin", "ORI, selectiemarker, MCS en promotor: dat is wat een plasmide minimaal nodig heeft voor genklonering.", "dna-027");
    voeg("info", "Van kloneren naar expressie", "Wil je er ook eiwit van maken, dan komen daar een terminator, een RBS of IRES en een start- en stopcodon bij. Een expressieplasmide heeft vaak ook een repressor om de expressie te regelen.", "dna-027");
  }

  const orde = { fout: 0, letop: 1, goed: 2, info: 3 };
  b.sort((x, y) => orde[x.soort] - orde[y.soort]);
  const aantal = { fout: 0, letop: 0, goed: 0, info: 0 };
  for (const x of b) aantal[x.soort]++;
  return { bevindingen: b, aantal, klaar: lijst.length > 0 && aantal.fout === 0 };
}

// Indicatieve lengte van het hele plasmide, voor de cirkelkaart en het label in het midden.
export const lengte = ids => (Array.isArray(ids) ? ids : []).reduce((n, id) => n + (MAP.get(id)?.bp || 0), 2000);
