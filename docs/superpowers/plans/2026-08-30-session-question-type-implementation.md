# Session Question Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require a question type on new and edited study sessions, preserve legacy sessions as unspecified, display the type in session views, and filter dashboard calculations by one type at a time.

**Architecture:** Add a PostgreSQL/Prisma enum and a required `StudySession.questionType` field, with `UNSPECIFIED` reserved for migrated records. Keep localized labels and editable-type validation in the study-session module, while a dashboard-specific parser translates stable URL values into enum filters consumed by the existing aggregate query.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.9, Prisma 7/PostgreSQL, Zod 4, Vitest/Testing Library, Playwright.

## Global Constraints

- New and edited sessions accept exactly one of `Jurisprudencia`, `Lei Seca`, or `Doutrina`.
- Existing sessions are migrated to `UNSPECIFIED` and displayed as `Nao informado`.
- `UNSPECIFIED` is never offered as a valid form choice; editing a legacy session requires a new choice.
- The database column is required and has no permanent default.
- Dashboard selection is exclusive and supports `Todos`, the three editable types, and `Nao informado`.
- Dashboard URL values are `all`, `jurisprudence`, `black-letter-law`, `doctrine`, and `unspecified`; unknown values normalize to `all`.
- Period, local reference date, and question-type filters must preserve one another in navigation.
- Summary totals, percentages, and per-subject rows must all use the same filtered session set.
- Preserve existing Portuguese UI copy conventions, visible focus, keyboard navigation, and responsive behavior.
- Do not manually edit `src/generated/prisma/`; regenerate it with Prisma and leave it ignored by Git.

## File Structure

- `prisma/schema.prisma`: declares `QuestionType`, the required session field, and the dashboard lookup index.
- `prisma/migrations/202608300001_add_session_question_type/migration.sql`: creates the enum, backfills legacy rows, removes the migration default, and creates the index.
- `src/modules/study-sessions/question-type.ts`: owns editable values, Portuguese labels, and editable-value narrowing.
- `src/modules/study-sessions/schema.ts`: validates that submitted sessions use an editable type.
- `src/modules/study-sessions/session-form.tsx`: captures and restores the required radio selection.
- `src/modules/study-sessions/session-form.module.css`: styles accessible question-type controls responsively.
- `src/modules/study-sessions/session-list.tsx`: shows the localized type in history.
- `src/modules/study-sessions/session-list.module.css`: styles history metadata.
- `src/app/(protected)/sessions/[id]/page.tsx`: shows the localized type in details.
- `src/app/(protected)/sessions/[id]/session-details.module.css`: styles details metadata.
- `src/app/(protected)/sessions/[id]/edit/page.tsx`: supplies the persisted type to the form.
- `src/modules/dashboard/question-type-filter.ts`: parses and serializes stable dashboard filter values.
- `src/modules/dashboard/queries.ts`: applies the validated enum filter to the aggregate CTE.
- `src/modules/dashboard/local-today-redirect.tsx`: preserves the type while correcting the local date.
- `src/app/(protected)/dashboard/page.tsx`: renders filter links and passes the selected type through.
- `src/modules/dashboard/dashboard.module.css`: lays out both filter groups on desktop and mobile.
- Unit, integration, and E2E tests under `tests/`: verify validation, persistence, rendering, filtering, accessibility, and navigation.

---

### Task 1: Persist And Validate Question Types

**Files:**
- Create: `prisma/migrations/202608300001_add_session_question_type/migration.sql`
- Create: `src/modules/study-sessions/question-type.ts`
- Modify: `prisma/schema.prisma:21-38`
- Modify: `src/modules/study-sessions/schema.ts:1-77`
- Modify: `tests/unit/study-sessions/schema.test.ts:1-130`
- Modify: `tests/integration/study-sessions/repository.test.ts:1-175`
- Modify: `tests/integration/study-sessions/actions.test.ts:20-126`
- Modify: `tests/integration/dashboard/queries.test.ts:18-309`
- Modify: `tests/unit/study-sessions/session-list.test.tsx:16-31`
- Modify: `tests/unit/study-sessions/session-details-page.test.tsx:24-37`

