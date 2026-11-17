// End-to-end-tests (#80) en toegankelijkheid (#81) op de gebouwde site (_site).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure", locale: "nl-NL", timezoneId: "Europe/Amsterdam", reducedMotion: "reduce", serviceWorkers: "block" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "telefoon", use: { ...devices["Pixel 7"] } }
  ],
  webServer: { command: "node tools/serve.js _site 4173", url: "http://localhost:4173", reuseExistingServer: !process.env.CI }
});
