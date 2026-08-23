# PGE Study Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, self-hosted web platform where each PGE candidate securely records study sessions and sees weighted question performance by subject and period.

**Architecture:** Use a modular Next.js App Router monolith. Server Actions call focused application services, Prisma persists data in PostgreSQL, Auth.js supplies credentials authentication with JWT-backed sessions, and pure domain functions own calculations and normalization. Docker Compose runs PostgreSQL, a one-shot migration container, and the standalone Next.js application.

**Tech Stack:** Node.js 22, Next.js 16.3.2, React 19.2.8, TypeScript, Auth.js (`next-auth` 5.0.0-beta.32 pinned), Prisma 7.9.1, PostgreSQL 17, Zod 4.4.3, bcryptjs 3.0.3, Vitest 4.1.11, Testing Library, Playwright 1.62.1, CSS Modules.

## Global Constraints

- Treat `docs/superpowers/specs/2026-08-23-pge-study-control-design.md` as the source of truth.
- Keep the application a single deployable Next.js monolith; do not add a separate API or service.
- Use npm and commit `package-lock.json`; require Node.js 22.x in `.nvmrc` and `package.json#engines`.
- Pin the Auth.js beta exactly to `5.0.0-beta.32`; do not accept a floating beta range.
- Keep all user-facing copy in Brazilian Portuguese.
- Use server-derived `userId` for every private read and mutation; never accept it from form or URL input.
- Store `studyDate` as a PostgreSQL `date`, not a timestamp.
- Store resolved counts, but derive percentages at read time and display one decimal place.
- Keep subjects free-form; group by trimmed, collapsed-space, lowercase `subjectKey` while preserving display text.
- Accept only HTTP/HTTPS external URLs and open them with `target="_blank" rel="noreferrer"`.
- Preserve the Editorial juridico visual direction: `#f7f7f4` paper, `#25283a` ink, `#e95d3f` coral/error, and `#4a568c` correct/structure.
- Support all essential behavior at desktop and mobile widths without horizontal overflow.
- Use TDD for domain behavior, database behavior, authentication, and user flows.
- Do not commit secrets, `.env` files, generated Prisma client output, test artifacts, or `.superpowers/`.

---

## Planned File Structure

```text
.
├── prisma/
│   ├── migrations/202608230001_init/migration.sql
│   └── schema.prisma
├── scripts/
│   ├── run-e2e-tests.sh
│   └── run-integration-tests.sh
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (auth)/register/page.tsx
│   │   ├── (protected)/dashboard/page.tsx
│   │   ├── (protected)/layout.tsx
│   │   ├── (protected)/sessions/[id]/edit/page.tsx
│   │   ├── (protected)/sessions/new/page.tsx
│   │   ├── (protected)/sessions/page.tsx
│   │   ├── api/auth/[...nextauth]/route.ts
│   │   ├── api/health/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── generated/prisma/               # generated and gitignored
│   ├── lib/auth-user.ts
│   ├── lib/prisma.ts
│   ├── modules/auth/
│   │   ├── actions.ts
│   │   ├── auth-form.module.css
│   │   ├── login-form.tsx
│   │   ├── password.ts
│   │   ├── register-form.tsx
│   │   └── schema.ts
│   ├── modules/dashboard/
│   │   ├── dashboard.module.css
│   │   ├── performance-bars.tsx
│   │   ├── period.ts
│   │   └── queries.ts
│   ├── modules/study-sessions/
│   │   ├── actions.ts
│   │   ├── domain.ts
│   │   ├── repository.ts
│   │   ├── schema.ts
│   │   ├── session-form.module.css
│   │   ├── session-form.tsx
│   │   ├── session-list.module.css
│   │   └── session-list.tsx
│   ├── auth.ts
│   └── types/next-auth.d.ts
├── tests/
│   ├── e2e/auth-and-sessions.spec.ts
│   ├── e2e/responsive.spec.ts
│   ├── integration/auth/registration.test.ts
│   ├── integration/dashboard/queries.test.ts
│   ├── integration/study-sessions/repository.test.ts
│   ├── unit/dashboard/period.test.ts
│   ├── unit/study-sessions/domain.test.ts
│   └── unit/study-sessions/schema.test.ts
├── .dockerignore
├── .env.example
├── .env.test.example
├── .nvmrc
├── compose.test.yaml
├── compose.yaml
├── Dockerfile
├── next.config.ts
├── playwright.config.ts
├── prisma.config.ts
├── vitest.config.ts
└── vitest.integration.config.ts
```

## Task 1: Bootstrap The Application And Test Harness

**Files:**
- Create: `package.json`, `package-lock.json`, `.nvmrc`, `tsconfig.json`, `next-env.d.ts`, `eslint.config.mjs`, `next.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/unit/app/home.test.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:unit`, `test:integration`, and `test:e2e`.
- Produces: shared CSS tokens used by all later UI tasks.

- [ ] **Step 1: Initialize Git and install the pinned Next.js application dependencies**

Run:

```bash
git init
npm init --yes
npm install next@16.3.2 react@19.2.8 react-dom@19.2.8 next-auth@5.0.0-beta.32 @prisma/client@7.9.1 @prisma/adapter-pg@7.9.1 pg zod@4.4.3 bcryptjs@3.0.3 dotenv
npm install --save-dev typescript@5.9.3 @types/node @types/react @types/react-dom @types/pg eslint eslint-config-next@16.3.2 prisma@7.9.1 vitest@4.1.11 jsdom @vitejs/plugin-react vite-tsconfig-paths @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test@1.62.1 @axe-core/playwright
```

Set `.nvmrc` to `22` and add this exact engine constraint:

```json
{
  "engines": {
    "node": ">=22 <23"
  }
}
```

Extend `.gitignore` with:

```gitignore
node_modules/
.next/
src/generated/prisma/
.env
.env.*
!.env.example
!.env.test.example
coverage/
playwright-report/
test-results/
.superpowers/
```

Use this compiler configuration and the standard generated `next-env.d.ts`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

Configure `eslint.config.mjs` with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Set `next.config.ts` to `export default {}` until Task 8 enables standalone output.