**Interfaces:**
- Produces: Prisma enum `QuestionType` with `JURISPRUDENCE | BLACK_LETTER_LAW | DOCTRINE | UNSPECIFIED`.
- Produces: `editableQuestionTypes`, `EditableQuestionType`, `questionTypeLabels`, and `isEditableQuestionType(value)` from `question-type.ts`.
- Produces: `StudySessionInput.questionType: EditableQuestionType` after Zod validation.
- Consumes: existing `StudySessionInput`, repository spread writes, and Server Action form parsing.

- [ ] **Step 1: Add failing schema tests for valid and forbidden question types**

Add `questionType: "JURISPRUDENCE"` to the shared `valid` fixture, assert it survives parsing, and add these focused cases:

```ts
it.each(["JURISPRUDENCE", "BLACK_LETTER_LAW", "DOCTRINE"])(
  "accepts editable question type %s",
  (questionType) => {
    expect(studySessionInputSchema.parse({ ...valid, questionType })).toMatchObject({ questionType });
  },
);

it.each([undefined, "", "UNSPECIFIED", "UNKNOWN"])(
  "rejects non-editable question type %j",
  (questionType) => {
    expectFieldError(
      { ...valid, questionType },
      "questionType",
      "Selecione o tipo de questão.",
    );
  },
);
```

- [ ] **Step 2: Run the schema test and confirm the red state**

Run: `npm run test:unit -- tests/unit/study-sessions/schema.test.ts`

Expected: FAIL because `questionType` is not part of `studySessionInputSchema` and invalid values are not rejected.

- [ ] **Step 3: Add the enum, safe legacy migration, and shared question-type contract**

Add to `prisma/schema.prisma`:

```prisma
enum QuestionType {
  JURISPRUDENCE
  BLACK_LETTER_LAW
  DOCTRINE
  UNSPECIFIED
}
```

Add `questionType QuestionType @map("question_type")` immediately after `subjectKey` in `StudySession`, and add `@@index([userId, questionType, studyDate])` next to its two current indexes.

Create the migration with no permanent default:

```sql
CREATE TYPE "QuestionType" AS ENUM (
  'JURISPRUDENCE',
  'BLACK_LETTER_LAW',
  'DOCTRINE',
  'UNSPECIFIED'
);

ALTER TABLE "study_sessions"
  ADD COLUMN "question_type" "QuestionType" NOT NULL DEFAULT 'UNSPECIFIED';

ALTER TABLE "study_sessions"
  ALTER COLUMN "question_type" DROP DEFAULT;

CREATE INDEX "study_sessions_user_id_question_type_study_date_idx"
  ON "study_sessions"("user_id", "question_type", "study_date");
```

Create `question-type.ts`:

```ts
import { QuestionType } from "@/generated/prisma/enums";

export const editableQuestionTypes = [
  QuestionType.JURISPRUDENCE,
  QuestionType.BLACK_LETTER_LAW,
  QuestionType.DOCTRINE,
] as const;

export type EditableQuestionType = (typeof editableQuestionTypes)[number];

export const questionTypeLabels: Record<QuestionType, string> = {
  [QuestionType.JURISPRUDENCE]: "Jurisprudência",
  [QuestionType.BLACK_LETTER_LAW]: "Lei Seca",
  [QuestionType.DOCTRINE]: "Doutrina",
  [QuestionType.UNSPECIFIED]: "Não informado",
};

export function isEditableQuestionType(value: unknown): value is EditableQuestionType {
  return editableQuestionTypes.some((questionType) => questionType === value);
}
```

- [ ] **Step 4: Regenerate Prisma and add server-side validation**

Run: `npx prisma generate`

In `schema.ts`, define the field with the shared tuple and include it in the transformed output:

