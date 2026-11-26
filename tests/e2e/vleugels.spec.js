// B0: de vleugels (theorie/lab/project/PPO) zitten in de navigatie en de oude theorie-URL's
// blijven precies werken. De inhoud van lab, project en PPO komt in B2–B4.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { existsSync, readFileSync } from "node:fs";

// Het lesmateriaal staat versleuteld in de repo (zie tools/versleutel.js), dus die schermen
// vragen eerst een wachtwoord. Lokaal staat dat in .wachtwoord en testen we de hele weg; in CI
// staat het er niet, en dan toetsen we alleen dat het slot er is. Het wachtwoord in een secret
// zetten zou het in elke log-regel van een mislukte run kunnen laten belanden.
const WACHTWOORD = existsSync(".wachtwoord") ? readFileSync(".wachtwoord", "utf8").trim() : null;

async function ontgrendel(page) {
  const slot = page.locator("[data-slot=wachtwoord]");
  // Wachten tot het slot er staat: het scherm haalt eerst zijn data op, dus vlak na een goto is
  // het er nog niet. Zonder dit wachten denkt de test dat de kluis al open was.
  try { await slot.waitFor({ state: "visible", timeout: 15000 }); } catch { return; }
  await slot.fill(WACHTWOORD);
  await page.getByRole("button", { name: "Openen" }).click();
  await expect(page.locator(".slot")).toHaveCount(0, { timeout: 20000 });
}


const fouten = [];
test.beforeEach(async ({ page }) => {
  fouten.length = 0;
  page.on("pageerror", e => fouten.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fouten.push(m.text()); });
});
test.afterEach(() => expect(fouten, fouten.join("\n")).toEqual([]));

// Dit is de hele reden dat theorie geen voorvoegsel kreeg: elke bestaande link blijft geldig.
const OUD = [
  ["#/vandaag", "Vandaag"],
  ["#/begrippen", /Begrippen|Vragen/],
  ["#/flashcards", "Flashcards"],
  ["#/toets", "Oefentoets"],
  ["#/videos", "Video's"],
  ["#/verslag", "Verslag"],
  ["#/voortgang", "Voortgang"],
  ["#/instellingen", "Instellingen"]
];
for (const [url, kop] of OUD) {
  test(`bestaande theorie-URL ${url} werkt nog`, async ({ page }) => {
    await page.goto(`/${url}`);
    await expect(page.getByRole("heading", { level: 1, name: kop })).toBeVisible();
    await expect(page.locator("#vleugelkiezer a[data-vleugel=theorie]")).toHaveAttribute("aria-current", "true");
    await expect(page.locator("#tabs-theorie")).toBeVisible();
    await expect(page.locator("#tabs-vleugel")).toBeHidden();
    expect(page.url()).toContain(url);
  });
}

test("filters in de URL blijven werken", async ({ page }) => {
  await page.goto("/#/begrippen?q=dna");
  await expect(page.locator("#q")).toHaveValue("dna");
});

