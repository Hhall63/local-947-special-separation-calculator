# Calculator Math and Logic Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct every confirmed calculator arithmetic defect and add comprehensive automated coverage for all approved policy choices and meaningful numeric boundaries.

**Architecture:** Keep all policy math in the existing pure `calculator.mjs` module and DOM-only formatting in `app.mjs`. Add one internal tolerance-aware comparison helper, reuse the existing calculation paths, and extend the built-in Node tests with data-driven boundary and finite-domain sweeps. Do not add a dependency or refactor unrelated code.

**Tech Stack:** Browser ES modules, native JavaScript `Date`/`Intl`, Node.js built-in `node:test` and `node:assert/strict`.

## Global Constraints

- The approved policies in `docs/superpowers/specs/2026-07-19-calculator-math-logic-hardening-design.md` are authoritative.
- Fewer than eight total sick hours produce zero service months.
- Eight total sick hours begin the first service month.
- Every complete 160-hour block produces one service month.
- After a complete block, a remainder of at least one hour produces one additional month; a smaller remainder does not.
- Keep the approved Excel `YEARFRAC(today, retirementDate, 1)` projection policy.
- Retain all approved age, eligibility, salary, allowance, payment-frequency, coverage-duration, validation, copy, accessibility, privacy, and reset policies.
- No new dependency, framework, abstraction layer, UI component, policy option, or unrelated refactor.
- Use test-driven development: record the focused RED result before changing production code.
- Run `node --test`, `node --check app.mjs`, `node --check calculator.mjs`, and `git diff --check` before every task commit.

---

## File Structure

- `calculator.mjs`: Pure numeric comparison, date fraction, service, sick-leave, eligibility, salary, allowance, and validation logic.
- `app.mjs`: Browser collection and rendering; only projected-sick-hour formatting changes.
- `tests/calculator.test.mjs`: Pure unit, boundary, property, validation, and integrated-estimate coverage.
- `tests/structure.test.mjs`: Browser-controller regression for the projected sick-hours preview.

### Task 1: Correct sick-leave conversion and preview precision

**Files:**
- Modify: `calculator.mjs:1-84`
- Modify: `app.mjs:19-24,379-383`
- Test: `tests/calculator.test.mjs:55-83`
- Test: `tests/structure.test.mjs` in the existing browser-controller fixture

**Interfaces:**
- Consumes: `sickHoursToServiceMonths(hours: number)` and projected `retirementSickHours`.
- Produces: Internal `isAtLeast(value, minimum)` for later tasks; corrected sick-service months; projected-hour text with up to two decimal places.

- [ ] **Step 1: Replace the faulty sick test with a failing policy-boundary matrix**

Use this exact table in `tests/calculator.test.mjs`:

```js
test("converts sick hours using the approved eight-hour minimum and partial-block rule", () => {
  const cases = [
    [0, 0],
    [0.99, 0],
    [1, 0],
    [7.99, 0],
    [8, 1],
    [159.99, 1],
    [160, 1],
    [160.75, 1],
    [161, 2],
    [319.99, 2],
    [320, 2],
    [320.75, 2],
    [321, 3],
  ];

  for (const [hours, months] of cases) {
    assert.equal(sickHoursToServiceMonths(hours), months, `${hours} hours`);
  }
  assert.throws(() => sickHoursToServiceMonths(-0.25), RangeError);
});
```

Add a finite quarter-hour sweep through 4,800 hours:

```js
test("sick conversion follows the approved rule for every quarter hour through 600 days", () => {
  for (let quarters = 0; quarters <= 19_200; quarters += 1) {
    const hours = quarters / 4;
    const fullMonths = Math.floor(hours / 160);
    const remainder = hours - fullMonths * 160;
    const expected = hours < 8 ? 0 : fullMonths + (remainder >= 1 ? 1 : 0);
    assert.equal(sickHoursToServiceMonths(hours), expected, `${hours} hours`);
  }
});
```

