# Session Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit link from each study-session list item to a protected, read-only details page.

**Architecture:** Keep the list change inside the existing client component and implement `/sessions/[id]` as a Server Component. The page reuses `requireUserId()`, `getSession(userId, id)`, and the existing percentage domain functions so authorization and calculations stay in their current boundaries.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, CSS Modules, Vitest 4, Testing Library

## Global Constraints

- The details route is `/sessions/[id]` and remains inside the protected route group.
- Session lookup must use both the authenticated user ID and route session ID.
- Missing or inaccessible sessions must call `notFound()` without disclosing ownership.
- User-facing copy is in Brazilian Portuguese.
- Dates are formatted as Brazilian Portuguese calendar dates in UTC.
- Percentages always accompany their concrete counts and use one decimal place.
- Optional external links render only when present and use `target="_blank"` with `rel="noopener noreferrer"`.
- The details page offers `Voltar ao histórico` and `Editar sessão`, but not deletion.
- Preserve visible keyboard focus, minimum touch targets, and mobile responsiveness.
- Do not add dependencies, repository operations, model changes, or form changes.

---

## File Structure

- Modify `src/modules/study-sessions/session-list.tsx`: expose the details route from each list item.
- Modify `tests/unit/study-sessions/session-list.test.tsx`: verify each details link uses the session ID.
- Create `src/app/(protected)/sessions/[id]/page.tsx`: authorize, load, and render one session.
- Create `src/app/(protected)/sessions/[id]/session-details.module.css`: style only the details content and responsive behavior.
- Create `tests/unit/study-sessions/session-details-page.test.tsx`: verify data flow, output, optional links, navigation, and not-found behavior.

### Task 1: Link List Items To Session Details

**Files:**
- Modify: `tests/unit/study-sessions/session-list.test.tsx:34-59`
- Modify: `src/modules/study-sessions/session-list.tsx:102-105`

**Interfaces:**
- Consumes: `StudySession.id: string` and Next.js `Link` already used by `SessionList`.
- Produces: a `Ver detalhes` link with `href="/sessions/<session.id>"` for every rendered session.

- [ ] **Step 1: Write the failing list-link test**

Append this test inside the existing `describe("SessionList", ...)` block:

```tsx
it("links each listed session to its details page", () => {
  render(
    <SessionList
      sessions={[session({ id: "session-details" })]}
      page={1}
      totalPages={1}
    />,
  );

  expect(screen.getByRole("link", { name: "Ver detalhes" })).toHaveAttribute(
    "href",
    "/sessions/session-details",
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run test:unit -- tests/unit/study-sessions/session-list.test.tsx
```

Expected: FAIL because no link has the accessible name `Ver detalhes`.

- [ ] **Step 3: Add the details link**

Change the action group in `SessionList` to:

```tsx
<div className={styles.itemActions}>
  <Link href={`/sessions/${session.id}`}>Ver detalhes</Link>
  <Link href={`/sessions/${session.id}/edit`}>Editar</Link>
  <DeleteSessionForm session={session} />
</div>
```

No CSS change is needed because `.itemActions a` already supplies typography, focus treatment, and a `2.75rem` minimum height.

- [ ] **Step 4: Run the list tests to verify they pass**

Run:

```bash
npm run test:unit -- tests/unit/study-sessions/session-list.test.tsx
```

Expected: PASS for both percentage formatting and the new details link.

- [ ] **Step 5: Commit the list link**

```bash
git add tests/unit/study-sessions/session-list.test.tsx src/modules/study-sessions/session-list.tsx
git commit -m "feat(sessions): link session details"
```

### Task 2: Render The Protected Session Details Page

**Files:**
- Create: `tests/unit/study-sessions/session-details-page.test.tsx`
- Create: `src/app/(protected)/sessions/[id]/page.tsx`
- Create: `src/app/(protected)/sessions/[id]/session-details.module.css`

**Interfaces:**
- Consumes: `requireUserId(): Promise<string>`, `getSession(userId: string, id: string): Promise<StudySession | null>`, `percentage(part: number, total: number): number`, and `formatPercentage(value: number): string`.
- Produces: default async component `SessionDetailsPage({ params }: { params: Promise<{ id: string }> })`, rendering the owned session or invoking `notFound()`.

