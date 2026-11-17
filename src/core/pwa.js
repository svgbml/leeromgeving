// App-functies: installeren (#58), melding bij een nieuwe versie (#60), service worker.
import { toast } from "./dom.js";

let installPrompt = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; document.documentElement.dataset.installeerbaar = "1"; });
addEventListener("appinstalled", () => { installPrompt = null; delete document.documentElement.dataset.installeerbaar; toast("De leeromgeving staat nu als app op je apparaat."); });
export const installeerbaar = () => !!installPrompt;
export async function installeer() {
  if (!installPrompt) return false;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null; delete document.documentElement.dataset.installeerbaar;
  return outcome === "accepted";
}

// Service worker registreren; staat er een nieuwe versie klaar, dan een melding met herlaadknop.
export function registreerSW() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").then(reg => {
    const meld = w => toast("Er is een nieuwe versie van de leeromgeving.", { ms: 0, knop: { tekst: "Nu bijwerken", actie: () => w.postMessage("activeer") } });
    if (reg.waiting && navigator.serviceWorker.controller) meld(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) meld(w); });
    });
    // Elk uur even kijken of er een update is (de app blijft vaak lang open staan).
    setInterval(() => reg.update().catch(() => {}), 36e5);
  }).catch(() => {});
  let herladen = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!herladen) { herladen = true; location.reload(); } });
}
