"""Zet de projectvleugel (LU3) van elke module om naar data/<module>.project.json.

Bron is de Brightspace-index (bronnen/brightspace-genormaliseerd.json, zie tools/brightspace.py).
Twee dingen daarin zijn betrouwbaar genoeg om de vleugel op te bouwen:

  de mapstructuur  Het veld "pad" is de mappenboom van de cursus. Een map "Project
                   Infectieziekten" zegt dat dit een projectkeuze is; dat is harder dan een
                   titel waarin ergens "oncologie" staat. Zo komen de drie projecten van
                   de Cel (Biotechnologie, Dreigbrief, One Health) en van Eiwitten in de
                   praktijk (Biotechnologie, Infectieziekten, Oncologie) eruit.
  de inleverlinks  Een map "Inleverlinks" of "LU3 Inleverlinks" bevat precies de dingen die
                   je moet inleveren. Herkansingen staan ernaast en worden als zodanig
                   gemarkeerd, zodat een scherm ze apart kan zetten.

Wat NIET uit de bron komt, en dus ook niet in de data staat:
  - inleverdata. Geen van de 582 items heeft een "due"; die datums staan in de
    opdrachteigenschappen van Brightspace en die zijn niet opgehaald. Het bestand zegt dat
    met _ontbreekt, zodat een scherm geen deadline kan verzinnen.
  - doel en hypothese per project. Die schrijf je zelf; de bron heeft ze niet.

De projecttekst gaat hier wél mee (anders dan de protocoltekst in tools/protocollen.py): het
is de projectomschrijving van de opleiding zelf en zonder die tekst heeft de pagina Verhaal
niets te laten zien. Namen, e-mailadressen en toegangscodes worden eruit gehaald.

Gebruik: python tools/project.py
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
from schoonmaak import schoon

BRON = BRONNEN / "brightspace-genormaliseerd.json"
RUBRICS = pathlib.Path("data/rubrics")

# "Project Biotechnologie" is een keuze; "Project => Onderzoek: Uitvoeren" is de projectmap zelf
# en "Project theorie" is een opdrachtsoort. Vandaar de uitsluitingen.
PROJECTMAP = re.compile(r"^(?:lu3\s+)?project\s+(?!=>|theorie\b)(.+?)\s*$", re.I)
INLEVERMAP = re.compile(r"^(?:lu3\s+)?inleverlinks$", re.I)
INLEVERTITEL = re.compile(r"^inleverlink\b|^tweede inleverlink\b", re.I)
HERKANSING = re.compile(r"herkansing", re.I)
# Eén map Inleverlinks bevat de inleveringen van alle leeruitkomsten. Zegt de titel zelf LU1 of
# LU2, dan hoort het daar en niet in de projectvleugel.
ANDERE_LU = re.compile(r"^lu\s*[12]\b", re.I)
# De vorm waarin je inlevert, voor zover de titel het zegt.
VORMEN = [("verslag", r"verslag|rapportage"), ("presentatie", r"presentatie"),
          ("labjournaal", r"labjournaal"), ("plan", r"plan\b|onderzoeksplan"),
          ("certificaat", r"certificaat|knowingo"), ("opdracht", r"opdracht|huiswerk|vragen")]


def sleutel(naam):
    return re.sub(r"[^a-z0-9]+", "-", naam.lower()).strip("-")[:48]


def vorm_van(titel):
    for naam, patroon in VORMEN:
        if re.search(patroon, titel, re.I):
            return naam
    return None


def uit_map(item):
    """De projectkeuze volgens de mappenboom, of None. Dit is de harde bron."""
    for segment in item.get("pad") or []:
        m = PROJECTMAP.match(segment.strip())
        if m:
            return re.sub(r"\s+", " ", m.group(1)).strip()
    return None


def projectnaam(item, bekend=()):
    """De projectkeuze van dit item: eerst de map, dan de titel.

    De mappenboom bepaalt wélke projecten er zijn. Maar de pagina met de inhoud hangt er niet
    altijd in: "Project Oncologie" bij Eiwitten in de praktijk staat in de map Opdrachten van de
    kick-offweek. Zo'n pagina noemt het project in zijn titel, en die titel mag meedoen zodra de
    naam al uit een map bekend is — dan verzint hij geen nieuw project maar hangt hij de tekst
    op de juiste plek.
    """
    via_map = uit_map(item)
    if via_map:
        return via_map
    m = PROJECTMAP.match((item.get("titel") or "").strip())
    if m:
        naam = re.sub(r"\s+", " ", m.group(1)).strip()
        # Alleen koppelen aan een project dat de mappen al noemen, en los van hoofdletters.
        for b in bekend:
            if b.lower() == naam.lower():
                return b
    return None


def is_inlever(item):
    if INLEVERTITEL.match((item.get("titel") or "").strip()):
        return True
    return any(INLEVERMAP.match(s.strip()) for s in item.get("pad") or [])


def paginas_van(items, weggehaald=None):
    """De tekstpagina's van een project: titel, map en de geschoonde tekst.

    Alles wat schoon() vervangt komt in `weggehaald` terecht, zodat het databestand kan zeggen
    hoeveel er is weggefilterd in plaats van dat stil te doen.
    """
    uit, gezien = [], set()
    for i in items:
        tekst = (i.get("tekst") or "").strip()
        titel = (i.get("titel") or "").strip()
        if not tekst or len(tekst) < 120:
            continue
        # Dezelfde pagina staat soms in twee jaargangen; de eerste wint.
        if titel in gezien:
            continue
        gezien.add(titel)
        alinea = []
        for p in re.split(r"\n{1,}", tekst):
            if len(p.strip()) <= 1:
                continue
            schoongemaakt, gevonden = schoon(p)
            if weggehaald is not None:
                weggehaald.extend(gevonden)
            alinea.append(schoongemaakt.strip())
        uit.append({"titel": titel, "map": (i.get("pad") or [""])[-1], "alineas": alinea})
    return uit


def rubrics_van(module):
    """De rubric-id's die bij deze module en de projectvleugel horen."""
    if not RUBRICS.exists():
        return []
    uit = []
    for pad in sorted(RUBRICS.glob("*.json")):
        d = json.loads(pad.read_text(encoding="utf-8"))
        hoort_bij = d.get("modules") or [d.get("module")]
        if module in hoort_bij and d.get("vleugel") == "project":
            uit.append(d["id"])
    return uit