In the existing browser-controller regression, set the projected sick value to `160.75` and add:

```js
assert.equal(
  elements.get("projected-sick-hours").textContent,
  "160.75 hours",
);
```

- [ ] **Step 2: Run the focused tests and record RED**

Run:

```powershell
node --test --test-name-pattern "sick hours|sick conversion" tests/calculator.test.mjs
node --test tests/structure.test.mjs
```

Expected: failure because `1` and `7.99` return one month and the preview rounds `160.75` to `161`.

- [ ] **Step 3: Implement the minimal shared comparison and sick policy**

In `calculator.mjs`, keep the existing constants and add:

```js
const NUMERIC_TOLERANCE = 1e-9;

function isAtLeast(value, minimum) {
  return value >= minimum - NUMERIC_TOLERANCE;
}
```

Replace `sickHoursToServiceMonths()` with:

```js
export function sickHoursToServiceMonths(hours) {
  if (hours < 0) {
    throw new RangeError("Sick hours cannot be negative.");
  }
  if (!isAtLeast(hours, 8)) return 0;

  const fullMonths = Math.floor(hours / HOURS_PER_SICK_MONTH);
  const remainingHours = hours - fullMonths * HOURS_PER_SICK_MONTH;
  return fullMonths + (isAtLeast(remainingHours, 1) ? 1 : 0);
}
```

In `app.mjs`, add beside `currency`:

```js
const hoursFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
```

Render projected hours with:

```js
element("projected-sick-hours").textContent = service
  ? hoursFormat.format(service.retirementSickHours) + " hours"
  : "-";
```

- [ ] **Step 4: Run focused and complete verification**

Run the focused command from Step 2, then:

```powershell
node --test
node --check app.mjs
node --check calculator.mjs
git diff --check
```

Expected: focused tests and the complete suite pass; all checks exit 0.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- calculator.mjs app.mjs tests/calculator.test.mjs tests/structure.test.mjs
git commit -m "fix: correct sick leave service credit"
```

### Task 2: Make service thresholds and 50% share numerically reliable

**Files:**
- Modify: `calculator.mjs:108-216`
- Test: `tests/calculator.test.mjs` eligibility section

**Interfaces:**
- Consumes: Task 1 internal `isAtLeast(value, minimum)`.
- Produces: Tolerance-safe five-, 25-, and 30-year decisions and a cross-multiplied 50% GFD-share decision.

- [ ] **Step 1: Add failing composite-boundary regressions**

Add exact composite totals rather than passing literal `25`, `30`, or `0.5` values:

```js
test("composite month values pass exact 25- and 30-year thresholds", () => {
  const twentyFive = 12.5 + (10 + 8 / 12) + 22 / 12;
  const thirty = 17.5 + (10 + 8 / 12) + 22 / 12;

  assert.equal(twentyFive, 24.999999999999996);
  assert.equal(evaluateEligibility({ retirementAge: 60, eligibilityServiceYears: twentyFive }).unreduced, true);
  assert.equal(evaluateEligibility({ retirementAge: 59, eligibilityServiceYears: thirty }).unreduced, true);
});

