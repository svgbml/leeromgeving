// B4: PPO — de eisen per jaar, het bewijs dat je aan een pijler hangt, en het automatisch
// afvinken zodra een opdracht in de projectvleugel op ingeleverd staat.
//
// PPO is modulevrij: het leest het werk van álle modules. De status wordt daarom via
// localStorage gezet in plaats van door de projectvleugel heen te klikken — behalve in de test
// die juist dat doorwerken moet bewijzen, want dat is de hele belofte van stap 4.3.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fouten = [];
test.beforeEach(async ({ page }) => {
  fouten.length = 0;
  page.on("pageerror", e => fouten.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fouten.push(m.text()); });
});
test.afterEach(() => expect(fouten, fouten.join("\n")).toEqual([]));

const MODULE = "eiwitten-in-interactie";
const OPDRACHT = "lu3-rapportage";
const SLEUTEL = `${MODULE}:${OPDRACHT}`;

// Eén opdracht op ingeleverd zetten, zoals de projectvleugel dat bewaart.
const metIngeleverdWerk = page => page.addInitScript(([mod, opdracht]) => {
  localStorage.setItem("leeromgeving:opdrachtstatus", JSON.stringify({ [mod]: { [opdracht]: "ingeleverd" } }));
}, [MODULE, OPDRACHT]);

// Dat PPO modulevrij is en geen modulenaam in de titel zet, toetst vleugels.spec.js al.
test("de PPO-vleugel heeft zijn drie tabs", async ({ page }) => {
  await page.goto("/#/ppo/eisen");
  await expect(page.locator("#tabs-vleugel a")).toHaveCount(3);
  await expect(page.locator("#tabs-vleugel a[data-route='ppo/bewijs']")).toBeVisible();
  await expect(page.locator("#vleugelkiezer a[data-vleugel=ppo]")).toHaveAttribute("aria-current", "true");
});

