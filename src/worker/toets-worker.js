// Bouwt een oefentoets naast de pagina (#70), zodat een trage telefoon niet hapert.
// De moduledata wordt één keer per module gestuurd en hier bewaard.
import { createQuizGenerator } from "../domain/quiz.js";
import { seeded } from "../domain/text.js";

const data = new Map();
self.onmessage = ({ data: m }) => {
  try {
    if (m.soort === "data") { data.set(m.id, m.data); return; }
    const d = data.get(m.moduleId);
    if (!d) { self.postMessage({ nr: m.nr, fout: "geen-data" }); return; }
    const gewicht = m.gewichten || {};
    const gen = createQuizGenerator({ data: d, weightOf: id => gewicht[id] ?? 1, random: m.seed ? seeded(m.seed) : Math.random });
    const pool = m.ids ? m.ids.map(gen.byId).filter(Boolean) : d.begrippen;
    self.postMessage({ nr: m.nr, ...gen.buildItems(pool, m.n, m.mix) });
  } catch (e) {
    self.postMessage({ nr: m.nr, fout: String(e && e.message || e) });
  }
};