- [ ] **Step 2: Write a failing home-page smoke test**

```tsx
// tests/unit/app/home.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("identifies the product and offers authentication", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /pge study/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /entrar/i })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /criar conta/i })).toHaveAttribute("href", "/register");
  });
});
```

- [ ] **Step 3: Configure Vitest and verify the test fails**

```ts
// vitest.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

Run: `npm run test:unit -- tests/unit/app/home.test.tsx`

Expected: FAIL because the scaffolded page does not expose the required heading and links.

- [ ] **Step 4: Implement the shell and Editorial juridico tokens**

Use these root tokens in `src/app/globals.css`:

```css
:root {
  --paper: #f7f7f4;
  --surface: #ffffff;
  --ink: #25283a;
  --muted: #747680;
  --line: #e6e6df;
  --accent: #e95d3f;
  --correct: #4a568c;
  --danger: #e95d3f;
  --radius: 1rem;
}

* { box-sizing: border-box; }
html { background: var(--paper); color: var(--ink); }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; }
a { color: inherit; }
button, input { font: inherit; }
```

Implement `src/app/page.tsx` as a focused landing page with an `h1` containing `PGE Study`, a one-sentence product description, and links to `/login` and `/register`. Do not build marketing sections outside the MVP.

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <p>Controle de estudos para concursos da PGE</p>
      <h1>PGE Study</h1>
      <p>Registre questões, acompanhe acertos e transforme erros em direção de estudo.</p>
      <nav aria-label="Acesso à plataforma">
        <Link href="/login">Entrar</Link>
        <Link href="/register">Criar conta</Link>
      </nav>
    </main>
  );
}
```

- [ ] **Step 5: Add scripts and verify the foundation**

Use these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test"
  }
}
```

Run: `npm run test:unit -- tests/unit/app/home.test.tsx`

Expected: PASS.

Run: `npm run lint`, `npm run typecheck`, and `npm run build`.

Expected: all exit with status 0.

- [ ] **Step 6: Commit the foundation**

```bash
git add .gitignore .nvmrc package.json package-lock.json tsconfig.json next-env.d.ts eslint.config.mjs next.config.ts src/app tests/setup.ts tests/unit/app vitest.config.ts
git commit -m "chore: bootstrap Next.js application"
```

## Task 2: Implement Study-Session Domain Rules

**Files:**
- Create: `src/modules/study-sessions/domain.ts`
- Create: `src/modules/study-sessions/schema.ts`
- Create: `tests/unit/study-sessions/domain.test.ts`
- Create: `tests/unit/study-sessions/schema.test.ts`

**Interfaces:**
- Produces: `normalizeSubject(value: string): { subject: string; subjectKey: string }`.
- Produces: `resolveQuestionCounts(input: QuestionCountInput): ResolvedQuestionCounts`.
- Produces: `percentage(part: number, total: number): number`.
- Produces: `studySessionInputSchema` and `StudySessionInput` for actions and forms.

- [ ] **Step 1: Write failing tests for normalization, all three calculations, and percentages**

```ts
// tests/unit/study-sessions/domain.test.ts
import { describe, expect, it } from "vitest";
import { normalizeSubject, percentage, resolveQuestionCounts } from "@/modules/study-sessions/domain";

describe("study-session domain", () => {
  it("normalizes case and repeated whitespace without losing display spelling", () => {
    expect(normalizeSubject("  Direito   Civil ")).toEqual({
      subject: "Direito Civil",
      subjectKey: "direito civil",
    });
  });

  it.each([
    [{ totalQuestions: 50, correctAnswers: 30 }, { totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20 }],
    [{ correctAnswers: 30, wrongAnswers: 20 }, { totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20 }],
    [{ totalQuestions: 50, wrongAnswers: 20 }, { totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20 }],
  ])("resolves %o", (input, expected) => {
    expect(resolveQuestionCounts(input)).toEqual(expected);
  });

  it("rejects inconsistent resolved values", () => {
    expect(() => resolveQuestionCounts({ totalQuestions: 50, correctAnswers: 30, wrongAnswers: 30 }))
      .toThrow("O total deve ser igual à soma de acertos e erros.");
  });

  it("rounds percentages to one decimal place", () => {
    expect(percentage(2, 3)).toBe(66.7);
  });
});
```

- [ ] **Step 2: Run the domain test and confirm RED**

Run: `npm run test:unit -- tests/unit/study-sessions/domain.test.ts`

Expected: FAIL with module-not-found for `domain.ts`.

- [ ] **Step 3: Implement the pure domain functions**

```ts
// src/modules/study-sessions/domain.ts
export type QuestionCountInput = {
  totalQuestions?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
};

export type ResolvedQuestionCounts = Required<QuestionCountInput>;

const COUNT_MAX = 1_000_000;

export function normalizeSubject(value: string) {
  const subject = value.trim().replace(/\s+/g, " ");
  if (!subject || subject.length > 120) throw new Error("Informe um assunto com até 120 caracteres.");
  return { subject, subjectKey: subject.toLocaleLowerCase("pt-BR") };
}

export function resolveQuestionCounts(input: QuestionCountInput): ResolvedQuestionCounts {
  const entries = Object.values(input).filter((value) => value !== undefined);
  if (entries.length < 2) throw new Error("Informe pelo menos dois valores.");
  for (const value of entries) {
    if (!Number.isInteger(value) || value! < 0 || value! > COUNT_MAX) {
      throw new Error("Use números inteiros entre 0 e 1.000.000.");
    }
  }

  const totalQuestions = input.totalQuestions ?? input.correctAnswers! + input.wrongAnswers!;
  const correctAnswers = input.correctAnswers ?? totalQuestions - input.wrongAnswers!;
  const wrongAnswers = input.wrongAnswers ?? totalQuestions - correctAnswers;

  if (totalQuestions <= 0) throw new Error("O total deve ser maior que zero.");
  if (correctAnswers < 0 || wrongAnswers < 0 || totalQuestions !== correctAnswers + wrongAnswers) {
    throw new Error("O total deve ser igual à soma de acertos e erros.");
  }
  return { totalQuestions, correctAnswers, wrongAnswers };
}

