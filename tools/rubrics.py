"""Zet de beoordelingsformulieren van de opleiding om naar data/rubrics/.

De drie formulieren hebben elk een andere vorm, dus elk krijgt zijn eigen functie:

  rapportage        Excel: criteria in rijen, vier niveaus in kolommen, met volle
                    beschrijvingen per niveau. Dit is de enige echte rubric.
  presentatie       Word: een afvinkformulier. De niveaukolommen zijn leeg; de
                    assessor kruist aan. We bewaren dus de criteria en de niveaunamen,
                    niet verzonnen beschrijvingen.
  projectmatig      Excel: een monitoringsformulier plus een tweede blad met
                    definities van vaardigheden. We bewaren die definities.
  scoreformulier    Excel: het officiele toetsformulier van een module. Per
                    toetsonderdeel een minimum- en maximumscore en de zin die zegt
                    wanneer het voldoende is. Geen niveaubeschrijvingen, dus ook geen
                    zelfinschaling: dit is een puntenverdeling.
  checklist         Word: een VLD/NVD-lijst voor een praktijktoets. Alles moet voldaan
                    zijn, dus er valt niets te wegen; we bewaren de handelingen.

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
DNA = BRONNEN / "sharepoint/m13-dna-praktijk/Leeruitkomst 2 DNA in de praktijk"
# Wat met de browser uit SharePoint is gehaald: Excel-rubrics als csv, Word-formulieren als
# markdown (dat is wat Office online aanbiedt en het bewaart de tabellen netjes).
OPGEHAALD = BRONNEN / "rubrics"
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


# ---------- officiele toetsformulieren (xlsx met shared strings) ----------
import zipfile
import xml.etree.ElementTree as ET

XL = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def cellen_uit_xlsx(pad):
    """{rijnummer: {kolomletter: tekst}} — shared strings opgelost.

    tools/xlsx-tekst.py schreef deze formulieren weg als tsv, maar liet de shared strings
    als nummers staan; daarom leest dit de xlsx zelf.
    """
    z = zipfile.ZipFile(pad)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
            ss.append("".join(x.text or "" for x in si.iter(XL + "t")))
    uit = {}
    for naam in [n for n in z.namelist() if n.startswith("xl/worksheets/sheet")]:
        for rij in ET.fromstring(z.read(naam)).iter(XL + "row"):
            regel = {}
            for c in rij.iter(XL + "c"):
                v = c.find(XL + "v")
                if c.get("t") == "s" and v is not None:
                    tekst = ss[int(v.text)]
                elif c.get("t") == "inlineStr":
                    tekst = "".join(x.text or "" for x in c.iter(XL + "t"))
                else:
                    tekst = v.text if v is not None else ""
                if tekst and tekst.strip():
                    regel[re.sub(r"\d+", "", c.get("r") or "")] = tekst.strip()
            if regel:
                uit[int(rij.get("r"))] = regel
    return uit


def scoreformulier(pad, id, titel, module, bron):
    """Het toetsformulier van een module: onderdelen met een score en een criterium.

    De vorm is steeds dezelfde: bovenin de leeruitkomst en de vormen van bewijslast, dan een
    kop met "Score Min." en "Score Max.", en daaronder per regel een criterium. Een regel
    zonder titel hoort bij het onderdeel erboven, want het origineel voegt die cellen samen.
    """
    rijen = cellen_uit_xlsx(pad)
    leeruitkomst, bewijslast, criteria = "", [], []
    kop = None
    onderdeel = ""
    for nr in sorted(rijen):
        r = rijen[nr]
        waarden = " ".join(r.values())
        if "Wat moet je kunnen" in waarden:
            volgende = rijen.get(nr + 1) or {}
            leeruitkomst = " ".join(volgende.values())
        if "Wat lever je op" in waarden:
            volgende = rijen.get(nr + 1) or {}
            bewijslast = [b.strip() for b in " ".join(volgende.values()).splitlines() if b.strip()]
        if "Score Min." in waarden and "Titel:" in waarden:
            kop = {v: k for k, v in r.items()}
            continue
        if kop is None or "Totaalscore" in waarden or "Score Min." in waarden:
            continue
        criterium = r.get(kop.get("Wanneer is het voldoende? (Criteria)", "G"), "")
        if not criterium:
            continue
        onderdeel = r.get(kop.get("Titel:", "B"), "") or onderdeel
        criteria.append({
            "onderdeel": onderdeel,
            "vorm": r.get(kop.get("Vorm van Bewijslast:", "C"), ""),
            "score_min": r.get(kop.get("Score Min.:", "D"), ""),
            "score_max": r.get(kop.get("Score Max.:", "E"), ""),
            "criterium": criterium,
        })
    return {
        "id": id, "titel": titel, "module": module, "vleugel": "project",
        "soort": "scoreformulier",
        "_vorm": "Het officiele toetsformulier van de opleiding: per onderdeel een minimum- en "
                 "maximumscore en de zin die zegt wanneer het voldoende is. Er staan geen "
                 "beschrijvingen per niveau in, dus je kunt jezelf hier niet inschalen.",
        "leeruitkomst": leeruitkomst,
        "bewijslast": bewijslast,
        "criteria": criteria,
        "bron": bron,
    }


def praktijktoets_dna():
    """De VLD/NVD-lijst van de praktijktoets: groepen met handelingen."""
    pad = DNA / "Praktijktoets beoordelingsformulier DNA 1.3.txt"
    regels = [r.strip().lstrip("﻿") for r in pad.read_text(encoding="utf-8").splitlines()]
    groepen, huidig, inleiding = [], None, ""
    for r in regels:
        if not r or r in ("VLD", "NVD", "Evt. herkansing"):
            continue
        # Namen en groepsnummers horen niet in de site.
        if re.match(r"^(naam|groepsnummer|docent/toa)", r, re.I):
            continue
        if r.startswith("In deze toets"):
            inleiding = r
            continue
        if r.isdigit():
            continue
        if r in ("Uitvoeren experiment", "Verwerken gegevens", "Interpretatie", "Handeling"):
            if r != "Handeling":
                huidig = {"groep": r, "handelingen": []}
                groepen.append(huidig)
            continue
        if r.startswith("Afronding"):
            break
        if huidig and len(r) > 10:
            huidig["handelingen"].append(re.sub(r"\s+", " ", r))
    return {
        "id": "praktijktoets-dna", "titel": "Praktijktoets DNA (LU2)",
        "module": "dna-ontrafeld", "vleugel": "project", "soort": "checklist",
        "_vorm": "Een VLD/NVD-lijst: elk onderdeel moet voldaan zijn, er wordt niets gewogen. "
                 "De docent of TOA kruist tijdens de toets aan.",
        "inleiding": inleiding,
        "groepen": groepen,
        "afronding": "Voor een voldaan moeten alle onderdelen met een VLD zijn aangekruist.",
        "bron": "Praktijktoets beoordelingsformulier DNA 1.3.docx",
    }


def dna_lu2():
    return scoreformulier(
        DNA / "Beoordelingsformulier BML-module 1.4 LU2 DNA in de praktijk.xlsx",
        "dna-praktijk-lu2", "DNA in de praktijk (LU2)", "dna-ontrafeld",
        "Beoordelingsformulier BML-module 1.4 LU2 DNA in de praktijk.xlsx")


# ---------- opgehaald uit SharePoint ----------
import csv


def csv_rijen(pad):
    with open(pad, encoding="utf-8-sig", newline="") as f:
        return [[c.strip() for c in r] for r in csv.reader(f, delimiter=";")]


def rapportage_verslag():
    """De verslagrubric van jaar 1: criteria in rijen, vijf niveaus in kolommen.

    De kolomkoppen zijn plaatjes van sterren (vier tot nul), geen tekst. Ze krijgen hier dus de
    naam die je op het scherm ziet en geen verzonnen schoolcijfer: dat zou een vertaling zijn
    die de opleiding niet maakt.
    """
    niveaus = ["4 sterren", "3 sterren", "2 sterren", "1 ster", "0 sterren"]
    criteria, hoofdstuk = [], None
    for rij in csv_rijen(OPGEHAALD / "biomoleculen-rubric-rapportage.csv"):
        if len(rij) < 3 or not any(rij):
            continue
        if rij[0]:
            hoofdstuk = rij[0]
        teksten = [{"niveau": niveaus[i - 2], "tekst": c}
                   for i, c in enumerate(rij[2:7], 2) if c]
        if not teksten:
            continue
        criteria.append({"hoofdstuk": hoofdstuk, "criterium": rij[1], "gewicht": None,
                         "teksten": teksten})
    return {
        "id": "verslag-jaar1", "titel": "Verslag (praktijkverslag)",
        "module": "biomoleculen-labveiligheid",
        "modules": ["biomoleculen-labveiligheid", "de-cel"],
        "vleugel": "project", "soort": "rubric",
        "_vorm": "Dezelfde rubric geldt in Biomoleculen en in De cel. De niveaus staan in het "
                 "origineel als sterren boven de kolommen: vier sterren is het hoogste.",
        "niveaus": niveaus, "criteria": criteria,
        "bron": "Rubric Rapportage.xlsx (SharePoint, via Brightspace > Rubrics)",
    }


def presentatieformulier(bestand, id, titel, module, bron):
    """Het presentatieformulier: criteria met lege niveaukolommen, de docent kruist aan."""
    rijen = csv_rijen(bestand)
    kop = next((r for r in rijen if r and r[0] == "#"), [])
    # "Opmerkingen" is de feedbackkolom, geen niveau; de regeleinden komen uit de celopmaak.
    niveaus = [re.sub(r"\s+", " ", c) for c in kop[5:] if c and c.lower() != "opmerkingen"]
    criteria, onderdeel = [], None
    for rij in rijen:
        if len(rij) < 3 or not rij[0].isdigit():
            continue
        if rij[1]:
            onderdeel = rij[1]
        criteria.append({"hoofdstuk": onderdeel, "criterium": rij[2], "teksten": []})
    return {
        "id": id, "titel": titel, "module": module, "vleugel": "project",
        "soort": "afvinkformulier",
        "_vorm": "De niveaukolommen zijn in het origineel leeg; de beoordelaar kruist aan. Er staat "
                 "dus geen beschrijving per niveau in, en wij verzinnen die niet.",
        "niveaus": niveaus, "criteria": criteria, "bron": bron,
    }


def schaalformulier_md(bestand, id, titel, module, bron):
    """Een Word-formulier met schaaltabellen (1 t/m 5, of NEE/JA), opgehaald als markdown.

    Elke tabel is een blok criteria onder een vetgedrukt kopje in de eerste kolom. De cijfers
    zelf zijn de aankruisvakjes; die bewaren we als de schaal, niet als beoordeling.
    """
    hoofdstuk, criteria, schalen = None, [], set()
    for regel in pathlib.Path(bestand).read_text(encoding="utf-8").splitlines():
        regel = regel.strip()
        if not regel.startswith("|"):
            continue
        cellen = [c.strip() for c in regel.strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cellen):      # scheidingsregel van de tabel
            continue
        kop = re.sub(r"[*_]", "", cellen[0]).strip()
        if kop:
            hoofdstuk = kop
        criterium = cellen[1] if len(cellen) > 1 else ""
        schaal = [c for c in cellen[2:] if c]
        # Alleen regels met een echte schaal erachter zijn criteria; de kopregels van het
        # formulier (titel, groep, datum) hebben die niet.
        # Alleen een echte schaal telt: cijfers of NEE/JA. De kopregels van het formulier
        # (naam, datum, handtekening) hebben een lange of lege cel achter zich.
        if not schaal or not all(c.isdigit() or c.upper() in ("NEE", "JA", "VLD", "NVD") for c in schaal):
            continue
        if not criterium or len(criterium) < 8:
            continue
        criteria.append({"hoofdstuk": hoofdstuk, "criterium": re.sub(r"[*_]", "", criterium),
                         "schaal": schaal, "teksten": []})
        schalen.add(" / ".join(schaal))
    return {
        "id": id, "titel": titel, "module": module, "vleugel": "project",
        "soort": "schaalformulier",
        "_vorm": "Een formulier waarop de beoordelaar per criterium een cijfer op een schaal "
                 "aankruist. De schaal staat erbij; wat elk cijfer precies betekent staat niet in "
                 "het origineel.",
        "schalen": sorted(schalen), "criteria": criteria, "bron": bron,
    }


def verslag_jaar1():
    return rapportage_verslag()


def werkbespreking():
    return presentatieformulier(
        OPGEHAALD / "biomoleculen-rubric-werkbespreking.csv", "werkbespreking-biomoleculen",
        "Werkbespreking (presentatie)", "biomoleculen-labveiligheid",
        "Rubric werkbespreking.xlsx (SharePoint, via Brightspace > Rubrics)")


def presentatie_de_cel():
    return presentatieformulier(
        OPGEHAALD / "de-cel-rubric-presentatie.csv", "presentatie-de-cel",
        "Presentatie", "de-cel",
        "Rubric Presentatie.xlsx (SharePoint, via Brightspace > Rubric)")


def onderzoeksplan_dna_kraak():
    return schaalformulier_md(
        OPGEHAALD / "dna-kraak-onderzoeksplan.md", "onderzoeksplan-dna-kraak",
        "Onderzoeksplan (LU3)", "dna-kraak-de-code",
        "Beoordelingsformulieren jaar 2 onderzoeksplan DNA Kraak de code.docx")


def main():
    if not MAP.exists():
        print(f"{MAP} bestaat niet; eerst downloaden.")
        return
    DOEL.mkdir(parents=True, exist_ok=True)
    uit_sharepoint = (verslag_jaar1, werkbespreking, presentatie_de_cel, onderzoeksplan_dna_kraak)
    for maak in ((rapportage, presentatie, projectmatig, dna_lu2, praktijktoets_dna)
                 + (uit_sharepoint if OPGEHAALD.exists() else ())):
        doc = maak()
        pad = DOEL / f"{doc['id']}.json"
        pad.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        aantal = len(doc.get("criteria") or doc.get("vaardigheden") or doc.get("groepen") or [])
        print(f"{aantal:>3} regels -> {pad}")


if __name__ == "__main__":
    main()
