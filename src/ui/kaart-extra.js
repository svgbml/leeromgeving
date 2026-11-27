// Alles rond een kaart dat op meerdere schermen terugkomt: begriplinks met popover (#12),
// verwante kaarten (#11), ster (#6), notitie (#7), "meld een fout" (#29), vertaling (#37) en video's.
import { esc, rich, plain, kort } from "../domain/text.js";
import { index, termenIn, verwant, vertaling } from "../domain/kaarten.js";
import { app, prog, bewaar, instellingen } from "../core/store.js";
import { link } from "../core/router.js";
import { $, toast } from "../core/dom.js";
import { bewaarMelding, verstuur, verzendenMogelijk } from "../domain/meldingen.js";

// ---------- woordenlijst en video's (één keer laden) ----------
let lijst = null, videos = null;
export async function laadExtra() {
  const [w, v] = await Promise.all([
    lijst ? lijst : fetch("data/woordenlijst.json").then(r => r.ok ? r.json() : { termen: [] }).catch(() => ({ termen: [] })),
    videos ? videos : fetch("data/videos.json").then(r => r.ok ? r.json() : {}).catch(() => ({}))
  ]);
  lijst = w.termen ? w : lijst; videos = v;
  return { lijst: lijst?.termen || [], videos };
}
export const woordenlijst = () => lijst?.termen || [];
export function engels(b) {
  const v = vertaling(woordenlijst(), b);
  return v ? `<span class="tag tag-en" lang="en" title="Engels">EN · ${esc(v[1])}</span>` : "";
}

// ---------- video's ----------
export function videosVoor(modId, les) {
  const per = videos?.[modId] || {};
  return (les && per[les]) || [];
}
export const youtubeZoek = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
// Knop die de video-uitleg bij een les of onderwerp opent.
export function videoKnop(b, { klein = true } = {}) {
  if (!instellingen().videos) return "";
  const n = videosVoor(app.mod.id, b.les).length;
  return `<button type="button" class="btn ${klein ? "btn-klein" : ""} btn-video" data-actie="videos" data-id="${esc(b.id)}" aria-haspopup="dialog">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M10 8.5v7l6-3.5z"/><rect x="2.5" y="4.5" width="19" height="15" rx="4" fill="none" stroke="currentColor" stroke-width="2"/></svg>
    Video-uitleg${n ? ` (${n})` : ""}</button>`;
}
// Eén video als lijstitem; ook het videoscherm (#/videos) gebruikt dit.
export const videoItem = v => `
  <li class="video">
    <button type="button" class="video-speel" data-yt="${esc(v.id)}" aria-label="Speel ${esc(v.titel)} af">
      <img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt="" loading="lazy" width="160" height="90">
      <span class="video-duur">${esc(v.duur || "")}</span>
    </button>
    <div><p class="video-titel">${esc(v.titel)}</p><p class="src m0">${esc(v.kanaal || "")}${v.taal ? ` · ${v.taal === "nl" ? "Nederlands" : "Engels"}` : ""}</p></div>
  </li>`;

