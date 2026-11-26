"""Schrijft de practicumhandleidingen als Markdown naar data/protocollen/.

Tot nu toe bleef de protocoltekst in bronnen/ (buiten git) en stond er in data/ alleen de
structuur: hoeveel stappen, welke stoffen. Op uitdrukkelijk verzoek staat de tekst nu wél in de
site, zodat je het protocol kunt lezen zonder Brightspace erbij. Het blijft lesmateriaal van de
opleiding; BIJDRAGEN.md zegt wat dat betekent voor verspreiding.

Wat deze tool doet is opmaak, geen herschrijving: dezelfde regels, met kopjes als kop, stappen
als genummerde lijst en materialen als opsomming. De brontekst zelf wordt niet veranderd, want
een protocol dat ik "mooier" maak is een protocol waarop je niet meer kunt varen.

Tabellen (pipetteerschema's, PCR-programma's) komen uit de docx-lezer met tabs ertussen. Die
worden hier een Markdown-tabel, want als platte regels zijn ze onleesbaar.

Gebruik: python tools/protocol-markdown.py
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

DOEL = pathlib.Path("data/protocollen")
BESTANDEN = BRONNEN / "bestanden"

# Een kopregel: kort, geen eindpunt, en een van de woorden die de handleidingen gebruiken.
KOP = re.compile(r"^\s*(materia(?:len|al)|materials?|appa?ratuur|instrumentarium|uitvoering|"
                 r"methoden?|method|procedure|werkwijze|inleiding|voorbereiding|doel|"
                 r"uitwerkende opdrachten|opdracht|vaardigheid)\b[^.]{0,60}$", re.I)
GENUMMERD = re.compile(r"^\s*(\d+[\].\)]|\d+\s)")


# Word plakt de positie van een tekening vóór de alinea waar hij aan hangt: "304801589525Vorige
# week...", "00Figuur 1A", "right3355975Figuur 3". Die cijferreeks is opmaak, geen tekst. Alleen
# weghalen als er direct een hoofdletter op volgt, zodat "10 ml" of "25 °C" niets overkomt.
ANKER = re.compile(r"^(?:right|left|centre|center)?\d{2,}(?=[A-Z])")

# Bestandsnamen en experimentnamen verschillen in leestekens ("+" wordt "_", "Clean-up" wordt
# "clean up"). Vergelijken gebeurt daarom op alleen letters en cijfers.
norm = lambda s: re.sub(r"[^a-z0-9]+", "", str(s).lower())

# Waar de naam in het protocol niets gemeen heeft met de bestandsnaam, wijst dit het bestand aan.
# Eén regel per sessie is eerlijker dan een slimmere zoekregel die ergens anders mis gaat.
HANDMATIG = {
    ("dna-kraak-de-code", 1): "dna-toolbox-2627__W1.2_ Clean-up van PCR en ligatie.pdf.txt",
}


def tabelrij(regel):
    """Een regel met een tab ertussen komt uit een tabel; de cellen eruit halen."""
    cellen = [c.strip() for c in regel.split("\t")]
    return cellen if len([c for c in cellen if c]) >= 2 else None


def naar_markdown(titel, regels, bron):
    uit = [f"## {titel}", ""]
    if bron:
        uit += [f"*Uit de practicumhandleiding `{bron}` van de opleiding.*", ""]
    tabel = []

    def sluit_tabel():
        if not tabel:
            return
        breed = max(len(r) for r in tabel)
        rijen = [r + [""] * (breed - len(r)) for r in tabel]
        uit.append("| " + " | ".join(rijen[0]) + " |")
        uit.append("|" + "|".join([" --- "] * breed) + "|")
        for r in rijen[1:]:
            uit.append("| " + " | ".join(r) + " |")
        uit.append("")
        tabel.clear()

    for regel in regels:
        kaal = ANKER.sub("", regel.strip())
        rij = tabelrij(regel)
        if rij:
            tabel.append(rij)
            continue
        sluit_tabel()
        if not kaal:
            continue
        if KOP.match(kaal):
            uit += ["", f"### {kaal.rstrip(':')}", ""]
        elif GENUMMERD.match(kaal):
            # De bron nummert zelf met 1], 2] of 1.; als Markdown-lijst blijft dat nummer staan.
            uit.append(f"{GENUMMERD.match(kaal).group(1).rstrip('].) ')}. "
                       f"{GENUMMERD.sub('', kaal).strip()}")
        elif len(kaal) < 70 and not kaal.endswith((".", "?", "!")):
            uit.append(f"- {kaal}")
        else:
            uit += ["", kaal]
    sluit_tabel()

    # Dubbele lege regels opruimen; Markdown heeft er maar één nodig.
    schoon = []
    for r in uit:
        if r == "" and schoon and schoon[-1] == "":
            continue
        schoon.append(r)
    return "\n".join(schoon).strip() + "\n"


def main():
    mods = json.loads(pathlib.Path("data/modules.json").read_text(encoding="utf-8"))["modules"]
    DOEL.mkdir(parents=True, exist_ok=True)
    totaal = 0
    for m in mods:
        labpad = pathlib.Path(m["bestand"].replace(".json", ".lab.json"))
        if not labpad.exists():
            continue
        lab = json.loads(labpad.read_text(encoding="utf-8"))
        index = []
        for i, sessie in enumerate(lab.get("sessies", [])):
            # De bestandsnaam van de handleiding staat in "bron"; die zoeken we terug in bronnen/.
            bron = sessie.get("bron") or ""
            kandidaten = list(BRONNEN.rglob(pathlib.Path(bron).stem + ".txt")) if bron else []
            # Waar "bron" een mapnaam is in plaats van een bestandsnaam (DNA toolbox haalt zijn
            # handleidingen uit Brightspace), zijn de experimentnamen de documenttitels. Een sessie
            # kan dan uit meer dan één document bestaan; die komen onder elkaar in hetzelfde bestand.
            handmatig = HANDMATIG.get((m["id"], i))
            if handmatig:
                kandidaten = [BESTANDEN / handmatig]
            if not kandidaten:
                for exp in sessie.get("experimenten", []):
                    stam = norm(exp.get("naam", ""))[:40]
                    if not stam:
                        continue
                    kandidaten += [p for p in BESTANDEN.glob("*.txt") if stam in norm(p.name)]
            if not kandidaten:
                continue
            delen = []
            for k in dict.fromkeys(kandidaten):      # volgorde houden, dubbels eruit
                delen += k.read_text(encoding="utf-8").replace(chr(65279), "").splitlines() + [""]
            md = naar_markdown(sessie.get("titel") or f"Sessie {i + 1}", delen, bron)
            naam = f"{m['id']}-{i:02d}.md"
            (DOEL / naam).write_text(md, encoding="utf-8")
            index.append({"sessie": i, "titel": sessie.get("titel"), "bestand": f"data/protocollen/{naam}"})
            totaal += 1
        if index:
            lab["protocollen"] = index
            labpad.write_text(json.dumps(lab, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            print(f"{len(index):>3} protocollen -> {m['titel']}")
    print(f"\n{totaal} markdownbestanden in {DOEL}")


if __name__ == "__main__":
    main()
