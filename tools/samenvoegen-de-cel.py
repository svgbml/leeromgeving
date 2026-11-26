"""Voegt Celbiologie en datavaardigheden samen in De cel, en zet De cel in periode 2.

Waarom
------
Brightspace heeft voor jaar 1 vier cursussen: P1 Biomoleculen, P2 De cel, P3 Eiwitten, P4 DNA
ontrafeld. "Celbiologie en datavaardigheden" bestaat daar niet als module: celbiologie is het
thema van LU2 van De cel en datavaardigheden is daar een deeltoets van. In data/modules.json
stonden ze als twee modules, met De cel bovendien in periode 1.

Het lastige punt
----------------
Beide moduledossiers nummeren hun kaarten vanaf cel-001, dus alle 133 id's van De cel botsen met
de eerste 133 van Celbiologie. Zomaar samenvoegen zou 133 kaarten stil overschrijven. Daarom
krijgen de kaarten van Celbiologie de stam "celbio-" en blijven die van De cel zoals ze waren:
dan verandert er niets aan de kant die de module-id houdt, en is er maar één verhuizing nodig.

Die verhuizing is nodig omdat voortgang per module én per kaart-id wordt bewaard. Deze tool
schrijft daarom data/schema/samenvoeging-de-cel.json: de afbeelding van oude naar nieuwe sleutel.
src/core/store.js leest die één keer en verhuist je herhalingen, sterren, notities, antwoorden en
foutenboek mee. Zonder dat bestand zou je je werk aan 325 kaarten kwijt zijn.

Draai dit één keer. Hij weigert als De cel al is samengevoegd.

Gebruik: python tools/samenvoegen-de-cel.py
"""
import json
import pathlib
import re
import shutil

BRON = pathlib.Path("data/jaar-1/periode-2/celbiologie-datavaardigheden.json")
DOEL = pathlib.Path("data/jaar-1/periode-1/de-cel.json")
NIEUWE_MAP = pathlib.Path("data/jaar-1/periode-2")
KAART = pathlib.Path("data/schema/samenvoeging-de-cel.json")

# De kaarten van Celbiologie krijgen deze stam; die van De cel blijven "cel-".
STAM = "celbio-"
NUMMER = re.compile(r"^cel-(\d+)$")


def lees(pad):
    return json.loads(pad.read_text(encoding="utf-8"))


