"""Haalt de tekst uit de .docx-bestanden in bronnen/sharepoint/ en zet die als .txt ernaast.

Geen afhankelijkheden: een .docx is een zip met word/document.xml erin. Tabellen worden
regel voor regel uitgeschreven met tabs ertussen, want in deze protocollen staan de
pipetteerschema's en stoffenlijsten in tabellen.

De uitvoer blijft in bronnen/ (buiten git): het is lesmateriaal van de opleiding.
Wat er uiteindelijk in data/ komt is een eigen samenvatting met bronvermelding, zoals
de kaarten dat ook doen met de collegeslides.

Gebruik: python tools/docx-tekst.py
"""
import html
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
import re
import zipfile

# Twee bronnen: de SharePoint-mappen en de losse bestanden die uit Brightspace zijn
# gehaald (bronnen/bestanden). Beide bevatten practicumhandleidingen.
BRONNEN_MAPPEN = [BRONNEN / "sharepoint", BRONNEN / "bestanden"]


def tekst_uit_docx(pad):
    with zipfile.ZipFile(pad) as z:
        namen = [n for n in z.namelist() if n == "word/document.xml"]
        if not namen:
            return ""
        xml = z.read(namen[0]).decode("utf-8", "replace")
    # Celscheiding en alineascheiding vóór het strippen van tags, anders plakt alles aan elkaar.
    xml = re.sub(r"</w:tc>", "\t", xml)
    xml = re.sub(r"</w:tr>", "\n", xml)
    xml = re.sub(r"</w:p>", "\n", xml)
    xml = re.sub(r"<w:tab[^>]*/>", "\t", xml)
    xml = re.sub(r"<w:br[^>]*/>", "\n", xml)
    xml = re.sub(r"<[^>]+>", "", xml)
    #  (BOM) komt uit de XML-decodering en zou anders vooraan de titel blijven staan.
    tekst = html.unescape(xml).replace("", "")
    tekst = re.sub(r"[ \t]+\t", "\t", tekst)
    tekst = re.sub(r"\n{3,}", "\n\n", tekst)
    return tekst.strip()


def main():
    if not any(b.exists() for b in BRONNEN_MAPPEN):
        print("Geen bronmappen gevonden; eerst downloaden.")
        return
    n = 0
    for pad in sorted(p for b in BRONNEN_MAPPEN if b.exists() for p in b.rglob("*.docx")):
        if pad.name.startswith("~$"):
            continue
        uit = pad.with_suffix(".txt")
        tekst = tekst_uit_docx(pad)
        uit.write_text(tekst, encoding="utf-8")
        n += 1
        print(f"{len(tekst):>7} tekens  {pad.name}")
    print(f"\n{n} bestanden omgezet.")


if __name__ == "__main__":
    main()
