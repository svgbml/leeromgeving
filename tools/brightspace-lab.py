"""Bouwt labsessies uit practicumhandleidingen die in Brightspace staan (niet op SharePoint).

tools/protocollen.py leest de practicummappen van SharePoint. Module 1.3/2.2 (DNA toolbox) zet
zijn handleidingen ergens anders neer: als losse bestanden in Brightspace, geordend in mappen
"Week 3 - Lab 5 Plasmide isolatie/Miniprep". Die mapnaam is hier de sessie, en de bestanden
erin zijn de experimenten.

De ontleding zelf is niet overgedaan: blokken(), ontleed() en is_stof() komen uit
protocollen.py, zodat een verbetering daar ook hier geldt en de tellingen op dezelfde manier
tot stand komen.

Wat deze tool niet kan: twee labs van deze module (Lab 7 en Lab 8) staan niet als bestand maar
als pagina in Brightspace. Die tekst zit in de inhoud-API, die in deze omgeving niet te lezen
is. Ze komen hieronder als sessie zonder experimenten terug, met _ontbreekt erbij, zodat de
site ze noemt in plaats van ze weg te laten.

Gebruik: python tools/brightspace-lab.py
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN

import importlib.util
_spec = importlib.util.spec_from_file_location("prot", pathlib.Path(__file__).parent / "protocollen.py")
prot = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(prot)

INDEX = BRONNEN / "brightspace-genormaliseerd.json"
BESTANDEN = BRONNEN / "bestanden"

# Welke modules hun practicum in Brightspace hebben staan, en waar de sessies heen gaan.
MODULES = {"dna-kraak-de-code": "data/jaar-2/periode-2/dna-kraak-de-code.lab.json"}

# Een mapnaam als "Week 3 - Lab 5 Plasmide isolatie/Miniprep": week, labnummer en de naam.
LABMAP = re.compile(r"^\s*week\s*(\d+)\s*[-–]?\s*lab\s*(\d+)\s*[-–:]?\s*(.*)$", re.I)

# Labs die als pagina in Brightspace staan en dus geen bestand hebben. Zonder deze regels zou de
# sessielijst stilzwijgend twee labs overslaan; nu staan ze er, leeg en met uitleg.
ZONDER_BESTAND = [
    (4, 7, "Gel electroforese + sequence reactie"),
    (4, 8, "Sequencing clean up + run"),
]


def tekstbestand(item):
    """Het omgezette .txt naast het gedownloade bestand, of None.

    Het veld "lokaal" is bij een deel van de items leeg terwijl het bestand er wél staat: de
    downloader schoonde de bestandsnaam op (de ë van "Oriëntatie", de α van "DH5α", de komma in
    "W1.2,") maar schreef die naam niet terug in de index. Daarom ook zoeken op de opgeschoonde
    naam uit de URL; anders missen twee labs hun handleiding.
    """
    lokaal = item.get("lokaal")
    if lokaal:
        pad = (BESTANDEN / lokaal).with_suffix(".txt")
        if pad.exists():
            return pad
    naam = (item.get("url") or "").rsplit("/", 1)[-1]
    if not naam:
        return None
    schoon = re.sub(r"[^A-Za-z0-9 ._-]", "_", naam)
    pad = (BESTANDEN / f"{item.get('cursus', '')}__{schoon}").with_suffix(".txt")
    return pad if pad.exists() else None


def ontleed_bestand(pad):
    """Materialen, apparatuur en stappen uit één handleiding, met protocollen.py."""
    tekst = pad.read_text(encoding="utf-8").replace(chr(65279), "")
    regels = tekst.splitlines()
    los = not any(prot.ontleed(b)[2] for b in prot.blokken(regels))
    if los and sum(len(prot.ontleed(b, True)[2]) for b in prot.blokken(regels)) < 8:
        los = False
    mat, app, st = [], [], []
    for blok in prot.blokken(regels):
        m, a, s = prot.ontleed(blok, los)
        mat += m
        app += a
        st += s
    return mat, app, st


def main():
    if not INDEX.exists():
        print(f"{INDEX} bestaat niet; eerst scrapen.")
        return
    items = json.loads(INDEX.read_text(encoding="utf-8"))["items"]

    for modId, doel in MODULES.items():
        eigen = [i for i in items if i.get("module") == modId and i.get("vleugel") == "lab"]
        # Per labmap verzamelen; de mapnaam bepaalt week, nummer en titel.
        per_lab = {}
        for i in eigen:
            for segment in i.get("pad") or []:
                m = LABMAP.match(segment.strip())
                if m:
                    nr = int(m.group(2))
                    per_lab.setdefault(nr, {"week": int(m.group(1)),
                                            "titel": re.sub(r"\s+", " ", m.group(3)).strip(),
                                            "items": []})["items"].append(i)
                    break

        for week, nr, titel in ZONDER_BESTAND:
            per_lab.setdefault(nr, {"week": week, "titel": titel, "items": [],
                                    "_ontbreekt": "Dit lab staat als pagina in Brightspace, niet als "
                                    "bestand. De tekst is niet opgehaald, dus hier staan geen stappen; "
                                    "de pagina in Brightspace is de handleiding."})

        alle_stoffen = {}
        sessies = []
        for nr in sorted(per_lab):
            lab = per_lab[nr]
            experimenten, stoffen_sessie = [], []
            for i in lab["items"]:
                pad = tekstbestand(i)
                if not pad:
                    continue
                mat, app, st = ontleed_bestand(pad)
                stoffen = [s.strip(" \t-•*") for s in mat if prot.is_stof(s)]
                for s in stoffen:
                    alle_stoffen.setdefault(prot.sleutel(s), s)
                stoffen_sessie += [prot.sleutel(s) for s in stoffen]
                if not (stoffen or st):
                    continue
                experimenten.append({
                    "naam": i.get("titel") or pad.stem,
                    "stoffen": [prot.sleutel(s) for s in stoffen],
                    "apparatuur": [a.strip(" \t-•*") for a in app if a.strip()],
                    "aantal_stappen": len(st),
                    "heeft_opruimen": any(prot.OPRUIMEN.search(r) for r in st),
                })
            sessie = {
                "nr": nr,
                "week": lab["week"],
                "titel": f"Lab {nr}: {lab['titel']}" if lab["titel"] else f"Lab {nr}",
                "experimenten": experimenten,
                "stoffen": sorted(set(stoffen_sessie)),
                "bron": "Brightspace, " + (lab["items"][0].get("pad") or [""])[-1] if lab["items"] else "Brightspace",
            }
            if lab.get("_ontbreekt"):
                sessie["_ontbreekt"] = lab["_ontbreekt"]
            sessies.append(sessie)

        pad = pathlib.Path(doel)
        doc = json.loads(pad.read_text(encoding="utf-8")) if pad.exists() else {}
        doc.update({
            "id": modId, "vleugel": "lab",
            "_bron": "Practicumhandleidingen uit Brightspace (cursus DNA toolbox), via "
                     "tools/brightspace-lab.py. Alleen de structuur staat hier, niet de tekst.",
            "_betrouwbaarheid": "Automatisch ontleed met dezelfde parser als de SharePoint-"
                     "handleidingen (tools/protocollen.py); stappentellingen zijn een ondergrens. "
                     "De sessie-indeling komt uit de mapnamen in Brightspace en is dus wel exact.",
            "sessies": sessies,
        })
        pad.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"{len(sessies)} sessies -> {pad}")
        for s in sessies:
            st = sum(e["aantal_stappen"] for e in s["experimenten"])
            merk = "  (pagina, niet opgehaald)" if s.get("_ontbreekt") else ""
            print(f"  week {s['week']}  {s['titel'][:48]:<48} {len(s['experimenten'])} exp, "
                  f"{len(s['stoffen']):>2} stoffen, {st:>3} stappen{merk}")
        print(f"  {len(alle_stoffen)} unieke stofnamen")


if __name__ == "__main__":
    main()