def bouw(module, items):
    weggehaald = []
    # Twee rondes. Eerst bepalen de mappen wélke projecten er zijn; pas daarna mag een titel een
    # item bij zo'n project hangen. Omgekeerd zou een titel een project kunnen verzinnen dat in
    # de cursus niet als keuze bestaat.
    bekend = sorted({n for n in (uit_map(i) for i in items) if n})
    projecten = {n: [] for n in bekend}
    los = []
    for i in items:
        naam = projectnaam(i, bekend)
        (projecten[naam] if naam else los).append(i)

    opdrachten, gezien = [], set()
    for i in items:
        if not is_inlever(i):
            continue
        titel = re.sub(r"^(?:tweede )?inleverlink\s*", "", (i.get("titel") or "").strip(), flags=re.I)
        titel = titel.strip(" -–") or (i.get("titel") or "").strip()
        if ANDERE_LU.match(titel):
            continue
        k = (titel.lower(), bool(HERKANSING.search(i.get("titel") or "")))
        if k in gezien:
            continue
        gezien.add(k)
        opdrachten.append({
            "id": sleutel(titel) or "opdracht",
            "titel": titel,
            "vorm": vorm_van(titel),
            "project": sleutel(projectnaam(i, bekend)) if projectnaam(i, bekend) else None,
            "herkansing": bool(HERKANSING.search(i.get("titel") or "")),
        })

    # Eerst de pagina's, dan het bestand: _privacy telt wat schoon() heeft vervangen en die
    # telling is pas bekend als paginas_van is gelopen.
    uitgewerkt = [{
        "id": sleutel(naam),
        "naam": naam,
        "paginas": paginas_van(lijst, weggehaald),
        "aantal_bronnen": len(lijst),
    } for naam, lijst in sorted(projecten.items()) if naam]
    algemeen = paginas_van(los, weggehaald)

    return {
        "vleugel": "project",
        "_bron": "Brightspace-index (bronnen/brightspace-genormaliseerd.json). De projecten volgen "
                 "uit de mapstructuur van de cursus, niet uit een gok op de titel; zie tools/project.py.",
        "_betrouwbaarheid": "Automatisch afgeleid. Een map die \"Project <naam>\" heet geldt als "
                 "projectkeuze; heeft een module die mappen niet, dan blijft de lijst leeg en is dat "
                 "geen fout maar een leeg veld. Opdrachten komen uit de inleverlinks; staat iets "
                 "elders in de cursus, dan ontbreekt het hier.",
        "_ontbreekt": "Inleverdata. Geen enkel item in de bron heeft een datum: die staan in de "
                 "opdrachteigenschappen van Brightspace en zijn niet opgehaald. Doel en hypothese "
                 "staan er ook niet in; die schrijf je zelf per project.",
        "_privacy": f"{len(weggehaald)} keer is er iets vervangen door een plaatshouder "
                    f"(namen, e-mailadressen, telefoonnummers, toegangscodes); zie tools/schoonmaak.py."
                    if weggehaald else "Er is niets gevonden om te vervangen.",
        "projecten": uitgewerkt,
        "algemeen": algemeen,
        "opdrachten": opdrachten,
        "rubrics": rubrics_van(module),
    }