export function percentage(part: number, total: number) {
  if (total <= 0) throw new Error("Não é possível calcular percentual com total zero.");
  return Math.round((part / total) * 1_000) / 10;
}
```

- [ ] **Step 4: Write failing schema tests for dates, URLs, empty optional fields, and count limits**

```ts
// tests/unit/study-sessions/schema.test.ts
import { describe, expect, it } from "vitest";
import { studySessionInputSchema } from "@/modules/study-sessions/schema";

const valid = {
  studyDate: "2026-08-23",
  subject: "Direito Constitucional",
  totalQuestions: "50",
  correctAnswers: "30",
  wrongAnswers: "",
  questionListUrl: "https://questoes.example/lista/1",
  wrongQuestionListUrl: "",
};

describe("studySessionInputSchema", () => {
  it("parses form strings and resolves the missing count", () => {
    expect(studySessionInputSchema.parse(valid)).toMatchObject({
      studyDate: "2026-08-23",
      totalQuestions: 50,
      correctAnswers: 30,
      wrongAnswers: 20,
      wrongQuestionListUrl: null,
    });
  });

  it.each(["javascript:alert(1)", "ftp://example.com/a", "not-a-url"])("rejects unsafe URL %s", (url) => {
    expect(studySessionInputSchema.safeParse({ ...valid, questionListUrl: url }).success).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    expect(studySessionInputSchema.safeParse({ ...valid, studyDate: "2026-02-31" }).success).toBe(false);
  });
});
```

- [ ] **Step 5: Implement the server-authoritative Zod schema**

Create preprocessors that convert `""` to `undefined`, numeric strings to numbers, and empty URLs to `null`. Validate `YYYY-MM-DD` by round-tripping UTC year, month, and day. In `transform`, call `normalizeSubject` and `resolveQuestionCounts`:

```ts
// src/modules/study-sessions/schema.ts
import { z } from "zod";
import { normalizeSubject, resolveQuestionCounts } from "./domain";

const optionalCount = z.preprocess(
  (value) => value === "" || value === null ? undefined : typeof value === "string" ? Number(value) : value,
  z.number().int().min(0).max(1_000_000).optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.string().max(2_048).refine((value) => {
    try { return ["http:", "https:"].includes(new URL(value).protocol); }
    catch { return false; }
  }, "Informe uma URL HTTP ou HTTPS válida.").nullable(),
);

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const rawStudySessionSchema = z.object({
  studyDate: z.string().refine(isCalendarDate, "Informe uma data válida."),
  subject: z.string(),
  totalQuestions: optionalCount,
  correctAnswers: optionalCount,
  wrongAnswers: optionalCount,
  questionListUrl: optionalHttpUrl,
  wrongQuestionListUrl: optionalHttpUrl,
});

export const studySessionInputSchema = rawStudySessionSchema.transform((data, context) => {
  try {
    return {
      studyDate: data.studyDate,
      ...normalizeSubject(data.subject),
      ...resolveQuestionCounts(data),
      questionListUrl: data.questionListUrl,
      wrongQuestionListUrl: data.wrongQuestionListUrl,
    };
  } catch (error) {
    context.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Dados inválidos." });
    return z.NEVER;
  }
});

export type StudySessionInput = z.output<typeof studySessionInputSchema>;
```

- [ ] **Step 6: Verify domain and schema tests**

Run: `npm run test:unit -- tests/unit/study-sessions`

Expected: all tests PASS.

Run: `npm run typecheck` and `npm run lint`.

Expected: both exit 0.

- [ ] **Step 7: Commit domain rules**

```bash
git add src/modules/study-sessions/domain.ts src/modules/study-sessions/schema.ts tests/unit/study-sessions
git commit -m "feat: add study session domain rules"
```

## Task 3: Add PostgreSQL Persistence And Isolation

**Files:**
- Create: `prisma.config.ts`, `prisma/schema.prisma`
- Create: `prisma/migrations/202608230001_init/migration.sql`
- Create: `src/lib/prisma.ts`
- Create: `src/modules/study-sessions/repository.ts`
- Create: `compose.test.yaml`, `.env.test.example`, `vitest.integration.config.ts`, `scripts/run-integration-tests.sh`
- Create: `tests/integration/study-sessions/repository.test.ts`
- Modify: `.gitignore`, `package.json`

**Interfaces:**
- Consumes: `StudySessionInput` from Task 2.
- Produces: singleton `prisma`.
- Produces: `createSession`, `updateSession`, `deleteSession`, `getSession`, and `listSessions` repository functions; every function requires `userId`.

- [ ] **Step 1: Define the Prisma 7 configuration and schema**

```ts
// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String         @id @default(cuid())
  email        String         @unique @db.VarChar(254)
  passwordHash String         @map("password_hash") @db.VarChar(255)
  createdAt    DateTime       @default(now()) @map("created_at")
  updatedAt    DateTime       @updatedAt @map("updated_at")
  sessions     StudySession[]

  @@map("users")
}

model StudySession {
  id                   String   @id @default(cuid())
  userId               String   @map("user_id")
  studyDate            DateTime @map("study_date") @db.Date
  subject              String   @db.VarChar(120)
  subjectKey           String   @map("subject_key") @db.VarChar(120)
  totalQuestions       Int      @map("total_questions")
  correctAnswers       Int      @map("correct_answers")
  wrongAnswers         Int      @map("wrong_answers")
  questionListUrl      String?  @map("question_list_url") @db.VarChar(2048)
  wrongQuestionListUrl String?  @map("wrong_question_list_url") @db.VarChar(2048)
  createdAt            DateTime @default(now()) @map("created_at")
  updatedAt            DateTime @updatedAt @map("updated_at")
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, studyDate(sort: Desc)])
  @@index([userId, subjectKey, studyDate])
  @@map("study_sessions")
}
```

- [ ] **Step 2: Create the initial SQL migration with database constraints**

Generate the migration file with:

```bash
mkdir -p prisma/migrations/202608230001_init
DATABASE_URL='postgresql://pge:pge_test_only@localhost:5433/pge_test' npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/202608230001_init/migration.sql
```

Then append these constraints:

```sql
ALTER TABLE "study_sessions"
  ADD CONSTRAINT "study_sessions_total_positive" CHECK ("total_questions" > 0 AND "total_questions" <= 1000000),
  ADD CONSTRAINT "study_sessions_correct_range" CHECK ("correct_answers" >= 0 AND "correct_answers" <= 1000000),
  ADD CONSTRAINT "study_sessions_wrong_range" CHECK ("wrong_answers" >= 0 AND "wrong_answers" <= 1000000),
  ADD CONSTRAINT "study_sessions_counts_consistent" CHECK ("total_questions" = "correct_answers" + "wrong_answers");
