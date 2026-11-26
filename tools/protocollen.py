"""Zet de practicumprotocollen uit bronnen/sharepoint om naar labsessies in data/.

Een bestand is één labsessie (een week) en bevat meestal meerdere experimenten (1A, 1B, 4A...).
Elk experiment heeft zijn eigen Materialen-, Apparatuur- en Uitvoering-blok. De kopjes wisselen
per document: "Uitvoering", "Methoden" of "Methode"; "Materialen", "Materialen:" of "Materiaal".

Wat er WEL in data/ komt: de structuur. Welke experimenten, welke chemicaliën, welke apparatuur,
hoeveel stappen, en of er een opruimstap is. Dat is wat de labvleugel nodig heeft.

Wat er NIET in komt: de letterlijke protocoltekst. Dat is lesmateriaal van de opleiding en deze
repo is openbaar (zie BIJDRAGEN.md). De volledige tekst blijft in bronnen/.

Gebruik: python tools/protocollen.py [--toon <week>]
"""
import collections
import json
import pathlib
import re
import sys
import unicodedata

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN  # noqa: E402  (pad moet eerst goed staan)

# Welke SharePoint-map hoort bij welke module van de site, en welke bestanden daarin
# practicumhandleidingen zijn. Eén map kan bij meer dan één module horen (Module 1.2 bevat
# zowel microbiologie als celbiologie), dus de koppeling staat per map.
MAPPEN = [
    ("sharepoint/practicum-biomoleculen/Practicum - Biomoleculen in de praktijk",
     "data/jaar-1/periode-1/biomoleculen-labveiligheid.lab.json", "Experiment*.txt"),
    # "1. Veilig werken" klinkt algemeen, maar de practica gaan over bacteriestammen,
    # nutriëntagar en autoclaveren: dat hoort bij de microbiologiemodule, niet bij celbiologie.
    ("sharepoint/m12-veilig-werken/1. Veilig werken",
     "data/jaar-1/periode-1/de-cel.lab.json", "*Praktijkles*.txt"),
    ("sharepoint/m12-microbiologie/2. Microbiologie",
     "data/jaar-1/periode-1/de-cel.lab.json", "*Praktijkles*.txt"),
    # Module 1.3 Eiwit: per week een map, de protocollen staan erin. "Criteria labjournaal"
    # is geen protocol en valt af door het patroon.
    ("sharepoint/m13-eiwittechnieken/2. Eiwittechnieken",
     "data/jaar-1/periode-3/eiwitten-in-de-praktijk.lab.json", "**/*LU2*.txt"),
    ("sharepoint/m13-eiwittechnieken/2. Eiwittechnieken",
     "data/jaar-1/periode-3/eiwitten-in-de-praktijk.lab.json", "**/[Pp]rotocol*.txt"),
    # Module 1.4 DNA: één map met dagdelen, genummerd 01 t/m 11.
    ("sharepoint/m14-dna-praktijk/Leeruitkomst 2 DNA in de praktijk",
     "data/jaar-1/periode-4/dna-ontrafeld.lab.json", "Dagdeel*.txt"),
]

# Module 1.3 DNA (sharepoint/m13-dna-praktijk) is opgehaald maar nog niet gekoppeld: de site
# heeft geen module voor de DNA-stroom in periode 3. Module 1.4 Eiwit is op SharePoint vrijwel
# leeg (alleen weekmappen zonder studentmateriaal), dus daar valt niets om te zetten.