```ts
const QUESTION_TYPE_ERROR = "Selecione o tipo de questão.";
const editableQuestionType = z.enum(editableQuestionTypes, { error: QUESTION_TYPE_ERROR });

const rawStudySessionSchema = z.object({
  studyDate: z.string({ error: DATE_ERROR }).refine(isCalendarDate, DATE_ERROR),
  subject: normalizedSubject,
  questionType: editableQuestionType,
  totalQuestions: optionalCount,
  correctAnswers: optionalCount,
  wrongAnswers: optionalCount,
  questionListUrl: optionalHttpUrl,
  wrongQuestionListUrl: optionalHttpUrl,
});

return {
  studyDate: data.studyDate,
  questionType: data.questionType,
  ...data.subject,
  ...resolveQuestionCounts({
    totalQuestions: data.totalQuestions,
    correctAnswers: data.correctAnswers,
    wrongAnswers: data.wrongAnswers,
  }),
  questionListUrl: data.questionListUrl,
  wrongQuestionListUrl: data.wrongQuestionListUrl,
};
```

- [ ] **Step 5: Make persistence tests prove create and update store the enum**

Import `QuestionType` from `@/generated/prisma/enums`. Add `questionType: QuestionType.JURISPRUDENCE` to repository create inputs and assert it on the created record. Change the update input to `QuestionType.DOCTRINE` and assert the updated record contains it.

Add `questionType: "JURISPRUDENCE"` to `sessionFormData`, then extend action expectations:

```ts
expect.objectContaining({
  subject: "Direito Civil",
  questionType: QuestionType.JURISPRUDENCE,
})
```

For the update action, submit `{ questionType: "DOCTRINE" }` and assert `questionType: QuestionType.DOCTRINE`.

Add a repository integration assertion that proves the migration left the field required without a default:

```ts
const [questionTypeColumn] = await prisma.$queryRaw<Array<{
  is_nullable: "YES" | "NO";
  column_default: string | null;
}>>`
  SELECT is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'study_sessions'
    AND column_name = 'question_type'
`;
expect(questionTypeColumn).toEqual({ is_nullable: "NO", column_default: null });
```

- [ ] **Step 6: Update typed fixtures and direct SQL writes for the required column**

Add an explicit enum value to every direct Prisma session fixture in `repository.test.ts` and `dashboard/queries.test.ts`. Add `question_type` and a value to the bulk SQL insert:

```sql
INSERT INTO study_sessions (
  id, user_id, study_date, subject, subject_key, question_type,
  total_questions, correct_answers, wrong_answers, created_at, updated_at
)
SELECT 'bulk-' || value::text,
       ${owner.id},
       DATE '2026-08-23',
       'Direito Civil',
       'direito civil',
       'JURISPRUDENCE'::"QuestionType",
       1000000,
       1000000,
       0,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM generate_series(1, 2148) AS value
```

Add `questionType: QuestionType.JURISPRUDENCE` to the `StudySession` fixtures in `session-list.test.tsx` and `session-details-page.test.tsx`. Add `questionType` to every direct `createSession` input used by integration tests so `StudySessionInput` remains complete.

- [ ] **Step 7: Run data-layer verification**

Run: `npm run test:unit -- tests/unit/study-sessions/schema.test.ts`

Expected: PASS.

Run: `npm run test:integration -- tests/integration/study-sessions/repository.test.ts tests/integration/study-sessions/actions.test.ts`

Expected: PASS, including migration deployment and enum persistence.

Run: `npm run typecheck`

Expected: PASS with regenerated Prisma types and all required fixtures populated.

- [ ] **Step 8: Commit the data contract**

```bash
git add prisma/schema.prisma prisma/migrations/202608300001_add_session_question_type/migration.sql src/modules/study-sessions/question-type.ts src/modules/study-sessions/schema.ts tests/unit/study-sessions/schema.test.ts tests/unit/study-sessions/session-list.test.tsx tests/unit/study-sessions/session-details-page.test.tsx tests/integration/study-sessions/repository.test.ts tests/integration/study-sessions/actions.test.ts tests/integration/dashboard/queries.test.ts
git commit -m "feat: persist session question types"
```

### Task 2: Require A Type In The Session Form