```

Run: `DATABASE_URL=postgresql://pge:pge@localhost:5433/pge_test npx prisma generate`

Expected: generated client under `src/generated/prisma`.

- [ ] **Step 3: Add the Prisma singleton with PostgreSQL driver adapter**

```ts
// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL não configurada.");

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Write a failing integration test proving user isolation**

```ts
// tests/integration/study-sessions/repository.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession, getSession, updateSession } from "@/modules/study-sessions/repository";

describe("study session repository", () => {
  beforeEach(async () => {
    await prisma.studySession.deleteMany();
    await prisma.user.deleteMany();
  });

  it("never reads, updates, or deletes another user's session", async () => {
    const [owner, stranger] = await Promise.all([
      prisma.user.create({ data: { email: "owner@example.com", passwordHash: "hash" } }),
      prisma.user.create({ data: { email: "stranger@example.com", passwordHash: "hash" } }),
    ]);
    const session = await createSession(owner.id, {
      studyDate: "2026-08-23", subject: "Direito Civil", subjectKey: "direito civil",
      totalQuestions: 50, correctAnswers: 30, wrongAnswers: 20,
      questionListUrl: null, wrongQuestionListUrl: null,
    });

    await expect(getSession(stranger.id, session.id)).resolves.toBeNull();
    await expect(updateSession(stranger.id, session.id, { ...session, studyDate: "2026-08-23" })).resolves.toBeNull();
    await expect(deleteSession(stranger.id, session.id)).resolves.toBe(false);
  });
});
```

- [ ] **Step 5: Configure the disposable test database and verify RED**

`compose.test.yaml` must expose PostgreSQL 17 on host port 5433 with database `pge_test`, user `pge`, password `pge_test_only`, and a health check using `pg_isready`.

```yaml
services:
  db-test:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: pge_test
      POSTGRES_USER: pge
      POSTGRES_PASSWORD: pge_test_only
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pge -d pge_test"]
      interval: 2s
      timeout: 3s
      retries: 20
```

Configure `vitest.integration.config.ts` with `environment: "node"` and `include: ["tests/integration/**/*.test.ts"]`.

`scripts/run-integration-tests.sh` must use `set -eu`, start `compose.test.yaml`, export `DATABASE_URL=postgresql://pge:pge_test_only@localhost:5433/pge_test`, run `npx prisma migrate deploy`, run Vitest with `vitest.integration.config.ts`, and always stop the test stack through an `EXIT` trap.

```sh
#!/bin/sh
set -eu
docker compose -f compose.test.yaml up -d --wait
trap 'docker compose -f compose.test.yaml down -v' EXIT
export DATABASE_URL='postgresql://pge:pge_test_only@localhost:5433/pge_test'
npx prisma migrate deploy
npx vitest run --config vitest.integration.config.ts "$@"
```

Change the package script to `"test:integration": "sh scripts/run-integration-tests.sh"` so the final verification is self-contained.

Run: `sh scripts/run-integration-tests.sh tests/integration/study-sessions/repository.test.ts`

Expected: FAIL because repository functions do not exist.

- [ ] **Step 6: Implement ownership-scoped repository functions**

Use `new Date(`${input.studyDate}T00:00:00.000Z`)` at the persistence boundary. Use `findFirst({ where: { id, userId } })`, `updateMany({ where: { id, userId } })`, and `deleteMany({ where: { id, userId } })`; never use an ID-only mutation. `listSessions(userId, page)` must use `take: 20`, `skip: (page - 1) * 20`, order by `studyDate desc, createdAt desc`, and return records plus total page count.

Use this mutation result contract:

```ts
export type OwnedMutationResult<T> = T | null;

export async function updateSession(
  userId: string,
  id: string,
  input: StudySessionInput,
): Promise<OwnedMutationResult<StudySession>>;

export async function deleteSession(userId: string, id: string): Promise<boolean>;
```

Implement scoped mutations with these concrete patterns:

```ts
export async function updateSession(userId: string, id: string, input: StudySessionInput) {
  const result = await prisma.studySession.updateMany({
    where: { id, userId },
    data: { ...input, studyDate: new Date(`${input.studyDate}T00:00:00.000Z`) },
  });
  if (result.count === 0) return null;
  return prisma.studySession.findFirst({ where: { id, userId } });
}

export async function deleteSession(userId: string, id: string) {
  const result = await prisma.studySession.deleteMany({ where: { id, userId } });
  return result.count === 1;
}
```

- [ ] **Step 7: Verify persistence and constraints**

Add integration cases for pagination order, successful owner update/delete, and direct Prisma rejection of inconsistent counts.

Run: `sh scripts/run-integration-tests.sh tests/integration/study-sessions/repository.test.ts`

Expected: all tests PASS.

Run: `npm run typecheck` and `npm run lint`.

Expected: both exit 0.

- [ ] **Step 8: Commit persistence**

```bash
git add prisma prisma.config.ts src/lib/prisma.ts src/modules/study-sessions/repository.ts compose.test.yaml .env.test.example vitest.integration.config.ts scripts/run-integration-tests.sh package.json package-lock.json .gitignore tests/integration/study-sessions
git commit -m "feat: persist isolated study sessions"
```

## Task 4: Add Credentials Authentication

