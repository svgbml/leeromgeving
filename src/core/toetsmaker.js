// Toets bouwen: in een Web Worker als dat kan (#70), anders gewoon hier.
import { createQuizGenerator } from "../domain/quiz.js";
import { seeded } from "../domain/text.js";

let worker = null, nr = 0;
const wacht = new Map(), verstuurd = new Set();

function maakWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL("../worker/toets-worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => { wacht.get(data.nr)?.(data); wacht.delete(data.nr); };
    worker.onerror = () => { worker = false; for (const f of wacht.values()) f({ fout: "worker" }); wacht.clear(); };
  } catch { worker = false; }
  return worker;
}

function hier({ data, ids, n, mix, seed, gewichten }) {
  const gen = createQuizGenerator({ data, weightOf: id => gewichten?.[id] ?? 1, random: seed ? seeded(seed) : Math.random });
  const pool = ids ? ids.map(gen.byId).filter(Boolean) : data.begrippen;
  return gen.buildItems(pool, n, mix);
}

/** @returns {Promise<{items: object[], aanpassing: string[]}>} */
export async function maakToets(opdracht) {
  const w = maakWorker();
  if (!w) return hier(opdracht);
  if (!verstuurd.has(opdracht.moduleId)) { w.postMessage({ soort: "data", id: opdracht.moduleId, data: opdracht.data }); verstuurd.add(opdracht.moduleId); }
  const mijnNr = ++nr;
  const antwoord = await new Promise(res => {
    wacht.set(mijnNr, res);
    const { data, ...rest } = opdracht;
    w.postMessage({ ...rest, nr: mijnNr });
    setTimeout(() => { if (wacht.has(mijnNr)) { wacht.delete(mijnNr); res({ fout: "tijd" }); } }, 8000);
  });
  return antwoord.fout ? hier(opdracht) : antwoord;
}
