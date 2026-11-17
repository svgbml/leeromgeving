"""Markeert kaarten die over de organisatie van de module gaan in plaats van over de lesstof.

Voorbeelden: hoeveel bijeenkomsten er zijn, wanneer de toetsen zijn, welke lessen bij welke toets
horen, deadlines, huiswerk, inloggen op Brightspace/Knowingo/LabArchives, eisen aan een presentatie.
Zulke kaarten krijgen "lesinfo": true. De oefentoets en de flashcards slaan ze over; in de
begrippenlijst blijven ze zichtbaar met het label "lesinfo".

Gebruik:  python tools/markeer_lesinfo.py          (toont wat er verandert, schrijft niets)
          python tools/markeer_lesinfo.py --schrijf (past de moduledata aan)

Klopt een regel niet voor een kaart, zet de kaart dan in WEL of NIET hieronder ("<module-id>:<kaart-id>").
"""
import glob, json, re, sys

sys.stdout.reconfigure(encoding="utf-8")

# Woorden die alleen in organisatorische tekst voorkomen.
TEKST = re.compile(
    r"(remindo|brightspace|\bBS\b|knowingo|labarchives|refworks|mastering biology|sowiso|thinglink|"
    r"bijeenkomst|deadline|inlever|herkansing|inzage toets|summatieve|\bformatieve toets|"
    r"leeruitkom|aanwezigheidsplicht|eindopdracht|toetsen? in week|in week \d+[^.]{0,40}\btoets)", re.I)
# Kaarten waarvan het begrip (de slidetitel of vraag) al zegt dat het om de lesopzet gaat.
BEGRIP = re.compile(
    r"^(huiswerk|thuis afronden|voorbereid(en|ing)\b|lever\b|kan jij het verslag|presentatie molecuul|"
    r"presentaties$|waaraan moet de \w*presentatie|klik om stijl|moleculaire genetica: week|toetsing|"
    r"knowingo|digitaal labjournaal|mastering biology|video.s .*optioneel|bronnenlijst maken|"
    r"update casus|status van project|hoeveel bijeenkomsten|wanneer zijn de toetsen|welke lessen horen bij)", re.I)
ONDERWERP = re.compile(r"^(opzet|toetsing|presentatie|huiswerk|organisatie|planning|rooster|beoordeling)$", re.I)

# Handmatige uitzonderingen op de regels.
WEL = set()
NIET = {
    "biomoleculen-labveiligheid:bio-193",   # tabel met soorten testen: lesstof, noemt alleen "aanwezig"
    "eiwitten-in-de-praktijk:eiw-249",      # IEEE-bronvermelding: vaardigheid die getoetst kan worden
    "eiwitten-in-de-praktijk:eiw-281",      # formule voor R²: lesstof, verwijst alleen naar BS
}

def plat(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s or "")).strip()

def is_lesinfo(mod_id, b):
    sleutel = f"{mod_id}:{b['id']}"
    if sleutel in WEL: return True
    if sleutel in NIET: return False
    begrip = plat(b.get("begrip"))
    tekst = begrip + " " + plat(b.get("uitleg"))
    return bool(ONDERWERP.search(b.get("onderwerp") or "") or BEGRIP.search(begrip) or TEKST.search(tekst))

def main():
    schrijf = "--schrijf" in sys.argv
    totaal = 0
    for pad in sorted(glob.glob("data/jaar-*/periode-*/*.json")):
        with open(pad, encoding="utf-8") as f:
            data = json.load(f)
        mod_id = data.get("id") or pad
        aan, uit = [], []
        for b in data["begrippen"]:
            nu = is_lesinfo(mod_id, b)
            was = bool(b.get("lesinfo"))
            if nu: totaal += 1
            if nu and not was: aan.append(b); b["lesinfo"] = True
            if was and not nu: uit.append(b); b.pop("lesinfo", None)
        n = sum(1 for b in data["begrippen"] if b.get("lesinfo"))
        print(f"\n{mod_id}: {n} van {len(data['begrippen'])} kaarten lesinfo (+{len(aan)} / -{len(uit)})")
        for b in aan: print(f"  + {b['id']:9} {plat(b['begrip'])[:70]}")
        for b in uit: print(f"  - {b['id']:9} {plat(b['begrip'])[:70]}")
        if schrijf and (aan or uit):
            with open(pad, "w", encoding="utf-8", newline="\n") as f:
                json.dump(data, f, ensure_ascii=False, indent=1)
                f.write("\n")
    print(f"\nTotaal {totaal} lesinfo-kaarten." + ("" if schrijf else " (niets geschreven; gebruik --schrijf)"))

if __name__ == "__main__":
    main()
