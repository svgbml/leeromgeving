"""Waar de ruwe bronbestanden staan.

De scrape uit Brightspace en SharePoint is honderden megabytes groot. Die hoort niet in de
repo (zie .gitignore) en ook niet in de OneDrive-map van het project, want dan synchroniseert
alles mee. Het pad staat daarom in `.bronnen-pad`, een regel tekst, buiten git.

Staat dat bestand er niet, dan valt alles terug op `bronnen/` naast het project, zodat het
ook werkt op een machine die de scrape gewoon in de projectmap heeft staan.
"""
import pathlib

WIJZER = pathlib.Path(".bronnen-pad")
STANDAARD = pathlib.Path("bronnen")


def bronnen():
    if WIJZER.exists():
        pad = pathlib.Path(WIJZER.read_text(encoding="utf-8").strip())
        if pad.exists():
            return pad
        print(f"! {WIJZER} wijst naar {pad}, maar die map bestaat niet; val terug op {STANDAARD}")
    return STANDAARD


BRONNEN = bronnen()