def main():
    if not BRON.exists():
        print(f"{BRON} bestaat niet; eerst scrapen.")
        return
    items = json.loads(BRON.read_text(encoding="utf-8"))["items"]
    modules = json.loads(pathlib.Path("data/modules.json").read_text(encoding="utf-8"))["modules"]

    for mod in modules:
        eigen = [i for i in items if i.get("module") == mod["id"] and i.get("vleugel") == "project"]
        doc = bouw(mod["id"], eigen)
        # Twee verschillende soorten leeg: deze module staat helemaal niet in de bron, of hij
        # staat er wel maar heeft geen mappen "Project <naam>". De schermen zeggen een ander
        # ding bij elk van de twee, dus dat verschil moet uit de data blijken.
        doc["_bron_leeg"] = not eigen
        if not eigen:
            # Een bestand dat zegt dat de bron niets heeft is bruikbaarder dan geen bestand: het
            # scherm kan dan het verschil tonen tussen "nog niet opgehaald" en "er is niets".
            doc["_ontbreekt"] = ("De Brightspace-index heeft voor deze module geen projectitems. "
                                 "Dat kan betekenen dat de projectmap leeg was of niet is opgehaald; "
                                 "dit bestand verzint er niets bij.")
        doc["id"] = mod["id"]
        pad = pathlib.Path(mod["bestand"].replace(".json", ".project.json"))
        bestaand = json.loads(pad.read_text(encoding="utf-8")) if pad.exists() else {}
        bestaand.update(doc)
        # Handmatige aanvullingen overleven een hergeneratie. Nodig omdat de scrape niet overal
        # bij kan: de projectmappen van DNA toolbox staan als pagina in Brightspace, en die
        # tekst zit in de inhoud-API. Wat daar met de hand uit is overgenomen staat in
        # <module>.project.overrides.json en wint van het afgeleide bestand.
        over = pathlib.Path(mod["bestand"].replace(".json", ".project.overrides.json"))
        if over.exists():
            aanvulling = json.loads(over.read_text(encoding="utf-8"))
            bestaand.update(aanvulling)
            bestaand["_handmatig"] = ("Delen van dit bestand zijn met de hand uit Brightspace "
                                      "overgenomen; zie " + over.name + ".")
        pad.write_text(json.dumps(bestaand, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        # Tellen op wat er écht in het bestand staat, dus ná de handmatige aanvulling.
        print(f"{len(bestaand['projecten'])} projecten, {len(bestaand['opdrachten']):>2} opdrachten, "
              f"{len(bestaand['rubrics'])} rubrics -> {pad}"
              f"{'  (met handmatige aanvulling)' if bestaand.get('_handmatig') else ''}")
        for p in bestaand["projecten"]:
            print(f"     {p['naam'][:40]:<40} {len(p['paginas'])} pagina's")


if __name__ == "__main__":
    main()
