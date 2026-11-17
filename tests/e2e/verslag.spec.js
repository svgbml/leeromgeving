// Verslagpagina: laden, inhoudsopgave, zoeken, toegankelijkheid en breedte op de telefoon.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Module vooraf kiezen en herladen: wisselen tijdens het scherm laadt data en tekent opnieuw.
async function kies(page, id) {
  await page.goto("/#/begrippen");
  await page.evaluate(m => localStorage.setItem("leeromgeving:module", JSON.stringify(m)), id);
  await page.reload();
  await expect(page.locator("#main .sub")).toContainText(/\S/);
}

test.beforeEach(async ({ page }) => kies(page, "dna-kraak-de-code"));

test("verslag opent vanuit Begrippen en springt naar een les", async ({ page }) => {
  await page.getByRole("link", { name: "Lees het verslag" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Verslag" })).toBeVisible();
  await expect(page.locator("#vtekst h2").first()).toBeVisible();
  await expect(page.locator("#vtekst table").first()).toBeVisible();
  await page.goto("/#/verslag?k=les-3-pcr-en-primer-design");
  await expect(page.locator("#les-3-pcr-en-primer-design")).toBeInViewport();
});

test("zoeken markeert treffers", async ({ page }) => {
  await page.goto("/#/verslag");
  await page.locator("#vq").fill("annealing");
  await expect(page.locator("#vtel")).toHaveText(/\d+ keer gevonden/);
  expect(await page.locator("#vtekst mark").count()).toBeGreaterThan(0);
});

test("verslag van een gegenereerde module toont lessen en knoppen", async ({ page }) => {
  await kies(page, "dna-ontrafeld");
  await page.goto("/#/verslag");
  await expect(page.locator("#vtekst h2").first()).toBeVisible();
  // De lesknoppen komen pas als de moduledata geladen is; toBeVisible wacht daarop.
  await expect(page.locator(".verslag-les-knoppen").first()).toBeVisible();
});

test("verslag: toegankelijk en niet breder dan het scherm", async ({ page }) => {
  await page.goto("/#/verslag");
  await expect(page.locator("#vtekst h2").first()).toBeVisible();
  const breed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(breed).toBeLessThanOrEqual(1);
  const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
  expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
});