**Files:**
- Create: `src/modules/auth/schema.ts`, `src/modules/auth/password.ts`, `src/modules/auth/actions.ts`
- Create: `src/modules/auth/login-form.tsx`, `src/modules/auth/register-form.tsx`, `src/modules/auth/auth-form.module.css`
- Create: `src/auth.ts`, `src/types/next-auth.d.ts`, `src/lib/auth-user.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- Create: `src/app/(protected)/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/unit/app/home.test.tsx`
- Test: `tests/integration/auth/registration.test.ts`, `tests/unit/auth/schema.test.ts`

**Interfaces:**
- Produces: `registerUser(input)`, `registerAction`, and `loginAction`.
- Produces: Auth.js exports `handlers`, `auth`, `signIn`, and `signOut`.
- Produces: `requireUserId(): Promise<string>` for all private application services.

- [ ] **Step 1: Write failing validation and registration tests**

Cover normalized lowercase email, invalid email, password lengths 7/8/128/129, duplicate email, and bcrypt verification. The happy-path integration assertion is:

```ts
const result = await registerUser({ email: " Student@Example.COM ", password: "correct horse" });
expect(result).toEqual({ ok: true });
const stored = await prisma.user.findUniqueOrThrow({ where: { email: "student@example.com" } });
expect(stored.passwordHash).not.toBe("correct horse");
expect(await verifyPassword("correct horse", stored.passwordHash)).toBe(true);
```

Run: `npm run test:unit -- tests/unit/auth/schema.test.ts`

Expected: FAIL because auth schema does not exist.

Run: `sh scripts/run-integration-tests.sh tests/integration/auth/registration.test.ts`

Expected: FAIL because registration service does not exist.

- [ ] **Step 2: Implement schema, password hashing, and registration**

Use Zod to trim/lowercase email, enforce maximum 254 characters, and enforce password length 8-128. Hash with bcrypt cost 12:

```ts
// src/modules/auth/password.ts
import { compare, hash } from "bcryptjs";
export const hashPassword = (password: string) => hash(password, 12);
export const verifyPassword = (password: string, passwordHash: string) => compare(password, passwordHash);
```

`registerUser` must catch Prisma error code `P2002` and return `{ ok: false, fieldErrors: { email: ["Este e-mail já está cadastrado."] } }`; all other database errors must be logged server-side and return a generic form error.

- [ ] **Step 3: Configure Auth.js credentials and typed sessions**

```ts
// src/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/modules/auth/schema";
import { verifyPassword } from "@/modules/auth/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
      return { id: user.id, email: user.email };
    },
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.userId as string;
      return session;
    },
  },
});
```

Route handler:

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Add module augmentation so `session.user.id` and JWT `userId` are typed as strings.

- [ ] **Step 4: Add server actions and protected layout**

`loginAction` must call `signIn("credentials", { email, password, redirectTo: "/dashboard" })`, catch `AuthError`, and return only `E-mail ou senha inválidos.` for credentials failures. `registerAction` must preserve field errors and redirect successful registration to `/login?registered=1`.

```ts
// src/lib/auth-user.ts
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
```

The protected layout calls `requireUserId()` before rendering children. The public root page redirects authenticated users to `/dashboard`.

Update `tests/unit/app/home.test.tsx` to mock `auth()`. Await the async page before rendering it in the unauthenticated case, and assert `redirect("/dashboard")` in the authenticated case.

- [ ] **Step 5: Build accessible login and registration forms**

Use React `useActionState` with labels, `aria-describedby`, per-field messages, a form-level alert, disabled pending submit buttons, and links between login and registration. Do not add password recovery UI. The registration success query parameter shows `Conta criada. Entre para continuar.` on login.

- [ ] **Step 6: Verify authentication**

Run: `npm run test:unit -- tests/unit/auth`

Run: `sh scripts/run-integration-tests.sh tests/integration/auth/registration.test.ts`

Run: `npm run lint`, `npm run typecheck`, and `npm run build` with `AUTH_SECRET` and `DATABASE_URL` set to non-production test values.

Expected: all commands pass.

- [ ] **Step 7: Commit authentication**

```bash
git add src/auth.ts src/types src/lib/auth-user.ts src/modules/auth src/app/api/auth src/app/\(auth\) src/app/\(protected\)/layout.tsx src/app/page.tsx tests/unit/app/home.test.tsx tests/unit/auth tests/integration/auth
git commit -m "feat: add credentials authentication"
```

## Task 5: Build Study-Session CRUD

**Files:**
- Create: `src/modules/study-sessions/actions.ts`
- Create: `src/modules/study-sessions/session-form.tsx`, `src/modules/study-sessions/session-form.module.css`
- Create: `src/modules/study-sessions/session-list.tsx`, `src/modules/study-sessions/session-list.module.css`
- Create: `src/app/(protected)/sessions/new/page.tsx`
- Create: `src/app/(protected)/sessions/[id]/edit/page.tsx`
- Create: `src/app/(protected)/sessions/page.tsx`
- Modify: `src/app/(protected)/layout.tsx`
- Test: `tests/unit/study-sessions/session-form.test.tsx`
- Test: `tests/integration/study-sessions/actions.test.ts`

**Interfaces:**
- Consumes: Task 2 schema/domain, Task 3 repository, and Task 4 `requireUserId`.
- Produces: `createSessionAction`, `updateSessionAction`, `deleteSessionAction`.
- Produces: reusable `SessionForm` for create and edit pages.

- [ ] **Step 1: Write failing action tests**

Test that create obtains the current user server-side, normalizes subject, persists resolved counts, revalidates `/dashboard` and `/sessions`, and redirects to `/sessions`. Test update/delete with a stranger's ID as not found. Mock only `requireUserId`, `revalidatePath`, and `redirect`; use the real test database for persistence.

Use this action state:

```ts
export type SessionActionState = {
  fieldErrors?: Record<string, string[] | undefined>;
  formError?: string;
  values?: Record<string, string>;
};
```

Run: `sh scripts/run-integration-tests.sh tests/integration/study-sessions/actions.test.ts`

Expected: FAIL because the actions do not exist.

- [ ] **Step 2: Implement CRUD actions**

Each action must:

1. call `requireUserId()`;
2. convert `FormData` to a plain value object;
3. call `studySessionInputSchema.safeParse`;
4. return flattened field errors and original string values on validation failure;
5. call an ownership-scoped repository function;
6. treat a missing update/delete target as `Sessão não encontrada.`;
7. revalidate dashboard/history only after success;
8. redirect create/update to `/sessions` outside any `try/catch` that could swallow Next.js redirects.

The create action should follow this exact control flow; update and delete use the same state shape and their ownership-scoped repository functions:

```ts
export async function createSessionAction(
  _previous: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const userId = await requireUserId();
  const values = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = studySessionInputSchema.safeParse(values);
  if (!parsed.success) {
    return { values, fieldErrors: parsed.error.flatten().fieldErrors, formError: parsed.error.issues[0]?.message };
  }
  try {
    await createSession(userId, parsed.data);
  } catch (error) {
    console.error("Failed to create study session", error);
    return { values, formError: "Não foi possível salvar a sessão. Tente novamente." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  redirect("/sessions");
}
```

- [ ] **Step 3: Write failing client-form tests for automatic calculation**

```tsx
it("calculates errors from total and correct answers", async () => {
  const user = userEvent.setup();
  render(<SessionForm action={vi.fn()} defaultStudyDate="2026-08-23" />);
  await user.type(screen.getByLabelText("Total de questões"), "50");
  await user.type(screen.getByLabelText("Acertos"), "30");
  expect(screen.getByLabelText("Erros")).toHaveValue(20);
  expect(screen.getByText("Calculado automaticamente")).toBeVisible();
});
```

Add equivalent tests for the other two combinations, clearing a field to change the calculation basis, inconsistent manual values, pending submission, and preservation of server-returned values.

Run: `npm run test:unit -- tests/unit/study-sessions/session-form.test.tsx`

Expected: FAIL because `SessionForm` does not exist.

- [ ] **Step 4: Implement the form without duplicating domain math**

Use a small client-side adapter around `resolveQuestionCounts`. Calculate only when exactly two inputs are non-empty. Track `calculatedField` as `"totalQuestions" | "correctAnswers" | "wrongAnswers" | null`; when the user edits the calculated field, clear that marker and validate all three instead of silently replacing a value. Submit all three resolved values to the server.

Inputs must use `inputMode="numeric"`, `min={0}`, `max={1_000_000}`, and `step={1}`. Use `type="date"` for `studyDate` and `type="url"` for links. Display percentages beside counts only when all three values are consistent.

- [ ] **Step 5: Implement pages, list, edit, and delete confirmation**

- `/sessions/new` supplies today's local calendar date as the default.
- `/sessions/[id]/edit` calls `getSession(userId, id)` and invokes `notFound()` for absent/foreign records.
- `/sessions?page=N` awaits Next.js 16's `searchParams: Promise<{ page?: string }>` value, parses positive integer pages, calls `listSessions`, and renders 20 items.
- Each list item shows date, subject, `N (P%)` for acertos/erros, total, optional safe external links, edit action, and delete form.
- Delete uses a native confirmation dialog or an accessible dialog before submitting; the UI updates only after server success.
- Empty history links directly to `/sessions/new`.

- [ ] **Step 6: Verify CRUD**

Run: `npm run test:unit -- tests/unit/study-sessions`

Run: `sh scripts/run-integration-tests.sh tests/integration/study-sessions`

Run: `npm run lint`, `npm run typecheck`, and `npm run build`.

Expected: all pass.

- [ ] **Step 7: Commit CRUD**

```bash
git add src/modules/study-sessions src/app/\(protected\)/sessions src/app/\(protected\)/layout.tsx tests/unit/study-sessions tests/integration/study-sessions
git commit -m "feat: manage study sessions"
```

## Task 6: Build Weighted Performance Dashboard

**Files:**
- Create: `src/modules/dashboard/period.ts`, `src/modules/dashboard/queries.ts`
- Create: `src/modules/dashboard/performance-bars.tsx`, `src/modules/dashboard/dashboard.module.css`
- Create: `src/app/(protected)/dashboard/page.tsx`
- Modify: `src/app/(protected)/layout.tsx`
- Test: `tests/unit/dashboard/period.test.ts`
- Test: `tests/integration/dashboard/queries.test.ts`

**Interfaces:**
- Produces: `DashboardPeriod = "7d" | "30d" | "90d" | "all"`.
- Produces: `getPeriodStart(period, today): string | null` using inclusive calendar dates.
- Produces: `getDashboard(userId, period, today)` returning overall totals and subject rows.

```ts
export type DashboardSubject = {
  subject: string;
  subjectKey: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  correctPercentage: number;
  wrongPercentage: number;
};

export type DashboardData = {
  overall: Omit<DashboardSubject, "subject" | "subjectKey">;
  subjects: DashboardSubject[];
};

export async function getDashboard(
  userId: string,
  period: DashboardPeriod,
  today: string,
): Promise<DashboardData>;
```

- [ ] **Step 1: Write failing period boundary tests**

```ts
it.each([
  ["7d", "2026-08-17"],
  ["30d", "2026-07-25"],
  ["90d", "2026-05-26"],
  ["all", null],
])("returns inclusive start for %s", (period, expected) => {
  expect(getPeriodStart(period as DashboardPeriod, "2026-08-23")).toBe(expected);
});
```

Run: `npm run test:unit -- tests/unit/dashboard/period.test.ts`

Expected: FAIL because period functions do not exist.

- [ ] **Step 2: Implement timezone-safe calendar period helpers**

Operate on UTC calendar parts of explicit `YYYY-MM-DD` strings so host timezone cannot shift dates. Parse unknown query values with `parseDashboardPeriod(value)` and fall back to `"30d"`.

- [ ] **Step 3: Write failing weighted aggregation tests**

Seed these sessions for one user:

```ts
[
  { studyDate: "2026-08-23", subject: "Direito Civil", subjectKey: "direito civil", totalQuestions: 10, correctAnswers: 8, wrongAnswers: 2 },
  { studyDate: "2026-08-22", subject: "direito civil", subjectKey: "direito civil", totalQuestions: 2, correctAnswers: 1, wrongAnswers: 1 },
  { studyDate: "2026-05-01", subject: "Direito Antigo", subjectKey: "direito antigo", totalQuestions: 10, correctAnswers: 10, wrongAnswers: 0 },
]
```

For period `30d` ending `2026-08-23`, assert one subject named from the most recent spelling, 12 total, 9 correct, 3 wrong, 75.0% correct, and no `Direito Antigo`. Seed a second user and assert none of their counts leak into results.

Run: `sh scripts/run-integration-tests.sh tests/integration/dashboard/queries.test.ts`

Expected: FAIL because dashboard query does not exist.

- [ ] **Step 4: Implement aggregation in PostgreSQL**

Use one parameterized `$queryRaw` CTE for subject rows:

```sql
WITH filtered AS (
  SELECT * FROM study_sessions
  WHERE user_id = $userId AND study_date >= $startDate
), latest AS (
  SELECT DISTINCT ON (subject_key) subject_key, subject
  FROM filtered
  ORDER BY subject_key, study_date DESC, created_at DESC
)
SELECT f.subject_key,
       l.subject,
       SUM(f.total_questions)::int AS total_questions,
       SUM(f.correct_answers)::int AS correct_answers,
       SUM(f.wrong_answers)::int AS wrong_answers
FROM filtered f
JOIN latest l ON l.subject_key = f.subject_key
GROUP BY f.subject_key, l.subject
ORDER BY SUM(f.total_questions) DESC, l.subject ASC;
```

Build it with Prisma tagged SQL values, not string interpolation. Omit the date predicate for `all`. Use a Prisma `aggregate` query for overall sums. Convert nullable sums to zero and call `percentage` only when total is positive.

- [ ] **Step 5: Build dashboard UI with proportional bars**

The page awaits Next.js 16's `searchParams: Promise<{ period?: string }>` value, defaults to 30 days, and calls `getDashboard` with the authenticated user. Render:

- quick filter links preserving a visible selected state;
- cards for total, acertos, erros, and overall percentage;
- one row per subject with concrete counts and one-decimal percentages;
- a stacked horizontal bar with correct width in `--correct` and error width in `--danger`;
- an empty state linking to `/sessions/new`;
- no chart library.

Each bar needs an accessible text alternative such as `Direito Civil: 75,0% de acertos e 25,0% de erros em 12 questões`.

- [ ] **Step 6: Verify dashboard**

Run: `npm run test:unit -- tests/unit/dashboard`

Run: `sh scripts/run-integration-tests.sh tests/integration/dashboard`

Run: `npm run lint`, `npm run typecheck`, and `npm run build`.

Expected: all pass.

- [ ] **Step 7: Commit dashboard**

```bash
git add src/modules/dashboard src/app/\(protected\)/dashboard src/app/\(protected\)/layout.tsx tests/unit/dashboard tests/integration/dashboard
git commit -m "feat: add weighted performance dashboard"
```

## Task 7: Add End-To-End, Responsive, And Accessibility Coverage

**Files:**
- Create: `playwright.config.ts`
- Create: `scripts/run-e2e-tests.sh`
- Create: `tests/e2e/helpers.ts`
- Create: `tests/e2e/auth-and-sessions.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Modify: `src/app/globals.css` and relevant CSS modules only for defects found by tests
- Modify: `package.json`

**Interfaces:**
- Consumes: complete user flows from Tasks 4-6.
- Produces: repeatable browser-level acceptance suite for Chromium desktop and mobile.

- [ ] **Step 1: Configure Playwright against the disposable PostgreSQL database**

Configure `baseURL: "http://127.0.0.1:3000"`, trace on first retry, screenshot on failure, and projects for `Desktop Chrome` and `Mobile Chrome` using Pixel 7 dimensions. The web server command must start Next.js with test `DATABASE_URL` and `AUTH_SECRET`; reuse the server only outside CI.

Create `scripts/run-e2e-tests.sh` to start `compose.test.yaml`, apply migrations, clear tables, run Playwright, and tear down the database through an `EXIT` trap:

```sh
#!/bin/sh
set -eu
docker compose -f compose.test.yaml up -d --wait
trap 'docker compose -f compose.test.yaml down -v' EXIT
export DATABASE_URL='postgresql://pge:pge_test_only@localhost:5433/pge_test'
export AUTH_SECRET='test-only-auth-secret-at-least-32-characters'
npx prisma migrate deploy
npx prisma db execute --stdin <<'SQL'
TRUNCATE TABLE "study_sessions", "users" CASCADE;
SQL
npx playwright test "$@"
```

Set `"test:e2e": "sh scripts/run-e2e-tests.sh"` in `package.json`. Configure Playwright with `fullyParallel: false` because the suite shares one reset database. Use `crypto.randomUUID()` in test e-mail addresses.

- [ ] **Step 2: Write a failing complete-flow test**

```ts
test("candidate registers, records, edits, and deletes a study session", async ({ page }) => {
  const email = `candidate-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correct horse");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("correct horse");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole("link", { name: "Registrar sessão" }).click();
  await page.getByLabel("Assunto").fill("Direito Constitucional");
  await page.getByLabel("Total de questões").fill("50");
  await page.getByLabel("Acertos").fill("30");
  await expect(page.getByLabel("Erros")).toHaveValue("20");
  await page.getByRole("button", { name: "Salvar sessão" }).click();

  await expect(page.getByText("Direito Constitucional")).toBeVisible();
  await page.goto("/dashboard?period=30d");
  await expect(page.getByText("60,0%", { exact: true })).toBeVisible();
  await expect(page.getByText("30 acertos")).toBeVisible();
  await expect(page.getByText("20 erros")).toBeVisible();

  await page.goto("/sessions");
  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Total de questões").fill("40");
  await page.getByLabel("Acertos").fill("30");
  await page.getByLabel("Erros").fill("10");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByText("30 (75,0%)")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Nenhuma sessão registrada")).toBeVisible();
});
```

- [ ] **Step 3: Add acceptance cases from the specification**

Add tests for:

- all three automatic-calculation combinations;
- rejection of 50 total, 30 correct, and 30 wrong without clearing form values;
- optional HTTP/HTTPS links opening with safe attributes;
- dashboard period filters excluding old records;
- normalized grouping of `Direito Civil` and `direito   civil`;
- a second authenticated browser context receiving not-found for another user's edit URL;
- logout returning private navigation to login.

- [ ] **Step 4: Add responsive and accessibility assertions**

At 390x844 and 1440x900, visit login, new session, history, and dashboard. Assert `document.documentElement.scrollWidth === document.documentElement.clientWidth`. Run `AxeBuilder` on each stable page and require no serious or critical violations. Verify every input has a programmatic label, focus is visible, and stacked bars expose accessible text.

- [ ] **Step 5: Run E2E and fix only observed defects**

Run: `npm run test:e2e`

Expected: both Playwright projects PASS.

Run: `npm run test:unit`, `npm run test:integration`, `npm run lint`, `npm run typecheck`, and `npm run build`.

Expected: all pass.

- [ ] **Step 6: Commit acceptance coverage**

```bash
git add playwright.config.ts scripts/run-e2e-tests.sh tests/e2e package.json package-lock.json src/app/globals.css src/modules
git commit -m "test: cover authenticated study workflow"
```

## Task 8: Add Production Containers And Operations Guide

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env.example`
- Create: `src/app/api/health/route.ts`
- Create: `docs/operations.md`
- Create or modify: `README.md`, `next.config.ts`, `package.json`
- Test: `tests/unit/app/health.test.ts`