**Files:**
- Modify: `src/modules/study-sessions/session-form.tsx:9-285`
- Modify: `src/modules/study-sessions/session-form.module.css:62-254`
- Modify: `src/app/(protected)/sessions/[id]/edit/page.tsx:18-40`
- Modify: `tests/unit/study-sessions/session-form.test.tsx:9-144`
- Modify: `tests/unit/study-sessions/new-session-page.test.tsx:58-87`

**Interfaces:**
- Consumes: `editableQuestionTypes`, `questionTypeLabels`, and `isEditableQuestionType` from Task 1.
- Consumes: `SessionActionState.values.questionType` returned by existing actions.
- Produces: controlled radio group named `questionType` and `SessionFormDefaults.questionType` support.

- [ ] **Step 1: Add failing form tests for selection, errors, and restored state**

Assert all three radio choices render with none initially selected:

```ts
expect(screen.getByRole("radio", { name: "Jurisprudência" })).not.toBeChecked();
expect(screen.getByRole("radio", { name: "Lei Seca" })).not.toBeChecked();
expect(screen.getByRole("radio", { name: "Doutrina" })).not.toBeChecked();
```

Add a mocked validation response with:

```ts
fieldErrors: { questionType: ["Selecione o tipo de questão."] },
values: {
  studyDate: "2026-08-20",
  subject: "Direito Tributário",
  questionType: "DOCTRINE",
  totalQuestions: "80",
  correctAnswers: "50",
  wrongAnswers: "30",
  questionListUrl: "https://example.com/lista",
  wrongQuestionListUrl: "https://example.com/erros",
},
```

Submit after selecting `Jurisprudência`, then assert `Doutrina` is checked after the action response and the group has accessible description `Selecione o tipo de questão.`.

In `new-session-page.test.tsx`, render classified defaults and assert `Lei Seca` is checked. Render `questionType: "UNSPECIFIED"` and assert all three options remain unchecked.

- [ ] **Step 2: Run form tests and confirm the red state**

Run: `npm run test:unit -- tests/unit/study-sessions/session-form.test.tsx tests/unit/study-sessions/new-session-page.test.tsx`

Expected: FAIL because no `questionType` controls or defaults exist.

- [ ] **Step 3: Add controlled question-type state and accessible radios**

Extend `FormValues` and `initialValues`:

```ts
type FormValues = {
  studyDate: string;
  subject: string;
  questionType: string;
  totalQuestions: string;
  correctAnswers: string;
  wrongAnswers: string;
  questionListUrl: string;
  wrongQuestionListUrl: string;
};

questionType: isEditableQuestionType(defaults.questionType)
  ? defaults.questionType
  : "",
```

Render a fieldset between subject/date and performance:

```tsx
<fieldset
  className={styles.typeSection}
  aria-invalid={fieldError("questionType") ? true : undefined}
  aria-describedby={fieldError("questionType") ? "questionType-error" : undefined}
>
  <legend>Tipo de questão</legend>
  <div className={styles.typeOptions}>
    {editableQuestionTypes.map((questionType) => (
      <label key={questionType}>
        <input
          name="questionType"
          type="radio"
          required
          value={questionType}
          checked={values.questionType === questionType}
          onChange={(event) => setValues({ ...values, questionType: event.target.value })}
        />
        <span>{questionTypeLabels[questionType]}</span>
      </label>
    ))}
  </div>
  {fieldError("questionType") && (
    <p className={styles.fieldError} id="questionType-error">
      {fieldError("questionType")}
    </p>
  )}
</fieldset>
```

Style `.typeSection` consistently with existing fieldsets, make `.typeOptions` a wrapping three-column layout, give each label a minimum touch height, and reuse the coral focus outline on radio controls. Collapse the options to one column in the existing mobile media query.

- [ ] **Step 4: Pass persisted edit values without selecting the legacy value**

In the edit page defaults, add:

```ts
questionType: session.questionType,
```

`initialValues` must narrow this through `isEditableQuestionType`, so `UNSPECIFIED` becomes the empty string and classified sessions retain their selection.

