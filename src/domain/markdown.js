// Kleine, veilige Markdown-omzetter voor de verslagen (geen externe bibliotheek, werkt offline).
// Alles wordt eerst ge-escaped; daarna komen alleen bekende opmaakelementen terug.
// Ondersteunt: koppen #–####, alinea's, vet/cursief/code, links (alleen http/https), lijsten
// (genummerd en opsomming, ook ingesprongen), tabellen, citaten en horizontale lijnen.
import { esc } from "./text.js";

// Zelfde id voor dezelfde koptekst, ook vanuit andere schermen ("Les 3 – PCR en primer design").
export const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "kop";

// Backslash-escapes uit Google Docs-export (\_ \- \* …) en dubbele vet-markering in koppen.
const ontsnap = s => s.replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, "$1");
const kopTekst = s => ontsnap(s.replace(/^\*\*(.*)\*\*$/, "$1").replace(/\*\*/g, "")).trim();

function inline(s) {
  // Codefragmenten eerst apart zetten, zodat er binnenin geen opmaak gebeurt.
  const code = [];
  let t = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(c) - 1}\u0000`);
  t = esc(ontsnap(t));
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, tekst, url) => `<a href="${url}" target="_blank" rel="noopener">${tekst}</a>`);
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/__(.+?)__/g, "<strong>$1</strong>");
  t = t.replace(/(^|[^*\w])\*(?!\s)([^*]+?)\*(?!\w)/g, "$1<em>$2</em>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(code[i])}</code>`);
}

const isTabelRij = l => /^\s*\|.*\|\s*$/.test(l);
const isScheiding = l => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(l);
const cellen = l => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(c => c.trim());
const lijstItem = l => l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);

export function markdown(bron) {
  const regels = String(bron ?? "").replace(/\r\n?/g, "\n").split("\n");
  const uit = [], koppen = [], gebruikt = new Map();
  let i = 0;
  const uniek = s => { const n = gebruikt.get(s) || 0; gebruikt.set(s, n + 1); return n ? `${s}-${n + 1}` : s; };

  while (i < regels.length) {
    const l = regels[i];
    if (!l.trim()) { i++; continue; }

    const kop = l.match(/^(#{1,4})\s+(.*)$/);
    if (kop) {
      const niveau = kop[1].length, tekst = kopTekst(kop[2]), id = uniek(slug(tekst));
      koppen.push({ niveau, tekst, id });
      uit.push(`<h${niveau} id="${id}">${inline(tekst)}</h${niveau}>`);
      i++; continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { uit.push("<hr>"); i++; continue; }

    if (isTabelRij(l) && i + 1 < regels.length && isScheiding(regels[i + 1])) {
      let kopCellen = cellen(l);
      i += 2;
      const rijen = [];
      while (i < regels.length && isTabelRij(regels[i])) rijen.push(cellen(regels[i++]));
      // Google Docs exporteert een lege kopregel en zet de echte kop in de eerste rij.
      if (kopCellen.every(c => !c) && rijen.length) kopCellen = rijen.shift().map(c => c.replace(/^(\\?\*){2}|(\\?\*){2}$/g, ""));
      uit.push(`<div class="tabelwrap" tabindex="0"><table><thead><tr>${kopCellen.map(c => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead>
        <tbody>${rijen.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    if (/^\s*>/.test(l)) {
      const blok = [];
      while (i < regels.length && /^\s*>/.test(regels[i])) blok.push(regels[i++].replace(/^\s*>\s?/, ""));
      uit.push(`<blockquote>${markdown(blok.join("\n")).html}</blockquote>`);
      continue;
    }

    if (lijstItem(l)) {
      // Lijsten, ook geneste: een stapel open lijsten op inspringing.
      const stapel = [];
      let html = "";
      while (i < regels.length) {
        const m = lijstItem(regels[i]);
        if (!m) {
          // Vervolgregel van het vorige item (ingesprongen tekst) hoort er nog bij.
          if (regels[i].trim() && /^\s{2,}/.test(regels[i]) && stapel.length) { html = html.replace(/<\/li>$/, ` ${inline(regels[i].trim())}</li>`); i++; continue; }
          break;
        }
        const diepte = m[1].replace(/\t/g, "    ").length, soort = /\d/.test(m[2]) ? "ol" : "ul";
        while (stapel.length && diepte < stapel[stapel.length - 1].diepte) html += `</${stapel.pop().soort}></li>`;
        const top = stapel[stapel.length - 1];
        if (!top || diepte > top.diepte) {
          if (top) html = html.replace(/<\/li>$/, "");
          const start = soort === "ol" && parseInt(m[2], 10) !== 1 ? ` start="${parseInt(m[2], 10)}"` : "";
          html += `<${soort}${start}>`; stapel.push({ diepte, soort });
        }
        html += `<li>${inline(m[3])}</li>`;
        i++;
        if (i < regels.length && !regels[i].trim() && lijstItem(regels[i + 1] || "")) i++; // losse lege regel tussen items
      }
      while (stapel.length) { const s = stapel.pop(); html += `</${s.soort}>${stapel.length ? "</li>" : ""}`; }
      uit.push(html);
      continue;
    }

    const alinea = [regels[i++].trim()]; // altijd minstens één regel, anders blijft de lus hangen
    while (i < regels.length && regels[i].trim() && !/^(#{1,4})\s/.test(regels[i]) && !lijstItem(regels[i]) && !isTabelRij(regels[i]) && !/^\s*>/.test(regels[i])) alinea.push(regels[i++].trim());
    uit.push(`<p>${inline(alinea.join(" "))}</p>`);
  }
  return { html: uit.join("\n"), koppen };
}