EXPERIMENT = re.compile(r"^\s*experiment\s+(\d+[A-Za-z]?|[A-Za-z]?)\s*:?\s*(.*)$", re.I)
# "Materials" en "Method" erbij: de protocollen die in Brightspace als pagina staan (DNA
# toolbox, lab 8) zijn in het Engels geschreven. Zonder deze woorden ziet de parser daar
# geen materialenlijst en dus ook geen stoffen.
MATERIALEN = re.compile(r"^\s*(?:materia(?:len|al)|materials?)\s*:?\s*$", re.I)
# "Materiaal & Methode" is één kopje met lijst én procedure eronder. De regels daar verdelen
# we met is_stap en is_stof, die elkaar uitsluiten: een zin is geen stof, een lijstitem geen stap.
MATERIAAL_EN_METHODE = re.compile(r"^\s*materia(?:len|al)\s*(?:&|en)\s*methoden?\s*:?\s*$", re.I)
APPARATUUR = re.compile(
    r"^\s*(?:appa?ratuur(?:\s*&\s*disposables)?|instrumentarium)\s*:?\s*$", re.I)
STAPPEN_KOP = re.compile(r"^\s*(uitvoering|methoden?|method|procedure)\s*:?\s*$", re.I)
# Soms staat het onderwerp in het kopje ("Methode voor nutrientagar", "Vaardigheid:
# beenten vaste agar"). Zo'n kop is kort, heeft geen eindpunt en bevat geen werkwoordzin;
# de lengtegrens houdt een gewone zin die met "Methode" begint buiten de deur.
STAPPEN_KOP_MET_ONDERWERP = re.compile(
    r"^\s*(?:(?:methode|werkwijze|vaardigheid)\s*(?:voor|van|:)|opdracht\s+\d+\s*:?)"
    r"\s*\S[^.]{0,40}$", re.I)
INLEIDING = re.compile(r"^\s*(inleiding|voorbereiding)\b.*$", re.I)
TABEL = re.compile(r"^\s*tabel\s*\d*\s*:", re.I)
OPRUIMEN = re.compile(r"\bopruim|afvalvat|niet door de gootsteen\b", re.I)

# Een materialenregel is een stof als het geen glaswerk, gereedschap of zin is.
# Let op de stammen: "reageerbuis" matcht "reageerbuizen" niet, dus knippen we bij "reageerbui".
GEEN_STOF = re.compile(
    r"reageerbui|bekerglaz|bekerglas|thermometer|pincet|roervlo|roerstaa|maatkolf|maatkolv|pipet|"
    r"sampler|spatel|parafilm|cuvet|erlenmeyer|statief|handschoen|bril|labjas|rek\b|trechter|"
    r"schaar|pen\b|eppendorf|epjes|tip\b|puntje|falconbui|well.?plaat|weegpapier|panty|"
    r"spijkerbroek|stopwatch|weegschaal|warmteplaat|waterkoker|spectrofotometer|centrifuge|"
    r"vortex|ph.?meter|brander|magneetroer|uv.?lamp|rondfilter|monster van|stukje stof|"
    r"papier met|disposables|afvalbak|microbalans|balans\b|buisje|oven\b|incubator|"
    # Microbiologisch gereedschap uit de practica van module 1.2.
    r"petrischa|maatcilinder|verwarmingsplaat|autoclaa|stoof|\böse\b|entoog|gaasje|watten|"
    r"aluminiumfolie|reageerbuisrek|materiaal voor|objectglaas|dekglaas|microscoop|"
    r"drigalski|branderrek|kweekbak|kweekfles", re.I)
GETAL_ALLEEN = re.compile(r"^[\d\s,.%µlmg/()]+$")
# Regels die een instructie of kopje zijn in plaats van een stof.
GEEN_STOF_ZIN = re.compile(
    r"^(als |blanco is|chemicali[eë]n voor|noteer |nooit |sequentie |zie )|wordt gebruikt", re.I)
# Een PCR-programma en de koppen van een mastermixtabel staan net als stofnamen één per regel,
# dus op opmaak zijn ze niet te scheiden. Op inhoud wel: een stap van het programma noemt een
# tijd en een temperatuur, en een tabelkop is een van deze vaste woorden.
PROGRAMMAREGEL = re.compile(r"\d+\s*(?:°|graden)?\s*C\b|\b\d+\s*(?:min|sec|seconden|minuten|uur)\b", re.I)
TABELKOP = re.compile(r"^(?:totaal|stock|nodig|hold\b|verwarming deksel|"
                      r"voor\s+\d+\s*reacties?|\d+\s*reacties?)", re.I)