test("composite month values pass an exact 50 percent GFD share", () => {
  const projectedGfdYears = 12.5;
  const eligibilityServiceYears = projectedGfdYears + (10 + 7 / 12) + 23 / 12;
  const result = evaluateEligibility({ projectedGfdYears, eligibilityServiceYears });
  const share = result.checks.find((check) => check.key === "gfd-share");

  assert.equal(result.gfdShare, 0.49999999999999994);
  assert.equal(share.passed, true);
  assert.equal(share.actual, "50.0%");
});
```

Add one-month-below, exact, and one-month-above cases so tolerance cannot admit a real boundary miss:

```js
test("service and share tolerance does not admit a full-month miss", () => {
  for (const [years, expected] of [
    [4 + 11 / 12, false],
    [5, true],
    [5 + 1 / 12, true],
  ]) {
    const check = evaluateEligibility({
      continuousGfd: true,
      projectedGfdYears: years,
    }).checks.find((item) => item.key === "continuous-gfd");
    assert.equal(check.passed, expected, `${years} projected GFD years`);
  }

  for (const [age, years, expected] of [
    [60, 24 + 11 / 12, false],
    [60, 25, true],
    [60, 25 + 1 / 12, true],
    [59, 29 + 11 / 12, false],
    [59, 30, true],
    [59, 30 + 1 / 12, true],
  ]) {
    assert.equal(
      evaluateEligibility({ retirementAge: age, eligibilityServiceYears: years }).unreduced,
      expected,
      `${years} years at age ${age}`,
    );
  }

  for (const [gfdYears, expected] of [
    [12.5 - 1 / 12, false],
    [12.5, true],
    [12.5 + 1 / 12, true],
  ]) {
    const check = evaluateEligibility({
      projectedGfdYears: gfdYears,
      eligibilityServiceYears: 25,
    }).checks.find((item) => item.key === "gfd-share");
    assert.equal(check.passed, expected, `${gfdYears} of 25 years`);
  }
});
```

- [ ] **Step 2: Run focused tests and record RED**

Run:

```powershell
node --test --test-name-pattern "composite month|one month below|50 percent" tests/calculator.test.mjs
```

Expected: exact composite 25/30 and 50% cases fail under direct floating-point comparison.

- [ ] **Step 3: Reuse the Task 1 comparison at every derived threshold**

In `evaluateEligibility()`:

```js
const gfdSharePassed =
  hasProjectedGfd && hasEligibilityService && eligibilityServiceYears > 0
    ? isAtLeast(projectedGfdYears * 2, eligibilityServiceYears)
    : null;
const unreduced =
  !hasEligibilityService
    ? null
    : isAtLeast(eligibilityServiceYears, 30)
      ? true
      : !isAtLeast(eligibilityServiceYears, 25)
        ? false
        : hasAge
          ? retirementAge >= 60
          : null;
const continuousPassed =
  continuousGfd === false
    ? false
    : continuousGfd === true && hasProjectedGfd
      ? isAtLeast(projectedGfdYears, 5)
      : null;
```

Set the GFD check's `passed` to `gfdSharePassed`. Select the display branch using `gfdSharePassed === false`, so an exact accepted share renders `50.0%` instead of a floored `49.9%`.

- [ ] **Step 4: Run focused and complete verification**

Run the focused command from Step 2, then the four global verification commands.

Expected: all tests and checks pass.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- calculator.mjs tests/calculator.test.mjs
git commit -m "fix: stabilize service eligibility boundaries"
```

### Task 3: Match Excel Actual/Actual across every date class

**Files:**
- Modify: `calculator.mjs:4-40`
- Test: `tests/calculator.test.mjs:33-53`

**Interfaces:**
- Consumes: `yearFractionActualActual(startDate: Date, endDate: Date)`.
- Produces: Excel-compatible basis-1 year fractions without changing callers.

- [ ] **Step 1: Add failing Excel-compatible date cases**

Add:

```js
test("matches Excel Actual/Actual for a multi-year range", () => {
  const result = yearFractionActualActual(
    new Date(2026, 6, 18),
    new Date(2030, 0, 31),
  );
  assert.ok(Math.abs(result - 3.54052573932092) < 1e-12);
});

test("handles Actual/Actual date classes and invalid ranges", () => {
  assert.equal(yearFractionActualActual(new Date(2026, 0, 31), new Date(2027, 0, 31)), 1);
  assert.ok(Math.abs(yearFractionActualActual(new Date(2024, 1, 29), new Date(2025, 1, 28)) - 365 / 366) < 1e-12);
  assert.throws(() => yearFractionActualActual(new Date(2026, 0, 31), new Date(2026, 0, 31)), RangeError);
  assert.throws(() => yearFractionActualActual(new Date(2026, 1, 1), new Date(2026, 0, 31)), RangeError);
});
```

