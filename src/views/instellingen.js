// Instellingen: leren, toetsen, weergave, synchroniseren en app.
import { esc } from "../domain/text.js";
import { app, instellingen, zetInstelling, fetchData } from "../core/store.js";
import { $, acties, toast, say } from "../core/dom.js";
import { mapMogelijk, kiesMap, ontkoppelMap, syncMap, zetGist, syncGist, syncStatus } from "../core/sync.js";
import { installeerbaar, installeer } from "../core/pwa.js";
import { SNELTOETSEN } from "../ui/sneltoetsen.js";

const keuze = (k, opties) => `<select data-wijzig="zet" data-k="${k}">${opties.map(([v, l]) => `<option value="${v}" ${String(instellingen()[k]) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
const vink = (k, tekst) => `<label class="check"><input type="checkbox" data-wijzig="zet" data-k="${k}" ${instellingen()[k] ? "checked" : ""}> <span>${tekst}</span></label>`;
const tijd = t => t ? new Date(t).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "nog niet";

export default {
  mount({ main, signal }) {
    const teken = () => {
      const i = instellingen(), s = syncStatus();
      main.innerHTML = `
        <h1 style="view-transition-name:titel">Instellingen</h1>
        <p class="sub">Alles wordt in deze browser bewaard.</p>

        <section class="card instel"><h2 class="kop0">Leren</h2>
          <label class="field">Dagdoel (herhalingen per dag)${keuze("doel", [[10, "10"], [20, "20"], [30, "30"], [50, "50"], [80, "80"], [120, "120"]])}</label>
          <label class="field">Hoe goed wil je het onthouden?${keuze("retentie", [[0.85, "85% (minder herhalingen)"], [0.9, "90% (aanbevolen)"], [0.95, "95% (meer herhalingen)"]])}</label>
          <label class="field">Kaartrichting${keuze("richting", [["voor", "Begrip → uitleg"], ["achter", "Uitleg → begrip"], ["beide", "Beide richtingen"]])}</label>
          <label class="field">Volgorde van nieuwe kaarten${keuze("volgorde", [["slides", "Zoals in de lessen en slides"], ["willekeurig", "Willekeurig"]])}</label>
          ${vink("cloze", "Invulkaarten: vetgedrukte woorden in de uitleg worden een gat om in te vullen")}
          ${vink("typen", "Antwoord typen bij omgekeerde kaarten en invulkaarten (typfouten mogen)")}
          ${vink("autolinks", "Begrippen in een uitleg linken naar hun eigen kaart")}
          ${vink("videos", "Knop voor video-uitleg tonen")}
          <p class="src">Herhalen gebeurt met FSRS, het schema dat ook Anki gebruikt. Bestaande voortgang is overgenomen.</p>
        </section>

        <section class="card instel"><h2 class="kop0">Oefentoets</h2>
          <label class="field">Normering${keuze("norm", [["lineair", "Lineair: 1 + 9 × score"], ["cesuur", "Met cesuur (5,5 bij de cesuur)"]])}</label>
          <label class="field">Cesuur${keuze("cesuur", [[50, "50%"], [55, "55%"], [60, "60%"], [65, "65%"], [70, "70%"]])}</label>
          ${vink("gokcorrectie", "Gokcorrectie bij meerkeuze (verwachte gokpunten tellen niet mee)")}
          ${vink("examen", "Examensimulatie standaard aan")}
        </section>

        <section class="card instel"><h2 class="kop0">Weergave</h2>
          <label class="field">Lettergrootte${keuze("lettergrootte", [[90, "Klein"], [100, "Normaal"], [115, "Groot"], [130, "Extra groot"]])}</label>
          <label class="field">Lettertype${keuze("lettertype", [["plex", "IBM Plex Sans (standaard)"], ["atkinson", "Atkinson Hyperlegible (extra duidelijke letters)"], ["lexend", "Lexend (rustig leesbaar, bij dyslexie)"]])}</label>
          ${vink("contrast", "Hoog contrast")}
          <p class="src">Licht of donker kies je met de knop rechtsboven; animaties onderaan de pagina.</p>
        </section>

        <section class="card instel"><h2 class="kop0">Synchroniseren tussen apparaten</h2>
          <h3>Via een map</h3>
          ${mapMogelijk() ? `<p class="src mt0">Kies een map die al gesynchroniseerd wordt (OneDrive, Google Drive, Dropbox). De voortgang komt daar in <code>leeromgeving-voortgang.json</code> en wordt vanzelf bijgewerkt. Werkt in Chrome en Edge op de computer.</p>
            <p class="m0">${s.map ? `Gekoppeld aan map <strong>${esc(s.map)}</strong> · laatst ${tijd(s.mapTijd)}` : "Geen map gekoppeld."}</p>
            <div class="row">${s.map ? `<button type="button" class="btn" data-actie="syncMap">Nu synchroniseren</button><button type="button" class="btn" data-actie="ontkoppel">Ontkoppelen</button>` : `<button type="button" class="btn btn-primary" data-actie="kiesMap">Kies een map</button>`}</div>`
          : `<p class="src mt0">Deze browser kan geen map koppelen (dat kan in Chrome en Edge op de computer). Gebruik hieronder een GitHub Gist.</p>`}
          <h3>Via GitHub Gist</h3>
          <p class="src mt0">Maak op GitHub een <a href="https://github.com/settings/tokens/new?scopes=gist&description=Leeromgeving%20BML" target="_blank" rel="noopener">token met alleen de rechten “gist”</a> en plak die hier. De voortgang komt in een privé-gist. Het token blijft in deze browser; vul het op elk apparaat in.</p>
          <form class="row" data-form="gist">
            <label class="field grow">Token<input type="password" id="gtoken" autocomplete="off" placeholder="${s.gistToken ? "opgeslagen" : "ghp_… of github_pat_…"}"></label>
            <label class="field grow">Gist-id (leeg = nieuwe gist)<input id="gid" autocomplete="off" value="${esc(s.gistId || "")}"></label>
          </form>
          <p class="m0">${s.gistToken ? `Gekoppeld${s.gistId ? ` aan gist <code>${esc(s.gistId)}</code>` : ""} · laatst ${tijd(s.gistTijd)}` : "Geen gist gekoppeld."}</p>
          <div class="row"><button type="button" class="btn btn-primary" data-actie="gist">Opslaan en synchroniseren</button>${s.gistToken ? `<button type="button" class="btn" data-actie="gistWeg">Token verwijderen</button>` : ""}</div>
          <p class="src" id="syncmsg" role="status"></p>
        </section>

        <section class="card instel"><h2 class="kop0">App en offline</h2>
          ${installeerbaar() ? `<p class="m0">Zet de leeromgeving als app op je beginscherm of bureaublad.</p><div class="row"><button type="button" class="btn btn-primary" data-actie="installeer">Installeren</button></div>` : `<p class="src mt0">Installeren als app: in Chrome of Edge via het installatie-icoon in de adresbalk; op iPhone via Delen › Zet op beginscherm.</p>`}
          <p class="m0 mt">Modules worden offline bewaard zodra je ze opent.</p>
          <div class="row"><button type="button" class="btn" data-actie="offline">Alle modules nu offline beschikbaar maken</button></div>
          <p class="src" id="offmsg" role="status"></p>
        </section>

        <section class="card instel"><h2 class="kop0">Sneltoetsen</h2>
          <table class="sneltoets-tabel"><tbody>${SNELTOETSEN.map(([t, w]) => `<tr><th scope="row"><kbd>${t}</kbd></th><td>${w}</td></tr>`).join("")}</tbody></table>
        </section>`;
    };
    teken();
    const msg = (id, t) => { const el = $(id, main); if (el) el.textContent = t; say(t); };
    acties(main, {
      zet: el => {
        const k = el.dataset.k, v = el.type === "checkbox" ? el.checked : (isNaN(+el.value) ? el.value : +el.value);
        zetInstelling(k, v); app.flash = null; say("Opgeslagen");
      },
      kiesMap: async () => { try { const n = await kiesMap(); toast(`Gekoppeld aan ${n}`); teken(); } catch (e) { if (e.name !== "AbortError") msg("#syncmsg", `Koppelen mislukt: ${e.message}`); } },
      syncMap: async () => { const r = await syncMap({ vraag: true }).catch(e => ({ ok: false, reden: e.message })); msg("#syncmsg", r.ok ? `Gesynchroniseerd${r.gewijzigd.length ? `; bijgewerkt: ${r.gewijzigd.length} module(s)` : ""}.` : `Mislukt: ${r.reden}`); },
      ontkoppel: async () => { await ontkoppelMap(); teken(); },
      gist: async () => {
        const t = $("#gtoken", main).value.trim(), id = $("#gid", main).value.trim();
        if (t || id !== (syncStatus().gistId || "")) zetGist({ token: t || syncStatus().gistToken, id });
        msg("#syncmsg", "Bezig…");
        const r = await syncGist().catch(e => ({ ok: false, reden: e.message }));
        teken(); msg("#syncmsg", r.ok ? `Gesynchroniseerd${r.gewijzigd.length ? `; bijgewerkt: ${r.gewijzigd.length} module(s)` : ""}.` : `Mislukt: ${r.reden}`);
      },
      gistWeg: () => { zetGist({}); teken(); },
      installeer: async () => { await installeer(); teken(); },
      offline: async el => {
        el.disabled = true; let n = 0;
        for (const m of app.modules) { await fetchData(m).catch(() => {}); n++; msg("#offmsg", `${n} van ${app.modules.length} modules opgehaald…`); }
        msg("#offmsg", "Alle modules zijn offline beschikbaar."); el.disabled = false;
      }
    }, signal);
  }
};
