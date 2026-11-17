// Mindmap per les (#38): begrippen als knopen, lijnen waar kaarten elkaar noemen of sterk overlappen.
// Eenvoudige krachtsimulatie (afstoting + veren), vooraf uitgerekend; daarna een statische SVG.
import { esc, kort } from "../domain/text.js";
import { index, verwant } from "../domain/kaarten.js";
import { link } from "../core/router.js";

export function mindmap(data, kaarten) {
  const k = kaarten.slice(0, 70);
  if (k.length < 3) return `<p>Te weinig kaarten voor een kaart van deze selectie.</p>`;
  const idx = index(data), ids = new Set(k.map(b => b.id));
  const randen = [], gezien = new Set();
  for (const b of k) for (const x of verwant(idx, b.id, 3)) {
    if (!ids.has(x.id)) continue;
    const s = [b.id, x.id].sort().join("|");
    if (!gezien.has(s)) { gezien.add(s); randen.push([b.id, x.id]); }
  }
  const B = 760, H = Math.max(420, Math.min(900, k.length * 14));
  // Onderwerpen krijgen een eigen kleurklasse en een startpositie op een cirkel.
  const onderwerpen = [...new Set(k.map(b => b.onderwerp))];
  const pos = new Map(k.map((b, i) => {
    const o = onderwerpen.indexOf(b.onderwerp), hoek = (o / onderwerpen.length) * Math.PI * 2;
    return [b.id, { x: B / 2 + Math.cos(hoek) * B / 4 + (i % 7) * 6, y: H / 2 + Math.sin(hoek) * H / 4 + (i % 5) * 6, vx: 0, vy: 0 }];
  }));
  const knopen = [...pos.values()];
  for (let stap = 0; stap < 260; stap++) {
    const afkoel = 1 - stap / 260;
    for (let i = 0; i < knopen.length; i++) for (let j = i + 1; j < knopen.length; j++) {
      const a = knopen[i], c = knopen[j]; let dx = a.x - c.x, dy = a.y - c.y; const d2 = Math.max(80, dx * dx + dy * dy);
      const f = 2200 / d2; dx *= f / Math.sqrt(d2); dy *= f / Math.sqrt(d2);
      a.vx += dx; a.vy += dy; c.vx -= dx; c.vy -= dy;
    }
    for (const [x, y] of randen) {
      const a = pos.get(x), c = pos.get(y); const dx = c.x - a.x, dy = c.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 90) * 0.02; a.vx += dx / d * f; a.vy += dy / d * f; c.vx -= dx / d * f; c.vy -= dy / d * f;
    }
    for (const n of knopen) {
      n.vx += (B / 2 - n.x) * 0.004; n.vy += (H / 2 - n.y) * 0.004;
      n.x = Math.min(B - 60, Math.max(60, n.x + n.vx * afkoel)); n.y = Math.min(H - 20, Math.max(20, n.y + n.vy * afkoel));
      n.vx *= 0.5; n.vy *= 0.5;
    }
  }
  return `<figure class="mindmap"><svg viewBox="0 0 ${B} ${H}" role="img" aria-label="Mindmap van ${k.length} begrippen; elke knop is een link naar het begrip">
    ${randen.map(([x, y]) => { const a = pos.get(x), c = pos.get(y); return `<line x1="${a.x.toFixed(0)}" y1="${a.y.toFixed(0)}" x2="${c.x.toFixed(0)}" y2="${c.y.toFixed(0)}" class="mm-rand"/>`; }).join("")}
    ${k.map(b => { const p = pos.get(b.id), o = onderwerpen.indexOf(b.onderwerp) % 6;
      return `<a href="${link("begrippen", { id: b.id })}" class="mm-knoop mm-k${o}"><circle cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="6"/><text x="${p.x.toFixed(0)}" y="${(p.y - 10).toFixed(0)}" text-anchor="middle">${esc(kort(b.begrip, 28))}</text></a>`; }).join("")}
  </svg><figcaption class="src">${onderwerpen.slice(0, 6).map((o, i) => `<span class="mm-leg mm-k${i}">●</span> ${esc(o)}`).join(" · ")}${onderwerpen.length > 6 ? " · …" : ""}</figcaption></figure>`;
}