- [ ] **Step 5: Run form verification**

Run: `npm run test:unit -- tests/unit/study-sessions/session-form.test.tsx tests/unit/study-sessions/new-session-page.test.tsx`

Expected: PASS.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the required form control**

```bash
git add src/modules/study-sessions/session-form.tsx src/modules/study-sessions/session-form.module.css src/app/(protected)/sessions/[id]/edit/page.tsx tests/unit/study-sessions/session-form.test.tsx tests/unit/study-sessions/new-session-page.test.tsx
git commit -m "feat: require question type in session form"
```

### Task 3: Display Types In History And Details

**Files:**
- Modify: `src/modules/study-sessions/session-list.tsx:64-87`
- Modify: `src/modules/study-sessions/session-list.module.css:17-34`
- Modify: `src/app/(protected)/sessions/[id]/page.tsx:40-61`
- Modify: `src/app/(protected)/sessions/[id]/session-details.module.css:8-24`
- Modify: `tests/unit/study-sessions/session-list.test.tsx:34-74`
- Modify: `tests/unit/study-sessions/session-details-page.test.tsx:52-123`

**Interfaces:**
- Consumes: `questionTypeLabels: Record<QuestionType, string>` from Task 1.
- Consumes: required `StudySession.questionType` generated by Prisma.
- Produces: localized visible metadata for every enum value, including `UNSPECIFIED`.

- [ ] **Step 1: Add failing rendering tests for classified and legacy sessions**

In the history test, render one `DOCTRINE` and one `UNSPECIFIED` session and assert their individual list items contain `Doutrina` and `Não informado`.

In the details test, assert the normal fixture displays `Jurisprudência`. Add a second render with `questionType: QuestionType.UNSPECIFIED` and assert `Não informado` is visible.

- [ ] **Step 2: Run rendering tests and confirm the red state**

Run: `npm run test:unit -- tests/unit/study-sessions/session-list.test.tsx tests/unit/study-sessions/session-details-page.test.tsx`

Expected: FAIL because the type labels are not rendered.

- [ ] **Step 3: Render localized type metadata**

Import `questionTypeLabels` in both components. In history, keep the date as the first metadata line and add:

```tsx
<span className={styles.questionType}>{questionTypeLabels[session.questionType]}</span>
```

Place it in `.identity` before the subject heading. In details, add the same mapped value beside the date in a metadata wrapper before the heading. Style both labels as muted sans text without introducing a decorative badge or new semantic color.

- [ ] **Step 4: Run rendering and accessibility-adjacent unit verification**

Run: `npm run test:unit -- tests/unit/study-sessions/session-list.test.tsx tests/unit/study-sessions/session-details-page.test.tsx`

Expected: PASS for classified and legacy labels.

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit session type visibility**

```bash
git add src/modules/study-sessions/session-list.tsx src/modules/study-sessions/session-list.module.css src/app/(protected)/sessions/[id]/page.tsx src/app/(protected)/sessions/[id]/session-details.module.css tests/unit/study-sessions/session-list.test.tsx tests/unit/study-sessions/session-details-page.test.tsx
git commit -m "feat: show question types in session views"
```

### Task 4: Filter Dashboard Data By Question Type

**Files:**
- Create: `src/modules/dashboard/question-type-filter.ts`
- Create: `tests/unit/dashboard/question-type-filter.test.ts`
- Modify: `src/modules/dashboard/queries.ts:1-134`
- Modify: `src/modules/dashboard/local-today-redirect.tsx:5-26`
- Modify: `src/app/(protected)/dashboard/page.tsx:5-123`
- Modify: `src/modules/dashboard/dashboard.module.css:6-67,291-312`
- Modify: `tests/integration/dashboard/queries.test.ts:18-309`
- Modify: `tests/unit/dashboard/dashboard-page.test.tsx:48-146`
- Modify: `tests/unit/dashboard/local-today.test.tsx:24-81`

