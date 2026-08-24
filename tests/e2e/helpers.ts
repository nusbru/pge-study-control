import crypto from "node:crypto";
import { expect, type Page } from "@playwright/test";

export const testPassword = "correct horse";

export function uniqueEmail(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

export async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1$/);
}

export async function login(page: Page, email: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(testPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function registerAndLogin(page: Page, prefix: string) {
  const email = uniqueEmail(prefix);
  await register(page, email);
  await login(page, email);
  return email;
}

type SessionInput = {
  studyDate: string;
  subject: string;
  totalQuestions: string;
  correctAnswers: string;
  questionListUrl?: string;
  wrongQuestionListUrl?: string;
};

export async function createSession(page: Page, input: SessionInput) {
  await page.goto("/sessions/new");
  await page.getByLabel("Data do estudo").fill(input.studyDate);
  await page.getByLabel("Assunto").fill(input.subject);
  await page.getByRole("spinbutton", { name: "Total de questões", exact: true }).fill(input.totalQuestions);
  await page.getByRole("spinbutton", { name: "Acertos", exact: true }).fill(input.correctAnswers);
  if (input.questionListUrl) {
    await page.getByLabel("Link da lista de questões").fill(input.questionListUrl);
  }
  if (input.wrongQuestionListUrl) {
    await page.getByLabel("Link da lista de erros").fill(input.wrongQuestionListUrl);
  }
  await page.getByRole("button", { name: "Salvar sessão" }).click();
  await expect(page).toHaveURL(/\/sessions$/);
}