// Klik op een thumbnail: die wordt vervangen door de iframe, zodat YouTube pas dan laadt.
export function speelBijKlik(root, signal) {
  root.addEventListener("click", e => {
    const k = e.target.closest("[data-yt]"); if (!k || !root.contains(k)) return;
    const f = document.createElement("iframe");
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(k.dataset.yt)}?autoplay=1&rel=0`;
    f.title = k.getAttribute("aria-label").replace(/^Speel /, "").replace(/ af$/, "");
    f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen"; f.loading = "lazy";
    f.className = "video-frame";
    k.replaceWith(f);
  }, signal ? { signal } : undefined);
}

// Dialoog met de gekozen video's van de les plus een zoeklink voor het onderwerp.
export function toonVideos(b) {
  const lijstV = videosVoor(app.mod.id, b.les);
  const onderwerp = plain(b.onderwerp || "").replace(/^(deel|week)\s*\S+\s*/i, "");
  const term = app.data.kaarttype === "vraag" ? onderwerp : plain(b.begrip).replace(/\s*\([^)]*\)/g, "");
  const dlg = dialoog(`
    <h2 class="kop0">Video-uitleg</h2>
    <p class="sub">${b.les ? esc(b.les) : esc(b.onderwerp)}</p>
    ${lijstV.length ? `<ul class="video-lijst" role="list">${lijstV.map(videoItem).join("")}</ul>` : `<p>Voor deze les zijn nog geen video's uitgekozen.</p>`}
    <p class="video-zoek">Zelf zoeken op YouTube:
      <a href="${youtubeZoek(`${term} uitleg`)}" target="_blank" rel="noopener">${esc(term)} (Nederlands)</a> ·
      <a href="${youtubeZoek(`${term} explained`)}" target="_blank" rel="noopener">${esc(term)} (Engels)</a></p>
    <p class="src">Video's spelen af via youtube-nocookie.com en laden pas als je op afspelen klikt.</p>`);
  speelBijKlik(dlg);
}

// ---------- algemene dialoog ----------
export function dialoog(html, { klasse = "" } = {}) {
  const d = document.createElement("dialog");
  d.className = `dlg ${klasse}`;
  d.innerHTML = `<form method="dialog" class="dlg-sluit"><button class="btn btn-klein" aria-label="Sluiten">✕</button></form>${html}`;
  document.body.append(d);
  d.addEventListener("close", () => d.remove());
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
  d.showModal();
  return d;
}

// ---------- ster, notitie, meld fout ----------
export const heeftSter = id => !!prog().sterren[id];
export function sterKnop(id) {
  const aan = heeftSter(id);
  return `<button type="button" class="ster${aan ? " aan" : ""}" data-actie="ster" data-id="${esc(id)}" aria-pressed="${aan}" title="Markeren (s)">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>
    <span class="visually-hidden">${aan ? "Gemarkeerd" : "Markeren"}</span></button>`;
}
export function wisselSter(id, knop) {
  const p = prog();
  if (p.sterren[id]) delete p.sterren[id]; else p.sterren[id] = 1;
  bewaar();
  if (knop) { const aan = !!p.sterren[id]; knop.classList.toggle("aan", aan); knop.setAttribute("aria-pressed", aan); knop.querySelector(".visually-hidden").textContent = aan ? "Gemarkeerd" : "Markeren"; }
  return !!p.sterren[id];
}
export function notitieHtml(id) {
  const n = prog().notities[id];
  return n ? `<p class="notitie"><span class="tag tag-notitie">notitie</span> ${esc(n)}</p>` : "";
}
export function notitieBewerker(id) {
  return `<label class="notitie-veld"><span class="modelkop">Jouw notitie of ezelsbruggetje</span>
    <textarea rows="2" data-notitie="${esc(id)}" placeholder="Bijvoorbeeld een ezelsbruggetje">${esc(prog().notities[id] || "")}</textarea>
    <span class="src">Wordt vanzelf bewaard en gaat mee in de export.</span></label>`;
}
export function bewaarNotitie(id, tekst) {
  const p = prog();
  if (tekst.trim()) p.notities[id] = tekst.slice(0, 2000); else delete p.notities[id];
  bewaar();
}
// Melden gebeurt in de site zelf (src/domain/meldingen.js): deze knop opent een venstertje, je
// schrijft op wat er niet klopt en de melding komt bij Instellingen te staan. Eerder opende dit
// een nieuw GitHub-issue, maar dan ben je de kaart kwijt voordat je door de inlogpagina heen bent.
const meldKnop = (titel, context, tekst, extra = {}) =>
  `<button type="button" class="meld" data-meld="1" data-titel="${esc(kort(titel, 110))}"
    data-context="${esc(context)}"${Object.entries(extra).map(([k, v]) => ` data-${k}="${esc(v)}"`).join("")}
    >${esc(tekst)}</button>`;

// Waar de kaart vandaan komt. Zonder die regels is een melding niet na te trekken: dan is niet te
// zien welke slide nagelezen moet worden.
const herkomst = b => `**Module:** ${app.mod?.titel || "–"}\n**Kaart:** ${b.id}\n**Les:** ${b.les || "–"}`
  + `\n**Bron:** ${b.bron_bestand || "–"}${b.bron_slides?.length ? ` (slide ${b.bron_slides.join(", ")})` : ""}`;

export function meldFoutLink(b) {
  const titel = `Fout in kaart ${b.id}: ${kort(plain(b.begrip), 60)}`;
  const context = `${herkomst(b)}\n\n**Begrip/vraag:** ${plain(b.begrip)}\n\n**Uitleg nu:**\n> ${plain(b.uitleg)}`;
  return meldKnop(titel, context, "Meld een fout", { soort: "kaart", kaart: b.id, module: app.mod?.titel || "" });
}

/** Melden tijdens het beantwoorden van een toetsvraag.
 *
 * Hier kan de kaart ontbreken: een rekenvraag wordt ter plekke uit een sjabloon gemaakt en hoort
 * bij geen enkele kaart. Daarom gaat de vraag zelf mee, met het antwoord dat de app juist vindt —
 * dat is precies wat nagerekend moet worden als iemand meldt dat het niet klopt.
 */
export function meldVraagLink(it, k) {
  if (!it) return "";
  const regels = [
    k ? herkomst(k) : `**Module:** ${app.mod?.titel || "–"}\n**Vraag:** uit een sjabloon, hoort bij geen kaart`,
    `**Soort:** ${it.kind || "?"}${it.variant ? ` (${it.variant})` : ""}`,
    `\n**Vraag:**\n> ${plain(it.prompt || "")}`,
  ];
  if (it.antwoordGetal !== undefined) {
    regels.push(`\n**Antwoord volgens de app:** ${it.antwoordGetal} ${it.eenheid || ""}`);
    if (it.uitwerking) regels.push(`**Uitwerking:**\n> ${plain(it.uitwerking)}`);
  } else if (Array.isArray(it.opts) && it.opts.length) {
    regels.push(`\n**Antwoordopties:**\n${it.opts.map(o => `- ${plain(o.text)}${o.id === it.goed ? "  <- juist volgens de app" : ""}`).join("\n")}`);
  }
  const titel = `Fout in vraag: ${kort(plain(it.prompt || ""), 60)}`;
  return meldKnop(titel, regels.join("\n"), "Meld deze vraag", { soort: "vraag", kaart: k?.id || "", module: app.mod?.titel || "" });
}

// Eén keer koppelen (app.js): de meldknoppen staan in de begrippenlijst, de flashcards en de
// toets, dus het venstertje hangt aan document in plaats van aan elk scherm apart.
export function koppelMelder() {
  document.addEventListener("click", e => {
    const k = e.target.closest?.("[data-meld]"); if (!k) return;
    e.preventDefault();
    const { titel, context = "", soort = "kaart", kaart = "", module = "" } = k.dataset;
    const d = dialoog(`<h2 class="kop0">${esc(titel)}</h2>
      ${context ? `<details class="meld-context"><summary>Wat er bij de melding wordt bewaard</summary>
        <pre class="meld-pre">${esc(context)}</pre></details>` : ""}
      <label class="notitie-veld"><span class="modelkop">Wat klopt er niet?</span>
        <textarea rows="4" id="meld-tekst" placeholder="Bijvoorbeeld: de uitleg noemt vijf stappen, de slide vier."></textarea></label>
      <p class="row"><button type="button" class="btn btn-primary" data-meld-bewaar="1">${
        verzendenMogelijk() ? "Melding versturen" : "Melding bewaren"}</button></p>
      <p class="src m0" data-meld-stand>${verzendenMogelijk()
        ? "De melding gaat naar degene die de kaarten onderhoudt, en blijft ook bij Instellingen › Meldingen staan."
        : "De melding blijft in deze browser en komt bij Instellingen › Meldingen te staan, waar je hem kunt lezen, kopiëren of downloaden."}</p>`,
      { klasse: "dlg-meld" });
    const veld = d.querySelector("#meld-tekst");
    veld?.focus();
    const knop = d.querySelector("[data-meld-bewaar]");
    knop?.addEventListener("click", async () => {
      // Zonder tekst is er niets te melden; dan blijft het venster staan met de cursor in het veld.
      const melding = bewaarMelding({ titel, tekst: veld?.value, context, soort, kaart, module });
      if (!melding) { veld?.focus(); return; }
      if (!verzendenMogelijk()) {
        d.close();
        toast("Melding bewaard; je vindt hem bij Instellingen");
        return;
      }
      // Het venster blijft even staan: het verschil tussen "aangekomen" en "staat nog hier"
      // is precies wat je wilt weten als je iets meldt vanaf een computer van iemand anders.
      knop.disabled = true;
      const stand = d.querySelector("[data-meld-stand]");
      if (stand) stand.textContent = "Bezig met versturen…";
      const weg = await verstuur(melding);
      d.close();
      toast(weg ? "Melding verstuurd, dank je"
        : "Versturen lukte niet; de melding staat bij Instellingen en gaat later alsnog weg");
    });
  });
}

// ---------- verwante kaarten (#11) ----------
export function verwantHtml(b) {
  const lijstV = verwant(index(app.data), b.id, 4);
  if (!lijstV.length) return "";
  return `<div class="verwant"><span class="modelkop">Zie ook</span>
    <ul role="list">${lijstV.map(x => `<li><a href="${link("begrippen", { id: x.id })}" class="term-link" data-term="${esc(x.id)}">${esc(kort(x.begrip, 70))}</a></li>`).join("")}</ul></div>`;
}

// ---------- begriplinks met popover (#12) ----------
// Loopt door de tekstknopen van `root` en maakt van gevonden begrippen een link.
export function linkTermen(root, eigenId) {
  if (!instellingen().autolinks || !app.data) return;
  const idx = index(app.data);
  if (!idx.termen.length) return;
  for (const el of root.querySelectorAll(".tekst, .tekst0")) {
    if (el.dataset.gelinkt) continue; el.dataset.gelinkt = "1";
    const knopen = [], w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest("a,mark,button,.gat") ? 2 : 1 });
    while (w.nextNode()) knopen.push(w.currentNode);
    const gezien = new Set();
    let n = 0;
    for (const k of knopen) {
      if (n >= 6) break;
      const hits = termenIn(idx, k.data, eigenId, 6 - n).filter(h => !gezien.has(h.id)).sort((a, c) => a.van - c.van);
      if (!hits.length) continue;
      const frag = document.createDocumentFragment(); let pos = 0;
      for (const h of hits) {
        if (h.van < pos) continue;
        frag.append(k.data.slice(pos, h.van));
        const a = Object.assign(document.createElement("a"), { href: link("begrippen", { id: h.id }), className: "term-link", textContent: h.term });
        a.dataset.term = h.id; frag.append(a);
        pos = h.van + h.term.length; gezien.add(h.id); n++;
      }
      frag.append(k.data.slice(pos)); k.replaceWith(frag);
    }
  }
}
let pop = null;
// Eén keer koppelen: klik op een begriplink toont de uitleg in een popover in plaats van weg te springen.
export function koppelTermPopover() {
  if (pop) return;
  pop = Object.assign(document.createElement("div"), { id: "term-pop", className: "term-pop" });
  pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Begrip");
  const kanPopover = typeof pop.showPopover === "function";
  if (kanPopover) pop.setAttribute("popover", "auto");
  document.body.append(pop);
  document.addEventListener("click", e => {
    const a = e.target.closest("a.term-link[data-term]");
    if (!a || !kanPopover || !app.data) return;
    const b = app.gen.byId(a.dataset.term); if (!b) return;
    e.preventDefault();
    pop.innerHTML = `<p class="term-pop-t">${rich(b.begrip)}</p><div class="term-pop-u">${rich(b.uitleg)}</div>
      <p class="m0"><a href="${link("begrippen", { id: b.id })}">Open in de begrippenlijst</a></p>`;
    pop.showPopover();
    const r = a.getBoundingClientRect(), pb = Math.min(360, innerWidth - 24);
    pop.style.width = `${pb}px`;
    pop.style.left = `${Math.max(12, Math.min(r.left, innerWidth - pb - 12))}px`;
    const onder = r.bottom + 8, hoogte = pop.offsetHeight;
    pop.style.top = `${onder + hoogte > innerHeight - 8 ? Math.max(8, r.top - hoogte - 8) : onder}px`;
  });
  addEventListener("scroll", () => { if (pop.matches?.(":popover-open")) pop.hidePopover(); }, { passive: true });
}