Import `execFileSync` from `node:child_process` and add:

```js
test("Actual/Actual is independent of daylight-saving time zones", () => {
  const moduleUrl = new URL("../calculator.mjs", import.meta.url).href;
  const script = `
    import { yearFractionActualActual } from ${JSON.stringify(moduleUrl)};
    console.log(yearFractionActualActual(new Date(2026, 2, 8), new Date(2030, 0, 31)));
  `;
  const values = ["America/New_York", "UTC"].map((TZ) =>
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, TZ },
    }).trim(),
  );
  assert.equal(values[0], values[1]);
});
```

- [ ] **Step 2: Run focused date tests and record RED**

```powershell
node --test --test-name-pattern "Actual/Actual|YEARFRAC" tests/calculator.test.mjs
```

Expected: the multi-year case fails because the current function sums per-year fractions.

- [ ] **Step 3: Implement Excel's basis-1 denominator rules**

Keep `toUtcDate()` and `isLeapYear()`. Add these helpers:

```js
function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

function isFebruary29(date) {
  return date.getUTCMonth() === 1 && date.getUTCDate() === 29;
}

function isNoMoreThanOneYear(start, end) {
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return true;
  if (endYear !== startYear + 1) return false;

  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  return (
    startMonth > endMonth ||
    (startMonth === endMonth && start.getUTCDate() >= end.getUTCDate())
  );
}

function includesFebruary29(start, end) {
  for (
    let year = start.getUTCFullYear();
    year <= end.getUTCFullYear();
    year += 1
  ) {
    if (!isLeapYear(year)) continue;
    const leapDay = new Date(Date.UTC(year, 1, 29));
    if (leapDay >= start && leapDay <= end) return true;
  }
  return false;
}

function actualActualYearLength(start, end) {
  if (isNoMoreThanOneYear(start, end)) {
    const sameLeapYear =
      start.getUTCFullYear() === end.getUTCFullYear() &&
      isLeapYear(start.getUTCFullYear());
    return sameLeapYear || isFebruary29(start) || isFebruary29(end) || includesFebruary29(start, end)
      ? 366
      : 365;
  }

  let days = 0;
  let years = 0;
  for (
    let year = start.getUTCFullYear();
    year <= end.getUTCFullYear();
    year += 1
  ) {
    days += daysInYear(year);
    years += 1;
  }
  return days / years;
}
```

The final function shape must remain:

```js
export function yearFractionActualActual(startDate, endDate) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (end <= start) throw new RangeError("End date must be after start date.");

  const actualDays = (end - start) / DAY_MS;
  return actualDays / actualActualYearLength(start, end);
}
```

Do not change `projectService()` or any caller.

- [ ] **Step 4: Run focused and complete verification**

Run the focused command from Step 2, then the four global verification commands.

Expected: all tests and checks pass.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- calculator.mjs tests/calculator.test.mjs
git commit -m "fix: match Excel Actual Actual projection"
```

### Task 4: Complete the finite-domain and equivalence-class logic matrix

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify only if a new failing regression proves a defect: `calculator.mjs`

**Interfaces:**
- Consumes: Every exported function in `calculator.mjs`.
- Produces: Durable exhaustive coverage for finite choices and all meaningful numeric boundaries under the approved model.

- [ ] **Step 1: Add service, age, eligibility, and coverage sweeps**

Add data-driven tests that:

```js
test("round-trips every valid service month", () => {
  for (let years = 0; years <= 40; years += 1) {
    for (let months = 0; months <= 11; months += 1) {
      assert.equal(formatServiceYears(toServiceYears({ years, months })), `${years} years, ${months} months`);
    }
  }
});

