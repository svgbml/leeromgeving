// B0: de vleugels (theorie/lab/project/PPO) zitten in de navigatie en de oude theorie-URL's
// blijven precies werken. De inhoud van lab, project en PPO komt in B2–B4.
import { test, expect } from "@playwright/test";

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

test("een onbekende vleugelpagina valt terug op Vandaag", async ({ page }) => {
  await page.goto("/#/lab/bestaatniet");
  await expect(page.getByRole("heading", { level: 1, name: "Vandaag" })).toBeVisible();
});