test("vleugelkiezer brengt je naar de labvleugel en terug", async ({ page }) => {
  await page.goto("/#/vandaag");
  await page.locator("#vleugelkiezer a[data-vleugel=lab]").click();
  await expect(page).toHaveURL(/#\/lab\/voorbereiding$/);
  await expect(page.locator("#tabs-vleugel")).toBeVisible();
  await expect(page.locator("#tabs-theorie")).toBeHidden();
  // De labtabs, niet de theorietabs.
  await expect(page.locator("#tabs-vleugel a")).toHaveCount(3);
  await expect(page.locator("#tabs-vleugel a[data-route='lab/protocollen']")).toBeVisible();

  await page.locator("#vleugelkiezer a[data-vleugel=theorie]").click();
  await expect(page).toHaveURL(/#\/vandaag$/);
  await expect(page.locator("#tabs-theorie")).toBeVisible();
  await expect(page.locator("#tabs-vleugel")).toBeHidden();
});

test("een labpagina openen via de URL werkt direct", async ({ page }) => {
  await page.goto("/#/lab/protocollen");
  await expect(page.getByRole("heading", { level: 1, name: "Protocollen" })).toBeVisible();
  await expect(page.locator("#tabs-vleugel a[data-route='lab/protocollen']")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#vleugelkiezer a[data-vleugel=lab]")).toHaveAttribute("aria-current", "true");
  await expect(page).toHaveTitle(/^Protocollen · Lab · /);
});

test("PPO is modulevrij: geen modulenaam in de titel", async ({ page }) => {
  await page.goto("/#/ppo/eisen");
  await expect(page.getByRole("heading", { level: 1, name: "Eisen" })).toBeVisible();
  await expect(page).toHaveTitle("Eisen · PPO · Leeromgeving BML");
});

test("de module blijft staan als je van vleugel wisselt", async ({ page }) => {
  await page.goto("/#/vandaag");
  const tweede = await page.locator("#module option").nth(1).getAttribute("value");
  await page.locator("#module").selectOption(tweede);
  await page.locator("#vleugelkiezer a[data-vleugel=project]").click();
  await expect(page.locator("#module")).toHaveValue(tweede);
  await expect(page.locator(".sub")).toContainText("Project");
});

// ---------- B2: de drie andere labschermen ----------

test("Protocollen toont de opbouw van een sessie en de protocoltekst", async ({ page }) => {
  await page.goto("/#/lab/protocollen");
  await expect(page.getByRole("heading", { level: 1, name: "Protocollen" })).toBeVisible();
  await expect(page).toHaveTitle(/^Protocollen · Lab · /);
  await expect(page.locator("#tabs-vleugel a[data-route='lab/protocollen']")).toHaveAttribute("aria-current", "page");
  // Per experiment de structuur: stappen als ondergrens en apparatuur.
  await expect(page.locator("main")).toContainText(/Experiment 1A/);
  await expect(page.locator("main")).toContainText(/3 stappen/);
  await expect(page.locator("main")).toContainText(/opruimstap/);
  // De handleiding zelf zit achter het slot, want de repo is openbaar.
  await expect(page.locator(".slot")).toBeVisible();
  if (WACHTWOORD) {
    await ontgrendel(page);
    await expect(page.locator(".verslag-tekst"))
      .toContainText("Experiment week 1 - Labveiligheid.docx", { timeout: 20000 });
  }
  // Een sessie kiezen gaat op plek in de lijst, want twee sessies kunnen hetzelfde nummer hebben.
  await page.locator("select[data-invoer=sessie]").selectOption("2");
  await expect(page).toHaveURL(/sessie=2/);
  await expect(page.locator(".sub")).toContainText("week 2");
});

test("Voorbereiding vat de sessie samen", async ({ page }) => {
  await page.goto("/#/lab/voorbereiding");
  await expect(page.getByRole("heading", { level: 1, name: "Voorbereiding" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Wat ga je doen" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Experiment 1A: Afval opruimen");
  // Het doel en de hypothese staan erbij als suggestie, met vermelding dat het een suggestie is.
  await expect(page.getByRole("heading", { level: 2, name: "Doel en hypothese" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Een suggestie");
  await expect(page.getByRole("heading", { level: 2, name: "Apparatuur" })).toBeVisible();
});

test("Analyse legt per techniek uit hoe je uitwerkt, met formules", async ({ page }) => {
  await page.goto("/#/lab/analyse");
  await expect(page.getByRole("heading", { level: 1, name: "Analyse" })).toBeVisible();
  // Geen takenlijst meer, maar een stappenplan: dat voor elke uitwerking geldt staat er altijd.
  await expect(page.getByRole("heading", { level: 2, name: "Elke uitwerking" })).toBeVisible();
  await expect(page.locator(".formule-regel code").first()).toBeVisible();
  // En één markering voor je voortgang, die een herlaadbeurt overleeft.
  const vakje = page.locator("[data-wijzig=klaar]");
  await expect(page.locator("#labstand")).toContainText("0 van de 11");
  await vakje.check();
  await expect(page.locator("#labstand")).toContainText("1 van de 11");
  await page.reload();
  await expect(page.locator("[data-wijzig=klaar]")).toBeChecked();
  await expect(page.locator("#labstand")).toContainText("1 van de 11");
});

test("een module zonder labsessies krijgt een lege toestand, geen fout", async ({ page }) => {
  // Niet elke module is al omgezet; dat mag geen leeg of stuk scherm geven.
  await page.route("**/*.lab.json", r => r.fulfill({ json: { id: "leeg", vleugel: "lab", sessies: [] } }));
  for (const route of ["lab/voorbereiding", "lab/protocollen", "lab/analyse"]) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main")).toContainText("nog geen labsessies");
  }
});

for (const route of ["lab/voorbereiding", "lab/protocollen", "lab/analyse"]) {
  test(`toegankelijkheid: ${route}`, async ({ page }) => {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForTimeout(300);
    const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("een onbekende vleugelpagina valt terug op Vandaag", async ({ page }) => {
  await page.goto("/#/lab/bestaatniet");
  await expect(page.getByRole("heading", { level: 1, name: "Vandaag" })).toBeVisible();
});