# De concentratiekolom van zo'n tabel levert cellen als "0,3 µM", "10 mM", "1x" of "1 U/ml".
# Een getal met niets dan een eenheid erachter noemt geen stof. GETAL_ALLEEN dekt dit niet:
# dat laat alleen kleine letters en µ door, niet de M van molair of de x van een verdunning.
EENHEID_ALLEEN = re.compile(
    r"^[\d.,]*\s*(?:x|l|unit|u/ml|[nmµu]?[mgl]|[nmµu]?mol(?:/l)?|ng/l|%)$", re.I)


# De docx-lezer scheidt tabelcellen met een tab. Een regel mét tab komt dus uit een tabel
# (een pipetteerschema, een plaatindeling) en is geen stap of stof. Zonder deze regel telde
# het ELISA-protocol 302 "stappen", stuk voor stuk cellen als "8", "A" of "St 1".
def uit_tabel(regel):
    """Streng, voor stofnamen: elke tab wijst op een tabel.

    Een PCR-programma of een pipetteerschema zet één waarde per regel met een tab ervoor
    ("1 min 92C denaturatie DNA"), en die is van een echte stofnaam niet te onderscheiden.
    Zulke regels als stof opnemen vervuilt de lijst waar de labveiligheidspagina op leunt.
    """
    return "\t" in regel


def uit_tabelcel(regel):
    """Ruimer, voor stappen: alleen een tab BINNEN de regel scheidt cellen.

    Documenten die hun tekst met een tab laten inspringen (Diagnostiek, Microbiologie) zijn
    geen tabel. Een losse tabelcel valt alsnog af op de lengte-eis van is_stap.
    """
    return "\t" in regel.strip()


def is_stap(regel, los=False):
    # De drempel houdt losse woorden en lijstitems buiten de stappen. Een protocol dat enkel
    # uit korte bevelen bestaat ("Was 3x met PBS.") haalt die niet; los=True verlaagt hem, en
    # dat gebruiken we alleen als een document verder geen enkele stap opleverde.
    r = regel.strip()
    kort, woorden = (12, 3) if los else (25, 4)
    if r.endswith("?"):  # een observatievraag is geen handeling
        return False
    return bool(r) and not uit_tabelcel(regel) and len(r) >= kort and len(r.split()) >= woorden


def is_stof(regel):
    # Deze documenten staan vol harde spaties (\xa0). Die haalt strip() niet weg, waardoor een
    # cel als "ml\xa0" langs elke filter glipte en als stofnaam "ml" in de lijst belandde.
    r = regel.replace("\xa0", " ").strip(" \t-•*")
    if uit_tabelcel(regel) or PROGRAMMAREGEL.search(r) or TABELKOP.match(r):
        return False
    if EENHEID_ALLEEN.match(r):
        return False
    if not r or len(r) > 70 or len(r.split()) > 8:
        return False
    if r.endswith((".", "?", "!", ":")) or GETAL_ALLEEN.match(r):
        return False
    if GEEN_STOF_ZIN.search(r):
        return False
    return not GEEN_STOF.search(r)


def blokken(regels):
    """Splitst op Experiment-kopjes; alles ervoor is het inleidende blok."""
    uit, huidig = [], {"naam": None, "regels": []}
    for regel in regels:
        m = EXPERIMENT.match(regel)
        # Alleen een kopje als er weinig achter staat; anders is het een zin over een experiment.
        if m and len(regel) < 110:
            uit.append(huidig)
            huidig = {"naam": regel.strip().rstrip("."), "regels": []}
        else:
            huidig["regels"].append(regel)
    uit.append(huidig)
    return [b for b in uit if b["naam"] or b["regels"]]


