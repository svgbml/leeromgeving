// Kwaliteitsrapport per module (#30): wat kan er beter aan de kaarten?
// Schrijft Markdown naar stdout; in CI komt het in de samenvatting van de run (GITHUB_STEP_SUMMARY).
// Blokkeert de deploy niet: het is een werklijst, geen fout.  Gebruik: node tools/kwaliteit.js
import { modules, metOverrides } from "./lib.js";
import { toetsbaar } from "../src/domain/quiz.js";
import { plain } from "../src/domain/text.js";

const ORG = /\b(remindo|brightspace|knowingo|deadline|inlever|huiswerk|bijeenkomst|herkansing|rooster)\b/i;
const regels = ["# Kwaliteitsrapport kaarten", "", "| Module | Kaarten | Korte uitleg | Dubbel begrip | Kleine onderwerpen | Zonder bron | Mogelijk lesinfo |", "|---|---|---|---|---|---|---|"];
const details = [];
for (const m of modules()) {
  const { data } = metOverrides(m.bestand);
  const k = data.begrippen.filter(toetsbaar);
  const kort = k.filter(b => plain(b.uitleg).length < 25);
  const per = new Map(); for (const b of k) { const t = plain(b.begrip).toLowerCase(); per.set(t, [...(per.get(t) || []), b.id]); }
  const dubbel = [...per.entries()].filter(([, ids]) => ids.length > 1);
  const ond = new Map(); for (const b of k) ond.set(b.onderwerp, (ond.get(b.onderwerp) || 0) + 1);
  const klein = [...ond.entries()].filter(([, n]) => n < 4);
  const geenBron = k.filter(b => !b.bron_bestand);
  const org = k.filter(b => ORG.test(plain(`${b.begrip} ${b.uitleg}`)));
  regels.push(`| ${m.titel} | ${k.length} | ${kort.length} | ${dubbel.length} | ${klein.length} | ${geenBron.length} | ${org.length} |`);
  const lijst = (titel, items) => items.length ? `\n**${titel}**\n\n${items.slice(0, 15).map(x => `- ${x}`).join("\n")}${items.length > 15 ? `\n- … en ${items.length - 15} meer` : ""}\n` : "";
  details.push(`\n## ${m.titel}\n` +
    lijst("Korte uitleg (< 25 tekens)", kort.map(b => `\`${b.id}\` ${plain(b.begrip).slice(0, 60)}: “${plain(b.uitleg)}”`)) +
    lijst("Hetzelfde begrip meerdere keren", dubbel.map(([t, ids]) => `${t.slice(0, 60)} (${ids.join(", ")})`)) +
    lijst("Onderwerpen met minder dan 4 kaarten (weinig afleiders voor meerkeuze)", klein.map(([o, n]) => `${o.slice(0, 60)} (${n})`)) +
    lijst("Mogelijk organisatorisch, maar niet als lesinfo gemarkeerd (zie tools/markeer_lesinfo.py)", org.map(b => `\`${b.id}\` ${plain(b.begrip).slice(0, 70)}`)));
}
console.log([...regels, ...details].join("\n"));
