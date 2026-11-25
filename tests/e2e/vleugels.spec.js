// B0: de vleugels (theorie/lab/project/PPO) zitten in de navigatie en de oude theorie-URL's
// blijven precies werken. De inhoud van lab, project en PPO komt in B2–B4.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  await expect(page.locator("#tabs-vleugel a")).toHaveCount(4);
  await expect(page.locator("#tabs-vleugel a[data-route='lab/stoffen']")).toBeVisible();

  await page.locator("#vleugelkiezer a[data-vleugel=theorie]").click();
  await expect(page).toHaveURL(/#\/vandaag$/);
  await expect(page.locator("#tabs-theorie")).toBeVisible();
  await expect(page.locator("#tabs-vleugel")).toBeHidden();
});

test("een labpagina openen via de URL werkt direct", async ({ page }) => {
  await page.goto("/#/lab/stoffen");
  await expect(page.getByRole("heading", { level: 1, name: "Stoffen" })).toBeVisible();
  await expect(page.locator("#tabs-vleugel a[data-route='lab/stoffen']")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("#vleugelkiezer a[data-vleugel=lab]")).toHaveAttribute("aria-current", "true");
  await expect(page).toHaveTitle(/^Stoffen · Lab · /);
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

test("stoffenpagina toont de stoffen van de sessie en de hele bibliotheek", async ({ page }) => {
  await page.goto("/#/lab/stoffen");
  await expect(page.getByRole("heading", { level: 1, name: "Stoffen" })).toBeVisible();
  // De eerste labsessie noemt stoffen die nog niet in data/stoffen.json staan; die mogen niet
  // stil wegvallen, want dan mis je een stof waarvan je de gevaren niet kent.
  await expect(page.locator(".stoffen-tabel")).toContainText("onbekende stof");
  // De hele bibliotheek: met pictogrammen, en met de melding dat de data nog niet nagelopen is.
  await page.getByRole("button", { name: "Alle stoffen" }).click();
  await expect(page.locator(".ghs-ruit").first()).toBeVisible();
  await expect(page.locator(".waarschuwing")).toContainText(/nog niet tegen de SDS nagelopen/);
  await expect(page.getByText("Afvalvaten")).toBeVisible();
});

// ---------- B2: de drie andere labschermen ----------

test("Protocollen toont de opbouw van een sessie, niet de protocoltekst", async ({ page }) => {
  await page.goto("/#/lab/protocollen");
  await expect(page.getByRole("heading", { level: 1, name: "Protocollen" })).toBeVisible();
  await expect(page).toHaveTitle(/^Protocollen · Lab · /);
  await expect(page.locator("#tabs-vleugel a[data-route='lab/protocollen']")).toHaveAttribute("aria-current", "page");
  // Per experiment de structuur: stappen als ondergrens, apparatuur en stoffen.
  await expect(page.getByRole("heading", { level: 2, name: /Experiment 1A/ })).toBeVisible();
  await expect(page.locator("main")).toContainText(/Minstens 3 stappen/);
  await expect(page.locator("main")).toContainText(/opruimstap/);
  // De tekst van het protocol staat bewust niet in de repo; het scherm verwijst naar de handleiding.
  await expect(page.locator("main")).toContainText("Experiment week 1 - Labveiligheid.docx");
  // Een sessie kiezen gaat op plek in de lijst, want twee sessies kunnen hetzelfde nummer hebben.
  await page.locator("select[data-invoer=sessie]").selectOption("2");
  await expect(page).toHaveURL(/sessie=2/);
  await expect(page.locator(".sub")).toContainText("week 2");
});

test("Voorbereiding vat de sessie samen en linkt naar de stoffen", async ({ page }) => {
  await page.goto("/#/lab/voorbereiding");
  await expect(page.getByRole("heading", { level: 1, name: "Voorbereiding" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Wat ga je doen" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Experiment 1A: Afval opruimen");
  // Wat er nog niet is, staat er als zoiets en wordt niet verzonnen.
  await expect(page.getByRole("heading", { level: 2, name: "Nog niet ingevuld" })).toBeVisible();
  await page.getByRole("link", { name: "Open Stoffen" }).first().click();
  await expect(page).toHaveURL(/#\/lab\/stoffen\?sel=sessie&sessie=0/);
  await expect(page.getByRole("heading", { level: 1, name: "Stoffen" })).toBeVisible();
});

test("Analyse houdt per experiment bij wat je hebt uitgewerkt", async ({ page }) => {
  await page.goto("/#/lab/analyse");
  await expect(page.getByRole("heading", { level: 1, name: "Analyse" })).toBeVisible();
  const vakjes = page.locator(".kernlijst input[type=checkbox]");
  await expect(vakjes).toHaveCount(5);
  await expect(page.locator("#labstand")).toContainText("0 van de 5");
  await vakjes.first().check();
  await expect(page.locator("#labstand")).toContainText("1 van de 5");
  // Een afvinkje moet een herlaadbeurt overleven, anders begin je elke keer opnieuw.
  await page.reload();
  await expect(page.locator(".kernlijst input").first()).toBeChecked();
  await expect(page.locator("#labstand")).toContainText("1 van de 5");
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

for (const route of ["lab/voorbereiding", "lab/stoffen", "lab/protocollen", "lab/analyse"]) {
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
