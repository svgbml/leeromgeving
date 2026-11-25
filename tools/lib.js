// Gedeeld door build.js, validate-data.js en kwaliteit.js.
import { readFileSync, existsSync } from "node:fs";

export const lees = pad => JSON.parse(readFileSync(pad, "utf8"));
export const modules = () => lees("data/modules.json").modules;

// Handmatige correcties (#31): data/jaar-x/periode-y/<id>.overrides.json naast het moduledata-bestand.
// Zo blijven je verbeteringen staan als de kaarten opnieuw uit de slides worden gegenereerd.
// { "kaarten": { "<id>": { "uitleg": "…" } }, "verwijderd": ["<id>"], "nieuw": [ { …kaart } ],
//   "lessen": { "<nr>": { "vleugel": "lab" } } }
// "lessen" is waar de vleugelindeling staat (B1): die hoort niet in de gegenereerde data, want
// opnieuw genereren uit de slides zou hem wissen.
export const overridesPad = bestand => bestand.replace(/\.json$/, ".overrides.json");
export function metOverrides(bestand) {
  const data = lees(bestand), pad = overridesPad(bestand);
  if (!existsSync(pad)) return { data, overrides: null };
  const o = lees(pad);
  const weg = new Set(o.verwijderd || []);
  data.begrippen = data.begrippen.filter(b => !weg.has(b.id)).map(b => o.kaarten?.[b.id] ? { ...b, ...o.kaarten[b.id] } : b);
  if (Array.isArray(o.nieuw)) data.begrippen.push(...o.nieuw);
  if (o.lessen) data.lessen = (data.lessen || []).map(l => ({ ...l, ...o.lessen[l.nr] }));
  for (const k of ["casussen", "figuren", "slides"]) if (o[k]) data[k] = Array.isArray(o[k]) ? [...(data[k] || []), ...o[k]] : { ...(data[k] || {}), ...o[k] };
  return { data, overrides: o };
}
