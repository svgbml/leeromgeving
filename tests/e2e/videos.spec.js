// Videoscherm: tab in de navigatie, video's per les, filteren, afspelen en toegankelijkheid.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";

// Module vooraf kiezen en herladen: wisselen tijdens het scherm laadt data en tekent opnieuw.
async function kies(page, id) {
  await page.goto("/#/begrippen");
  // Eerst wachten tot de app klaar is met opstarten, anders schrijft die zijn eigen keuze er weer overheen.
  await expect(page.locator("#main .sub")).toBeVisible({ timeout: 20000 });
  await page.evaluate(m => localStorage.setItem("leeromgeving:module", JSON.stringify(m)), id);
  await page.reload();
  await expect(page.locator("#main .sub")).toContainText(/\S/, { timeout: 20000 });
}

test.beforeEach(async ({ page }) => kies(page, "dna-kraak-de-code"));

test("de tab Video's opent het videoscherm met video's per les", async ({ page }) => {
  await page.locator("nav.tabs a[data-route=videos]").click();
  await expect(page.getByRole("heading", { level: 1, name: "Video's" })).toBeVisible();
  await expect(page.locator("nav.tabs a[data-route=videos]")).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".video-kop")).toContainText(/uitgekozen video/);
  expect(await page.locator(".video-les").count()).toBeGreaterThan(5);
  expect(await page.locator(".video-speel").count()).toBeGreaterThan(5);
});

test("filteren op een les laat alleen die les zien", async ({ page }) => {
  await page.goto("/#/videos");
  const les1 = page.locator(".video-les").first();
  await expect(les1).toBeVisible();
  const naam = await les1.getAttribute("data-les");
  await page.locator(`.les-chips .chip[data-les="${naam}"]`).click();
  await expect(page).toHaveURL(/#\/videos\?les=/);
  await expect(les1).toBeVisible();
  await expect(page.locator(".video-les").nth(1)).toBeHidden();
  await page.locator('.les-chips .chip[data-les=""]').click();
  await expect(page.locator(".video-les").nth(1)).toBeVisible();
});

test("een video laadt pas na een klik en speelt dan in de pagina", async ({ page }) => {
  await page.goto("/#/videos");
  await expect(page.locator(".video-speel").first()).toBeVisible();
  expect(await page.locator("iframe").count()).toBe(0);
  await page.locator(".video-speel").first().click();
  const frame = page.locator("iframe.video-frame").first();
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("src", /youtube-nocookie\.com\/embed\//);
  // Nergens een gewone link naar youtube.com/watch: zoeken gaat via de resultatenpagina.
  expect(await page.locator('a[href*="youtube.com/watch"]').count()).toBe(0);
});

test("module zonder eigen tab-inhoud: elke module heeft een eigen video-overzicht", async ({ page }) => {
  // Het aantal lesblokken komt uit data/videos.json en niet uit een getal in deze test: toen
  // Celbiologie in De cel opging gingen de video's mee en liep een vast aantal meteen mis.
  const videos = JSON.parse(readFileSync(new URL("../../data/videos.json", import.meta.url), "utf8"));
  const verwacht = Object.keys(videos["de-cel"] || {}).length;
  expect(verwacht, "De cel hoort video's te hebben").toBeGreaterThan(0);

  await kies(page, "de-cel");
  await page.goto("/#/videos");
  await expect(page.locator(".video-kop")).toBeVisible();
  await expect(page.locator(".video-les")).toHaveCount(verwacht);
});

test("video's: toegankelijk en niet breder dan het scherm", async ({ page }) => {
  await page.goto("/#/videos");
  await expect(page.locator(".video-les").first()).toBeVisible();
  const breed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(breed).toBeLessThanOrEqual(1);
  const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
  expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
});
