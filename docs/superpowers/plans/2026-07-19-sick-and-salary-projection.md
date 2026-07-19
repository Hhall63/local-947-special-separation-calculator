# Sick Leave and Salary Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Project sick leave without an artificial cap and estimate retirement salary from the FY 2025-2026 Greensboro sworn-fire step and exempt range structure.

**Architecture:** Keep all salary data, validation rules, and projection math in `calculator.mjs`. Extend the existing form controller in `app.mjs` for progressive salary inputs and populate an accessible native dialog from the same exported salary data; preserve the current HTML/CSS design system and allowance flow.

**Tech Stack:** Static HTML, CSS custom properties, JavaScript ES modules, native `<dialog>`, Node.js built-in test runner.

## Global Constraints

- Add no dependency and no multi-promotion career timeline.
- Keep anticipated retirement salary as a direct manual override.
- Use November 1 as the annual progression date and January 31 as retirement day.
- Nonexempt progression stops at Step 5 for F01 or Step 8 for F02-F05.
- Exempt merit defaults to 4%, is editable, and stops at Green Zone Maximum.
- Every modeled promotion into an exempt rank starts at Green Zone Minimum.
- Reuse the existing UI tokens, form patterns, gray calculation panel, error behavior, and progressive disclosure.
- Do not alter eligibility, sick-hour conversion, creditable-service selection, allowance multiplier, or result calculation.
- Do not stage or modify `.impeccable/` or `tmp/` artifacts.

---

### Task 1: Remove the sick projection cap

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify: `calculator.mjs`
- Modify: `tests/structure.test.mjs`
- Modify: `index.html`
- Modify: `README.md`

**Interfaces:**
- Consumes: `projectSickHours({ currentHours, currentWorkedYears, remainingYears })`.
- Produces: The same numeric return value, calculated from the uncapped historical net rate.

- [x] **Step 1: Replace cap-focused tests with an uncapped-rate test**

```js
test("projects current sick hours at an uncapped historical net rate", () => {
  assert.equal(
    projectSickHours({
      currentHours: 1_200,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    1_440,
  );
});
```

