# LET OP: dit script is geschreven voor een andere omgeving (het leest uit /home/claude) en
# kan hier niet draaien. Belangrijker: de module "celbiologie-datavaardigheden" hieronder
# bestaat niet meer -- die is opgegaan in De cel (tools/samenvoegen-de-cel.py). Zou je dit
# alsnog draaien, dan maakt hij die splitsing opnieuw, mét botsende cel-id's. Pas eerst de
# MODULES-tabel aan.
import sys, json, collections, os
sys.path.insert(0, '/home/claude/repo-leeromgeving/tools')
from build_slidekaarten import bouw

BM = "Biomoleculen in de praktijk_week %s.pptx"
P1 = [("Labveiligheid_week1.pptx", "Labveiligheid", "Veiligheidsquiz", 1),
      ("Kennisslides  - Functionele Groepen & IUPAC Naamgeving (.pptx", "Functionele groepen en IUPAC-naamgeving", "Kennistoets", 2)]
for i, w in enumerate(["2.1","2.2","3.1","3.2","4.1","4.2","5.1","5.2","6.1","6.2","8.1+8.2","8.2-9.1_Betrouwbaarheidsinterval","9.1"], start=3):
    naam = "Biomoleculen week " + w.replace("_Betrouwbaarheidsinterval", " (betrouwbaarheidsinterval)")
    P1.append((BM % w, naam, "Kennistoets", i))
P1 += [("Vragen biomoleculen_studentversie.pptx", "Oefenvragen biomoleculen", "Kennistoets", 16),
       ("Oncologie.pptx", "Themales Oncologie", "Themales", 17),
       ("Biotech.pptx", "Themales Biotechnologie", "Themales", 18)]

CB = "NEW_Celbiologie theorie les %d module %s.pptx"
P2 = [(CB % (1, "1.2  Studentenversie 2024-2025"), "Celbiologie 1", "Theorietoets", 1),
      (CB % (2, "2 Studentenversie 2024-2025"), "Celbiologie 2", "Theorietoets", 2),
      (CB % (3, "1.2 Studentenversie 2 2024-2025"), "Celbiologie 3", "Theorietoets", 3),
      (CB % (4, "1.2  studentenversie 2024-2025"), "Celbiologie 4", "Theorietoets", 4),
      (CB % (5, "1.2  Studentenversie 2024-2025"), "Celbiologie 5", "Theorietoets", 5),
      ("Datavaardigheden_les 1.pptx", "Datavaardigheden 1", "Datavaardigheden", 6),
      ("Datavaardigheden_les 2 voor BS.pptx", "Datavaardigheden 2", "Datavaardigheden", 7),
      ("Datavaardigheden_les 3 tijdens de les.pptx", "Datavaardigheden 3", "Datavaardigheden", 8),
      ("Datavaardigheden_les 4 tijdens de les.pptx", "Datavaardigheden 4", "Datavaardigheden", 9),
      ("Datavaardigheden_les 5 tijdens de les.pptx", "Datavaardigheden 5", "Datavaardigheden", 10),
      ("Datavaardigheden_les 6 2526 tijdens de les.pptx", "Datavaardigheden 6", "Datavaardigheden", 11),
      ("NEW_(Bio)moleculen in de praktijk_week 2.1.pptx", "(Bio)moleculen week 2.1", "Theorietoets", 12)]

P3 = [("2526_1-1_Eiwitten, vorm functie en basis biochemie- studenten.pptx", "Eiwitten: vorm, functie en basisbiochemie", "Theorietoets", 1),
      ("2526_1-2_ Hart - vaten en bloed.pptx", "Hart, vaten en bloed", "Theorietoets", 2),
      ("2526_wk2_Nieren en Longen_MG.pptx", "Nieren en longen", "Theorietoets", 3),
      ("2526_wk3_Neurologie.pptx", "Neurologie", "Theorietoets", 4),
      ("2526_wk4_Immunologie_Deel 1.pptx", "Immunologie deel 1", "Theorietoets", 5),
      ("2526_wk5_Immunologie_Deel 2.pptx", "Immunologie deel 2", "Theorietoets", 6),
      ("Week 2 Theorie onderzoeksplan - Algemeen_informatie trechter.pptx", "Onderzoeksplan: informatietrechter", "Project", 7),
      ("Week 3 - Theorie onderzoeksplan - Doel en hypothese.pptx", "Onderzoeksplan: doel en hypothese", "Project", 8),
      ("Week 4 Theorie onderzoeksplan - Materiaal en methode _Eiwit.pptx", "Onderzoeksplan: materiaal en methode", "Project", 9),
      ("Resultaat verwerking ELISA.pptx", "ELISA-resultaten verwerken", "Praktijk", 10),
      ("week 3 LU2 tips_foto_mic_preparaten_NEW.pptx", "Microscopiepreparaten fotograferen", "Praktijk", 11)]