**Interfaces:**
- Consumes: generated `QuestionType` and `questionTypeLabels` from Task 1.
- Produces: `DashboardQuestionType = QuestionType | "all"`.
- Produces: `parseDashboardQuestionType(value: unknown): DashboardQuestionType`.
- Produces: `serializeDashboardQuestionType(value: DashboardQuestionType): string`.
- Changes: `getDashboard(userId, period, today, questionType): Promise<DashboardData>`.
- Changes: `LocalTodayRedirect` requires `questionType: DashboardQuestionType`.

- [ ] **Step 1: Add failing parser tests for every public URL value**

Create `question-type-filter.test.ts`:

```ts
it.each([
  ["all", "all"],
  ["jurisprudence", QuestionType.JURISPRUDENCE],
  ["black-letter-law", QuestionType.BLACK_LETTER_LAW],
  ["doctrine", QuestionType.DOCTRINE],
  ["unspecified", QuestionType.UNSPECIFIED],
  [undefined, "all"],
  ["unknown", "all"],
  [["doctrine"], "all"],
])("parses %j as %s", (input, expected) => {
  expect(parseDashboardQuestionType(input)).toBe(expected);
});

it.each([
  ["all", "all"],
  [QuestionType.JURISPRUDENCE, "jurisprudence"],
  [QuestionType.BLACK_LETTER_LAW, "black-letter-law"],
  [QuestionType.DOCTRINE, "doctrine"],
  [QuestionType.UNSPECIFIED, "unspecified"],
])("serializes %s as %s", (input, expected) => {
  expect(serializeDashboardQuestionType(input as DashboardQuestionType)).toBe(expected);
});
```

- [ ] **Step 2: Run parser tests and confirm the red state**

Run: `npm run test:unit -- tests/unit/dashboard/question-type-filter.test.ts`

Expected: FAIL because the dashboard filter module does not exist.

- [ ] **Step 3: Implement the typed URL boundary**

Create a bidirectional mapping instead of casting query strings:

```ts
const fromParam = {
  jurisprudence: QuestionType.JURISPRUDENCE,
  "black-letter-law": QuestionType.BLACK_LETTER_LAW,
  doctrine: QuestionType.DOCTRINE,
  unspecified: QuestionType.UNSPECIFIED,
} as const;

export type DashboardQuestionType = QuestionType | "all";

export function parseDashboardQuestionType(value: unknown): DashboardQuestionType {
  if (value === "all") return "all";
  return typeof value === "string" && value in fromParam
    ? fromParam[value as keyof typeof fromParam]
    : "all";
}

export function serializeDashboardQuestionType(value: DashboardQuestionType): string {
  if (value === "all") return "all";
  return Object.entries(fromParam).find(([, questionType]) => questionType === value)![0];
}
```

- [ ] **Step 4: Add failing integration coverage for exclusive and legacy filtering**

Update every existing `getDashboard` call to pass `"all"` as the fourth argument. Add a test that inserts sessions for the same user and date with `JURISPRUDENCE`, `DOCTRINE`, and `UNSPECIFIED`, plus a matching type owned by another user.

Assert:

```ts
await expect(getDashboard(owner.id, "30d", "2026-08-23", QuestionType.JURISPRUDENCE))
  .resolves.toMatchObject({
    overall: { totalQuestions: 10, correctAnswers: 8, wrongAnswers: 2 },
    subjects: [{ subject: "Direito Civil", totalQuestions: 10 }],
  });

await expect(getDashboard(owner.id, "30d", "2026-08-23", QuestionType.UNSPECIFIED))
  .resolves.toMatchObject({
    overall: { totalQuestions: 5, correctAnswers: 3, wrongAnswers: 2 },
  });

await expect(getDashboard(owner.id, "30d", "2026-08-23", "all"))
  .resolves.toMatchObject({
    overall: { totalQuestions: 35, correctAnswers: 21, wrongAnswers: 14 },
  });
```

- [ ] **Step 5: Apply the validated filter inside the aggregate CTE**

Extend `getDashboard` with `questionType: DashboardQuestionType` and build only parameterized Prisma SQL:

```ts
const questionTypeFilter = questionType === "all"
  ? Prisma.empty
  : Prisma.sql`AND question_type = ${questionType}::"QuestionType"`;

WITH filtered AS (
  SELECT * FROM study_sessions
  WHERE user_id = ${userId} ${dateFilter} ${questionTypeFilter}
),
```

Do not filter later CTEs independently; `latest`, `subjects`, and `overall` must continue reading only from `filtered`.

- [ ] **Step 6: Add failing page and local-date navigation tests**

Extend dashboard page search params with `questionType`. Assert a `doctrine` request calls:

```ts
expect(mocks.getDashboard).toHaveBeenCalledWith(
  "user-1",
  "30d",
  "2026-08-24",
  QuestionType.DOCTRINE,
);
```

Assert the `Lei Seca` filter link preserves `period=30d` and `today=2026-08-24`, and the `90 dias` link preserves `questionType=doctrine`. Assert an invalid type selects `Todos` and calls the query with `"all"`.

Update `LocalTodayRedirect` tests to pass a selected type and expect replacements such as:

```text
/dashboard?period=30d&today=2026-08-23&questionType=doctrine
```

- [ ] **Step 7: Render and preserve the exclusive dashboard filter**

Parse the query before date preflight:

```ts
const questionType = parseDashboardQuestionType(rawQuestionType);
const questionTypeParam = serializeDashboardQuestionType(questionType);
```

Define the rendered options explicitly:

```ts
const questionTypeOptions = [
  { value: "all", label: "Todos" },
  { value: "jurisprudence", label: questionTypeLabels[QuestionType.JURISPRUDENCE] },
  { value: "black-letter-law", label: questionTypeLabels[QuestionType.BLACK_LETTER_LAW] },
  { value: "doctrine", label: questionTypeLabels[QuestionType.DOCTRINE] },
  { value: "unspecified", label: questionTypeLabels[QuestionType.UNSPECIFIED] },
] as const;
```

Pass `questionType` to both `LocalTodayRedirect` renders and as the fourth argument to `getDashboard`. Add a second filter group:

```tsx
<div className={styles.filterGroup}>
  <h2>Tipo de questão</h2>
  <nav className={styles.filters} aria-label="Filtrar tipo de questão">
    {questionTypeOptions.map(({ value, label }) => (
      <Link
        key={value}
        href={{ pathname: "/dashboard", query: { period, today, questionType: value } }}
        aria-current={questionTypeParam === value ? "page" : undefined}
      >
        {label}
      </Link>
    ))}
  </nav>
</div>
```

Include `questionType: questionTypeParam` in period links. Add a `.filterControls` wrapper so both groups stack with clear spacing, while the through-date stays aligned to the outer row. On mobile, stack controls and keep links wrapping instead of forcing all five options into equal-width columns.

Extend `LocalTodayRedirectProps` and its `URLSearchParams` call:

```ts
const query = new URLSearchParams({
  period,
  today: localToday,
  questionType: serializeDashboardQuestionType(questionType),
});
```

- [ ] **Step 8: Run dashboard verification**

Run: `npm run test:unit -- tests/unit/dashboard/question-type-filter.test.ts tests/unit/dashboard/dashboard-page.test.tsx tests/unit/dashboard/local-today.test.tsx`

Expected: PASS for parsing, active filters, preserved query values, and local-date correction.

Run: `npm run test:integration -- tests/integration/dashboard/queries.test.ts`

Expected: PASS for all-type totals, exclusive category totals, legacy totals, date windows, and user isolation.

Run: `npm run typecheck`

Expected: PASS with the new query and redirect signatures used everywhere.

- [ ] **Step 9: Commit dashboard filtering**

```bash
git add src/modules/dashboard/question-type-filter.ts src/modules/dashboard/queries.ts src/modules/dashboard/local-today-redirect.tsx src/app/(protected)/dashboard/page.tsx src/modules/dashboard/dashboard.module.css tests/unit/dashboard/question-type-filter.test.ts tests/unit/dashboard/dashboard-page.test.tsx tests/unit/dashboard/local-today.test.tsx tests/integration/dashboard/queries.test.ts
git commit -m "feat: filter dashboard by question type"
```

