// Animaties. Aan of uit staat op <html data-beweging>: index.html zet dat vóór het tekenen op basis van
// de eigen keuze (onder in de pagina) of, bij "Zoals het systeem", "beweging verminderen" van het OS.
// Staan animaties uit, dan gebeurt alles hetzelfde, alleen zonder beweging.

const SLEUTEL = "leeromgeving:beweging";
const mq = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
export const rustig = () => typeof document === "undefined" || document.documentElement.dataset.beweging !== "aan";

// Koppelt de keuze onder in de pagina (Zoals het systeem / Aan / Uit).
export function setupBeweging(select, melden = () => {}) {
  if (!select) return;
  let keuze = ""; try { keuze = localStorage.getItem(SLEUTEL) || ""; } catch {}
  select.value = keuze === "aan" || keuze === "uit" ? keuze : "";
  const pas = () => {
    const k = select.value;
    document.documentElement.dataset.beweging = k || (mq && mq.matches ? "uit" : "aan");
  };
  select.addEventListener("change", () => {
    try { select.value ? localStorage.setItem(SLEUTEL, select.value) : localStorage.removeItem(SLEUTEL); } catch {}
    pas(); melden(document.documentElement.dataset.beweging === "aan" ? "Animaties aan" : "Animaties uit");
  });
  mq?.addEventListener?.("change", () => { if (!select.value) pas(); });
}

// Paginawissel met de View Transitions API (Chrome, Edge, Safari 18+); anders direct.
export function overgang(teken) {
  if (rustig() || typeof document.startViewTransition !== "function") { teken(); return; }
  document.startViewTransition(teken);
}

// Laat een getal oplopen, bijvoorbeeld het cijfer op de uitslag.
export function telOp(el, van, naar, ms = 800, fmt = n => String(Math.round(n))) {
  if (!el) return;
  if (rustig() || van === naar) { el.textContent = fmt(naar); return; }
  const start = performance.now();
  const stap = nu => {
    const t = Math.min(1, (nu - start) / ms), e = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(van + (naar - van) * e);
    if (t < 1 && el.isConnected) requestAnimationFrame(stap);
  };
  el.textContent = fmt(van);
  requestAnimationFrame(stap);
}

// Voortgangsbalken laten doorlopen vanaf hun vorige stand in plaats van te verspringen.
// Gebruik: <div class="meter" data-meter="sleutel"><span style="width:40%"></span></div>
const vorige = new Map();
export function meters(root) {
  for (const m of root.querySelectorAll(".meter[data-meter]")) {
    const span = m.querySelector("span"); if (!span) continue;
    const doel = span.style.width, van = vorige.get(m.dataset.meter) ?? "0%";
    vorige.set(m.dataset.meter, doel);
    if (rustig() || van === doel) continue;
    span.style.transition = "none"; span.style.width = van;
    void span.offsetWidth; // reflow, zodat de overgang start vanaf "van"
    span.style.transition = ""; span.style.width = doel;
  }
}

// Kleine confettiregen, bijvoorbeeld bij een 8 of hoger of een afgeronde sessie.
export function confetti(bij) {
  if (rustig() || typeof document.body.animate !== "function") return;
  const r = bij?.getBoundingClientRect?.() || { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const doos = Object.assign(document.createElement("div"), { className: "confetti" });
  doos.setAttribute("aria-hidden", "true");
  const css = getComputedStyle(document.documentElement);
  const kleuren = ["--accent", "--good", "--extra", "--focus"].map(v => css.getPropertyValue(v).trim() || "#0b6e74");
  for (let i = 0; i < 46; i++) {
    const s = document.createElement("span");
    s.style.background = kleuren[i % kleuren.length];
    s.style.left = `${x0}px`; s.style.top = `${y0}px`;
    if (i % 3 === 0) s.style.borderRadius = "50%";
    doos.append(s);
    const hoek = Math.random() * Math.PI * 2, kracht = 90 + Math.random() * 170;
    const dx = Math.cos(hoek) * kracht, dy = Math.sin(hoek) * kracht - 120;
    s.animate([
      { transform: "translate(-50%,-50%) rotate(0) scale(1)", opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540}deg) scale(1)`, opacity: 1, offset: .45 },
      { transform: `translate(calc(-50% + ${dx * 1.2}px), calc(-50% + ${dy + 260}px)) rotate(${Math.random() * 900}deg) scale(.6)`, opacity: 0 }
    ], { duration: 1300 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" });
  }
  document.body.append(doos);
  setTimeout(() => doos.remove(), 2100);
}