test("calculates age and covered months for every birth month", () => {
  for (let birthMonth = 1; birthMonth <= 12; birthMonth += 1) {
    const age = ageAtRetirement({ birthYear: 1970, birthMonth, retirementYear: 2030 });
    assert.equal(age, birthMonth === 1 ? 60 : 59);
    assert.equal(coveredBenefitMonths({ birthYear: 1970, birthMonth, retirementYear: 2030 }), 24 + birthMonth - 1);
  }
});
```

Loop through `true`, `false`, and `undefined` for both eligibility choices:

```js
test("evaluates every required-choice combination", () => {
  const choices = [true, false, undefined];
  for (const regularServiceRetirement of choices) {
    for (const continuousGfd of choices) {
      const result = evaluateEligibility({
        retirementAge: 60,
        regularServiceRetirement,
        continuousGfd,
        projectedGfdYears: 20,
        eligibilityServiceYears: 30,
      });
      assert.equal(
        result.complete,
        regularServiceRetirement !== undefined && continuousGfd !== undefined,
      );
      assert.equal(
        result.failed,
        regularServiceRetirement === false || continuousGfd === false,
      );
      assert.equal(
        result.eligible,
        regularServiceRetirement === true && continuousGfd === true,
      );
    }
  }
});
```

- [ ] **Step 2: Add salary, allowance, projection, and validation matrices**

For every rank, require zero-, one-, and multiple-raise calculations:

```js
test("projects every configured rank across raise counts", () => {
  for (const rank of Object.keys(RANK_SALARIES)) {
    for (const [promotionYear, retirementYear, raises] of [
      [2029, 2030, 0],
      [2028, 2030, 1],
      [2027, 2030, 2],
    ]) {
      assert.equal(
        projectSalary({
          mode: "rank",
          rank,
          promotionMonth: 7,
          promotionYear,
          today: new Date(2026, 0, 31),
          retirementDate: new Date(retirementYear, 0, 31),
        }),
        RANK_SALARIES[rank].salary * 1.04 ** raises,
      );
    }
  }
});
```

Add the exact raise-date table:

```js
test("counts July raises on both sides of the strict boundary", () => {
  for (const [baseDate, expected] of [
    [new Date(2027, 5, 30), 3],
    [new Date(2027, 6, 1), 2],
    [new Date(2027, 6, 2), 2],
  ]) {
    assert.equal(
      countJulyRaises({ baseDate, retirementDate: new Date(2030, 0, 31) }),
      expected,
    );
  }
});