def ontleed(blok, los=False):
    """Materialen, apparatuur en stappen binnen één experiment."""
    materialen, apparatuur, stappen = [], [], []
    waar = None
    for regel in blok["regels"]:
        if MATERIAAL_EN_METHODE.match(regel):
            waar = "beide"; continue
        if MATERIALEN.match(regel):
            waar = "materialen"; continue
        if APPARATUUR.match(regel):
            waar = "apparatuur"; continue
        if STAPPEN_KOP.match(regel) or STAPPEN_KOP_MET_ONDERWERP.match(regel):
            waar = "stappen"; continue
        if INLEIDING.match(regel) or TABEL.match(regel):
            waar = None; continue
        if not regel.strip():
            continue
        if waar == "beide":
            if is_stap(regel, los):
                stappen.append(regel)
            elif is_stof(regel):
                materialen.append(regel)
        elif waar == "materialen":
            materialen.append(regel)
        elif waar == "apparatuur":
            apparatuur.append(regel)
        elif waar == "stappen":
            if is_stap(regel, los):
                stappen.append(regel)
        elif waar is None and (los or blok["naam"] or materialen or apparatuur):
            # Sommige documenten zetten de stappen direct onder het Experiment-kopje, zonder
            # "Uitvoering" (Benedict, week 4). Staan de materialen in een eerder blok, dan is
            # er binnen dit blok niets gezien; het Experiment-kopje zelf is dan het signaal.
            # Bij los=True is er geen enkel kopje en is de hele tekst het protocol.
            if is_stap(regel, los):
                stappen.append(regel)
    return materialen, apparatuur, stappen


def sleutel(naam):
    kaal = unicodedata.normalize("NFKD", naam).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", kaal.lower()).strip("-")[:48] or "stof"


def main():
    toon = None
    if "--toon" in sys.argv:
        toon = sys.argv[sys.argv.index("--toon") + 1]
    # Twee mappen kunnen naar hetzelfde moduledossier schrijven (Module 1.2 levert zowel
    # "Veilig werken" als "Microbiologie" aan de-cel). Eerst verzamelen, dan één keer wegschrijven,
    # anders overschrijft de tweede map de sessies van de eerste.
    per_doel = {}
    for bron, doel, patroon in MAPPEN:
        sessies = verwerk(BRONNEN / bron, patroon, toon)
        if sessies:
            per_doel.setdefault(doel, []).extend(sessies)
    for doel, sessies in per_doel.items():
        schrijf(pathlib.Path(doel), sessies)


