"""Haalt per slide de titel, de bullettekst en de notities uit een pptx."""
import sys, json, re
from pptx import Presentation
from pptx.util import Emu

def tekst_van(shape):
    if not shape.has_text_frame: return []
    uit = []
    for p in shape.text_frame.paragraphs:
        t = "".join(r.text for r in p.runs).strip()
        if t: uit.append((p.level, t))
    return uit

def slide_data(s, nr):
    titel, blokken, notes = "", [], ""
    vormen = []
    for sh in s.shapes:
        if sh.shape_type == 6:  # group
            vormen.extend(sh.shapes)
        else:
            vormen.append(sh)
    # titelplaceholder zoeken
    for sh in vormen:
        try:
            if sh.is_placeholder and sh.placeholder_format.type in (13, 1, 0) and sh.has_text_frame and sh.text_frame.text.strip():
                titel = sh.text_frame.text.strip().replace("\n", " "); break
        except Exception: pass
    for sh in vormen:
        regels = tekst_van(sh)
        if not regels: continue
        if titel and len(regels) == 1 and regels[0][1].strip() == titel: continue
        blokken.append(regels)
        if sh.has_table if hasattr(sh, "has_table") else False: pass
    for sh in vormen:
        if getattr(sh, "has_table", False):
            for row in sh.table.rows:
                cellen = [c.text.strip().replace("\n", " ") for c in row.cells]
                if any(cellen): blokken.append([(0, " | ".join(c for c in cellen if c))])
    try:
        if s.has_notes_slide: notes = s.notes_slide.notes_text_frame.text.strip()
    except Exception: pass
    if not titel:
        for b in blokken:
            if b: titel = b[0][1]; break
    return {"nr": nr, "titel": titel, "blokken": blokken, "notes": notes}

uit = {}
for pad in sys.argv[1:]:
    try:
        prs = Presentation(pad)
        uit[pad.split("/")[-1]] = [slide_data(s, i + 1) for i, s in enumerate(prs.slides)]
    except Exception as e:
        uit[pad.split("/")[-1]] = [{"fout": str(e)}]
print(json.dumps(uit, ensure_ascii=False))