- [ ] **Step 1: Write failing page tests**

Create `tests/unit/study-sessions/session-details-page.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudySession } from "@/generated/prisma/client";
import SessionDetailsPage from "@/app/(protected)/sessions/[id]/page";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  getSession: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("@/lib/auth-user", () => ({
  requireUserId: mocks.requireUserId,
}));

vi.mock("@/modules/study-sessions/repository", () => ({
  getSession: mocks.getSession,
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

const studySession: StudySession = {
  id: "session-1",
  userId: "user-1",
  studyDate: new Date("2026-08-23T00:00:00.000Z"),
  subject: "Direito Civil",
  subjectKey: "direito civil",
  totalQuestions: 50,
  correctAnswers: 30,
  wrongAnswers: 20,
  questionListUrl: "https://example.com/questions",
  wrongQuestionListUrl: "https://example.com/errors",
  createdAt: new Date("2026-08-23T12:00:00.000Z"),
  updatedAt: new Date("2026-08-23T12:00:00.000Z"),
};

beforeEach(() => {
  mocks.requireUserId.mockResolvedValue("user-1");
  mocks.getSession.mockResolvedValue(studySession);
  mocks.notFound.mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SessionDetailsPage", () => {
  it("loads the owned session and renders its details and actions", async () => {
    const page = await SessionDetailsPage({
      params: Promise.resolve({ id: "session-1" }),
    });

    render(page);

    expect(mocks.requireUserId).toHaveBeenCalledOnce();
    expect(mocks.getSession).toHaveBeenCalledWith("user-1", "session-1");
    expect(screen.getByRole("heading", { name: "Direito Civil" })).toBeVisible();
    expect(screen.getByText("23/08/2026")).toBeVisible();
    expect(screen.getByText("30 (60,0%)")).toBeVisible();
    expect(screen.getByText("20 (40,0%)")).toBeVisible();
    expect(screen.getByText("50")).toBeVisible();

    const questions = screen.getByRole("link", { name: /Lista de questões/ });
    expect(questions).toHaveAttribute("href", "https://example.com/questions");
    expect(questions).toHaveAttribute("target", "_blank");
    expect(questions).toHaveAttribute("rel", "noopener noreferrer");

    const errors = screen.getByRole("link", { name: /Lista de erros/ });
    expect(errors).toHaveAttribute("href", "https://example.com/errors");
    expect(errors).toHaveAttribute("target", "_blank");
    expect(errors).toHaveAttribute("rel", "noopener noreferrer");

    expect(screen.getByRole("link", { name: "Editar sessão" })).toHaveAttribute(
      "href",
      "/sessions/session-1/edit",
    );
    expect(screen.getByRole("link", { name: "Voltar ao histórico" })).toHaveAttribute(
      "href",
      "/sessions",
    );
  });

  it("omits the materials section when the session has no external links", async () => {
    mocks.getSession.mockResolvedValueOnce({
      ...studySession,
      questionListUrl: null,
      wrongQuestionListUrl: null,
    });
    const page = await SessionDetailsPage({
      params: Promise.resolve({ id: "session-1" }),
    });

    render(page);

    expect(screen.queryByRole("region", { name: "Materiais da sessão" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Lista de questões/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Lista de erros/ })).not.toBeInTheDocument();
  });

  it("returns not found when the session is missing or inaccessible", async () => {
    mocks.getSession.mockResolvedValueOnce(null);

    await expect(
      SessionDetailsPage({ params: Promise.resolve({ id: "unknown" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.getSession).toHaveBeenCalledWith("user-1", "unknown");
    expect(mocks.notFound).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the page tests to verify they fail**

Run:

```bash
npm run test:unit -- tests/unit/study-sessions/session-details-page.test.tsx
```

Expected: FAIL because `src/app/(protected)/sessions/[id]/page.tsx` does not exist.

- [ ] **Step 3: Implement the Server Component**

Create `src/app/(protected)/sessions/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth-user";
import { formatPercentage, percentage } from "@/modules/study-sessions/domain";
import { getSession } from "@/modules/study-sessions/repository";
import styles from "./session-details.module.css";