**Interfaces:**
- Produces: `GET /api/health` returning 200 only when PostgreSQL is reachable.
- Produces: Docker targets `migrator` and `runner`.
- Produces: Compose services `db`, `migrate`, and `app` with health/dependency ordering.

- [ ] **Step 1: Write a failing health-route test**

Mock Prisma `$queryRaw` for success and failure. Assert success returns status 200 with `{ "status": "ok" }`; failure returns status 503 with `{ "status": "unavailable" }` and does not expose exception text.

Run: `npm run test:unit -- tests/unit/app/health.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 2: Implement the health endpoint**

```ts
// src/app/api/health/route.ts
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
```

- [ ] **Step 3: Configure standalone output and multi-stage image**

Set `output: "standalone"` in `next.config.ts`.

Use this multi-stage Dockerfile:

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build' npx prisma generate
RUN DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build' AUTH_SECRET='build-only-secret-not-used-at-runtime' npm run build

FROM deps AS migrator
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

`.dockerignore` must exclude `.git`, `.next`, `node_modules`, test output, `.env*` except `.env.example`, `.superpowers`, and local docs that are not needed at runtime.

- [ ] **Step 4: Define Compose dependency and health behavior**

Use this Compose dependency graph:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:?POSTGRES_DB is required}
      POSTGRES_USER: ${POSTGRES_USER:?POSTGRES_USER is required}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 12
    restart: unless-stopped

  migrate:
    build:
      context: .
      target: migrator
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  app:
    build:
      context: .
      target: runner
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      AUTH_SECRET: ${AUTH_SECRET:?AUTH_SECRET is required}
      AUTH_TRUST_HOST: "true"
    ports:
      - "${APP_PORT:-3000}:3000"
    depends_on:
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 12
    restart: unless-stopped

volumes:
  postgres_data:
```

