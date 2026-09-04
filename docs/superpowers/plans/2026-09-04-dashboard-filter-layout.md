# Dashboard Filter Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Place the `Periodo` and `Tipo de questao` dashboard filter groups on one desktop row while preserving the stacked mobile layout.

**Architecture:** Keep the existing server-rendered dashboard markup and change only its CSS flex direction. Extend the existing responsive end-to-end test with geometry assertions so desktop and mobile layouts are both protected against regression.

**Tech Stack:** Next.js 16, React 19, CSS Modules, Playwright 1.62

## Global Constraints

- Keep filter links, query parameters, accessible labels, focus styles, and selected-state semantics unchanged.
- Keep the date at the opposite side of the filter row.
- Use the existing `44rem` breakpoint for the stacked mobile layout.
- Do not modify or restore unrelated worktree changes.
- Do not create a git commit unless the user explicitly requests one.

---

### Task 1: Responsive Dashboard Filter Alignment

**Files:**
- Modify: `tests/e2e/responsive.spec.ts:119-139`
- Modify: `src/modules/dashboard/dashboard.module.css:16-21,301-316`

**Interfaces:**
- Consumes: Existing `filterControls` and `filterGroup` CSS Module classes rendered by `src/app/(protected)/dashboard/page.tsx`.
- Produces: A horizontal desktop filter-group layout and a Playwright regression assertion for desktop and mobile alignment.

- [ ] **Step 1: Write the failing responsive layout assertion**

In the dashboard test step, after locating `typeFilters`, capture the two filter heading rectangles and assert their geometry according to the current viewport:

```ts
const filterHeadingPositions = await Promise.all([
  page.getByRole("heading", { name: "Período" }),
  page.getByRole("heading", { name: "Tipo de questão" }),
].map((heading) => heading.evaluate((element) => {
  const { top, bottom } = element.getBoundingClientRect();
  return { top, bottom };
})));
const [periodHeading, questionTypeHeading] = filterHeadingPositions;

if (viewport.name === "desktop") {
  expect(Math.abs(periodHeading.top - questionTypeHeading.top)).toBeLessThan(2);
} else {
  expect(questionTypeHeading.top).toBeGreaterThan(periodHeading.bottom);
}
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npx playwright test tests/e2e/responsive.spec.ts --grep "core pages remain responsive and accessible"
```

Expected: the desktop assertion fails because `.filterControls` currently uses `flex-direction: column`.

- [ ] **Step 3: Implement the minimal responsive CSS change**

Update the base `.filterControls` rule:

```css
.filterControls {
  display: flex;
  min-width: 0;
  flex-direction: row;
  gap: 1rem 2rem;
}
```

Update the existing mobile rule so it explicitly restores the current layout:

```css
.filterControls {
  width: 100%;
  flex-direction: column;
  gap: 0.5rem;
}
```

- [ ] **Step 4: Run the focused responsive test**

Run:

```bash
npx playwright test tests/e2e/responsive.spec.ts --grep "core pages remain responsive and accessible"
```

Expected: PASS at both the `390x844` mobile viewport and the `1440x900` desktop viewport, with no horizontal overflow or serious/critical Axe violations.

- [ ] **Step 5: Run static verification**

Run:

```bash
npm run lint
npm run typecheck
```

Expected: both commands exit successfully.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git diff -- tests/e2e/responsive.spec.ts src/modules/dashboard/dashboard.module.css docs/superpowers/specs/2026-09-04-dashboard-filter-layout-design.md docs/superpowers/plans/2026-09-04-dashboard-filter-layout.md
```

Expected: only the approved responsive layout, its regression coverage, and the associated design/plan documents appear.
