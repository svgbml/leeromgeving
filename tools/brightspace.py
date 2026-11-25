"""Normaliseert de Brightspace-export tot een bruikbare index per module en vleugel.

Invoer (niet in git, staat in bronnen/):
  bronnen/brightspace-index.json    de inhoudsopgave van elke cursus
  bronnen/brightspace-paginas.json  de tekst van elke Brightspace-pagina
  bronnen/bestanden/                de gedownloade docx/pdf/xlsx/gb-bestanden

Uitvoer:
  bronnen/brightspace-genormaliseerd.json   alles samen, met vleugel en week per item

Brightspace deelt zijn mappen al in zoals de overhaul dat wil: "LU1 ... (Theorie)",
"LU2 ... (Praktijk)", "LU3 ... (Project)", "Veilig werken - Praktijk", "PPO", "Inleverlinks".
Die labels zijn betrouwbaarder dan raden op het toets-veld, dus die nemen we over.

Gebruik: python tools/brightspace.py
"""
import json
import re
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
import collections

BRON = BRONNEN

# Welke Brightspace-cursus hoort bij welke module van de site. Twee studiejaren kunnen
# op dezelfde module uitkomen; het jaar staat in het item zelf.
CURSUS_NAAR_MODULE = {
    "biomoleculen-2526": "biomoleculen-labveiligheid",
    "biomoleculen-2627": "biomoleculen-labveiligheid",
    "de-cel-2526": "de-cel",
    "de-cel-2627": "de-cel",
    "eiwitten-onmisbaar-2526": "eiwitten-in-de-praktijk",
    "dna-ontrafeld-2526": "dna-ontrafeld",
    "eiwitten-in-interactie-2627": "eiwitten-in-interactie",
    "dna-toolbox-2627": "dna-kraak-de-code",
    # Modulevrij: de labreferentie van de opleiding (protocollen, apparatuur, veiligheid).
    "laboratoria": None,
    "veiligheidsplatform": None,
    "sv-omica": None,
}

# Volgorde telt: de eerste die past wint. "Inleverlinks" vóór "praktijk", want een
# inleverlink voor een practicumverslag hoort bij wat je inlevert, niet bij de sessie.
VLEUGEL_REGELS = [
    (re.compile(r"\bppo\b", re.I), "ppo"),
    (re.compile(r"inleverlink", re.I), "project"),
    (re.compile(r"lu\s*3|project|onderzoek", re.I), "project"),
    (re.compile(r"lu\s*2|praktijk|practicum|veilig werken|labdocument|laboratoria", re.I), "lab"),
    (re.compile(r"lu\s*1|theorie|ppt|powerpoint|quiz", re.I), "theorie"),
    (re.compile(r"module.?informatie|software|app", re.I), "info"),
]

WEEK = re.compile(r"\b(?:week|wk)\s*\.?\s*(\d+)(?:[.\-](\d+))?", re.I)
LES = re.compile(r"\b(?:les|theorieles|college)\s*\.?\s*(\d+)", re.I)


# Let op: geen \b gebruiken. In "Introductie werkveld_PPO bijeenkomst" staat een underscore
# vóór PPO, en dat is een woordteken, dus \bppo\b matcht daar niet.
PPO = re.compile(r"(?<![a-z0-9])ppo(?![a-z0-9])", re.I)


def vleugel_van(pad, titel="", url=""):
    """De vleugel volgens het Brightspace-pad; de bovenste map weegt het zwaarst.

    Titel en bestandsnaam tellen alleen mee voor PPO: die slides staan vaak in een map
    "PPT/Quiz/...", en de regel voor "ppt" zou ze anders als theorie bestempelen.
    """
    if PPO.search(titel) or PPO.search(url or ""):
        return "ppo"
    for stuk in pad:
        for patroon, naam in VLEUGEL_REGELS:
            if patroon.search(stuk):
                return naam
    return "info"


def week_van(pad, titel):
    for tekst in [*pad, titel]:
        m = WEEK.search(tekst)
        if m:
            return f"{m.group(1)}.{m.group(2)}" if m.group(2) else m.group(1)
    return None


def les_van(pad, titel):
    for tekst in [*pad, titel]:
        m = LES.search(tekst)
        if m:
            return int(m.group(1))
    return None


def soort_van(url, type_id):
    if not url:
        return "d2l"
    kaal = url.split("?")[0]
    m = re.search(r"\.([a-z0-9]{2,5})$", kaal, re.I)
    ext = m.group(1).lower() if m else None
    if type_id == "Link" or kaal.startswith("http"):
        return "externe-link"
    return ext or "d2l"


def main():
    index = json.loads((BRON / "brightspace-index.json").read_text(encoding="utf-8"))
    paginas = json.loads((BRON / "brightspace-paginas.json").read_text(encoding="utf-8"))["paginas"]
    tekst_van = {(p["cursus"], p["id"]): p["tekst"] for p in paginas}

    bestanden = {p.name for p in (BRON / "bestanden").glob("*")} if (BRON / "bestanden").exists() else set()

    uit = {"bron": "brightspace.avans.nl", "items": []}
    for cursus in index["cursussen"]:
        sleutel = cursus["sleutel"]
        if sleutel not in CURSUS_NAAR_MODULE:
            continue
        module = CURSUS_NAAR_MODULE[sleutel]
        jaar = "2026-27" if sleutel.endswith("2627") else ("2025-26" if sleutel.endswith("2526") else None)
        for it in cursus.get("items", []):
            pad = it.get("pad") or []
            url = it.get("url")
            soort = soort_van(url, it.get("type"))
            naam = url.split("?")[0].split("/")[-1] if url and not url.startswith("http") else None
            uit["items"].append({
                "cursus": sleutel,
                "module": module,
                "jaar": jaar,
                "vleugel": vleugel_van(pad, it["titel"], url or ""),
                "week": week_van(pad, it["titel"]),
                "les": les_van(pad, it["titel"]),
                "titel": it["titel"],
                "pad": pad,
                "soort": soort,
                "url": url,
                "bestandsnaam": naam,
                "lokaal": next((b for b in bestanden if naam and b.endswith(naam.replace("/", "_"))), None),
                "tekst": tekst_van.get((sleutel, it["id"])),
                "due": it.get("due"),
            })

    pad_uit = BRON / "brightspace-genormaliseerd.json"
    pad_uit.write_text(json.dumps(uit, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{len(uit['items'])} items -> {pad_uit}")
    per = collections.Counter((i["module"] or "(modulevrij)", i["vleugel"]) for i in uit["items"])
    modules = sorted({m for m, _ in per})
    vleugels = ["theorie", "lab", "project", "ppo", "info"]
    print(f"\n{'module':<28}" + "".join(f"{v:>10}" for v in vleugels))
    for m in modules:
        print(f"{m:<28}" + "".join(f"{per.get((m, v), 0):>10}" for v in vleugels))
    print("\nmet tekst:", sum(1 for i in uit["items"] if i["tekst"]))
    print("met lokaal bestand:", sum(1 for i in uit["items"] if i["lokaal"]))
    print("externe links:", sum(1 for i in uit["items"] if i["soort"] == "externe-link"))
    print("nog te downloaden (pptx):", sum(1 for i in uit["items"] if i["soort"] == "pptx"))


if __name__ == "__main__":
    main()