Use this `.env.example`, with comments requiring both `CHANGE_ME` values to be replaced before startup:

```dotenv
POSTGRES_DB=pge_study_control
POSTGRES_USER=pge
POSTGRES_PASSWORD=CHANGE_ME_RANDOM_DATABASE_PASSWORD
DATABASE_URL=postgresql://pge:CHANGE_ME_RANDOM_DATABASE_PASSWORD@db:5432/pge_study_control
AUTH_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32
APP_PORT=3000
```

- [ ] **Step 5: Write operational documentation**

`README.md` must cover prerequisites, local development, test commands, production Compose startup, and the external HTTPS proxy requirement.

`docs/operations.md` must contain exact commands for:

- copying `.env.example` to `.env` and replacing both `CHANGE_ME` values;
- `docker compose build` and `docker compose up -d`;
- checking `docker compose ps` and `/api/health`;
- viewing app and migration logs;
- applying updates with a fresh build;
- PostgreSQL backup using `docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup.sql`;
- restore into an empty database using `docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"' < backup.sql`;
- proxy-level HTTPS and rate limiting specifically for `/login`, `/register`, and `/api/auth/*`.

- [ ] **Step 6: Verify the production stack**

Run: `npm run test:unit -- tests/unit/app/health.test.ts`

Run: `docker compose config`

