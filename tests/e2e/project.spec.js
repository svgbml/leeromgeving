// B3: de projectvleugel (LU3) — de keuze die onthouden wordt, de opdrachtstatus, de rubrics.
//
// De projectdata verschilt sterk per module: alleen Eiwitten in interactie heeft drie projecten,
// opdrachten én rubrics. Die module is daarom het ijkpunt. Een module zonder projectkeuzes wordt
// apart getoetst, want dat is de toestand van de meeste modules en mag geen stuk scherm geven.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fouten = [];
test.beforeEach(async ({ page }) => {
  fouten.length = 0;
  page.on("pageerror", e => fouten.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fouten.push(m.text()); });
});
test.afterEach(() => expect(fouten, fouten.join("\n")).toEqual([]));

const PROJECTMODULE = "eiwitten-in-interactie";
// Een module kiezen en wachten tot dat echt is doorgevoerd. Zonder die wachtregel liep de
// volgende page.goto soms vooruit op het opslaan van de keuze, en opende het scherm met de
// vórige module; dat maakte meerdere tests hier wisselvallig.
const kiesModule = async (page, id) => {
  await page.goto("/#/vandaag");
  await page.locator("#module").selectOption(id);
  await expect(page.locator("#module")).toHaveValue(id);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("leeromgeving:module") || "null")))
    .toBe(id);
};

const ROUTES = ["project/verhaal", "project/doel", "project/protocollen", "project/inleveren",
  "project/rubrics", "project/opdrachten"];

test("de projectvleugel heeft zijn zes tabs en opent direct via de URL", async ({ page }) => {
  await page.goto("/#/project/verhaal");
  await expect(page.getByRole("heading", { level: 1, name: "Verhaal" })).toBeVisible();
  await expect(page).toHaveTitle(/^Verhaal · Project · /);
  await expect(page.locator("#tabs-vleugel a")).toHaveCount(6);
  await expect(page.locator("#tabs-vleugel a[data-route='project/rubrics']")).toBeVisible();
  await expect(page.locator("#vleugelkiezer a[data-vleugel=project]")).toHaveAttribute("aria-current", "true");
});

test("een module zonder projectkeuzes krijgt een lege toestand, geen fout", async ({ page }) => {
  await page.route("**/*.project.json", r => r.fulfill({
    json: { id: "leeg", vleugel: "project", projecten: [], opdrachten: [], rubrics: [], algemeen: [] }
  }));
  // Elk scherm zegt wat er bij hém ontbreekt; dat is niet één vaste zin.
  const VERWACHT = [
    ["project/verhaal", /niet in keuzes|nog geen projectinhoud/],
    ["project/doel", /niet in keuzes|nog geen projectinhoud/],
    ["project/opdrachten", /geen inleverlinks/]
  ];
  for (const [route, zin] of VERWACHT) {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main")).toContainText(zin);
  }
});

test("je kiest je project één keer; daarna onthoudt de app het", async ({ page }) => {
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/verhaal");
  // Zolang er niets gekozen is staat de vraag er, en noemt de subregel géén project: anders
  // leest het als een keuze die je niet hebt gemaakt.
  await expect(page.getByRole("heading", { level: 2, name: "Welk project doe je?" })).toBeVisible();
  await expect(page.locator(".sub")).toHaveText("Project · Eiwitten in interactie");

  await page.getByRole("button", { name: "Oncologie" }).click();
  await expect(page.locator("main")).toContainText("Je doet Oncologie");
  await expect(page.locator(".sub")).toContainText("Oncologie");
  await expect(page.getByRole("heading", { level: 2, name: "Welk project doe je?" })).toBeHidden();

  // De keuze geldt in de hele vleugel en overleeft een herlaadbeurt.
  await page.goto("/#/project/opdrachten");
  await expect(page.locator("main")).toContainText("Je doet Oncologie");
  await page.reload();
  await expect(page.locator("main")).toContainText("Je doet Oncologie");
});

