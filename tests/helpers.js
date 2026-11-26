import { readFileSync } from "node:fs";

// Voorspelbare "random" zodat tests steeds hetzelfde resultaat geven.
export function seeded(seed = 1) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const laad = pad => JSON.parse(readFileSync(new URL(`../${pad}`, import.meta.url), "utf8"));
export const modules = () => laad("data/modules.json").modules;

// Het moduledossier opzoeken via modules.json in plaats van een pad in te tikken: de map waarin
// een module staat volgt de periode, en die kan veranderen (De cel verhuisde van periode 1 naar 2).
export function laadModule(id) {
  const m = modules().find(x => x.id === id);
  if (!m) throw new Error(`module ${id} staat niet in data/modules.json`);
  return laad(m.bestand);
}
