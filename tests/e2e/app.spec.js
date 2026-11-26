// Klikt door de belangrijkste schermen zoals een student dat doet.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// De plasmidebouwer hoort bij één module; die moet dus gekozen zijn voordat het scherm bestaat.
const PLASMIDE_MODULE = "dna-kraak-de-code";
async function ga(page, route) {
  if (route === "plasmide") {
    await page.goto("/#/vandaag");
    await page.selectOption("#module", PLASMIDE_MODULE);
  }
  await page.goto(`/#/${route}`);
}

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
  // Eén kaart per module; het aantal volgt data/modules.json, dus niet vastpinnen op een getal.
  const modules = await page.locator("#module option").count();
  expect(modules).toBeGreaterThan(1);
  await expect(page.locator(".dash-card")).toHaveCount(modules);
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
  // Eerst wachten tot de app klaar is met opstarten, anders schrijft die zijn eigen keuze er weer overheen.
  await expect(page.locator("#main .sub")).toBeVisible();
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

test("plasmidebouwer: controleert de constructie en hoort bij één module", async ({ page }) => {
  await ga(page, "plasmide");
  await expect(page.getByRole("heading", { level: 1, name: "Plasmidebouwer" })).toBeVisible();
  // Opdracht met een C-terminale HIS-tag; de klassieke fout is een stopcodon vóór de tag.
  await page.locator('[data-actie=kiesOpdracht][data-id="his-c"]').click();
  for (const id of ["prom-pro", "rbs", "atg", "gen", "stop", "his", "stop", "term", "ori", "marker"]) {
    await page.locator(`[data-actie=voegToe][data-id="${id}"]`).click();
  }
  await expect(page.locator(".pl-chip")).toHaveCount(10);
  await page.locator("[data-actie=controleer]").click();
  await expect(page.locator(".pl-b-fout").first()).toContainText("Stopcodon vóór HIS");
  // Het voorbeeldantwoord van dezelfde opdracht moet wél kloppen.
  await page.locator("[data-actie=voorbeeld]").click();
  await expect(page.locator("#pl-u-kop")).toHaveText("Dit plasmide klopt");
  await expect(page.locator(".pl-b-fout")).toHaveCount(0);
  // Bij een andere module verdwijnt de tab en blijf je niet op het scherm staan.
  await page.selectOption("#module", "dna-ontrafeld");
  await expect(page.locator(".tabs [data-route=plasmide]")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Vandaag" })).toBeVisible();
});

test("telefoon: geen horizontaal scrollen", async ({ page }) => {
  await page.goto("/#/vandaag");
  for (const r of ["vandaag", "begrippen", "flashcards", "toets", "plasmide", "videos", "verslag", "voortgang", "instellingen"]) {
    await ga(page, r);
    // De plasmidebouwer met de langste constructie erin: die moet binnen zijn eigen schuifbalk blijven.
    if (r === "plasmide") {
      await page.goto("/#/plasmide?opdracht=transcriptioneel");
      await page.locator("[data-actie=voorbeeld]").click();
      await expect(page.locator(".pl-chip")).toHaveCount(12);
    }
    await page.waitForTimeout(300);
    const breed = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(breed, r).toBeLessThanOrEqual(1);
  }
});

// Toegankelijkheid (#81): geen ernstige of kritieke overtredingen van WCAG 2.1 AA.
for (const r of ["vandaag", "begrippen", "flashcards", "toets", "plasmide", "videos", "verslag", "voortgang", "instellingen"]) {
  test(`toegankelijkheid: ${r}`, async ({ page }) => {
    await ga(page, r);
    await page.waitForTimeout(500);
    const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("elke toetsvraag is te melden, ook een rekenvraag zonder kaart", async ({ page }) => {
  // Melden gebeurt in de site zelf: de melding komt in deze browser te staan en is daarna bij
  // Instellingen te lezen. Bij een rekenvraag hoort het antwoord dat de app juist vindt in de
  // context te staan — anders valt niet na te rekenen wat er precies mis is.
  await page.goto("/#/toets");
  await page.getByRole("button", { name: /Start|Begin/ }).first().click();
  const meld = page.locator(".vraag-meld button.meld");
  await expect(meld).toBeVisible();
  await meld.click();
  const dlg = page.locator("dialog.dlg-meld");
  await expect(dlg).toBeVisible();
  await dlg.getByRole("group").click();                 // <details> met de context openklappen
  await expect(dlg.locator(".meld-pre")).toContainText("**Module:**");
  await expect(dlg.locator(".meld-pre")).toContainText("**Vraag:**");
  await dlg.locator("#meld-tekst").fill("Het juiste antwoord klopt niet met mijn berekening.");
  await dlg.getByRole("button", { name: "Melding bewaren" }).click();
  await expect(dlg).toBeHidden();

  await page.goto("/#/instellingen");
  const kaart = page.locator(".card.instel", { hasText: "Meldingen" }).first();
  await expect(kaart).toContainText("Het juiste antwoord klopt niet met mijn berekening.");
});
