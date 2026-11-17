// Kleine DOM-hulpjes die alle schermen gebruiken.
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// Melding voor schermlezers (ARIA live-regio in index.html).
export function say(msg) {
  const live = document.getElementById("live");
  if (!live) return;
  live.textContent = "";
  setTimeout(() => (live.textContent = msg), 30);
}

// Korte zichtbare melding onderaan (verdwijnt vanzelf).
export function toast(msg, { ms = 3200, knop = null } = {}) {
  let doos = document.getElementById("toasts");
  if (!doos) { doos = Object.assign(document.createElement("div"), { id: "toasts", className: "toasts" }); document.body.append(doos); }
  const t = document.createElement("div");
  t.className = "toast"; t.setAttribute("role", "status");
  t.innerHTML = `<span>${msg}</span>`;
  if (knop) {
    const b = Object.assign(document.createElement("button"), { type: "button", className: "btn btn-klein", textContent: knop.tekst });
    b.addEventListener("click", () => { knop.actie(); t.remove(); });
    t.append(b);
  }
  doos.append(t);
  if (ms) setTimeout(() => { t.classList.add("weg"); setTimeout(() => t.remove(), 300); }, ms);
  return t;
}

// Eén klikluisteraar per scherm (#68): elementen met data-actie="naam" roepen acties[naam](el, event) aan.
// `signal` (AbortController van de router) ruimt de luisteraars op bij een paginawissel.
export function acties(root, map, signal) {
  const opties = { signal };
  root.addEventListener("click", e => {
    const el = e.target.closest("[data-actie]");
    if (!el || !root.contains(el) || el.disabled) return;
    const f = map[el.dataset.actie];
    if (f) { if (el.tagName === "A" && el.getAttribute("href") === "#") e.preventDefault(); f(el, e); }
  }, opties);
  root.addEventListener("change", e => {
    const el = e.target.closest("[data-wijzig]");
    if (el && root.contains(el)) map[el.dataset.wijzig]?.(el, e);
  }, opties);
  root.addEventListener("input", e => {
    const el = e.target.closest("[data-invoer]");
    if (el && root.contains(el)) map[el.dataset.invoer]?.(el, e);
  }, opties);
}

// Download van een tekstbestand (export).
export function download(naam, inhoud, type = "application/json") {
  const blob = inhoud instanceof Blob ? inhoud : new Blob([inhoud], { type });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: naam });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Gevonden woorden markeren in tekstknopen (#33), zonder de HTML-opmaak te breken.
export function markeer(root, zoek) {
  const q = zoek.trim();
  if (q.length < 2) return;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement.closest("mark,script,style,button,select,option,.src") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const knopen = []; while (walker.nextNode()) knopen.push(walker.currentNode);
  for (const n of knopen) {
    if (!re.test(n.data)) continue; re.lastIndex = 0;
    const frag = document.createDocumentFragment(); let laatst = 0;
    n.data.replace(re, (m, i) => { frag.append(n.data.slice(laatst, i), Object.assign(document.createElement("mark"), { textContent: m })); laatst = i + m.length; return m; });
    frag.append(n.data.slice(laatst));
    n.replaceWith(frag);
  }
}

export const datumKort = d => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
export const datumTijd = d => new Date(d).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
