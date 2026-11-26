// PPO > Bewijsstukken: welk werk je aan welke pijler hangt (OVERHAUL.md > B4, 4.2 en 4.3).
//
// Stap 4.2 vraagt "per eis welke opdracht of verslag telt". Die koppeling staat niet in de bron:
// de opleiding zegt wélke sóórten bewijs meetellen (verslagen, presentaties, feedback,
// reflecties), niet welk bewijsstuk bij welke pijler hoort. Dat is ook logisch — hetzelfde
// verslag kan bij Ik of bij Wij horen, afhankelijk van wat je eruit haalt. Dit scherm legt die
// keuze dus bij jou en bewaart hem lokaal, in plaats van een koppeling te verzinnen.
//
// Stap 4.3 is wat er daarna automatisch gebeurt: een opdracht die in de projectvleugel op
// "ingeleverd" of "beoordeeld" staat, telt hier als binnen. Je vinkt hier dus nooit "klaar" aan;
// dat volgt uit de status die je in Opdrachten zet. "bezig" is geen bewijs — dan heb je nog
// niets om te laten zien — en zulk werk staat apart als onderweg.
//
// De vorm van dit scherm volgt uit één getal: er is werk uit zeven modules, zo'n zestig stuks.
// Een vinkjeslijst per pijler zou dat viermaal herhalen, ruim tweehonderd vakjes op één pagina.
// Daarom staat het werk één keer, met per regel vier knoppen, en tonen de pijlers alleen wat je
// eraan hebt gehangen.
import { esc } from "../domain/text.js";
import {
  pijlersVan, bewijssoortenVan, alleOpdrachten, bewijsPerPijler, pijlerStand
} from "../domain/ppo.js";
import {
  app, laadPPO, laadAlleProjectData, ppoBewijs, zetPpoBewijs, opdrachtStatussen
} from "../core/store.js";
import { $, $$, acties, say } from "../core/dom.js";
import { link } from "../core/router.js";

const stand = s => `${s.gevuld} van de ${s.totaal} pijlers heeft bewijs dat binnen is`;

// De regel onder een pijlerkop. Staat apart omdat een klik hem ter plekke bijwerkt in plaats van
// het hele scherm te hertekenen; dan zou de focus uit de knop springen die je net indrukte.
const pijlerRegel = ({ binnen, onderweg }) => binnen.length
  ? `${binnen.length} ${binnen.length === 1 ? "bewijsstuk" : "bewijsstukken"} binnen${
      onderweg.length ? `, ${onderweg.length} nog onderweg` : ""}.`
  : onderweg.length
    ? `Nog niets binnen; ${onderweg.length} ${onderweg.length === 1 ? "stuk" : "stukken"} onderweg.`
    : "Nog niets aan deze pijler gehangen.";

// Wat je aan een pijler hing, met de status eruit. Binnen eerst: dat is wat je kunt laten zien.
const gehangenLijst = ({ binnen, onderweg }) => {
  const alles = [...binnen, ...onderweg];
  if (!alles.length) return "";
  return `<ul class="feiten">${alles.map(o => `<li>${esc(o.titel)}
    <span class="src">${esc(o.moduleTitel)} · ${o.telt ? "binnen" : `nog ${esc(o.status)}`}</span></li>`).join("")}</ul>`;
};

// De hele portfoliokaart. Een klik op een pijlerknop bouwt alleen deze kaart opnieuw op: de knop
// staat in de kaart eronder, dus de focus blijft waar hij was en de lijst loopt wél mee.
const portfolio = perPijler => `
  <h2>Je portfolio per pijler</h2>
  ${perPijler.map(vak => `<h3>${esc(vak.pijler.naam)}</h3>
    <p class="src">${esc(pijlerRegel(vak))}</p>
    ${gehangenLijst(vak)}
    ${vak.verdwenen.length ? `<p class="waarschuwing" role="alert">${vak.verdwenen.length}
      ${vak.verdwenen.length === 1 ? "koppeling wijst" : "koppelingen wijzen"} naar werk dat niet meer
      in de data staat (${esc(vak.verdwenen.join(", "))}). De projectdata is opnieuw gegenereerd;
      hang het opnieuw aan.</p>` : ""}`).join("")}`;

