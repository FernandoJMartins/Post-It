import { defineConfig, devices } from "@playwright/test";

// E2E (README 120). Requer app rodando e browsers instalados:
//   npx playwright install chromium
//   npm run dev   (em outro terminal)   e   docker compose up -d
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
