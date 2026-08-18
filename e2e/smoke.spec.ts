import { test, expect } from "@playwright/test";

// Fluxo E2E (README 120, 184): login -> dashboard -> conectar conta -> agendar.
// Pré-requisitos: `docker compose up -d`, `npm run db:seed`, `npm run dev`, `npm run worker`.
// Usuário demo do seed: demo@postador.dev / demo12345

test("home mostra chamadas para login/cadastro", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Postador Insta/ })).toBeVisible();
});

test("login do usuário demo cai no dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("demo@postador.dev");
  await page.getByPlaceholder("senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("navega para Contas e Mídia a partir do dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("demo@postador.dev");
  await page.getByPlaceholder("senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");

  await page.getByRole("link", { name: "Contas", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: /Contas do Instagram/ })).toBeVisible();

  await page.goto("/media");
  await expect(page.getByRole("heading", { name: /Biblioteca de mídia/ })).toBeVisible();
});

test("agendar exige conta conectada e vídeo pronto", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("email").fill("demo@postador.dev");
  await page.getByPlaceholder("senha").fill("demo12345");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard");

  await page.goto("/schedule");
  await expect(page.getByRole("heading", { name: /Agendar publicação/ })).toBeVisible();
});
