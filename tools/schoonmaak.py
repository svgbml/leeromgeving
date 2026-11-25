"""Haalt persoonsgegevens uit de Brightspace-scrape en bouwt er een index van voor de site.

De ruwe scrape in bronnen/ bevat namen van docenten, e-mailadressen en zelfs een
Teams-toegangscode. Die hoort niet in een openbare repo. Dit script:

  1. spoort gevoelige patronen op (e-mail, telefoon, toegangscodes, namen);
  2. vervangt ze door een label;
  3. schrijft een index naar data/lesmateriaal.json met alleen organisatorische gegevens:
     titel, module, vleugel, week, soort en waar het materiaal staat.

Wat NIET naar data/ gaat: de letterlijke tekst van collegemateriaal. Dat is lesmateriaal van
de opleiding en de repo is openbaar; zie BIJDRAGEN.md over auteursrecht. De tekst blijft in
bronnen/ staan om er kaarten uit te maken, net als bij de slides.

Gebruik: python tools/schoonmaak.py [--rapport]
"""
import json
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
import re
import sys
import collections

BRON = BRONNEN
DOEL = pathlib.Path("data/lesmateriaal.json")

# Patronen die zeker weg moeten.
PATRONEN = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "[e-mail verwijderd]"),
    (re.compile(r"\b(?:\+31|0)\s?6[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}\b"), "[telefoon verwijderd]"),
    # "code f6ptjzn", "teamcode abc1234": een toegangscode bij een uitnodigend woord.
    (re.compile(r"\b(?:code|teamcode|toegangscode|wachtwoord|password)\b[\s:]*([a-z0-9]{5,12})\b", re.I), "[code verwijderd]"),
    (re.compile(r"https?://teams\.microsoft\.com/\S+"), "[Teams-link verwijderd]"),
]

# Docentinitialen zoals ze in bestandsnamen voorkomen (_WvG_, _MG_). Die zijn herleidbaar.
INITIALEN = re.compile(r"[_\- ]([A-Z]{2}[A-Za-z]?|[A-Z][a-z][A-Z])[_\- ](?=\d|NEW|new|\.)")

# Namen vangen we niet met een regex (te veel vals-positief op vaktermen). In plaats daarvan
# melden we regels die eruitzien als een aanhef of ondertekening, zodat een mens ze nakijkt.
VERDACHT = re.compile(r"\b(?:beste|groet(?:en)?|mvg|met vriendelijke groet|docent|contactpersoon)\b", re.I)


def schoon(tekst):
    """Vervangt gevoelige patronen; geeft de schone tekst en wat er is vervangen terug."""
    if not tekst:
        return tekst, []
    gevonden = []
    for patroon, vervanger in PATRONEN:
        def _vervang(m):
            gevonden.append(m.group(0)[:40])
            return vervanger
        tekst = patroon.sub(_vervang, tekst)
    return tekst, gevonden


def verdachte_regels(tekst):
    return [r.strip()[:90] for r in (tekst or "").splitlines() if VERDACHT.search(r)]


def main():
    rapport = "--rapport" in sys.argv
    genorm = json.loads((BRON / "brightspace-genormaliseerd.json").read_text(encoding="utf-8"))["items"]

    vervangen = collections.Counter()
    tevoorschijn = []
    items = []
    for i in genorm:
        tekst, gev = schoon(i.get("tekst"))
        for g in gev:
            vervangen[g] += 1
        if tekst:
            tevoorschijn.extend(verdachte_regels(tekst))
        titel, _ = schoon(i["titel"])
        titel = INITIALEN.sub(" ", titel)
        items.append({
            "titel": titel.strip(),
            "module": i["module"],
            "vleugel": i["vleugel"],
            "jaar": i["jaar"],
            "week": i["week"],
            "les": i["les"],
            "soort": i["soort"],
            # Waar het staat, niet de inhoud: brightspace, sharepoint, extern of lokaal bestand.
            "waar": ("brightspace" if (i.get("url") or "").startswith("/")
                     else "sharepoint" if "sharepoint" in (i.get("url") or "")
                     else "extern" if (i.get("url") or "").startswith("http") else "onbekend"),
            "heeft_tekst": bool(tekst),
            "due": i.get("due"),
        })

    DOEL.parent.mkdir(parents=True, exist_ok=True)
    DOEL.write_text(json.dumps({
        "_uitleg": "Index van het lesmateriaal per module en vleugel, uit Brightspace. Bevat geen "
                   "lesmateriaal zelf en geen persoonsgegevens: alleen titel, indeling en vindplaats.",
        "items": items,
    }, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{len(items)} items -> {DOEL}")
    print(f"\nvervangen persoonsgegevens: {sum(vervangen.values())}")
    for k, n in vervangen.most_common(10):
        print(f"  {n:>3}x  {k}")
    if rapport and tevoorschijn:
        print(f"\nregels die een mens moet nakijken ({len(tevoorschijn)}):")
        for r in tevoorschijn[:25]:
            print("   ", r)


if __name__ == "__main__":
    main()
