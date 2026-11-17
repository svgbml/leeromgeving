// Kleine SVG-grafiekjes zonder bibliotheek. Kleuren komen uit de CSS-variabelen, dus licht,
// donker en hoog contrast werken vanzelf.
import { esc, cijferTekst } from "../domain/text.js";
import { niveau } from "../domain/planner.js";

// Cijfertrend (#40): lijntje met punten; de 5,5-lijn als stippellijn.
export function sparkline(cijfers, { b = 120, h = 32, label = "Cijfertrend" } = {}) {
  if (!cijfers || cijfers.length < 2) return "";
  const x = i => 3 + i * (b - 6) / (cijfers.length - 1), y = c => h - 3 - (c - 1) / 9 * (h - 6);
  const pad = cijfers.map((c, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(c).toFixed(1)}`).join("");
  const laatste = cijfers[cijfers.length - 1];
  return `<svg class="spark" viewBox="0 0 ${b} ${h}" width="${b}" height="${h}" role="img" aria-label="${esc(label)}: ${cijfers.map(cijferTekst).join(", ")}">
    <line x1="0" x2="${b}" y1="${y(5.5)}" y2="${y(5.5)}" class="spark-norm"/>
    <path d="${pad}" class="spark-lijn"/>
    ${cijfers.map((c, i) => `<circle cx="${x(i)}" cy="${y(c)}" r="${i === cijfers.length - 1 ? 3 : 1.8}" class="${c >= 5.5 ? "spark-goed" : "spark-fout"}"/>`).join("")}
    <title>Laatste: ${cijferTekst(laatste)}</title></svg>`;
}

// Heatmap van studiedagen (#39), zoals op GitHub.
export function heatmapSvg(kolommen) {
  const c = 11, g = 3, b = kolommen.length * (c + g) + 22, h = 7 * (c + g) + 16;
  const dagen = ["ma", "", "wo", "", "vr", "", ""];
  let html = `<svg class="heat" viewBox="0 0 ${b} ${h}" role="img" aria-label="Studiedagen van de afgelopen ${kolommen.length} weken">`;
  dagen.forEach((d, i) => { if (d) html += `<text x="0" y="${16 + i * (c + g) + 9}" class="heat-lbl">${d}</text>`; });
  let vorigeMaand = "";
  kolommen.forEach((kol, w) => {
    const maand = new Date(kol[0].dag + "T12:00:00").toLocaleDateString("nl-NL", { month: "short" });
    if (maand !== vorigeMaand && w < kolommen.length - 1) { html += `<text x="${22 + w * (c + g)}" y="9" class="heat-lbl">${maand}</text>`; vorigeMaand = maand; }
    kol.forEach((d, i) => {
      if (d.toekomst) return;
      html += `<rect x="${22 + w * (c + g)}" y="${16 + i * (c + g)}" width="${c}" height="${c}" rx="2" class="heat-${niveau(d.n)}"><title>${d.dag}: ${d.n} ${d.n === 1 ? "herhaling" : "herhalingen"}</title></rect>`;
    });
  });
  return html + "</svg>";
}

// Voortgangsring voor het dagdoel (#14).
export function ring(waarde, doel, { r = 34, dik = 8, tekst = "" } = {}) {
  const omtrek = 2 * Math.PI * r, frac = Math.min(1, doel ? waarde / doel : 0), s = 2 * (r + dik);
  return `<svg class="ring" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" role="img" aria-label="${esc(tekst || `${waarde} van ${doel}`)}">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="ring-bg" stroke-width="${dik}"/>
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" class="ring-fg${frac >= 1 ? " ring-vol" : ""}" stroke-width="${dik}"
      stroke-dasharray="${omtrek.toFixed(1)}" stroke-dashoffset="${(omtrek * (1 - frac)).toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/>
    <text x="50%" y="50%" class="ring-tekst" dominant-baseline="central" text-anchor="middle">${waarde}</text></svg>`;
}

// Staafjes voor de prognose van de komende dagen.
export function staafjes(rij, { h = 46 } = {}) {
  const max = Math.max(1, ...rij.map(d => d.n));
  return `<div class="staaf-rij" role="list">${rij.map((d, i) => {
    const dag = i === 0 ? "vandaag" : new Date(d.dag + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short" });
    return `<div class="staaf" role="listitem" aria-label="${dag}: ${d.n}"><span class="staaf-n">${d.n}</span><span class="staaf-b" style="height:${Math.max(2, d.n / max * h)}px"></span><span class="staaf-d">${dag}</span></div>`;
  }).join("")}</div>`;
}