def schrijf(DOEL, sessies):
    doel = json.loads(DOEL.read_text(encoding="utf-8")) if DOEL.exists() else {}
    doel.update({
        "id": DOEL.name.replace(".lab.json", ""), "vleugel": "lab",
        "_bron": "Practicumhandleidingen van de opleiding (SharePoint). Alleen de structuur staat "
                 "hier, niet de protocoltekst; zie tools/protocollen.py.",
        "_betrouwbaarheid": "Automatisch ontleed uit Word-documenten zonder vaste opmaak. De "
                 "stappentellingen zijn een ondergrens. Herkend worden de kopjes Uitvoering, "
                 "Methoden, Materiaal & Methode, Werkwijze, Vaardigheid en Opdracht n; gebruikt een "
                 "document een ander kopje, dan worden stappen gemist. Heeft het helemaal geen "
                 "kopjes, dan geldt de hele tekst als protocol, maar alleen als dat minstens acht "
                 "stappen oplevert — een praktijktoets of observatieles komt dus terecht op nul. "
                 "Stoffen komen uit de materiaallijsten; cellen uit een PCR-programma of "
                 "pipetteerschema worden eruit gefilterd, maar een enkele maatregel kan blijven "
                 "staan. \"week\" is null waar het document geen weeknummer noemt; dat is niet "
                 "verzonnen. Loop dit na voordat je er in het lab op vaart.",
        "sessies": sessies,
    })
    DOEL.write_text(json.dumps(doel, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(sessies)} sessies -> {DOEL}")
    for s in sessies:
        stappen = sum(e["aantal_stappen"] for e in s["experimenten"])
        print(f"  week {str(s['week'] or '?'):>2}  {s['titel'][:46]:<46} "
              f"{len(s['experimenten']):>2} exp, {stappen:>3} stappen")


def verwerk(BRON, patroon, toon):
    if not BRON.exists():
        print(f"– {BRON} bestaat niet; overgeslagen.")
        return []

    sessies = []
    # Een patroon met ** zoekt ook in de weekmappen eronder.
    gevonden = BRON.rglob(patroon[3:]) if patroon.startswith("**/") else BRON.glob(patroon)
    for pad in sorted(gevonden):
        # chr(65279) is de BOM. Als los teken in een string haalt de formatter van dit project
        # hem uit de broncode weg (hij ruimt onzichtbare tekens op), zodat er .replace("","")
        # overbleef — een no-op. Daarom zo geschreven.
        tekst = pad.read_text(encoding="utf-8").replace(chr(65279), "")
        regels = tekst.splitlines()
        # De week staat soms in de bestandsnaam en soms alleen in de tekst; vindt hij hem
        # nergens, dan blijft week leeg in plaats van dat we er een verzinnen.
        week = re.search(r"week\s*(\d+)", pad.stem, re.I) or re.search(r"\bweek\s*(\d+)", tekst, re.I)
        les = re.search(r"(?:praktijkles|dagdeel)\s*(\d+)", pad.stem, re.I)
        # "Inleiding" is een kopje, geen titel; dan valt hij terug op de bestandsnaam.
        titel = next((r.strip().rstrip(".") for r in regels
                      if r.strip() and not INLEIDING.match(r)), pad.stem)
        experimenten = []
        # Een document zonder enig kopje (Protocol IHC: alleen korte bevelen onder "Dagdeel 1")
        # levert in de eerste ronde niets op. Dan is de hele tekst het protocol en lezen we het
        # opnieuw met een lagere drempel. Alleen bij nul, zodat gewone documenten niets merken.
        los = not any(ontleed(b)[2] for b in blokken(regels))
        # Een praktijktoets of een observatieles heeft geen protocol. Dat de lossere ronde dan
        # weinig oplevert is het enige signaal dat we hebben, dus houden we nul aan bij minder
        # dan acht stappen in plaats van losse regels als protocol te presenteren.
        if los and sum(len(ontleed(b, True)[2]) for b in blokken(regels)) < 8:
            los = None  # geen tweede ronde; dit document heeft geen uitvoering
        for blok in blokken(regels):
            mat, app, st = ontleed(blok, bool(los))
            stoffen = [m.strip(" \t-•*") for m in mat if is_stof(m)]
            if not (blok["naam"] or stoffen or st):
                continue
            experimenten.append({
                "naam": blok["naam"] or "Algemeen",
                "apparatuur": [a.strip(" \t-•*") for a in app if a.strip()],
                "aantal_stappen": len(st),
                "heeft_opruimen": any(OPRUIMEN.search(r) for r in st),
            })
        sessies.append({
            "nr": int(les.group(1)) if les else (int(week.group(1)) if week else None),
            "week": int(week.group(1)) if week else None,
            "titel": titel,
            "experimenten": experimenten,
            "bron": pad.with_suffix(".docx").name,
            "_bestand": pad.stem,
        })

    # Komt dezelfde titel bij meer dan één document voor, dan is het de kop van de module
    # ("LU2 Eiwitten in de Praktijk") en niet de titel van die sessie. Dan de bestandsnaam.
    vaak = collections.Counter(s["titel"] for s in sessies)
    for s in sessies:
        if vaak[s["titel"]] > 1:
            s["titel"] = s.pop("_bestand")
        else:
            s.pop("_bestand", None)

    if toon:
        for s in sessies:
            if str(s["week"]) == str(toon):
                print(json.dumps(s, ensure_ascii=False, indent=1))
        return []

    
    return sessies


if __name__ == "__main__":
    main()
