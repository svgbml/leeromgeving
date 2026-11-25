"""Telt per periode en leeruitkomst hoeveel PowerPoints er zijn, en waar ze vandaan komen.

Drie bronnen worden naast elkaar gelegd:
  site         slidebestanden waar de module-data een Drive-link voor heeft (tekst staat al in kaarten)
  brightspace  pptx die rechtstreeks in Brightspace staan (bronnen/brightspace-genormaliseerd.json)
  beide        hetzelfde bestand in allebei

De LU volgt uit de vleugel: LU1 = theorie, LU2 = lab/praktijk, LU3 = project.
Voor de site komt die vleugel van de les waar het slidebestand bij hoort (de indeling uit B1).

Gebruik: python tools/slide-overzicht.py
"""
import json
import pathlib

import sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from paden import BRONNEN
import collections

BRON = BRONNEN
LU = {"theorie": "LU1", "lab": "LU2", "project": "LU3", "ppo": "PPO", "info": "overig"}
KOLOMMEN = ["LU1", "LU2", "LU3", "PPO", "overig"]

# Bestandsnamen verschillen in spaties, hoofdletters en "- Copy"; zo vergelijken we ze.
def norm(s):
    s = s.lower().replace("- copy", "").replace("_", " ")
    return "".join(ch for ch in s if ch.isalnum())


def site_slides():
    """Per slidebestand: module, periode en LU, afgeleid uit de les waar het bij hoort."""
    mods = json.loads(pathlib.Path("data/modules.json").read_text(encoding="utf-8"))["modules"]
    uit = {}
    for m in mods:
        data = json.loads(pathlib.Path(m["bestand"]).read_text(encoding="utf-8"))
        over_pad = pathlib.Path(m["bestand"].replace(".json", ".overrides.json"))
        lessen_over = {}
        if over_pad.exists():
            lessen_over = json.loads(over_pad.read_text(encoding="utf-8")).get("lessen", {})
        # bestand -> vleugel, via de les die dat bestand als bron noemt
        vleugel_van_bestand = {}
        for les in data.get("lessen", []):
            vleugel = (lessen_over.get(str(les["nr"])) or {}).get("vleugel", "theorie")
            for bron in les.get("bronnen") or []:
                vleugel_van_bestand[bron] = vleugel
        for naam in (data.get("slides") or {}):
            uit[norm(naam)] = {
                "naam": naam,
                "module": m["id"],
                "periode": m["periode"],
                "lu": LU.get(vleugel_van_bestand.get(naam, "theorie"), "overig"),
            }
    return uit


def brightspace_slides():
    pad = BRON / "brightspace-genormaliseerd.json"
    if not pad.exists():
        return {}
    items = json.loads(pad.read_text(encoding="utf-8"))["items"]
    uit = {}
    for i in items:
        if i["soort"] != "pptx" or not i.get("bestandsnaam"):
            continue
        k = norm(i["bestandsnaam"])
        # Dezelfde naam kan in twee jaargangen staan; de nieuwste wint voor de periode.
        if k in uit and (uit[k]["jaar"] or "") >= (i["jaar"] or ""):
            continue
        uit[k] = {
            "naam": i["bestandsnaam"],
            "module": i["module"] or "(modulevrij)",
            "jaar": i["jaar"],
            "lu": LU.get(i["vleugel"], "overig"),
        }
    return uit


def tabel(titel, rijen, kop_links):
    breed = max([len(r) for r in rijen] + [len(kop_links)]) + 2
    print(f"\n{titel}")
    print(f"{kop_links:<{breed}}" + "".join(f"{k:>8}" for k in KOLOMMEN) + f"{'totaal':>9}")
    print("-" * (breed + 8 * len(KOLOMMEN) + 9))
    return breed


def main():
    site = site_slides()
    bs = brightspace_slides()
    alle = set(site) | set(bs)

    # Periode per module uit modules.json, zodat beide bronnen dezelfde periode noemen.
    mods = json.loads(pathlib.Path("data/modules.json").read_text(encoding="utf-8"))["modules"]
    periode_van_module = {m["id"]: m["periode"] for m in mods}

    rijen = collections.defaultdict(lambda: collections.Counter())
    herkomst = collections.Counter()
    for k in alle:
        s, b = site.get(k), bs.get(k)
        module = (s or b)["module"]
        periode = periode_van_module.get(module, "(modulevrij)")
        lu = (s or b)["lu"]
        if s and b:
            bron = "beide"
        elif s:
            bron = "alleen site (Drive)"
        else:
            bron = "alleen Brightspace"
        herkomst[bron] += 1
        rijen[(periode, module)][lu] += 1
        rijen[(periode, module)]["totaal"] += 1

    breed = tabel("PowerPoints per periode en leeruitkomst (uniek, beide bronnen samen)",
                  [f"{p} · {m}" for p, m in rijen], "periode / module")
    for (periode, module) in sorted(rijen, key=lambda x: (x[0], x[1])):
        c = rijen[(periode, module)]
        label = f"{periode} · {module}"
        print(f"{label:<{breed}}" + "".join(f"{c.get(k,0):>8}" for k in KOLOMMEN) + f"{c['totaal']:>9}")
    tot = collections.Counter()
    for c in rijen.values():
        tot.update(c)
    print("-" * (breed + 8 * len(KOLOMMEN) + 9))
    print(f"{'totaal':<{breed}}" + "".join(f"{tot.get(k,0):>8}" for k in KOLOMMEN) + f"{tot['totaal']:>9}")

    print("\nHerkomst van die bestanden")
    for k, v in herkomst.most_common():
        print(f"  {v:>4}  {k}")
    print(f"\n  {sum(1 for k in alle if k in site):>4}  tekst staat al als kaarten in de site")
    print(f"  {0:>4}  pptx lokaal gedownload (bronnen/bestanden bevat nog geen pptx)")


if __name__ == "__main__":
    main()