def schrijf(pad, data):
    pad.parent.mkdir(parents=True, exist_ok=True)
    pad.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    if not BRON.exists():
        print("Celbiologie en datavaardigheden bestaat niet meer; al samengevoegd?")
        return
    celbio, decel = lees(BRON), lees(DOEL)
    if any(b["id"].startswith(STAM) for b in decel["begrippen"]):
        print("De cel bevat al kaarten met de stam celbio-; niets gedaan.")
        return

    # 1. Lessen: die van De cel houden hun nummer, die van Celbiologie schuiven erachter.
    verschuiving = len(decel["lessen"])
    nieuwe_lessen = []
    les_titel = {}
    for les in celbio["lessen"]:
        nr = int(les["nr"]) + verschuiving
        les_titel[int(les["nr"])] = (nr, les["titel"])
        # De cel schrijft nr en aantal als getal, Celbiologie als tekst; hier gelijktrekken,
        # want tools/validate-data.js eist een geheel getal.
        heel = {**les, "nr": nr}
        if str(les.get("aantal", "")).isdigit():
            heel["aantal"] = int(les["aantal"])
        nieuwe_lessen.append(heel)

    # 2. Kaarten: nieuwe id, nieuwe module, nieuw lesnummer en bijpassende lesnaam.
    kaart = {}
    labels = {}   # oude lesnaam -> nieuwe, voor videos.json
    nieuwe_begrippen = []
    for b in celbio["begrippen"]:
        m = NUMMER.match(b["id"])
        if not m:
            raise SystemExit(f"Onverwacht kaart-id in Celbiologie: {b['id']}")
        nieuw_id = f"{STAM}{m.group(1)}"
        kaart[b["id"]] = nieuw_id
        oud_nr = int(b.get("les_nr") or 0)
        nr, titel = les_titel.get(oud_nr, (oud_nr + verschuiving, ""))
        # "module" op een kaart is een label dat de app nergens leest; door het te laten staan
        # blijft zichtbaar uit welk moduledossier een kaart kwam.
        if b.get("les"):
            labels[b["les"]] = f"Les {nr} – {titel}" if titel else b["les"]
        nieuwe_begrippen.append({
            **b,
            "id": nieuw_id,
            "les_nr": nr,
            "les": f"Les {nr} – {titel}" if titel else b.get("les", ""),
        })

    # 3. Samenvoegen. De cel voorop, zodat de bestaande volgorde niet verschuift.
    decel["begrippen"] = decel["begrippen"] + nieuwe_begrippen
    decel["lessen"] = decel["lessen"] + nieuwe_lessen
    decel["slides"] = {**(decel.get("slides") or {}), **(celbio.get("slides") or {})}
    bronnen = list(decel.get("bronnen") or [])
    for x in celbio.get("bronnen") or []:
        if x not in bronnen:
            bronnen.append(x)
    decel["bronnen"] = bronnen
    decel["titel"] = "De cel"
    decel["module"] = "De cel (Jaar 1 · Periode 2)"
    decel["periode"] = "Jaar 1 · Periode 2"
    decel["periode_nr"] = 2
    decel["_samengevoegd"] = ("Celbiologie en datavaardigheden is hierin opgegaan: in Brightspace is "
                              "dat geen eigen module maar het thema van LU2 van De cel, met "
                              "datavaardigheden als deeltoets. De kaarten daarvan hebben de stam "
                              "celbio-; zie tools/samenvoegen-de-cel.py.")

    # 3b. De overrides. Daar staan handgemaakte kaarten in (veld "nieuw") die niet uit de slides
    #     komen: 43 bij Celbiologie, 24 bij De cel. Die zouden met het verwijderen van het oude
    #     moduledossier verdwijnen, dus ze gaan mee, met dezelfde hernoeming en lesverschuiving.
    over_bron = BRON.with_name(BRON.stem + ".overrides.json")
    over_doel = DOEL.with_name(DOEL.stem + ".overrides.json")
    extra = 0
    if over_bron.exists():
        ob = lees(over_bron)
        od = lees(over_doel) if over_doel.exists() else {}
        nieuw_lijst = list(od.get("nieuw") or [])
        for b in ob.get("nieuw") or []:
            m = NUMMER.match(b.get("id", ""))
            if not m:
                raise SystemExit(f"Onverwacht kaart-id in de overrides van Celbiologie: {b.get('id')}")
            nieuw_id = f"{STAM}{m.group(1)}"
            kaart[b["id"]] = nieuw_id
            oud_nr = int(b.get("les_nr") or 0)
            nr, titel = les_titel.get(oud_nr, (oud_nr + verschuiving, ""))
            if b.get("les"):
                labels[b["les"]] = f"Les {nr} – {titel}" if titel else b["les"]
            nieuw_lijst.append({**b, "id": nieuw_id, "les_nr": nr,
                                "les": f"Les {nr} – {titel}" if titel else b.get("les", "")})
            extra += 1
        # Al het andere uit de oude overrides (lessen, begrippen) erbij, zonder te overschrijven.
        for sleutel, waarde in ob.items():
            if sleutel == "nieuw":
                continue
            od.setdefault(sleutel, waarde)
        od["nieuw"] = nieuw_lijst
        schrijf(over_doel, od)

    # 4. Alles naar periode-2, want daar hoort De cel volgens de cursus.
    NIEUWE_MAP.mkdir(parents=True, exist_ok=True)
    verplaatst = []
    for oud in sorted(DOEL.parent.glob("de-cel.*")):
        nieuw = NIEUWE_MAP / oud.name
        if oud.resolve() != nieuw.resolve():
            shutil.move(str(oud), str(nieuw))
            verplaatst.append(nieuw)
    schrijf(NIEUWE_MAP / DOEL.name, decel)

    # 5. De oude moduledossiers weg.
    weg = sorted(BRON.parent.glob("celbiologie-datavaardigheden.*"))
    for pad in weg:
        pad.unlink()

    # 6. modules.json: Celbiologie eruit, De cel naar periode 2 en het nieuwe pad.
    mpad = pathlib.Path("data/modules.json")
    m = lees(mpad)
    m["modules"] = [x for x in m["modules"] if x["id"] != "celbiologie-datavaardigheden"]
    for x in m["modules"]:
        if x["id"] == "de-cel":
            x["periode_nr"] = 2
            x["periode"] = "Jaar 1 · Periode 2"
            x["titel"] = "De cel"
            x["bestand"] = str(NIEUWE_MAP / DOEL.name).replace("\\", "/")
    m["modules"].sort(key=lambda x: (x["jaar"], x["periode_nr"], x["titel"]))
    schrijf(mpad, m)

    # 7. Alles wat naar de oude module wees, wijst nu naar De cel. volgordes.json en videos.json
    #    noemen modules in een lijst, dus daar kan "de-cel" al in staan; vandaar het ontdubbelen.
    aangepast = []

    # videos.json sleutelt per module én daarbinnen per lesnaam, dus daar moeten de video's
    # van de oude module eronder geschoven worden mét hun nieuwe lesnaam.
    vpad = pathlib.Path("data/videos.json")
    if vpad.exists():
        v = lees(vpad)
        oude = v.pop("celbiologie-datavaardigheden", None)
        if oude is not None:
            doel_v = v.setdefault(decel["id"], {})
            for les, lijst in oude.items():
                doel_v.setdefault(labels.get(les, les), []).extend(lijst)
            # De sleutelvolgorde van een module volgt de lesvolgorde; opnieuw ordenen.
            v[decel["id"]] = {k: doel_v[k] for k in sorted(doel_v, key=lambda s: (
                int(re.match(r"Les\s*(\d+)", s).group(1)) if re.match(r"Les\s*(\d+)", s) else 99, s))}
            schrijf(vpad, v)
            aangepast.append(vpad.name)

    for pad in (pathlib.Path("data/volgordes.json"),):
        if not pad.exists():
            continue
        ruw = pad.read_text(encoding="utf-8")
        if "celbiologie-datavaardigheden" not in ruw:
            continue
        data = json.loads(ruw)

        def herschrijf(x):
            if isinstance(x, dict):
                return {k: herschrijf(v) for k, v in x.items()}
            if isinstance(x, list):
                uit = []
                for v in (herschrijf(i) for i in x):
                    if v not in uit:
                        uit.append(v)
                return uit
            return "de-cel" if x == "celbiologie-datavaardigheden" else x

        schrijf(pad, herschrijf(data))
        aangepast.append(pad.name)

    # rekenen.js noemt de module in de sjablonenlijst; daar hetzelfde, als tekst.
    rek = pathlib.Path("src/domain/rekenen.js")
    if rek.exists():
        t = rek.read_text(encoding="utf-8")
        if "celbiologie-datavaardigheden" in t:
            # Eerst de combinatie met de-cel erin, anders blijft er een dubbele over.
            t = t.replace('"de-cel", "celbiologie-datavaardigheden"', '"de-cel"')
            t = t.replace('"celbiologie-datavaardigheden", "de-cel"', '"de-cel"')
            t = t.replace('"celbiologie-datavaardigheden"', '"de-cel"')
            rek.write_text(t, encoding="utf-8")
            aangepast.append(rek.name)

    # 8. De verhuiskaart voor de voortgang.
    schrijf(KAART, {
        "_wat": "Afbeelding van de oude kaart-id's van Celbiologie en datavaardigheden naar hun "
                "nieuwe id in De cel. src/core/store.js gebruikt dit één keer om bewaarde "
                "voortgang mee te verhuizen.",
        "van_module": "celbiologie-datavaardigheden",
        "naar_module": "de-cel",
        "kaarten": kaart,
    })

    print(f"{len(nieuwe_begrippen)} kaarten en {len(nieuwe_lessen)} lessen verhuisd naar De cel")
    print(f"  totaal nu: {len(decel['begrippen'])} kaarten, {len(decel['lessen'])} lessen")
    print(f"  plus {extra} handgemaakte kaarten uit de overrides")
    print(f"  verplaatst: {', '.join(p.name for p in verplaatst)}")
    print(f"  verwijderd: {', '.join(p.name for p in weg)}")
    print(f"  verhuiskaart: {KAART} ({len(kaart)} id's)")
    print(f"  verwijzingen bijgewerkt in: {', '.join(aangepast) or 'niets'}")


if __name__ == "__main__":
    main()