### Task 5: Cover The Complete User Flow And Verify The Release

**Files:**
- Modify: `tests/e2e/helpers.ts:66-89`
- Modify: `tests/e2e/auth-and-sessions.spec.ts:17-196`
- Modify: `tests/e2e/responsive.spec.ts:82-143`

**Interfaces:**
- Consumes: accessible radio labels and dashboard filter links from Tasks 2 and 4.
- Produces: `SessionInput.questionType: "Jurisprudência" | "Lei Seca" | "Doutrina"` in the E2E helper.
- Verifies: form requirement, edit persistence, history/details labels, dashboard filtering, URL preservation, responsiveness, and accessibility.

- [ ] **Step 1: Make E2E session creation choose a required type explicitly**

Extend the helper input and select the radio before submission:

```ts
type SessionInput = {
  studyDate: string;
  subject: string;
  questionType: "Jurisprudência" | "Lei Seca" | "Doutrina";
  totalQuestions: string;
  correctAnswers: string;
  questionListUrl?: string;
  wrongQuestionListUrl?: string;
};

await page.getByRole("radio", { name: input.questionType }).check();
```

Add an explicit `questionType` to every `createSession` call. In direct form flows, check a radio before saving so each test isolates its intended behavior.

- [ ] **Step 2: Extend the complete lifecycle test**

In the create/edit/delete flow, select `Jurisprudência`, assert it appears in the history item, open details and assert the same label, then return to edit and assert the radio remains checked before changing counts.

Add a required-field check in a focused test:

```ts
await page.getByLabel("Data do estudo").fill(controlledToday);
await page.getByLabel("Assunto").fill("Sessão sem tipo");
await page.getByLabel("Total de questões").fill("10");
await page.getByLabel("Acertos").fill("6");
await page.getByRole("button", { name: "Salvar sessão" }).click();
await expect(page).toHaveURL(/\/sessions\/new$/);
await expect(page.getByText("Selecione o tipo de questão.").first()).toBeVisible();
```

- [ ] **Step 3: Add an end-to-end dashboard category scenario**

Create one `Jurisprudência` session with 10 questions and one `Doutrina` session with 20 questions. Open the 30-day dashboard and click `Jurisprudência`. Assert the URL retains `period=30d`, `today`, and `questionType=jurisprudence`; assert the summary shows 10 questions and the doctrine subject is absent. Click `Doutrina` and assert the summary switches to 20. Click `Todos` and assert both subjects and 30 total questions return.

- [ ] **Step 4: Extend responsive accessibility coverage**

Create responsive-test sessions with an explicit type. On both mobile and desktop, assert the new-session page has three named radio controls, the dashboard type filter is present, and `expectAccessiblePage` reports no serious/critical Axe violations or horizontal overflow.

- [ ] **Step 5: Run focused E2E tests**

Run: `npm run test:e2e -- tests/e2e/auth-and-sessions.spec.ts tests/e2e/responsive.spec.ts`

Expected: PASS on configured desktop and mobile projects, including the required field, labels, filters, and accessibility checks.

- [ ] **Step 6: Run the complete verification suite**

Run each command separately and require a zero exit status:

```bash
npm test
npm run test:integration
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Expected: all unit, operations, security, integration, type, lint, production build, desktop E2E, and mobile E2E checks pass.

- [ ] **Step 7: Review the final diff for scope and generated files**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: only the planned source, migration, test, and plan files are present; `src/generated/prisma/` remains ignored; no whitespace errors are reported.

- [ ] **Step 8: Commit the complete flow coverage**

```bash
git add tests/e2e/helpers.ts tests/e2e/auth-and-sessions.spec.ts tests/e2e/responsive.spec.ts docs/superpowers/plans/2026-08-30-session-question-type-implementation.md
git commit -m "test: cover question type user flows"
```