Expected: valid rendered Compose configuration with no missing required variable when a temporary test `.env` is supplied.

Run: `docker compose build`

Expected: both targets build successfully.

Run: `docker compose up -d --wait`

Expected: `db` and `app` healthy, `migrate` exited with code 0.

Run: `curl --fail http://127.0.0.1:3000/api/health`

Expected: `{"status":"ok"}`.

Run the complete verification suite: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, `npm run lint`, `npm run typecheck`, and `npm run build`.

Expected: all commands pass.

- [ ] **Step 7: Commit deployment support**

```bash
git add Dockerfile .dockerignore compose.yaml .env.example src/app/api/health next.config.ts package.json package-lock.json README.md docs/operations.md tests/unit/app/health.test.ts
git commit -m "feat: add self-hosted deployment"
```

## Final Verification

- [ ] Run `npm run test:unit` and confirm all unit/component tests pass.
- [ ] Run `npm run test:integration` and confirm real PostgreSQL integration tests pass.
- [ ] Run `npm run test:e2e` and confirm desktop/mobile browser projects pass.
- [ ] Run `npm run lint`, `npm run typecheck`, and `npm run build` with zero errors.
- [ ] Run `docker compose config`, `docker compose build`, and `docker compose up -d --wait` successfully.
- [ ] Confirm `GET /api/health` returns 200 and `{ "status": "ok" }`.
- [ ] Manually verify registration, login, all three count calculations, edit, delete, period filters, safe links, logout, and cross-user denial.
- [ ] Inspect `git status --short` and confirm no `.env`, generated Prisma client, test artifacts, or `.superpowers/` files are tracked.