// Bron met Drive-link; zonder link de bestandsnaam met een aanduiding (#32).
export function bron(b) {
  const f = b.bron_bestand || "";
  if (!f) return "";
  const les = (app.data.lessen || []).find(l => (l.bronnen || []).includes(f));
  const naam = esc(les ? `Les ${les.nr} – ${les.titel}` : f.replace(" - student.pptx", "").replace(/\.(pptx|docx)$/, "").replace(/_/g, " "));
  const id = driveId(app.data.slides?.[f]);
  const deel = b.bron_slides?.length ? `, slide ${b.bron_slides.join(", ")}` : "";
  return (id ? `<button type="button" class="link-knop" data-slides="${esc(id)}" data-titel="${naam}" data-slide="${esc((b.bron_slides || [])[0] ?? "")}" aria-haspopup="dialog">${naam}<span class="visually-hidden"> (slides bekijken)</span></button>`
    : `${naam}<span class="src-geen" title="Er is nog geen link naar dit slidebestand"> (geen link)</span>`) + deel;
}
export const slideLink = f => bron({ bron_bestand: f });

// ---------- slides bekijken zonder Drive-pagina ----------
// De slides staan in Google Drive. Een gewone Drive-link opent de Drive-pagina, waar de eigenaar
// van het bestand zichtbaar is. Daarom openen ze hier in Drive's kale voorbeeldweergave (/preview)
// in een afgeschermd frame: zonder "allow-popups" kan de knop "openen in nieuw venster" niets openen,
// en de app stuurt geen verwijzer mee. Let op: de bestands-id staat wel in de data; wie die zelf in
// een Drive-adres plakt, ziet de eigenaar alsnog. Zie README › Slides.
const driveId = u => (String(u || "").match(/\/file\/d\/([\w-]{10,})/) || [])[1] || "";
export function koppelSlideViewer() {
  document.addEventListener("click", e => {
    const k = e.target.closest?.("[data-slides]"); if (!k) return;
    e.preventDefault();
    const slide = k.dataset.slide ? `<p class="src m0">Zoek naar slide ${esc(k.dataset.slide)}.</p>` : "";
    const d = dialoog(`<h2 class="kop0">${k.dataset.titel}</h2>${slide}
      <div class="slides-vak"><iframe class="slides-frame" title="Slides: ${k.dataset.titel}"
        src="https://drive.google.com/file/d/${encodeURIComponent(k.dataset.slides)}/preview"
        sandbox="allow-scripts allow-same-origin" referrerpolicy="no-referrer" allow="fullscreen" loading="lazy"></iframe></div>
      <p class="src">Laadt het niet? Dan staat het bestand misschien niet (meer) gedeeld.</p>`, { klasse: "dlg-slides" });
    d.querySelector("iframe")?.focus();
  });
}

// Ster, notitie en meld-fout in één regel onder een kaart.
export const kaartVoet = b => `<div class="kaart-voet">${b.bron_bestand ? `<p class="src">Bron: ${bron(b)}</p>` : ""}<span class="kaart-voet-r">${meldFoutLink(b)}</span></div>`;
