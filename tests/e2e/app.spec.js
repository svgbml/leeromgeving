// Klikt door de belangrijkste schermen zoals een student dat doet.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fouten = [];
test.beforeEach(async ({ page }) => {
  fouten.length = 0;
  page.on("pageerror", e => fouten.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fouten.push(m.text()); });
});
test.afterEach(() => expect(fouten, fouten.join("\n")).toEqual([]));

test("Vandaag toont alle modules en het dagdoel", async ({ page }) => {
  await page.goto("/#/vandaag");
  await expect(page.getByRole("heading", { level: 1, name: "Vandaag" })).toBeVisible();
  await expect(page.locator(".dash-card")).toHaveCount(6);
  await expect(page.locator(".dash-card .dash-knoppen").first()).toBeVisible();
  await expect(page.getByText("Dagdoel")).toBeVisible();
});

test("flashcards: omdraaien, beoordelen en ongedaan maken", async ({ page }) => {
  await page.goto("/#/flashcards");
  await expect(page.locator("#telling")).toHaveText(/0 van \d+ gedaan/);
  await page.getByRole("button", { name: /Toon antwoord/ }).click();
  await expect(page.locator(".flip-kaart")).toHaveClass(/omgedraaid/);
  await page.getByRole("button", { name: /^Goed/ }).click();
  await expect(page.locator("#telling")).toHaveText(/1 van \d+ gedaan/);
  await page.keyboard.press("z");
  await expect(page.locator("#telling")).toHaveText(/0 van \d+ gedaan/);
  const opgeslagen = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("leeromgeving:biomoleculen-labveiligheid") || '{"cards":{}}').cards).length);
  expect(opgeslagen).toBe(0);
});

test("oefentoets: vragen beantwoorden en uitslag met cijfer", async ({ page }) => {
  await page.goto("/#/toets");
  await page.locator("#qn").selectOption("10");
  await page.getByRole("button", { name: "Start toets" }).click();
  for (let i = 0; i < 10; i++) {
    await expect(page.locator("#qtext")).toBeVisible();
    const opt = page.locator(".opt:not([disabled])").first();
    if (await opt.count()) await opt.click();
    else if (await page.locator("[data-actie=toonModel]").count()) {
      await page.locator("#antwoord").fill("Een kort antwoord");
      await page.locator("[data-actie=toonModel]").click();
      await page.locator("[data-actie=vastleggen]").click();
    } else if (await page.locator("[data-actie=controleer]").count()) {
      if (await page.locator("#reken").count()) await page.locator("#reken").fill("1");
      await page.locator("[data-actie=controleer]").click();
    } else if (await page.locator(".hotspot:not([disabled])").count()) await page.locator(".hotspot").first().click();
    await page.locator("#next").click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "Resultaat" })).toBeVisible();
  await expect(page.locator(".cijfer span")).toHaveText(/^\d+,\d$/);
});

test("examensimulatie: navigeren, markeren en inleveren", async ({ page }) => {
  await page.goto("/#/toets");
  await page.locator("#qn").selectOption("10");
  await page.locator("#qexam").check();
  await page.getByRole("button", { name: "Start toets" }).click();
  await expect(page.locator(".qnav-b")).toHaveCount(10);
  await page.getByRole("button", { name: "Markeer voor later" }).click();
  await expect(page.locator(".qnav-b").first()).toHaveClass(/vlag/);
  await page.locator(".qnav-b").nth(9).click();
  await expect(page.locator("#qnr")).toHaveText("Vraag 10 van 10");
  await page.getByRole("button", { name: "Inleveren" }).click();
  await page.getByRole("button", { name: /Toch inleveren/ }).click();
  // Open vragen kijk je daarna zelf na; anders direct de uitslag.
  for (let i = 0; i < 10 && !(await page.getByRole("heading", { name: "Resultaat" }).count()); i++) {
    await page.locator("[data-actie=vastleggen]").click();
    await page.locator("#next").click();
  }
  await expect(page.getByRole("heading", { level: 1, name: "Resultaat" })).toBeVisible();
});

test("lopende toets blijft bewaard na herladen", async ({ page }) => {
  await page.goto("/#/toets");
  await page.getByRole("button", { name: "Start toets" }).click();
  await expect(page.locator("#qnr")).toHaveText(/Vraag 1 van/);
  await page.reload();
  await expect(page.locator("#qnr")).toHaveText(/Vraag 1 van/);
});

test("begrippen: zoeken staat in de URL, lesinfo verborgen, deeplink werkt", async ({ page }) => {
  await page.goto("/#/begrippen");
  // Module vooraf kiezen: wisselen tijdens het scherm laadt data en tekent opnieuw, wat met typen botst.
  await page.evaluate(() => localStorage.setItem("leeromgeving:module", JSON.stringify("dna-kraak-de-code")));
  await page.reload();
  await expect(page.locator("#main .sub")).toContainText("DNA kraak de code");
  await page.locator("#q").fill("bijeenkomsten");
  await expect(page).toHaveURL(/q=bijeenkomsten/);
  await expect(page.locator("#count")).toHaveText("0 kaarten gevonden");
  await page.getByLabel(/Ook lesinfo tonen/).check();
  await expect(page.locator("#count")).toHaveText("1 kaart gevonden");
  await expect(page.locator("mark").first()).toHaveText(/bijeenkomsten/i);
  await page.goto("/#/begrippen?id=dna-010");
  await expect(page.locator("#k-dna-010")).toHaveClass(/uitgelicht/);
});

test("video-uitleg opent een dialoog met video's", async ({ page }) => {
  await page.goto("/#/begrippen?les=" + encodeURIComponent("Les 3 – DNA-replicatie"));
  await page.locator("#module").selectOption("dna-ontrafeld");
  await page.goto("/#/begrippen?les=" + encodeURIComponent("Les 3 – DNA-replicatie"));
  await page.locator(".lesblok .btn-video").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".video").first()).toBeVisible();
});

test("slides openen in de app, afgeschermd en zonder Drive-pagina", async ({ page }) => {
  await page.route(/drive\.google\.com/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<p>slides</p>" }));
  await page.goto("/#/begrippen");
  await page.locator(".begrip .link-knop").first().click();
  const frame = page.locator("dialog .slides-frame");
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute("src", /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/preview$/);
  const sandbox = await frame.getAttribute("sandbox");
  expect(sandbox).not.toContain("allow-popups");
  await expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
  // Nergens in de pagina een gewone link naar Drive.
  expect(await page.locator('a[href*="drive.google.com"]').count()).toBe(0);
});

test("instellingen: lettergrootte wordt direct toegepast", async ({ page }) => {
  await page.goto("/#/instellingen");
  await page.getByLabel("Lettergrootte").selectOption("130");
  await expect(page.locator("html")).toHaveAttribute("style", /font-size: 138\.125%/);
});

test("telefoon: geen horizontaal scrollen", async ({ page }) => {
  await page.goto("/#/vandaag");
  for (const r of ["vandaag", "begrippen", "flashcards", "toets", "voortgang", "instellingen"]) {
    await page.goto(`/#/${r}`);
    await page.waitForTimeout(300);
    const breed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(breed, r).toBeLessThanOrEqual(1);
  }
});

// Toegankelijkheid (#81): geen ernstige of kritieke overtredingen van WCAG 2.1 AA.
for (const r of ["vandaag", "begrippen", "flashcards", "toets", "voortgang", "instellingen"]) {
  test(`toegankelijkheid: ${r}`, async ({ page }) => {
    await page.goto(`/#/${r}`);
    await page.waitForTimeout(500);
    const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}
