// Vegen op de telefoon (#49): naar links = Opnieuw, naar rechts = Goed, omhoog = Makkelijk.
// De kaart beweegt mee met je vinger; een gekleurde rand laat zien welke knop je kiest.
import { rustig } from "./motion.js";

export function veegbaar(el, opKeuze, signal) {
  let start = null, dx = 0, dy = 0;
  const keuze = () => Math.abs(dx) > Math.abs(dy) ? (dx < -80 ? 0 : dx > 80 ? 2 : null) : (dy < -90 ? 3 : null);
  const zet = () => {
    el.style.transform = `translate(${dx}px, ${Math.min(0, dy)}px) rotate(${dx / 20}deg)`;
    const k = keuze();
    el.dataset.veeg = k === null ? "" : ["opnieuw", "", "goed", "makkelijk"][k];
  };
  el.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" || e.target.closest("a,button,textarea,input")) return;
    start = { x: e.clientX, y: e.clientY }; dx = dy = 0;
    el.setPointerCapture(e.pointerId); el.style.transition = "none";
  }, { signal });
  el.addEventListener("pointermove", e => {
    if (!start) return;
    dx = e.clientX - start.x; dy = e.clientY - start.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) zet();
  }, { signal });
  const einde = () => {
    if (!start) return;
    const k = keuze(); start = null;
    el.style.transition = rustig() ? "none" : "transform .25s ease";
    if (k === null) { el.style.transform = ""; el.dataset.veeg = ""; return; }
    el.style.transform = rustig() ? "" : `translate(${k === 0 ? -innerWidth : k === 2 ? innerWidth : 0}px, ${k === 3 ? -innerHeight : 0}px) rotate(${dx / 10}deg)`;
    setTimeout(() => opKeuze(k), rustig() ? 0 : 180);
  };
  el.addEventListener("pointerup", einde, { signal });
  el.addEventListener("pointercancel", () => { start = null; el.style.transform = ""; el.dataset.veeg = ""; }, { signal });
}