P4 = [("Les 01 - Moleculaire genetica.pptx", "Moleculaire genetica", "Theorietoets", 1),
      ("Les 02 - DNA extractie.pptx", "DNA-extractie", "Theorietoets", 2),
      ("Les 03 - DNA replicatie.pptx", "DNA-replicatie", "Theorietoets", 3),
      ("Les 04 - DNA technieken - PCR.pptx", "DNA-technieken: PCR", "Theorietoets", 4),
      ("Les 05_Vectoren en Restrictie Enzymen.pptx", "Vectoren en restrictie-enzymen", "Theorietoets", 5),
      ("Les 06_Transcriptie.pptx", "Transcriptie", "Theorietoets", 6),
      ("Les 07_ Gen regulatie - extra uitleg.pptx", "Genregulatie", "Theorietoets", 7),
      ("Les 08_Translatie.pptx", "Translatie", "Theorietoets", 8),
      ("Les 10 - STR analyse en Capillaire Gelelektroforese.pptx", "STR-analyse en capillaire gelelektroforese", "Theorietoets", 10),
      ("Les 11 - Genetica 1.pptx", "Genetica 1", "Theorietoets", 11),
      ("Les 12 - Genetica 2.pptx", "Genetica 2", "Theorietoets", 12),
      ("Themales Biotechnologie.pptx", "Themales Biotechnologie", "Themales", 13),
      ("Themales Oncologie_sept2024_WvG_NEW.pptx", "Themales Oncologie", "Themales", 14)]

MODULES = [
  ("p1.json", P1, "biomoleculen-labveiligheid", "bio", "Biomoleculen en labveiligheid", 1, "data/jaar-1/periode-1/biomoleculen-labveiligheid.json"),
  ("p2.json", P2, "celbiologie-datavaardigheden", "cel", "Celbiologie en datavaardigheden", 2, "data/jaar-1/periode-2/celbiologie-datavaardigheden.json"),
  ("p3.json", P3, "eiwitten-in-de-praktijk", "eiw", "Eiwitten in de praktijk", 3, "data/jaar-1/periode-3/eiwitten-in-de-praktijk.json"),
  ("p4.json", P4, "dna-ontrafeld", "don", "DNA ontrafeld", 4, "data/jaar-1/periode-4/dna-ontrafeld.json"),
]
REPO = "/home/claude/repo-leeromgeving/"
nieuw = []
for bron, lessen, mid, prefix, titel, pnr, pad in MODULES:
    d = bouw(f"/home/claude/build/{bron}", lessen, mid, prefix, titel, "Jaar 1", pnr, f"Jaar 1 · Periode {pnr}")
    os.makedirs(os.path.dirname(REPO + pad), exist_ok=True)
    json.dump(d, open(REPO + pad, "w"), ensure_ascii=False, indent=1)
    on = collections.Counter(b["onderwerp"] for b in d["begrippen"])
    print(f'{titel:38s} {len(d["begrippen"]):4d} kaarten, {len(d["lessen"]):2d} lessen, {len(on):3d} onderwerpen')
    nieuw.append({"id": mid, "titel": titel, "jaar": 1, "periode_nr": pnr, "periode": f"Jaar 1 · Periode {pnr}", "bestand": pad})

m = json.load(open(REPO + "data/modules.json"))
bestaand = {x["id"] for x in m["modules"]}
m["modules"] = [x for x in m["modules"]] + [x for x in nieuw if x["id"] not in bestaand]
m["modules"].sort(key=lambda x: (x["jaar"], x["periode_nr"], x["titel"]))
json.dump(m, open(REPO + "data/modules.json", "w"), ensure_ascii=False, indent=1)
print("modules.json:", [x["id"] for x in m["modules"]])
