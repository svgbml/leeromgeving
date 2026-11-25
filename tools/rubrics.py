"""Zet de beoordelingsformulieren van de opleiding om naar data/rubrics/.

De drie formulieren hebben elk een andere vorm, dus elk krijgt zijn eigen functie:

  rapportage        Excel: criteria in rijen, vier niveaus in kolommen, met volle
                    beschrijvingen per niveau. Dit is de enige echte rubric.
  presentatie       Word: een afvinkformulier. De niveaukolommen zijn leeg; de
                    assessor kruist aan. We bewaren dus de criteria en de niveaunamen,
                    niet verzonnen beschrijvingen.
  projectmatig      Excel: een monitoringsformulier plus een tweede blad met
                    definities van vaardigheden. We bewaren die definities.

Persoonsgegevens (namen van assessoren, groepsnummers) worden niet overgenomen.

Gebruik: python tools/rubrics.py
"""
import json
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
import re

MAP = BRONNEN / ("sharepoint/lu3-eiwitten-interactie/Leeruitkomst 3 Onderzoek Troubleshooting")
DOEL = pathlib.Path("data/rubrics")
NIVEAUS_4 = ["goed", "voldoende", "matig", "onvoldoende"]


def rijen_uit_tsv(pad, blad=None):
    """Rijen uit de tsv; ¶ is een regeleinde binnen een cel (zie tools/xlsx-tekst.py)."""
    uit, huidig = [], None
    for regel in pad.read_text(encoding="utf-8").splitlines():
        if regel.startswith("# "):
            huidig = regel[2:].strip()
            continue
        if blad and huidig != blad:
            continue
        uit.append([c.replace("¶", "\n").strip() for c in regel.split("\t")])
    return uit


def rapportage():
    """De rapportage-rubric, zonder de niveautoewijzing te gokken.

    Het origineel gebruikt samengevoegde cellen, die deze lezer niet uitvouwt. Daardoor
    verschuiven de kolommen per rij: de kopregel zet "Goed" in kolom 3, maar sommige
    criteria hebben hun teksten in kolom 2 t/m 5 en andere in 4 t/m 6, met gewichten
    ertussen. Een beoordelingsniveau verkeerd toewijzen is erger dan het openlaten, dus
    bewaren we de teksten mét hun kolomnummer en markeren we de rubric als te controleren.
    """
    pad = MAP / "Beoordelings Rubric Rapportage LU3 Aangepast.tsv"
    kopkolom = {}
    criteria, hoofdstuk = [], None
    for cellen in rijen_uit_tsv(pad):
        if not any(cellen):
            continue
        laag = [c.lower() for c in cellen]
        if "goed" in laag and "onvoldoende" in laag:
            kopkolom = {i: c.lower() for i, c in enumerate(cellen) if c}
            continue
        teksten = [{"kolom": i, "tekst": c} for i, c in enumerate(cellen)
                   if i >= 2 and len(c) > 25]
        if not teksten:
            continue
        if cellen[0] and not cellen[0].isdigit():
            hoofdstuk = cellen[0]
        criteria.append({
            "hoofdstuk": hoofdstuk,
            "criterium": cellen[1] if len(cellen) > 1 and not cellen[1].isdigit() else "",
            "gewicht": next((int(c) for c in cellen[:3] if c.isdigit()), None),
            "teksten": teksten,
        })
    return {
        "id": "rapportage-lu3",
        "titel": "Rapportage (LU3)",
        "module": "eiwitten-in-interactie",
        "vleugel": "project",
        "soort": "rubric",
        "_onzeker": "De koppeling tekst -> niveau is NIET betrouwbaar: het origineel gebruikt "
                    "samengevoegde cellen, waardoor de kolommen per rij verschuiven. De teksten "
                    "staan hier met hun kolomnummer; de kop stond op " +
                    ", ".join(f"kolom {i} = {n}" for i, n in sorted(kopkolom.items())) +
                    ". Controleer dit tegen het origineel voordat de app er cijfers aan hangt.",
        "niveaus": NIVEAUS_4,
        "criteria": criteria,
        "bron": "Beoordelings Rubric Rapportage LU3 Aangepast.xlsx",
    }


def presentatie():
    pad = MAP / "Beoordelingsformulier Presentatie LU3.txt"
    regels = [r.strip() for r in pad.read_text(encoding="utf-8").splitlines()]
    niveaus, criteria, na_kop = [], [], False
    for r in regels:
        if r.lower() == "criteria":
            na_kop = True
            continue
        if not na_kop or not r:
            continue
        if r.lower() in ("onvoldoende", "matig", "voldoende", "goed", "zeer goed"):
            niveaus.append(r.lower())
            continue
        if r.lower().startswith("feedback"):
            break
        # Namen, data en parafen horen niet in de site.
        if re.match(r"^(studenten|datum|naam assessoren|cijfer|paraaf)", r, re.I):
            continue
        criteria.append({"criterium": r, "niveaus": {}})
    return {
        "id": "presentatie-lu3",
        "titel": "Presentatie (LU3)",
        "module": "eiwitten-in-interactie",
        "vleugel": "project",
        "soort": "afvinkformulier",
        "_vorm": "De niveaukolommen zijn in het origineel leeg; de assessor kruist aan. "
                 "Er staan dus geen beschrijvingen per niveau in, en wij verzinnen ze niet.",
        "niveaus": niveaus,
        "criteria": criteria,
        "bron": "Beoordelingsformulier Presentatie LU3.docx",
    }


def projectmatig():
    pad = MAP / "Beoordelingsformulier projectmatig werken Jaar 2 Module Eiwitten in interactie.tsv"
    vaardigheden = []
    for cellen in rijen_uit_tsv(pad, blad="xl/worksheets/sheet2.xml"):
        cellen = [c.strip() for c in cellen]
        if len(cellen) < 2 or not cellen[0] or not cellen[1]:
            continue
        if cellen[0].lower().startswith("type vaardigheid"):
            continue
        vaardigheden.append({"vaardigheid": cellen[0], "uitleg": cellen[1]})
    return {
        "id": "projectmatig-werken",
        "titel": "Projectmatig werken (jaar 2)",
        "module": "eiwitten-in-interactie",
        "vleugel": "project",
        "soort": "vaardigheden",
        "_vorm": "Het origineel is een monitoringsformulier dat je in week 6 en week 10 invult. "
                 "Hier staan de vaardigheden met hun omschrijving; de ingevulde scores niet.",
        "vaardigheden": vaardigheden,
        "bron": "Beoordelingsformulier projectmatig werken Jaar 2 Module Eiwitten in interactie.xlsx",
    }


def main():
    if not MAP.exists():
        print(f"{MAP} bestaat niet; eerst downloaden.")
        return
    DOEL.mkdir(parents=True, exist_ok=True)
    for maak in (rapportage, presentatie, projectmatig):
        doc = maak()
        pad = DOEL / f"{doc['id']}.json"
        pad.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        aantal = len(doc.get("criteria") or doc.get("vaardigheden") or [])
        print(f"{aantal:>3} regels -> {pad}")


if __name__ == "__main__":
    main()