export default {
  async mount({ main, signal }) {
    main.innerHTML = `<h1>Bewijsstukken</h1><p class="sub">PPO</p>
      <p class="loading" role="status">Je werk uit alle modules laden…</p>`;

    let ppo = null, perModule = {};
    try { [ppo, perModule] = await Promise.all([laadPPO(), laadAlleProjectData()]); }
    catch {
      $(".loading", main)?.replaceWith(Object.assign(document.createElement("div"), {
        className: "card", innerHTML: `<p class="m0" role="alert">De PPO-gegevens konden niet geladen worden.</p>`
      }));
      return;
    }
    if (signal.aborted) return;

    const pijlers = pijlersVan(ppo);
    // Standaard alleen het werk dat al de deur uit is: dát kan bewijs zijn. De rest staat achter
    // een knop, want vooruit plannen mag ook.
    let alles = false;

    const teken = () => {
      const opdrachten = alleOpdrachten(perModule, opdrachtStatussen(), app.modules);
      const perPijler = bewijsPerPijler(pijlers, ppoBewijs(), opdrachten);
      const s = pijlerStand(perPijler);
      const gehangenOveral = new Set(perPijler.flatMap(p => p.gekoppeld.map(o => o.sleutel)));
      // Wat je al ergens hebt gehangen blijft staan, ook als het nog niet binnen is: anders
      // verdwijnt een koppeling uit het zicht zodra je hem hebt gemaakt.
      const zichtbaar = opdrachten.filter(o => alles || o.telt || gehangenOveral.has(o.sleutel));

      // Per module groeperen; zestig regels op één hoop is niet te lezen.
      const perMod = new Map();
      for (const o of zichtbaar) {
        if (!perMod.has(o.moduleTitel)) perMod.set(o.moduleTitel, []);
        perMod.get(o.moduleTitel).push(o);
      }

      main.innerHTML = `
        <h1>Bewijsstukken</h1>
        <p class="sub">PPO · over alle modules heen</p>

        ${!opdrachten.length ? `<div class="card">
          <p class="m0">Er is nog geen werk om aan een pijler te hangen: de projectvleugel heeft voor
            geen enkele module opdrachten in de data.</p>
          <p class="src"><a href="${esc(link("project/opdrachten"))}">Open Opdrachten</a></p>
        </div>` : `
          <div class="card">
            <h2>Hoe dit werkt</h2>
            <p class="m0" id="ppostand" role="status">${stand(s)}</p>
            <p class="m0">Je hangt zelf je werk aan een pijler: hetzelfde verslag kan bij <em>Ik</em>
              of bij <em>Wij</em> horen, afhankelijk van wat je eruit haalt. De opleiding zegt wélke
              soorten bewijs meetellen, niet welk stuk bij welke pijler hoort.</p>
            <p class="m0">Afvinken dat iets <em>klaar</em> is hoeft hier niet: een opdracht telt als
              binnen zodra hij in de projectvleugel op ingeleverd of beoordeeld staat.</p>
            ${s.leeg.length ? `<p class="src">Nog zonder bewijs: ${esc(s.leeg.join(", "))}.</p>` : ""}
          </div>

          <div class="card" id="ppoportfolio">${portfolio(perPijler)}</div>

          <div class="card">
            <h2>Je werk</h2>
            <p class="m0">Klik een pijler aan om dit werk eraan te hangen. Eén stuk mag bij meer dan
              één pijler horen.</p>
            <div class="row tussen">
              <p class="m0 src">${zichtbaar.length} van de ${opdrachten.length} stuks${
                alles ? "" : " — alleen wat al is ingeleverd of beoordeeld"}</p>
              <button class="btn btn-klein" data-actie="toggleAlles" aria-pressed="${alles}">${
                alles ? "Alleen ingeleverd werk" : "Toon al mijn werk"}</button>
            </div>
            ${!zichtbaar.length ? `<p class="m0">Er staat nog niets op ingeleverd of beoordeeld.
              Zet de status in <a href="${esc(link("project/opdrachten"))}">Opdrachten</a>, of toon
              al je werk om vooruit te plannen.</p>` : [...perMod].map(([mod, lijst]) => `
              <h3>${esc(mod)}</h3>
              <ul class="kernlijst">${lijst.map(o => `<li>
                <p class="m0">${esc(o.titel)} <span class="src">${o.vorm ? `${esc(o.vorm)} · ` : ""}${
                  o.herkansing ? "herkansing · " : ""}${o.telt ? "binnen" : esc(o.status)}</span></p>
                <div class="row">${pijlers.map(p => {
                  const aan = ppoBewijs()[p.id]?.[o.sleutel] === true;
                  return `<button class="btn btn-klein" data-actie="hang" data-pijler="${esc(p.id)}"
                    data-sleutel="${esc(o.sleutel)}" aria-pressed="${aan}"
                    aria-label="${esc(o.titel)} aan pijler ${esc(p.naam)} hangen">${esc(p.naam)}</button>`;
                }).join("")}</div>
              </li>`).join("")}</ul>`).join("")}
          </div>`}

        ${bewijssoortenVan(ppo).length ? `<div class="card">
          <h2>Wat de opleiding als bewijs ziet</h2>
          <p class="m0">Niet alles hiervan staat in deze app. Feedback, reflecties en ervaringen uit
            stage of werkveld horen er net zo goed bij; die houd je in je eigen portfolio bij.</p>
          <ul class="feiten">${bewijssoortenVan(ppo).map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>` : ""}

        <p class="src">Wat je hier aanhangt staat in deze browser, niet in Brightspace en niet in de
          synchronisatie. <a href="${esc(link("ppo/eisen"))}">De eisen per jaar</a> ·
          <a href="${esc(link("project/opdrachten"))}">De status van je opdrachten</a></p>`;
    };

    acties(main, {
      // Alleen deze knop, de pijlerregel en de teller bijwerken: hertekenen zou de focus uit de
      // knop halen die je net indrukte, en er staan hier tientallen regels onder elkaar.
      hang: el => {
        const aan = el.getAttribute("aria-pressed") !== "true";
        zetPpoBewijs(el.dataset.pijler, el.dataset.sleutel, aan);
        el.setAttribute("aria-pressed", String(aan));

        const opdrachten = alleOpdrachten(perModule, opdrachtStatussen(), app.modules);
        const perPijler = bewijsPerPijler(pijlers, ppoBewijs(), opdrachten);
        const regelEl = $("#ppostand", main);
        if (regelEl) regelEl.textContent = stand(pijlerStand(perPijler));
        const kaart = $("#ppoportfolio", main);
        if (kaart) kaart.innerHTML = portfolio(perPijler);
        say(aan ? "Aan deze pijler gehangen" : "Niet meer aan deze pijler");
      },
      toggleAlles: () => { alles = !alles; teken(); $$("[data-actie=toggleAlles]", main)[0]?.focus(); }
    }, signal);

    teken();
  }
};