test("preserves full precision for fractional allowance inputs", () => {
  for (const coveredMonths of [1, 13, 24]) {
    const result = calculateBenefit({
      benefitServiceYears: 25 + 7 / 12,
      retirementSalary: 98_765.43,
      coveredMonths,
    });
    const annual = 0.0085 * (25 + 7 / 12) * 98_765.43;
    assert.equal(result.annual, annual);
    assert.equal(result.biweekly, annual / 26);
    assert.equal(result.total, (annual / 12) * coveredMonths);
  }
});
```

Use this mutation-table shape based on `validInput()`:

```js
test("validates every calculator input class", () => {
  const cases = [
    ["retirement-year", (input) => { input.retirementYear = Number.NaN; }],
    ["birth-month", (input) => { input.birthMonth = 0; }],
    ["birth-year", (input) => { input.birthYear = 1899; }],
    ["regular-retirement", (input) => { input.regularServiceRetirement = undefined; }],
    ["continuous-gfd", (input) => { input.continuousGfd = undefined; }],
    ["gfd-years", (input) => { input.currentGfd.years = -1; }],
    ["gfd-years", (input) => { input.currentGfd.years = 1.5; }],
    ["gfd-months", (input) => { input.currentGfd.months = 12; }],
    ["other-lgers", (input) => { input.otherLgers = undefined; }],
    ["other-years", (input) => { input.otherLgers = { years: -1, months: 0 }; }],
    ["other-months", (input) => { input.otherLgers = { years: 0, months: 12 }; }],
    ["sick-mode", (input) => { input.sick.mode = undefined; }],
    ["sick-hours", (input) => { input.sick.hours = -0.25; }],
    ["benefit-service-mode", (input) => { input.benefitService.mode = undefined; }],
    ["benefit-years", (input) => { input.benefitService = { mode: "manual", years: 0, months: 0 }; }],
    ["benefit-months", (input) => { input.benefitService = { mode: "manual", years: 1, months: 12 }; }],
    ["anticipated-salary", (input) => { input.salary = { mode: "anticipated", amount: 0 }; }],
    ["current-salary", (input) => { input.salary = { mode: "current", amount: 0 }; }],
    ["rank", (input) => { input.salary = { mode: "rank", rank: "", promotionMonth: 1, promotionYear: 2029 }; }],
    ["promotion-month", (input) => { input.salary = { mode: "rank", rank: "captain", promotionMonth: 0, promotionYear: 2029 }; }],
    ["promotion-year", (input) => { input.salary = { mode: "rank", rank: "captain", promotionMonth: 2, promotionYear: 2030 }; }],
  ];

  for (const [expectedKey, mutate] of cases) {
    const input = structuredClone(validInput());
    mutate(input);
    const errors = validateInput(input, new Date(2026, 6, 17));
    assert.ok(errors[expectedKey], `Expected ${expectedKey}`);
  }
});
```

Add valid mode cases:

```js
test("accepts every supported sick and salary mode", () => {
  const salaryCases = [
    { mode: "anticipated", amount: 100_000 },
    { mode: "current", amount: 90_000 },
    { mode: "rank", rank: "captain", promotionMonth: 1, promotionYear: 2029 },
  ];
  const sickCases = [
    { mode: "retirement", hours: 160.75 },
    { mode: "current", hours: 160.75 },
  ];

  for (const salary of salaryCases) {
    for (const sick of sickCases) {
      const input = structuredClone(validInput());
      input.salary = salary;
      input.sick = sick;
      assert.deepEqual(validateInput(input, new Date(2026, 6, 17)), {});
    }
  }
});
```

- [ ] **Step 3: Add integrated consistency cases**

Use these calculated/manual, current/retirement sick, other-service, and salary combinations:

```js
test("integrated estimates preserve service and allowance identities", () => {
  const cases = [
    {
      otherLgers: null,
      sick: { mode: "retirement", hours: 161 },
      benefitService: { mode: "calculated" },
      salary: { mode: "anticipated", amount: 100_000 },
    },
    {
      otherLgers: { years: 2, months: 6 },
      sick: { mode: "current", hours: 320.75 },
      benefitService: { mode: "calculated" },
      salary: { mode: "current", amount: 90_000 },
    },
    {
      otherLgers: null,
      sick: { mode: "retirement", hours: 8 },
      benefitService: { mode: "manual", years: 28, months: 6 },
      salary: { mode: "rank", rank: "captain", promotionMonth: 1, promotionYear: 2029 },
    },
  ];

  for (const overrides of cases) {
    const estimate = calculateEstimate(
      { ...validInput(), ...overrides },
      new Date(2026, 6, 17),
    );
    assert.equal(
      estimate.service.sickServiceYears,
      estimate.service.sickServiceMonths / 12,
    );
    assert.ok(estimate.benefit);
    assert.equal(estimate.benefit.biweekly, estimate.benefit.annual / 26);
    assert.equal(
      estimate.benefit.total,
      (estimate.benefit.annual / 12) * estimate.coveredMonths,
    );
  }
});
```

Add the integrated eligibility-failure table:

```js
test("withholds the allowance for every eligibility failure class", () => {
  const cases = [
    ["under-62", (input) => { input.birthYear = 1968; }],
    ["regular-service", (input) => { input.regularServiceRetirement = false; }],
    ["continuous-gfd", (input) => { input.continuousGfd = false; }],
    ["gfd-share", (input) => { input.otherLgers = { years: 40, months: 0 }; }],
    ["unreduced", (input) => { input.currentGfd = { years: 20, months: 0 }; }],
  ];

  for (const [failedKey, mutate] of cases) {
    const input = structuredClone(validInput());
    mutate(input);
    const estimate = calculateEstimate(input, new Date(2026, 6, 17));
    assert.equal(estimate.benefit, null, failedKey);
    assert.equal(
      estimate.eligibility.checks.find((check) => check.key === failedKey).passed,
      false,
      failedKey,
    );
  }
});
```

Add end-to-end composite-boundary regressions with exact month inputs:

```js
test("integrated eligibility accepts exact composite service and share thresholds", () => {
  const cases = [
    {
      label: "25 years at age 60",
      today: new Date(2029, 0, 31),
      input: {
        ...validInput(),
        currentGfd: { years: 11, months: 6 },
        otherLgers: { years: 10, months: 8 },
        sick: { mode: "retirement", hours: 3_361 },
      },
    },
    {
      label: "30 years under age 60",
      today: new Date(2029, 0, 31),
      input: {
        ...validInput(),
        birthYear: 1971,
        currentGfd: { years: 16, months: 6 },
        otherLgers: { years: 10, months: 8 },
        sick: { mode: "retirement", hours: 3_361 },
      },
    },
    {
      label: "exactly 50 percent GFD",
      today: new Date(2029, 0, 31),
      input: {
        ...validInput(),
        currentGfd: { years: 11, months: 6 },
        otherLgers: { years: 10, months: 7 },
        sick: { mode: "retirement", hours: 3_521 },
      },
    },
  ];

  for (const { label, today, input } of cases) {
    const estimate = calculateEstimate(input, today);
    assert.equal(estimate.eligibility.eligible, true, label);
    assert.ok(estimate.benefit, label);
  }
});

