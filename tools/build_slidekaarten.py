"""Maakt uit geextraheerde slidetekst (extract.py) een moduledata-bestand voor de leeromgeving.

Per inhoudelijke slide ontstaat een kaart: de titel is het begrip, de bullets zijn de uitleg.
Organisatorische slides (programma, leerdoelen, planning) en slides zonder tekst vallen af.
Dit levert bewust ruwe kaarten op die de slides letterlijk volgen; naslag, geen herschrijving.
"""
import json, re, sys, unicodedata

# Slides die over de les zelf gaan, niet over de stof.
ORG = re.compile(r"^(programma|programma van vandaag|planning|agenda|leerdoel|leerdoelen|leeruitkomst|"
                 r"les\s*\d+\s*[:.]?$|week\s*\d+|vragen\??|vragen\?|einde|bedankt|tot (de )?volgende|"
                 r"huiswerk|voorbereiding|opdracht\s*\d*$|toets|tentamen|beoordeling|rooster|literatuur|"
                 r"bronnen|inhoud|overzicht van de les|wie ben ik|kennismaking|evaluatie|afsluiting|"
                 r"terugblik|herhaling$|quiz$|kahoot|pauze|samenvatting van vandaag|"
                 r"niet vergeten|praktijkverslag|praktijktoets|learning goals?|learning objectives?|"
                 r"recap\b|mindmap|take home|deadline|inleveren|aanwezigheid|groepsindeling|"
                 r"wat gaan we doen|aan de slag|zelfstudie|voorbereidingsopdracht)\b", re.I)
ORG_BODY = re.compile(r"\b(de student kan|leeruitkomst|bijeenkomsten in week|aanwezigheidsplicht|"
                      r"inleverdatum|cijfer telt|weging|breng elke keer mee|at the end of this (lecture|module)|"
                      r"in groepjes|tijd:\s*\d+\s*min|je kunt na deze les|doel van (de|deze) les)\b", re.I)
RUIS = re.compile(r"^(figure?\s*[\d.]+[a-z]?|fig\.?\s*[\d.]+|slide\s*\d+|©|copyright|bron:|"
                  r"pearson|campbell|\d+\s*$|[A-Z]\)\s*$|back$|volgende$|vorige$)", re.I)
# literatuurverwijzingen onder een figuur zijn geen lesstof
CITAAT = re.compile(r"(doi:|https?://|first published|volume:\s*\d+,\s*issue|et al\.,? \d{4}|"
                    r"©\s*\d{4}|all rights reserved)", re.I)

def schoon(t):
    t = unicodedata.normalize("NFC", t or "")
    t = t.replace("\x0b", " ").replace("\u000b", " ").replace("\xa0", " ")
    t = re.sub(r"\s+", " ", t).strip()
    # losgeraakte woorden uit PowerPoint ("Moleculairegenetica") laten we staan: niet raden
    return t

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def body_html(regels):
    """Bullets worden een lijst, losse zinnen een alinea."""
    if len(regels) == 1:
        return esc(regels[0])
    return "<ul>" + "".join(f"<li>{esc(r)}</li>" for r in regels) + "</ul>"

AGENDA = re.compile(r"^(programma van vandaag|programma|inhoud|overzicht|onderwerpen)", re.I)

