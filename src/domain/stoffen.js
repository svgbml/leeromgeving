// Stoffen die je in een labsessie gebruikt. De veldnamen volgen de module Labveiligheid:
// rubriek 2 van de SDS geeft het pictogram, het signaalwoord, de H-zinnen en de
// voorzorgsmaatregelen (P-zinnen); daarnaast de PBM en het afvalvat.
// De gegevens zelf staan in data/stoffen.json, één keer, zodat elke module dezelfde stof deelt.

export const AFVALVATEN = ["zuur", "basisch", "halogeenarm", "halogeenrijk"];
export const SIGNAALWOORDEN = ["Gevaar", "Waarschuwing"];

// De negen GHS-pictogrammen. "kort" is wat op de stoffenpagina onder het ruitje staat.
export const GHS = {
  GHS01: { kort: "Ontplofbaar", naam: "Ontplofbare stof" },
  GHS02: { kort: "Ontvlambaar", naam: "Ontvlambare stof" },
  GHS03: { kort: "Oxiderend", naam: "Oxiderende stof" },
  GHS04: { kort: "Gas onder druk", naam: "Gas onder druk" },
  GHS05: { kort: "Bijtend", naam: "Bijtende stof" },
  GHS06: { kort: "Giftig", naam: "Acuut giftige stof" },
  GHS07: { kort: "Schadelijk", naam: "Schadelijk of irriterend" },
  GHS08: { kort: "Gezondheidsgevaar", naam: "Gezondheidsgevaar op lange termijn (CMR)" },
  GHS09: { kort: "Milieugevaarlijk", naam: "Gevaarlijk voor het milieu" }
};

// Stoffen van een sessie, in de volgorde waarin de sessie ze noemt. Een id die niet in de
// bibliotheek staat verdwijnt niet, maar komt als "onbekend" terug: anders mis je stil een stof.
export function stoffenVoor(ids = [], bibliotheek = []) {
  const op = new Map(bibliotheek.map(s => [s.id, s]));
  return ids.map(id => op.get(id) || { id, naam: id, onbekend: true });
}

export function pbmVan(stoffen = []) {
  const uit = [];
  for (const s of stoffen) for (const p of s.pbm || []) if (!uit.includes(p)) uit.push(p);
  return uit;
}

// Per afvalvat de stoffen die erin gaan; vaten zonder stoffen komen niet in de lijst.
export function afvalGroepen(stoffen = []) {
  const uit = new Map();
  for (const s of stoffen) {
    if (!s.afvalvat) continue;
    if (!uit.has(s.afvalvat)) uit.set(s.afvalvat, []);
    uit.get(s.afvalvat).push(s);
  }
  return uit;
}

// Hoeveel stoffen nog niet tegen de SDS zijn nagelopen. Zolang dat er zijn, zegt de pagina dat.
export const ongecontroleerd = (stoffen = []) => stoffen.filter(s => !s.gecontroleerd).length;
