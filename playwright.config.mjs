// Browser smoke tests: npx playwright test (builds are served by `vite preview`).
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npx vite preview --port 4173 --strictPort", url: "http://localhost:4173", reuseExistingServer: !process.env.CI, timeout: 60000 },
});