test("integrated service preserves every sick-hour boundary", () => {
  for (const [hours, months] of [
    [7.99, 0],
    [8, 1],
    [160.75, 1],
    [161, 2],
  ]) {
    const input = validInput();
    input.sick = { mode: "retirement", hours };
    assert.equal(
      calculateEstimate(input, new Date(2029, 0, 31)).service.sickServiceMonths,
      months,
      `${hours} hours`,
    );
  }
});

test("integrated service uses the Excel multi-year projection fraction", () => {
  const estimate = calculateEstimate(validInput(), new Date(2026, 6, 18));
  assert.ok(Math.abs(estimate.dates.remainingYears - 3.54052573932092) < 1e-12);
});
```

- [ ] **Step 4: Run the new matrix and diagnose any failure before editing production code**

```powershell
node --test tests/calculator.test.mjs
```

Expected: pass. If any new test fails, reproduce it independently, trace its caller, and make only the smallest policy-preserving correction required by the approved spec.

- [ ] **Step 5: Run final branch verification**

```powershell
node --test
node --check app.mjs
node --check calculator.mjs
git diff --check
```

Expected: zero failures and all commands exit 0.

- [ ] **Step 6: Commit Task 4**

```powershell
git add -- tests/calculator.test.mjs calculator.mjs
git commit -m "test: cover calculator logic boundaries"
```

## Final Review and Publication

- [ ] Review every task commit against the approved spec with fresh subagents.
- [ ] Fix every Critical or Important review finding and re-review once.
- [ ] Run the full verification suite from root on the final branch.
- [ ] Fast-forward `master`, rerun the full suite on the merged result, and push `master`.
- [ ] Fetch cache-busted live `index.html` and `app.mjs`; verify the updated script is served and both Clear controls remain present.
- [ ] Remove the owned feature worktree and merged feature branch while preserving `.impeccable/audit/`, `.impeccable/critique/`, and `tmp/`.