test("met Ander project wissel je alsnog", async ({ page }) => {
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/verhaal");
  await page.getByRole("button", { name: "Oncologie" }).click();
  await page.getByRole("button", { name: "Ander project" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Ander project kiezen" })).toBeVisible();
  await page.getByRole("button", { name: "Forensisch" }).click();
  await expect(page.locator("main")).toContainText("Je doet Forensisch");
});

test("een bewaarde keuze die uit de data verdwijnt valt zichtbaar terug", async ({ page }) => {
  // De data wordt opnieuw gegenereerd zodra de cursus verandert; een keuze kan dus verdwijnen.
  // Dat mag geen leeg scherm geven, maar ook niet stil een ander project opdringen.
  await page.addInitScript(() => {
    localStorage.setItem("leeromgeving:projectkeuze", JSON.stringify({ "eiwitten-in-interactie": "weggehaald" }));
  });
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/verhaal");
  await expect(page.locator("main")).toContainText("bestaat niet meer in de data");
  await expect(page.getByRole("heading", { level: 2, name: /Welk project|Ander project/ })).toBeVisible();
});

test("de status van een opdracht loopt rond en blijft staan", async ({ page }) => {
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/opdrachten");
  await expect(page.getByRole("heading", { level: 2, name: "Te maken" })).toBeVisible();
  const knop = page.locator("[data-actie=status][data-id=lu3-rapportage]");
  await expect(knop).toHaveText("te doen");
  await knop.click();
  await expect(knop).toHaveText("bezig");
  await knop.click();
  await expect(knop).toHaveText("ingeleverd");
  await expect(page.locator("#opdrachtstand")).toContainText("1 van de");
  // De focus moet op de knop blijven, anders kun je er met het toetsenbord niet doorheen lopen.
  await expect(knop).toBeFocused();
  await page.reload();
  await expect(page.locator("[data-actie=status][data-id=lu3-rapportage]")).toHaveText("ingeleverd");
  // Herkansingen staan apart, niet tussen de te maken opdrachten.
  await expect(page.getByRole("heading", { level: 2, name: "Herkansingen" })).toBeVisible();
});

test("Inleveren zegt dat het de deadlines niet weet in plaats van een datum te verzinnen", async ({ page }) => {
  // Inmiddels heeft elke module een toetstabel, dus die wordt hier weggehouden. Zo blijft
  // toetsbaar wat het scherm doet zodra een module er geen heeft — een nieuwe module begint zo.
  await page.route("**/*.deadlines.json", r => r.fulfill({ status: 404, body: "" }));
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/inleveren");
  await expect(page.getByRole("heading", { level: 2, name: "Wat je inlevert" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Wanneer — dat weet deze app niet/ })).toBeVisible();
  await expect(page.locator("main")).toContainText("worden niet geraden");
});

test("Rubrics toont de vorm van elk formulier en waarschuwt bij de onzekere rubric", async ({ page }) => {
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/rubrics");
  await expect(page.getByRole("heading", { level: 2, name: "Presentatie (LU3)" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /Rapportage/ })).toBeVisible();
  // De rapportage-rubric is niet betrouwbaar ontleed; dat moet op het scherm staan.
  await expect(page.locator(".waarschuwing")).toContainText(/NIET betrouwbaar/);

  // Zelfbeoordeling: het niveau erboven moet omhoog wijzen, ook in een lijst die van
  // onvoldoende naar zeer goed loopt in plaats van omgekeerd.
  const kiezer = page.locator('[data-rubric="presentatie-lu3"] select').first();
  await kiezer.selectOption("matig");
  const boven = page.locator('[data-rubric="presentatie-lu3"] [data-boven="0"]');
  await expect(boven).toContainText("Voor voldoende");
  // Dit formulier heeft lege niveaukolommen; er wordt dus geen beschrijving verzonnen.
  await expect(boven).toContainText("geen beschrijving");
});

test("Doel en hypothese worden per project bewaard", async ({ page }) => {
  await kiesModule(page, PROJECTMODULE);
  await page.goto("/#/project/verhaal");
  await page.getByRole("button", { name: "Oncologie" }).click();
  await page.goto("/#/project/doel");
  await page.locator("[data-invoer=doel]").fill("Bepalen of NSE een terugval voorspelt.");
  await expect(page.locator("#doelstand")).toContainText("Opgeslagen");
  await page.reload();
  await expect(page.locator("[data-invoer=doel]")).toHaveValue("Bepalen of NSE een terugval voorspelt.");

  // Een ander project krijgt een leeg vel; je tekst wordt niet overschreven.
  await page.goto("/#/project/verhaal");
  await page.getByRole("button", { name: "Ander project" }).click();
  await page.getByRole("button", { name: "Forensisch" }).click();
  await page.goto("/#/project/doel");
  await expect(page.locator("[data-invoer=doel]")).toHaveValue("");
});

test("Protocollen hergebruikt de labhandleidingen en maakt geen tweede lijst", async ({ page }) => {
  // Biomoleculen heeft wél labsessies; de projectvleugel wijst daarnaar terug in plaats van
  // de protocollen te kopiëren naar de projectdata.
  await page.goto("/#/project/protocollen");
  await expect(page.getByRole("heading", { level: 1, name: "Protocollen" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Protocollen van deze module" })).toBeVisible();
  await page.locator(".kernlijst a").first().click();
  await expect(page).toHaveURL(/#\/lab\/protocollen/);
});

for (const route of ROUTES) {
  test(`toegankelijkheid: ${route}`, async ({ page }) => {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForTimeout(300);
    const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}
