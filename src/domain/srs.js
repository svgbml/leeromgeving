// Herhaalschema: FSRS-5 (Free Spaced Repetition Scheduler, standaardparameters van Anki).
// Pure functies: geen opslag, geen DOM.
// Knoppen: 0 = Opnieuw, 1 = Moeilijk, 2 = Goed, 3 = Makkelijk (FSRS-cijfer = knop + 1).
//
// Kaarttoestand: { s: stabiliteit (dagen), d: moeilijkheid 1–10, reps, lapses, due (ms), last (ms), iv (dagen) }
// Oudere voortgang (SM-2: { iv, ef, reps, lapses, due }) wordt bij de eerste beoordeling omgezet.

export const DAY = 864e5;
export const KNOWN_DAYS = 7;   // "beheerst" = komt pas over 7 dagen of later terug
export const LEECH_LAPSES = 4; // "moeilijke kaart" = vier keer of vaker vergeten
export const MAX_IV = 365;

const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
const DECAY = -0.5, FACTOR = 19 / 81;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Datum in de tijdzone van de gebruiker (YYYY-MM-DD), zodat de daglimiet om middernacht wisselt.
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const isLeech = c => !!c && c.lapses >= LEECH_LAPSES;
export const isKnown = c => !!c && (c.iv || 0) >= KNOWN_DAYS;
export const isDue = (c, now) => !!c && c.due <= now;

// Kans dat je de kaart nu nog weet.
export const retrievability = (t, s) => Math.pow(1 + FACTOR * t / s, DECAY);
// Interval (dagen) waarbij de kans op onthouden precies `r` is.
export const intervalVoor = (s, r = 0.9) => s / FACTOR * (Math.pow(r, 1 / DECAY) - 1);

const d0 = g => clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
const s0 = g => W[g - 1];

// Oude SM-2-kaart omzetten naar FSRS-velden.
export function migreer(c) {
  if (!c || typeof c.s === "number") return c;
  const iv = c.iv || 0, ef = c.ef ?? 2.5;
  return { s: Math.max(0.5, iv), d: clamp(10 - (ef - 1.3) * 4.67, 1, 10), reps: c.reps || 0, lapses: c.lapses || 0,
    due: c.due, last: c.due - iv * DAY, iv };
}

function volgende(card, g, now, r) {
  const G = g + 1;
  const c = migreer(card);
  if (!c || !c.reps && typeof c.s !== "number") {
    const s = s0(G);
    return { s, d: d0(G), reps: G > 1 ? 1 : 0, lapses: 0, last: now, due: G === 1 ? now + 60e3 : now + dagen(s, r) * DAY, iv: G === 1 ? 0 : dagen(s, r) };
  }
  const t = Math.max(0, (now - (c.last ?? now)) / DAY);
  const R = retrievability(t, c.s);
  // Moeilijkheid: naar boven bij Opnieuw/Moeilijk, naar beneden bij Makkelijk, met demping en terugtrekking naar het gemiddelde.
  const dDelta = -W[6] * (G - 3);
  let d = c.d + dDelta * (10 - c.d) / 9;
  d = clamp(W[7] * d0(4) + (1 - W[7]) * d, 1, 10);
  let s;
  if (t < 1) s = c.s * Math.exp(W[17] * (G - 3 + W[18]));               // herhaling op dezelfde dag
  else if (G === 1) s = Math.min(c.s, W[11] * Math.pow(c.d, -W[12]) * (Math.pow(c.s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R)));
  else s = c.s * (Math.exp(W[8]) * (11 - c.d) * Math.pow(c.s, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1)
      * (G === 2 ? W[15] : 1) * (G === 4 ? W[16] : 1) + 1);
  s = Math.max(0.1, s);
  if (G === 1) return { s, d, reps: 0, lapses: (c.lapses || 0) + 1, last: now, due: now + 60e3, iv: 0 };
  const iv = dagen(s, r);
  return { s, d, reps: (c.reps || 0) + 1, lapses: c.lapses || 0, last: now, due: now + iv * DAY, iv };
}
const dagen = (s, r) => clamp(Math.round(intervalVoor(s, r)), 1, MAX_IV);

// Interval in dagen na knop g (0 = binnen een minuut terug).
export const preview = (card, g, now = Date.now(), r = 0.9) => volgende(card, g, now, r).iv;

// Geeft een nieuwe kaarttoestand terug; de oude blijft ongewijzigd.
export const grade = (card, g, now = Date.now(), r = 0.9) => volgende(card, g, now, r);

// Kaart vandaag laten terugkomen (foutenboek → flashcards).
export const nuHerhalen = (card, now = Date.now()) =>
  card ? { ...migreer(card), due: now } : { s: 0.4, d: 6, reps: 0, lapses: 0, last: now, due: now, iv: 0 };

export const ivText = d => d < 1 ? "1 min" : d === 1 ? "1 dag" : d < 31 ? `${d} dagen` : d < 365 ? `${Math.round(d / 30)} mnd` : "1 jaar";
