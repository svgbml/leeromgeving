// B5: samenhang tussen de vleugels — wat er op Vandaag buiten de theorie staat, de stand per
// vleugel op Voortgang, en het zoeken over alle vleugels heen.
//
// Deze drie dingen hangen aan data uit álle modules, dus ze laden los van het scherm eromheen.
// Daarom wacht elke test op de kaart zelf en niet alleen op de kop.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const fouten = [];
test.beforeEach(async ({ page }) => {
  fouten.length = 0;
  page.on("pageerror", e => fouten.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fouten.push(m.text()); });
});
test.afterEach(() => expect(fouten, fouten.join("\n")).toEqual([]));

test("Vandaag toont wat er buiten de theorie open staat (5.1)", async ({ page }) => {
  await page.goto("/#/vandaag");
  const kaart = page.locator("#dash-vleugels");
  await expect(kaart.getByRole("heading", { name: "Buiten de theorie" })).toBeVisible();
  await expect(kaart).toContainText(/labsessies/);
  await expect(kaart).toContainText(/opdrachten open/);
  // Een tijdlijn is het niet, en dat moet er staan: er zijn geen inleverdata.
  await expect(kaart).toContainText("niet op datum");
});

test("vanaf Vandaag spring je naar de juiste module én vleugel", async ({ page }) => {
  await page.goto("/#/vandaag");
  const knop = page.locator('#dash-vleugels [data-naar="project/opdrachten"]').first();
  await expect(knop).toBeVisible();
  const mod = await knop.getAttribute("data-id");
  await knop.click();
  await expect(page).toHaveURL(/#\/project\/opdrachten/);
  await expect(page.locator("#module")).toHaveValue(mod);
});

test("Voortgang zet de drie vleugels naast elkaar met één getal (5.2)", async ({ page }) => {
  await page.goto("/#/voortgang");
  const kaart = page.locator("#vg-vleugels");
  await expect(kaart.getByRole("heading", { name: "Per vleugel" })).toBeVisible();
  await expect(kaart).toContainText(/onderdelen klaar/);
  await expect(kaart).toContainText("Theorie");
  await expect(kaart).toContainText("Lab");
  await expect(kaart).toContainText("Project");
  // Het totaal telt onderdelen op; dat staat er ook zo bij, want anders lijkt het een gemiddelde.
  await expect(kaart).toContainText("telt onderdelen op, geen percentages");

  // De balk van het geheel is de som van de vleugels, niet een gemiddelde van percentages.
  const samen = kaart.locator('[role=progressbar]').first();
  const max = Number(await samen.getAttribute("aria-valuemax"));
  const delen = kaart.locator('[role=progressbar]');
  let som = 0;
  for (let i = 1; i < await delen.count(); i++) som += Number(await delen.nth(i).getAttribute("aria-valuemax"));
  expect(max).toBe(som);
});

test("Voortgang telt herkansingen niet mee in de projectstand", async ({ page }) => {
  await page.goto("/#/voortgang");
  await expect(page.locator("#vg-vleugels")).toContainText(/herkansing(en)? niet meegeteld/);
});

test("een afgevinkte uitwerking komt terug in de labstand", async ({ page }) => {
  await page.goto("/#/lab/analyse");
  const vakje = page.locator(".kernlijst input[type=checkbox]").first();
  await vakje.check();
  await page.goto("/#/voortgang");
  await expect(page.locator("#vg-vleugels")).toContainText(/Lab — 1 van \d+ uitwerkingen afgevinkt/);
});

test("zoeken vindt werk buiten de theorie en wisselt daarvoor van module (5.3)", async ({ page }) => {
  await page.goto("/#/begrippen?q=elisa");
  const blok = page.locator("#anderevleugels");
  await expect(blok).toContainText("Ook buiten de theorie");
  // ELISA is een labsessie van een andere module dan de standaardmodule.
  const knop = blok.locator("[data-actie=naarTreffer]").first();
  await expect(blok).toContainText("andere module");
  await knop.click();
  await expect(page).toHaveURL(/#\/lab\/protocollen\?sessie=\d+/);
  await expect(page.locator("#module")).toHaveValue("eiwitten-in-de-praktijk");
  await expect(page.locator(".sub")).toContainText(/ELISA/i);
});

test("zoeken naar iets wat alleen in het project staat werkt ook", async ({ page }) => {
  await page.goto("/#/begrippen?q=rapportage");
  await expect(page.locator("#anderevleugels")).toContainText(/opdracht|herkansing/);
});

test("zoeken op één teken levert geen blok buiten de theorie op", async ({ page }) => {
  // Eén teken raakt bijna alles; dan is het geen hulp maar ruis.
  await page.goto("/#/begrippen?q=a");
  await expect(page.locator("#anderevleugels")).toBeEmpty();
});

test("het zoekblok verdwijnt als je het zoekveld leegmaakt", async ({ page }) => {
  await page.goto("/#/begrippen?q=elisa");
  await expect(page.locator("#anderevleugels")).toContainText("Ook buiten de theorie");
  await page.locator("#q").fill("");
  await expect(page.locator("#anderevleugels")).toBeEmpty();
});

test("de samenhang gaat niet onderuit als lab en project leeg zijn", async ({ page }) => {
  await page.route("**/*.lab.json", r => r.fulfill({ json: { vleugel: "lab", sessies: [] } }));
  await page.route("**/*.project.json", r => r.fulfill({ json: { vleugel: "project", opdrachten: [], projecten: [] } }));
  await page.goto("/#/vandaag");
  await expect(page.locator("#dash-vleugels")).toContainText("nog niets te zien");
  await page.goto("/#/voortgang");
  // Theorie heeft wél kaarten, dus er is een stand; alleen lab en project melden dat ze leeg zijn.
  await expect(page.locator("#vg-vleugels")).toContainText("niets in de data");
});

for (const route of ["vandaag", "voortgang", "begrippen?q=elisa"]) {
  test(`toegankelijkheid met de samenhang erbij: ${route}`, async ({ page }) => {
    await page.goto(`/#/${route}`);
    await expect(page.locator("main h1")).toBeVisible();
    // Wachten tot de losgeladen kaarten er staan, anders toetst axe het skelet.
    await page.waitForTimeout(1200);
    const uitslag = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const ernstig = uitslag.violations.filter(v => ["serious", "critical"].includes(v.impact));
    expect(ernstig.map(v => `${v.id}: ${v.help} (${v.nodes.length}×) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

// ---------- de deadlinetabel van een module (B5-correctie) ----------

test("Inleveren toont de inlevermomenten van de module en telt alleen bij een datum af", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("leeromgeving:module", JSON.stringify("dna-kraak-de-code")));
  await page.goto("/#/project/inleveren");
  const kaart = page.locator(".card", { has: page.getByRole("heading", { level: 2, name: "Wanneer" }) });
  await expect(kaart).toBeVisible();
  // De drie leeruitkomsten staan er, want de tabel van de opleiding loopt over LU1 t/m LU3.
  await expect(kaart).toContainText("LU1");
  await expect(kaart).toContainText("LU2");
  await expect(kaart).toContainText("LU3");
  // Een echte datum krijgt een aftelling erbij.
  await expect(kaart).toContainText(/23:59u — (vandaag|morgen|over \d+ dagen|geweest)/);
  // Een week blijft een week; daar wordt geen datum van gemaakt.
  await expect(kaart).toContainText("week 4");
  await expect(kaart).toContainText("2 dagen na elke les");
  await expect(kaart).not.toContainText("week 4 — over");
});

test("een module zonder deadlinetabel zegt dat het de datums niet weet", async ({ page }) => {
  // Elke module heeft inmiddels een toetstabel, dus die wordt hier weggehouden.
  await page.route("**/*.deadlines.json", r => r.fulfill({ status: 404, body: "" }));
  await page.goto("/#/project/inleveren");
  await expect(page.getByRole("heading", { level: 2, name: /Wanneer — dat weet deze app niet/ })).toBeVisible();
  await expect(page.locator("main")).toContainText("worden niet geraden");
});

test("Vandaag noemt de eerstvolgende deadline met een echte datum", async ({ page }) => {
  await page.goto("/#/vandaag");
  const kaart = page.locator("#dash-vleugels");
  await expect(kaart).toContainText("Eerstvolgende deadline");
  await expect(kaart).toContainText(/— (vandaag|morgen|over \d+ dagen)/);
});