Update the structural copy assertion to require `uncapped historical net rate` and reject `caps that rate at 96 hours per year`.

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test --test-name-pattern "uncapped historical|progressive disclosure layout"`

Expected: FAIL because `projectSickHours()` still limits the rate to 96 and the old assumption remains.

- [x] **Step 3: Remove the cap at the shared projection function**

```js
export function projectSickHours({
  currentHours,
  currentWorkedYears,
  remainingYears,
}) {
  if (currentWorkedYears <= 0) {
    throw new RangeError("Current worked service must be greater than zero.");
  }

  return currentHours +
    (currentHours / currentWorkedYears) * remainingYears;
}
```

Delete `MAX_SICK_ACCRUAL_PER_YEAR`, update the assumption sentence, and remove the obsolete constant from README maintenance guidance.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `node --test --test-name-pattern "sick|progressive disclosure layout"`

Expected: all sick projection, conversion, integrated service, and assumption tests pass.

- [x] **Step 5: Commit the sick change**

```powershell
git add -- calculator.mjs index.html README.md tests/calculator.test.mjs tests/structure.test.mjs
git commit -m "fix: project uncapped historical sick leave"
```

### Task 2: Add table-driven salary projection

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify: `calculator.mjs`

**Interfaces:**
- Produces: `SALARY_STRUCTURE`, `isExemptRank(rank)`, `projectStructuredSalary(input)`.
- `projectStructuredSalary(input)` returns `{ salary, rank, step, maximumDate, maximumStatus }`, where `step` is `null` for exempt ranks and `maximumStatus` is `"already"`, `"reached"`, or `"not-before-retirement"`.
- Consumed later by: `calculateRetirementSalary()`, `populateSalaryChoices()`, salary preview rendering, and the salary-table dialog.

- [x] **Step 1: Add salary-structure and boundary tests**

Add tests that assert:

```js
assert.deepEqual(SALARY_STRUCTURE.f01.steps, [49724, 51713, 53782, 55933, 58170]);
assert.equal(SALARY_STRUCTURE.f05.steps.at(-1), 105705);
assert.equal(SALARY_STRUCTURE.f06.greenMax, 123751);
assert.equal(SALARY_STRUCTURE.f09.rangeMax, 265045);
```

Exercise these cases with fixed local dates:

```js
projectStructuredSalary({
  currentRank: "f02",
  currentStep: 7,
  retirementRank: "f02",
  meritRate: 4,
  today: new Date(2026, 6, 19),
  retirementDate: new Date(2028, 0, 31),
});
// salary 74263, step 8, maximumDate 2026-11-01
```

Also prove: a raise does not occur before November 1; F01 stops at Step 5; a same-day November 1 promotion does not receive a second raise; closest-step promotion chooses the higher step on a tie; exempt compounding stops exactly at Green Zone Maximum; an exempt salary already above Green Zone Maximum is not reduced; any exempt promotion begins at Green Zone Minimum; and no maximum before retirement returns `not-before-retirement`.

- [x] **Step 2: Run the focused salary tests and verify RED**

Run: `node --test --test-name-pattern "salary structure|structured salary|November 1|Green Zone|closest step" tests/calculator.test.mjs`

Expected: FAIL because the structure and projection function do not exist.

- [x] **Step 3: Add the single salary data source**

```js
export const SALARY_STRUCTURE = Object.freeze({
  f01: { grade: 1, label: "Fire Fighter", type: "nonexempt", steps: [49724, 51713, 53782, 55933, 58170], rangeMax: null },
  f02: { grade: 2, label: "Fire Fighter Sr", type: "nonexempt", steps: [56434, 58691, 61039, 63481, 66020, 68661, 71407, 74263], rangeMax: 83013 },
  f04: { grade: 4, label: "Sr Fire Inspector / Fire Engineer", type: "nonexempt", steps: [66980, 69660, 72446, 75344, 78358, 81492, 84752, 88142], rangeMax: 98527 },
  f05: { grade: 5, label: "Fire Captain / Asst Fire Marshal", type: "nonexempt", steps: [80327, 83540, 86882, 90357, 93972, 97730, 101640, 105705], rangeMax: 118160 },
  f06: { grade: 6, label: "Battalion Chief / Deputy Fire Marshal", type: "exempt", rangeMin: 77303, greenMin: 94040, controlPoint: 101714, greenMax: 123751, rangeMax: 138331 },
  f07: { grade: 7, label: "Assistant Fire Chief / Fire Marshal", type: "exempt", rangeMin: 98948, greenMin: 120373, controlPoint: 130195, greenMax: 158402, rangeMax: 177065 },
  f08: { grade: 8, label: "Deputy Fire Chief", type: "exempt", rangeMin: 111297, greenMin: 135395, controlPoint: 146443, greenMax: 178170, rangeMax: 199162 },
  f09: { grade: 9, label: "Fire Chief", type: "exempt", rangeMin: 148113, greenMin: 180183, controlPoint: 194886, greenMax: 237109, rangeMax: 265045 },
});
```

Delete `RANK_SALARIES`, `RAISE_RATE`, `countJulyRaises()`, and the old rank/current projection branch after callers are migrated.

- [x] **Step 4: Implement the smallest event-based projection**

`projectStructuredSalary()` starts from the current rank/step or salary, processes at most one promotion and each intervening November 1 in chronological order, skips the annual raise when it shares the promotion date, and records when the retirement rank reaches its cap. Use `Date` comparisons and the published arrays directly; do not add a timeline class.

`calculateRetirementSalary()` returns `amount` for anticipated mode and `projectStructuredSalary(input.salary).salary` for structure mode.

- [x] **Step 5: Run focused and complete calculator tests**

Run:

```powershell
node --test --test-name-pattern "salary|raise|promotion|Green Zone|closest step" tests/calculator.test.mjs
node --test tests/calculator.test.mjs
```

Expected: all calculator tests pass and the old July 1/rank-starting tests have been replaced.

- [x] **Step 6: Commit the salary domain change**

```powershell
git add -- calculator.mjs tests/calculator.test.mjs
git commit -m "feat: project salaries from sworn fire structure"
```

### Task 3: Replace the salary form and validation

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify: `tests/structure.test.mjs`
- Modify: `index.html`
- Modify: `app.mjs`

**Interfaces:**
- Structured salary input shape: `{ mode: "structure", currentRank, currentStep, currentSalary, retirementRank, promotionMonth, promotionYear, meritRate }`.
- New DOM IDs: `salary-structure-fields`, `current-rank`, `current-step-field`, `current-step`, `current-exempt-salary-field`, `current-exempt-salary`, `retirement-rank-field`, `retirement-rank`, `promotion-date-fields`, `merit-rate-field`, `merit-rate`, `salary-position`, `salary-maximum`.

- [x] **Step 1: Add failing validation and controller tests**

Test valid manual, nonexempt, exempt, and promoted salary inputs. Test errors for missing/unknown rank, invalid step, nonpositive or above-Range-Max exempt salary, negative merit rate, lower retirement grade, and missing/nonfuture/post-retirement promotion date.

Extend the browser fixture to prove that selecting `structure` reveals current rank; F02 reveals step but not current salary; F06 reveals current salary and merit; a changed retirement rank reveals promotion date; and a complete valid structure input reveals all three preview values.

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test --test-name-pattern "structured salary inputs|salary validation|progressively reveals"`

Expected: FAIL because the new DOM fields and input shape are absent.

- [x] **Step 3: Replace salary markup with two modes**

Keep `anticipated` and replace `current`/`rank` with:

```html
<label>
  <input type="radio" name="salary-mode" value="structure" required />
  Project from FY 2025-2026 salary structure
</label>
```

