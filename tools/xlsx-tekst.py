"""Haalt de cellen uit .xlsx-bestanden in bronnen/sharepoint en zet die als .tsv ernaast.

Een .xlsx is een zip: xl/sharedStrings.xml bevat de tekst, xl/worksheets/sheetN.xml de cellen
met een verwijzing naar die lijst. Geen afhankelijkheden nodig.

De rubrics van de opleiding staan deels in Excel, met de criteria in rijen en de niveaus in
kolommen. Als tsv is dat leesbaar en verder te verwerken.

Gebruik: python tools/xlsx-tekst.py
"""
import html
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
import re
import zipfile

BRON = BRONNEN / "sharepoint"
CEL = re.compile(r"<c r=\"([A-Z]+)(\d+)\"([^>]*)>(.*?)</c>|<c r=\"([A-Z]+)(\d+)\"([^>]*)/>", re.S)
WAARDE = re.compile(r"<v>(.*?)</v>", re.S)
INLINE = re.compile(r"<is>(.*?)</is>", re.S)
TAGS = re.compile(r"<[^>]+>")


def kolomnummer(letters):
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n


def gedeelde_teksten(z):
    if "xl/sharedStrings.xml" not in z.namelist():
        return []
    xml = z.read("xl/sharedStrings.xml").decode("utf-8", "replace")
    # Elke <si> is één tekst; losse <t>-stukken binnen een <si> horen aaneen.
    return [html.unescape(TAGS.sub("", si)) for si in re.findall(r"<si>(.*?)</si>", xml, re.S)]


def blad_naar_rijen(xml, gedeeld):
    rijen = {}
    for m in CEL.finditer(xml):
        kol, rij, attr, inhoud = (m.group(1), m.group(2), m.group(3), m.group(4)) if m.group(1) \
            else (m.group(5), m.group(6), m.group(7), "")
        tekst = ""
        if inhoud:
            v = WAARDE.search(inhoud)
            if 't="s"' in attr and v:
                idx = int(v.group(1))
                tekst = gedeeld[idx] if idx < len(gedeeld) else ""
            elif 't="inlineStr"' in attr:
                i = INLINE.search(inhoud)
                tekst = html.unescape(TAGS.sub("", i.group(1))) if i else ""
            elif v:
                tekst = html.unescape(v.group(1))
        # Regeleinden binnen een cel moeten weg uit de tsv, anders breekt één spreadsheetrij
        # over meerdere regels en loopt de kolomindeling mis. ¶ markeert ze; rubrics.py
        # zet ze terug.
        schoon = tekst.replace("\t", " ").replace("\r\n", "\n").replace("\r", "\n")
        rijen.setdefault(int(rij), {})[kolomnummer(kol)] = schoon.replace("\n", "¶").strip()
    return rijen


def main():
    if not BRON.exists():
        print(f"{BRON} bestaat niet.")
        return
    n = 0
    for pad in sorted(BRON.rglob("*.xlsx")):
        if pad.name.startswith("~$"):
            continue
        try:
            with zipfile.ZipFile(pad) as z:
                gedeeld = gedeelde_teksten(z)
                bladen = sorted(x for x in z.namelist() if re.match(r"xl/worksheets/sheet\d+\.xml$", x))
                uit = []
                for blad in bladen:
                    rijen = blad_naar_rijen(z.read(blad).decode("utf-8", "replace"), gedeeld)
                    if not rijen:
                        continue
                    uit.append(f"# {blad}")
                    breed = max((max(r) for r in rijen.values() if r), default=0)
                    for nr in sorted(rijen):
                        cellen = [rijen[nr].get(k, "") for k in range(1, breed + 1)]
                        if any(c for c in cellen):
                            uit.append("\t".join(cellen).rstrip())
        except Exception as e:
            print(f"  ! {pad.name}: {e}")
            continue
        tekst = "\n".join(uit)
        pad.with_suffix(".tsv").write_text(tekst, encoding="utf-8")
        n += 1
        print(f"{len(tekst):>7} tekens  {pad.name}")
    print(f"\n{n} bestanden omgezet.")


if __name__ == "__main__":
    main()