type SessionDetailsPageProps = {
  params: Promise<{ id: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export default async function SessionDetailsPage({ params }: SessionDetailsPageProps) {
  const userId = await requireUserId();
  const { id } = await params;
  const session = await getSession(userId, id);
  if (!session) notFound();

  const correctPercentage = formatPercentage(
    percentage(session.correctAnswers, session.totalQuestions),
  );
  const wrongPercentage = formatPercentage(
    percentage(session.wrongAnswers, session.totalQuestions),
  );
  const hasMaterials = session.questionListUrl || session.wrongQuestionListUrl;

  return (
    <main className="protectedPage">
      <header className="protectedPageHeader">
        <div>
          <h1>Detalhes da sessão</h1>
          <p>Consulte os resultados e materiais registrados nesta sessão.</p>
        </div>
        <Link className="primaryLink" href={`/sessions/${session.id}/edit`}>
          Editar sessão
        </Link>
      </header>

      <section className={styles.panel} aria-labelledby="session-subject">
        <div className={styles.identity}>
          <time dateTime={session.studyDate.toISOString().slice(0, 10)}>
            {dateFormatter.format(session.studyDate)}
          </time>
          <h2 id="session-subject">{session.subject}</h2>
        </div>

        <dl className={styles.counts}>
          <div>
            <dt>Acertos</dt>
            <dd>{session.correctAnswers} ({correctPercentage})</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{session.wrongAnswers} ({wrongPercentage})</dd>
          </div>
          <div>
            <dt>Total de questões</dt>
            <dd>{session.totalQuestions}</dd>
          </div>
        </dl>

        {hasMaterials && (
          <section className={styles.resources} aria-label="Materiais da sessão">
            <h3>Materiais</h3>
            <div>
              {session.questionListUrl && (
                <a href={session.questionListUrl} target="_blank" rel="noopener noreferrer">
                  Lista de questões <span aria-hidden="true">↗</span>
                </a>
              )}
              {session.wrongQuestionListUrl && (
                <a href={session.wrongQuestionListUrl} target="_blank" rel="noopener noreferrer">
                  Lista de erros <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </section>
        )}

        <footer className={styles.actions}>
          <Link href="/sessions">Voltar ao histórico</Link>
        </footer>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Add focused responsive styles**

Create `src/app/(protected)/sessions/[id]/session-details.module.css`:

```css
.panel {
  padding: 2rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

.identity {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
}

.identity time {
  display: block;
  margin-bottom: 0.4rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.identity h2 {
  margin: 0;
  font-size: 1.6rem;
  overflow-wrap: anywhere;
}

.counts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 1.5rem 0;
}

.counts div {
  min-width: 0;
}

.counts dt {
  margin-bottom: 0.3rem;
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.counts dd {
  margin: 0;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 750;
}

.counts div:first-child dd {
  color: var(--correct);
}

.resources {
  padding: 1.5rem 0;
  border-top: 1px solid var(--line);
}

.resources h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.resources div,
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}

.resources a,
.actions a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 700;
  text-underline-offset: 0.2em;
}

.actions {
  padding-top: 1.5rem;
  border-top: 1px solid var(--line);
}

.resources a:focus-visible,
.actions a:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}

@media (max-width: 40rem) {
  .panel {
    padding: 1.25rem;
  }

  .counts {
    grid-template-columns: 1fr;
  }

  .actions a {
    justify-content: center;
    width: 100%;
  }
}
```

- [ ] **Step 5: Run the page tests to verify they pass**

Run:

```bash
npm run test:unit -- tests/unit/study-sessions/session-details-page.test.tsx
```

Expected: PASS for rendering, optional materials, navigation, authorization arguments, and not-found handling.

- [ ] **Step 6: Run the complete verification suite required for this change**

Run:

```bash
npm run test:unit
npm run lint
npm run typecheck
```

Expected: all commands exit with status 0 and report no failures or type errors.

- [ ] **Step 7: Commit the details page**

```bash
git add tests/unit/study-sessions/session-details-page.test.tsx \
  'src/app/(protected)/sessions/[id]/page.tsx' \
  'src/app/(protected)/sessions/[id]/session-details.module.css'
git commit -m "feat(sessions): add session details page"
```