def kaarten_uit(deck, bestand, les_titel, les_nr, toets=""):
    uit, sectie, gezien, sinds, agenda = [], "", {}, 0, []
    for nr_s, s in enumerate(deck):
        titel = schoon(s.get("titel", ""))
        regels = [schoon(t) for blok in s.get("blokken", []) for lvl, t in blok]
        regels = [r for r in regels if r and not RUIS.match(r) and not CITAAT.search(r)]
        body = [r for r in regels if r != titel and len(r) > 2]
        tekst_len = sum(len(r) for r in body)
        # titel die ook (bijna) in de body staat niet twee keer tonen
        if titel:
            k = titel[:40].lower()
            body = [r for r in body if not (r[:40].lower() == k or titel.lower().startswith(r[:40].lower()))]
        tekst_len = sum(len(r) for r in body)
        if nr_s == 0: continue                       # titelslide
        if not titel and not body: continue
        if AGENDA.match(titel) and len(body) >= 3:   # agendapunten worden de onderwerpen
            agenda = [r for r in body if 3 < len(r) < 60]; continue
        if ORG.match(titel) or (body and ORG_BODY.search(" ".join(body[:3]))): continue
        # komt de titel terug in de agenda, dan begint daar een nieuw onderwerp
        for a in agenda:
            if a.lower()[:25] in titel.lower() or titel.lower()[:25] in a.lower():
                sectie, sinds = a, 0; break
        if RUIS.match(titel):
            if not body: continue
            titel, body = body[0], body[1:]
        # Korte titel zonder tekst: dat is een sectiekop, die wordt het onderwerp.
        if titel and tekst_len < 25:
            # een vraag, losse kreet of hoofdletterwoord is geen bruikbaar onderwerp
            if len(titel) <= 60 and not titel.endswith(("?", ":")) and not titel.isupper():
                sectie, sinds = titel.rstrip(" .:"), 0
            continue
        if not titel: titel, body = body[0], body[1:]
        if body and tekst_len < 45 and len(titel) < 45: continue   # te weinig om te leren
        # alleen losse labels (figuurbijschrift, legenda): geen kaart
        if body and len(body) >= 2 and max(len(r) for r in body) < 40: continue
        if body and sum(len(r) for r in body) < 40: continue
        if not body:
            if len(titel) < 45: continue
            woorden = titel.split()
            voor, na = " ".join(woorden[:6]) + "…", titel
        else:
            voor, na = titel, body_html(body)
        voor = voor[:140]
        sleutel = re.sub(r"[^a-z0-9]", "", voor.lower())[:60]
        if sleutel in gezien:
            # dubbele slide: de rijkste versie houden
            if len(na) > len(uit[gezien[sleutel]]["uitleg"]): uit[gezien[sleutel]]["uitleg"] = na
            continue
        notes = schoon(s.get("notes", ""))
        gezien[sleutel] = len(uit)
        sinds += 1
        if sinds > 12: sectie = ""      # een sectiekop geldt niet voor de hele les
        uit.append({
            "onderwerp": sectie or les_titel,
            "begrip": voor,
            "uitleg": na,
            "aanvulling": notes if 20 < len(notes) < 600 else "",
            "les": f"Les {les_nr} – {les_titel}" if les_nr else les_titel,
            "les_nr": les_nr,
            "toets": toets,
            "bron_bestand": bestand,
            "bron_slides": [s["nr"]],
        })
    return uit

def bouw(extract_json, lessen, module_id, prefix, titel, jaar, periode_nr, periode):
    """lessen: lijst van (bestand, lestitel, toetsblok, lesnummer)."""
    data = json.load(open(extract_json))
    begrippen, lesinfo = [], []
    for bestand, les_titel, toets, nr in lessen:
        deck = data.get(bestand)
        if deck is None:
            print("ontbreekt:", bestand, file=sys.stderr); continue
        k = kaarten_uit(deck, bestand, les_titel, nr, toets)
        lesinfo.append({"nr": nr, "titel": les_titel, "toets": toets, "aantal": len(k), "bronnen": [bestand]})
        begrippen.extend(k)
    for i, b in enumerate(begrippen, start=1):
        b["id"] = f"{prefix}-{i:03d}"
        b["module"] = titel
        b["type"] = "vraag" if False else "begrip"
    return {"id": module_id, "titel": titel, "module": titel, "periode": periode, "jaar": jaar,
            "periode_nr": periode_nr, "kaarttype": "begrip", "lessen": lesinfo,
            "bronnen": [l[0] for l in lessen], "slides": {}, "begrippen": begrippen}