test("Eisen toont de fase van het gekozen jaar en de vier pijlers", async ({ page }) => {
  await page.goto("/#/ppo/eisen");
  await expect(page.getByRole("heading", { level: 2, name: "De vier pijlers" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Wie ben ik?");

  // Van jaar wisselen zet het jaar in de URL, zodat je de pagina kunt delen of terugvinden.
  await page.locator("select[data-invoer=jaar]").selectOption("4");
  await expect(page).toHaveURL(/jaar=4/);
  await expect(page.locator(".sub")).toContainText("jaar 4");
  // De bron twijfelt zelf over de studiepunten van jaar 4; dat moet op het scherm staan.
  await expect(page.locator(".waarschuwing")).toContainText(/vraagteken/);
});

test("Eisen zegt dat geen studiepunten niet hetzelfde is als nul", async ({ page }) => {
  await page.goto("/#/ppo/eisen?jaar=1");
  await expect(page.locator("main")).toContainText("niet hetzelfde als nul");
});

test("een jaar dat de bron niet kent valt terug op het eerste", async ({ page }) => {
  await page.goto("/#/ppo/eisen?jaar=9");
  await expect(page.locator(".sub")).toContainText("jaar 1");
});

test("Bewijsstukken toont standaard alleen werk dat de deur uit is", async ({ page }) => {
  await metIngeleverdWerk(page);
  await page.goto("/#/ppo/bewijs");
  await expect(page.getByRole("heading", { level: 2, name: "Je werk" })).toBeVisible();
  // Eén stuk staat op ingeleverd; de rest staat achter de knop. Zonder die grens zou elke pijler
  // tientallen regels tonen.
  await expect(page.locator("main")).toContainText("alleen wat al is ingeleverd of beoordeeld");
  await expect(page.locator(".kernlijst li")).toHaveCount(1);

  await page.getByRole("button", { name: "Toon al mijn werk" }).click();
  await expect(page.locator(".kernlijst li").first()).toBeVisible();
  expect(await page.locator(".kernlijst li").count()).toBeGreaterThan(1);
});

test("je hangt werk aan een pijler en de stand loopt mee", async ({ page }) => {
  await metIngeleverdWerk(page);
  await page.goto("/#/ppo/bewijs");
  await expect(page.locator("#ppostand")).toContainText("0 van de 4");

  const knop = page.locator(`[data-actie=hang][data-pijler=ik][data-sleutel="${SLEUTEL}"]`);
  await knop.click();
  await expect(knop).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#ppostand")).toContainText("1 van de 4");
  // De portfoliokaart loopt mee, niet alleen de teller.
  await expect(page.locator("#ppoportfolio")).toContainText("1 bewijsstuk binnen");
  // De focus blijft op de knop, anders kun je er met het toetsenbord niet door.
  await expect(knop).toBeFocused();

  // En het overleeft een herlaadbeurt.
  await page.reload();
  await expect(page.locator(`[data-actie=hang][data-pijler=ik][data-sleutel="${SLEUTEL}"]`))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#ppostand")).toContainText("1 van de 4");
});

test("werk dat nog bezig is telt niet als bewijs, maar verdwijnt ook niet", async ({ page }) => {
  await page.addInitScript(([mod, opdracht, sleutel]) => {
    localStorage.setItem("leeromgeving:opdrachtstatus", JSON.stringify({ [mod]: { [opdracht]: "bezig" } }));
    localStorage.setItem("leeromgeving:ppobewijs", JSON.stringify({ ik: { [sleutel]: true } }));
  }, [MODULE, OPDRACHT, SLEUTEL]);
  await page.goto("/#/ppo/bewijs");
  // "bezig" is geen bewijs: je hebt nog niets om te laten zien.
  await expect(page.locator("#ppostand")).toContainText("0 van de 4");
  await expect(page.locator("#ppoportfolio")).toContainText("1 stuk onderweg");
  // Maar het blijft wel staan, ook al is het niet ingeleverd.
  await expect(page.locator("#ppoportfolio")).toContainText("nog bezig");
});

test("een koppeling naar verdwenen werk wordt niet verzwegen", async ({ page }) => {
  // De projectdata wordt opnieuw gegenereerd; een opdracht kan weg zijn. Dan moet PPO dat zeggen
  // in plaats van stil één bewijsstuk minder te tonen.
  await page.addInitScript(() => {
    localStorage.setItem("leeromgeving:ppobewijs", JSON.stringify({ ik: { "eiwitten-in-interactie:weggehaald": true } }));
  });
  await page.goto("/#/ppo/bewijs");
  await expect(page.locator("#ppoportfolio .waarschuwing")).toContainText("niet meer in de data staat");
});

test("de status uit de projectvleugel vinkt het bewijs automatisch af (4.3)", async ({ page }) => {
  // Dit is de hele belofte van stap 4.3, dus hier wordt de status écht in de projectvleugel
  // gezet in plaats van in localStorage voorgekookt.
  await page.addInitScript(([mod, sleutel]) => {
    localStorage.setItem("leeromgeving:module", JSON.stringify(mod));
    localStorage.setItem("leeromgeving:ppobewijs", JSON.stringify({ ik: { [sleutel]: true } }));
  }, [MODULE, SLEUTEL]);

  await page.goto("/#/ppo/bewijs");
  await expect(page.locator("#ppostand")).toContainText("0 van de 4");

  await page.goto("/#/project/opdrachten");
  const status = page.locator(`[data-actie=status][data-id=${OPDRACHT}]`);
  await expect(status).toHaveText("te doen");
  await status.click();
  await expect(status).toHaveText("bezig");
  await status.click();
  await expect(status).toHaveText("ingeleverd");

  // Terug naar PPO zonder daar iets aan te klikken: het bewijs is nu binnen.
  await page.goto("/#/ppo/bewijs");
  await expect(page.locator("#ppostand")).toContainText("1 van de 4");
  await expect(page.locator("#ppoportfolio")).toContainText("1 bewijsstuk binnen");
});

test("Deadlines verzint geen datums", async ({ page }) => {
  await page.goto("/#/ppo/deadlines");
  await expect(page.getByRole("heading", { level: 2, name: /Deze app weet de datums niet/ })).toBeVisible();
  await expect(page.locator("main")).toContainText("geen datum geraden");
  // Wat de bron wél zegt: per jaar wanneer er beoordeeld wordt.
  await expect(page.getByRole("heading", { level: 2, name: "Wanneer er beoordeeld wordt" })).toBeVisible();
  await expect(page.locator("ol.feiten > li")).toHaveCount(4);
});

test("PPO gaat niet onderuit op lege data", async ({ page }) => {
  await page.route("**/data/ppo/ppo.json", r => r.fulfill({ json: { pijlers: [], fases: [] } }));
  for (const route of ["ppo/eisen", "ppo/deadlines"]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main")).toContainText("nog geen fases");
  }
});

for (const route of ["ppo/eisen", "ppo/bewijs", "ppo/deadlines"]) {
  test(`toegankelijkheid: ${route}`, async ({ page }) => {
    await metIngeleverdWerk(page);
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForTimeout(300);
    const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}