Add the structured select/number fields using the IDs above, `min="0"`, appropriate `step`, and existing `.field`, `.field-row`, `.choice-stack`, `.hint`, and `.calculation-panel` classes.

- [x] **Step 4: Collect, reveal, validate, and render through existing paths**

- Populate current and retirement ranks from `SALARY_STRUCTURE` and steps from the selected current rank.
- Collect the structured salary object in `collectInput()`.
- Update `salaryErrorKeys`, `errorTargets`, and `validateInput()` for the new fields.
- Keep all visibility decisions in `updateConditionalFields(errors)`.
- Render projected salary, final step/exempt position, and maximum date/status in the existing preview.
- Ensure reset returns merit rate to `4`, clears generated step choices, and hides every dependent region.

- [x] **Step 5: Run focused and full tests**

Run:

```powershell
node --test --test-name-pattern "salary|progressively reveals|complete reset"
node --test
```

Expected: all tests pass.

- [x] **Step 6: Commit the salary interface**

```powershell
git add -- app.mjs calculator.mjs index.html tests/calculator.test.mjs tests/structure.test.mjs
git commit -m "feat: add structured salary entry"
```

### Task 4: Add the salary dialog, assumptions, and visual integration

**Files:**
- Modify: `tests/structure.test.mjs`
- Modify: `index.html`
- Modify: `app.mjs`
- Modify: `styles.css`
- Modify: `README.md`

**Interfaces:**
- New DOM IDs: `open-salary-structure`, `salary-structure-dialog`, `close-salary-structure`, `nonexempt-salary-body`, `exempt-salary-body`.
- Consumes: `SALARY_STRUCTURE` for dialog row generation.

- [x] **Step 1: Add failing dialog, copy, and visual-hook tests**

Assert the native dialog, opener, close button, two labeled tables, effective date, and these assumptions exist:

```text
Current sick hours are projected using your uncapped historical net rate.
November 1 is used as the estimated annual raise date because the dates City Hall releases raises vary.
Salary values use the FY 2025-2026 structure effective October 15, 2025 until this calculator is manually updated.
```

Test opener `showModal()`, Close, Escape-native close/focus restoration, and reset closing behavior with the fixture's dialog stub.

- [x] **Step 2: Run focused tests and verify RED**

Run: `node --test --test-name-pattern "salary structure dialog|salary assumptions|complete reset"`

Expected: FAIL because the dialog and new copy are absent.

- [x] **Step 3: Add semantic dialog markup and shared-data population**

Use `<dialog>` with a heading, effective-date paragraph, two `.table-scroll` wrappers, semantic tables, progression notes, and the existing secondary Close button. Populate body rows from `SALARY_STRUCTURE`; do not duplicate salary amounts in `app.mjs`.

- [x] **Step 4: Reuse the existing visual system**

Add only the required selectors: `.salary-source`, `.salary-dialog`, `.salary-dialog__header`, `.table-scroll`, and `.salary-table`. Use existing `--navy`, `--red`, `--gold`, `--surface`, `--border`, `--white`, `--radius-sm`, `--radius-md`, and spacing variables. Style `dialog::backdrop` with a translucent navy. Constrain dialog width/height and table overflow so the page never scrolls horizontally.

- [x] **Step 5: Update assumptions and maintenance documentation**

Replace the capped sick statement, document November 1 and the active salary source/rules, and update README maintenance notes to point to `SALARY_STRUCTURE` and the dialog effective-date copy.

- [x] **Step 6: Run full automated and rendered verification**

Run:

```powershell
node --test
node --check app.mjs
node --check calculator.mjs
git diff --check
node C:/Users/ffhal/.agents/skills/impeccable/scripts/detect.mjs --json index.html styles.css
```

Render 1440px and 390px initial, structured nonexempt, structured exempt/promotion, dialog, complete, and reset states. Verify keyboard focus restoration and no page-level horizontal overflow.

- [x] **Step 7: Commit, push, and verify production**

```powershell
git add -- README.md app.mjs calculator.mjs index.html styles.css tests/calculator.test.mjs tests/structure.test.mjs docs/superpowers/plans/2026-07-19-sick-and-salary-projection.md
git commit -m "feat: add salary structure guidance"
git push origin master
```

Poll `https://hhall63.github.io/local-947-special-separation-calculator/` until it returns the new structure mode, effective date, dialog IDs, maximum-result fields, and uncapped sick assumption.

## Self-review

- Spec coverage: all approved sick, nonexempt, exempt, one-promotion, manual-override, dialog, assumptions, visual-integration, validation, reset, test, and deployment requirements map to Tasks 1-4.
- Placeholder scan: no unfinished requirement or unspecified implementation step remains.
- Interface consistency: `SALARY_STRUCTURE`, `projectStructuredSalary()`, the structured input shape, DOM IDs, and result fields are defined once and consumed consistently by later tasks.
