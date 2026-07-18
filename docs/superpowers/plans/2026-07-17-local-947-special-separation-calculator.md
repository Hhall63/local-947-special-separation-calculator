# Local 947 Special Separation Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private, accessible, browser-only calculator that determines apparent Fire SSA eligibility and, only when eligible, estimates annual, biweekly, and lifetime payments.

**Architecture:** Use a dependency-free static web page. Keep date, service, sick-leave, eligibility, salary, and benefit calculations as pure exports in `calculator.mjs`; keep DOM collection and rendering in `app.mjs`; verify calculation boundaries with Node's built-in test runner.

**Tech Stack:** Semantic HTML5, modern CSS with OKLCH color tokens, browser ES modules, Node.js built-in `node:test` and `node:assert/strict`.

## Global Constraints

- The user-facing title is exactly **Local 947 Special Separation Calculator**.
- All retirement dates are January 31 of the selected retirement year.
- The application is browser-only: no backend, database, framework, third-party dependency, analytics, cookies, local storage, or network submission.
- Entered GFD and other LGERS service represent service earned as of the browser's current date.
- Future time through retirement increases GFD service only; other LGERS service remains fixed.
- Current sick hours use the historical net accumulation rate capped at 96 hours per year.
- LGERS sick credit is one month per 160 hours plus one month when the remaining block contains at least one full hour.
- Eligibility uses calculated service only; a manual benefit-service value changes only the `0.0085` benefit equation.
- Salary raises are 4% on applicable July 1 dates strictly before retirement; there is no retirement-year raise.
- Ineligible users see every failed requirement and no payment figures.
- Eligible users see annual, gross biweekly (`annual / 26`), and monthly-prorated lifetime estimates.
- Meet WCAG 2.2 AA and support color-vision deficiency, keyboard use, screen readers, and reduced motion.
- Follow `PRODUCT.md`, `DESIGN.md`, and `docs/superpowers/specs/2026-07-17-local-947-special-separation-calculator-design.md`.

---

## File Structure

- `calculator.mjs`: Constants and pure calculation/validation functions. It must never access `document`, `window`, storage, or the network.
- `app.mjs`: Form-state collection, conditional-field visibility, validation rendering, derived previews, result rendering, focus management, and reset behavior.
- `index.html`: Semantic calculator form, eligibility explanation, derived-value output slots, accessible result region, assumptions, and disclaimers.
- `styles.css`: Local 947 design tokens, responsive layout, component states, focus treatment, result states, and reduced-motion override.
- `assets/local-947-logo.png`: User-supplied Local 947 logo copied from `C:\Users\ffhal\Downloads\654087f960e364a26859d818_greensboro_fire_logo-p-500.png`.
- `tests/calculator.test.mjs`: Pure calculation, validation, and orchestration tests.
- `tests/structure.test.mjs`: Static smoke checks for required HTML, accessibility hooks, CSS safeguards, logo, and documentation.
- `README.md`: Preview, test, hosting, privacy, assumptions, and maintenance instructions.
- `DESIGN.md` and `.impeccable/design.json`: Refresh after implementation using Impeccable scan mode so the seed becomes an exact record of the built tokens and components.

## Shared Interfaces

`calculator.mjs` consumes and returns these plain objects:

```js
// Values collected by app.mjs after native input parsing.
const calculatorInput = {
  retirementYear: 2030,
  birthMonth: 1, // 1 through 12
  birthYear: 1970,
  regularServiceRetirement: true, // true, false, or undefined
  continuousGfd: true, // true, false, or undefined
  currentGfd: { years: 26, months: 0 },
  otherLgers: null, // null for N/A, undefined when unanswered, or { years, months }
  sick: { mode: "retirement", hours: 0 },
  benefitService: { mode: "manual", years: 28, months: 0 },
  salary: { mode: "anticipated", amount: 100000 },
};

// calculateEstimate(input, today) returns:
const estimate = {
  dates: { retirementDate, remainingYears },
  service: {
    currentGfdYears,
    otherLgersYears,
    projectedGfdYears,
    retirementSickHours,
    sickServiceMonths,
    sickServiceYears,
    eligibilityServiceYears,
    benefitServiceYears,
  },
  retirementAge,
  eligibility: { eligible, checks, gfdShare, unreduced },
  retirementSalary,
  coveredMonths,
  benefit: null, // null when ineligible
  // or { annual, biweekly, total } when eligible
};
```

---

### Task 1: Date, service, and sick-leave calculation foundation

**Files:**
- Create: `tests/calculator.test.mjs`
- Create: `calculator.mjs`

**Interfaces:**
- Consumes: Native `Date` objects and nonnegative numeric service/hour values.
- Produces: `toServiceYears(value)`, `yearFractionActualActual(startDate, endDate)`, `projectService(args)`, `projectSickHours(args)`, and `sickHoursToServiceMonths(hours)`.

- [ ] **Step 1: Write the failing foundation tests**

Create `tests/calculator.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

import {
  projectService,
  projectSickHours,
  sickHoursToServiceMonths,
  toServiceYears,
  yearFractionActualActual,
} from "../calculator.mjs";

test("converts separate years and months to decimal years", () => {
  assert.equal(toServiceYears({ years: 12, months: 6 }), 12.5);
});

test("matches Microsoft's YEARFRAC Actual/Actual leap-year example", () => {
  const result = yearFractionActualActual(
    new Date(2012, 0, 1),
    new Date(2012, 6, 30),
  );

  assert.ok(Math.abs(result - 0.5765027322404371) < 1e-12);
});

test("adds remaining time only to GFD service", () => {
  const result = projectService({
    today: new Date(2026, 0, 31),
    retirementDate: new Date(2030, 0, 31),
    currentGfdYears: 20,
    otherLgersYears: 4,
  });

  assert.equal(result.remainingYears, 4);
  assert.equal(result.projectedGfdYears, 24);
  assert.equal(result.otherLgersYears, 4);
});

test("projects current sick hours at the historical net rate", () => {
  assert.equal(
    projectSickHours({
      currentHours: 480,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    576,
  );
});

test("caps historical sick accumulation at 96 hours per year", () => {
  assert.equal(
    projectSickHours({
      currentHours: 1200,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    1392,
  );
});

test("converts sick hours using the LGERS partial-block rule", () => {
  assert.equal(sickHoursToServiceMonths(0), 0);
  assert.equal(sickHoursToServiceMonths(160), 1);
  assert.equal(sickHoursToServiceMonths(160.75), 1);
  assert.equal(sickHoursToServiceMonths(161), 2);
  assert.equal(sickHoursToServiceMonths(320), 2);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `calculator.mjs`.

- [ ] **Step 3: Implement the minimum calculation foundation**

Create `calculator.mjs`:

```js
export const HOURS_PER_SICK_MONTH = 160;
export const MAX_SICK_ACCRUAL_PER_YEAR = 96;

const DAY_MS = 86_400_000;

export function toServiceYears({ years, months }) {
  return Number(years) + Number(months) / 12;
}

function toUtcDate(date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function yearFractionActualActual(startDate, endDate) {
  let cursor = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  if (end <= cursor) {
    throw new RangeError("End date must be after start date.");
  }

  let fraction = 0;

  while (cursor < end) {
    const year = cursor.getUTCFullYear();
    const nextYear = new Date(Date.UTC(year + 1, 0, 1));
    const segmentEnd = nextYear < end ? nextYear : end;
    const days = (segmentEnd - cursor) / DAY_MS;
    fraction += days / (isLeapYear(year) ? 366 : 365);
    cursor = segmentEnd;
  }

  return fraction;
}

export function projectService({
  today,
  retirementDate,
  currentGfdYears,
  otherLgersYears,
}) {
  const remainingYears = yearFractionActualActual(today, retirementDate);

  return {
    remainingYears,
    projectedGfdYears: currentGfdYears + remainingYears,
    otherLgersYears,
  };
}

export function projectSickHours({
  currentHours,
  currentWorkedYears,
  remainingYears,
}) {
  if (currentWorkedYears <= 0) {
    throw new RangeError(
      "Current worked service must be greater than zero.",
    );
  }

  const historicalNetRate = Math.min(
    currentHours / currentWorkedYears,
    MAX_SICK_ACCRUAL_PER_YEAR,
  );

  return currentHours + historicalNetRate * remainingYears;
}

export function sickHoursToServiceMonths(hours) {
  if (hours < 0) {
    throw new RangeError("Sick hours cannot be negative.");
  }

  const fullMonths = Math.floor(hours / HOURS_PER_SICK_MONTH);
  const remainingHours = hours - fullMonths * HOURS_PER_SICK_MONTH;
  return fullMonths + (remainingHours >= 1 ? 1 : 0);
}
```

- [ ] **Step 4: Run the foundation tests**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Commit the calculation foundation**

```powershell
git add calculator.mjs tests/calculator.test.mjs
git commit -m "feat: add service and sick leave calculations"
```

---

### Task 2: Fire SSA eligibility evaluation

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify: `calculator.mjs`

**Interfaces:**
- Consumes: `birthYear`, `birthMonth`, `retirementYear`, boolean attestations, projected GFD years, and total calculated eligibility years.
- Produces: `ageAtRetirement(args)` and `evaluateEligibility(args)` returning `{ eligible, checks, gfdShare, unreduced }`.

- [ ] **Step 1: Add failing eligibility boundary tests**

Append to `tests/calculator.test.mjs` and add both names to its existing import:

```js
test("calculates age on January 31 from birth month and year", () => {
  assert.equal(
    ageAtRetirement({
      birthYear: 1970,
      birthMonth: 1,
      retirementYear: 2030,
    }),
    60,
  );
  assert.equal(
    ageAtRetirement({
      birthYear: 1970,
      birthMonth: 2,
      retirementYear: 2030,
    }),
    59,
  );
});

test("qualifies at exactly 30 years regardless of age", () => {
  const result = evaluateEligibility({
    retirementAge: 55,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 20,
    eligibilityServiceYears: 30,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.unreduced, true);
});

test("qualifies at exactly age 60 with 25 years", () => {
  const result = evaluateEligibility({
    retirementAge: 60,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 12.5,
    eligibilityServiceYears: 25,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.gfdShare, 0.5);
});

test("fails when GFD service is below 50 percent", () => {
  const result = evaluateEligibility({
    retirementAge: 60,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 12.49,
    eligibilityServiceYears: 25,
  });

  assert.equal(result.eligible, false);
  assert.equal(
    result.checks.find((check) => check.key === "gfd-share").passed,
    false,
  );
});

test("fails each nonnumeric eligibility requirement independently", () => {
  const result = evaluateEligibility({
    retirementAge: 62,
    regularServiceRetirement: false,
    continuousGfd: false,
    projectedGfdYears: 4.99,
    eligibilityServiceYears: 30,
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(
    result.checks
      .filter((check) => !check.passed)
      .map((check) => check.key),
    ["under-62", "regular-service", "continuous-gfd", "gfd-share"],
  );
});
```

Update the import:

```js
import {
  ageAtRetirement,
  evaluateEligibility,
  projectService,
  projectSickHours,
  sickHoursToServiceMonths,
  toServiceYears,
  yearFractionActualActual,
} from "../calculator.mjs";
```

- [ ] **Step 2: Run tests to verify the new imports fail**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: FAIL because `ageAtRetirement` and `evaluateEligibility` are not exported.

- [ ] **Step 3: Implement eligibility functions**

Append to `calculator.mjs`:

```js
export function ageAtRetirement({
  birthYear,
  birthMonth,
  retirementYear,
}) {
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    throw new RangeError("Birth month must be from 1 through 12.");
  }

  return retirementYear - birthYear - (birthMonth > 1 ? 1 : 0);
}

export function evaluateEligibility({
  retirementAge,
  regularServiceRetirement,
  continuousGfd,
  projectedGfdYears,
  eligibilityServiceYears,
}) {
  const gfdShare =
    eligibilityServiceYears > 0
      ? projectedGfdYears / eligibilityServiceYears
      : 0;
  const unreduced =
    eligibilityServiceYears >= 30 ||
    (retirementAge >= 60 && eligibilityServiceYears >= 25);

  const checks = [
    {
      key: "under-62",
      label: "Under age 62 on the January 31 retirement date",
      passed: retirementAge < 62,
    },
    {
      key: "regular-service",
      label: "Regular LGERS service retirement, not disability retirement",
      passed: regularServiceRetirement === true,
    },
    {
      key: "continuous-gfd",
      label:
        "At least five continuous years as a sworn Greensboro firefighter immediately before retirement",
      passed: continuousGfd === true && projectedGfdYears >= 5,
    },
    {
      key: "gfd-share",
      label: "At least 50% of total creditable service is sworn GFD service",
      passed: gfdShare >= 0.5,
    },
    {
      key: "unreduced",
      label:
        "Unreduced LGERS service retirement: 30 years, or age 60 with 25 years",
      passed: unreduced,
    },
  ];

  return {
    eligible: checks.every((check) => check.passed),
    checks,
    gfdShare,
    unreduced,
  };
}
```

- [ ] **Step 4: Run eligibility tests**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: all 11 tests PASS.

- [ ] **Step 5: Commit eligibility**

```powershell
git add calculator.mjs tests/calculator.test.mjs
git commit -m "feat: evaluate Fire SSA eligibility"
```

---

### Task 3: Salary projection, benefit amounts, and estimate orchestration

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify: `calculator.mjs`

**Interfaces:**
- Consumes: The shared `calculatorInput` object and an injectable `today` date.
- Produces: `RANK_SALARIES`, `retirementDateForYear(year)`, `countJulyRaises(args)`, `projectSalary(args)`, `coveredBenefitMonths(args)`, `calculateBenefit(args)`, and `calculateEstimate(input, today)`.

- [ ] **Step 1: Add failing salary and benefit tests**

Add these names to the test import:

```js
  RANK_SALARIES,
  calculateBenefit,
  calculateEstimate,
  countJulyRaises,
  coveredBenefitMonths,
  projectSalary,
  retirementDateForYear,
```

Append:

```js
test("counts July 1 raises after the base date and before retirement", () => {
  assert.equal(
    countJulyRaises({
      baseDate: new Date(2026, 6, 17),
      retirementDate: new Date(2030, 0, 31),
    }),
    3,
  );
});

test("a July promotion receives its first raise the following July", () => {
  assert.equal(
    projectSalary({
      mode: "rank",
      rank: "captain",
      promotionMonth: 7,
      promotionYear: 2027,
      today: new Date(2026, 6, 17),
      retirementDate: new Date(2030, 0, 31),
    }),
    RANK_SALARIES.captain.salary * 1.04 ** 2,
  );
});

test("uses anticipated salary directly", () => {
  assert.equal(
    projectSalary({
      mode: "anticipated",
      amount: 123456,
      today: new Date(2026, 6, 17),
      retirementDate: new Date(2030, 0, 31),
    }),
    123456,
  );
});

test("counts covered months through the end of the age-62 month", () => {
  assert.equal(
    coveredBenefitMonths({
      birthYear: 1968,
      birthMonth: 1,
      retirementYear: 2029,
    }),
    12,
  );
  assert.equal(
    coveredBenefitMonths({
      birthYear: 1968,
      birthMonth: 2,
      retirementYear: 2030,
    }),
    1,
  );
});

test("calculates annual, biweekly, and monthly-prorated totals", () => {
  assert.deepEqual(
    calculateBenefit({
      benefitServiceYears: 30,
      retirementSalary: 100000,
      coveredMonths: 12,
    }),
    {
      annual: 25500,
      biweekly: 25500 / 26,
      total: 25500,
    },
  );
});

test("manual benefit service changes payments without changing eligibility", () => {
  const estimate = calculateEstimate(
    {
      retirementYear: 2030,
      birthMonth: 1,
      birthYear: 1970,
      regularServiceRetirement: true,
      continuousGfd: true,
      currentGfd: { years: 26, months: 0 },
      otherLgers: null,
      sick: { mode: "retirement", hours: 0 },
      benefitService: { mode: "manual", years: 28, months: 0 },
      salary: { mode: "anticipated", amount: 100000 },
    },
    new Date(2026, 0, 31),
  );

  assert.equal(estimate.service.eligibilityServiceYears, 30);
  assert.equal(estimate.service.benefitServiceYears, 28);
  assert.equal(estimate.eligibility.eligible, true);
  assert.equal(estimate.benefit.annual, 23800);
});

test("returns no benefit when the applicant is ineligible", () => {
  const estimate = calculateEstimate(
    {
      retirementYear: 2030,
      birthMonth: 1,
      birthYear: 1968,
      regularServiceRetirement: true,
      continuousGfd: true,
      currentGfd: { years: 26, months: 0 },
      otherLgers: null,
      sick: { mode: "retirement", hours: 0 },
      benefitService: { mode: "calculated" },
      salary: { mode: "anticipated", amount: 100000 },
    },
    new Date(2026, 0, 31),
  );

  assert.equal(estimate.retirementAge, 62);
  assert.equal(estimate.eligibility.eligible, false);
  assert.equal(estimate.benefit, null);
});
```

- [ ] **Step 2: Run tests and confirm the new exports fail**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: FAIL because the salary and benefit exports do not exist.

- [ ] **Step 3: Add constants and end-to-end pure calculation**

Append to `calculator.mjs`:

```js
export const RANK_SALARIES = Object.freeze({
  srff: { label: "SrFF", salary: 56_434 },
  engineerInspector: {
    label: "Engineer / Sr Fire Insp.",
    salary: 66_980,
  },
  captain: {
    label: "Captain / Asst. Fire Marshal",
    salary: 80_327,
  },
  battalionChief: {
    label: "Batt. Chief / Dep. Fire Marshal",
    salary: 94_040,
  },
  assistantChief: {
    label: "Assistant Fire Chief / Fire Marshal",
    salary: 120_373,
  },
  deputyChief: { label: "Deputy Fire Chief", salary: 135_395 },
  fireChief: { label: "Fire Chief", salary: 180_183 },
});

export const RAISE_RATE = 0.04;
export const BENEFIT_MULTIPLIER = 0.0085;
export const CHECKS_PER_YEAR = 26;

function dateNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function retirementDateForYear(year) {
  return new Date(year, 0, 31);
}

export function countJulyRaises({ baseDate, retirementDate }) {
  const base = dateNumber(baseDate);
  const retirement = dateNumber(retirementDate);
  let count = 0;

  for (
    let year = baseDate.getFullYear();
    year <= retirementDate.getFullYear();
    year += 1
  ) {
    const raise = Date.UTC(year, 6, 1);
    if (raise > base && raise < retirement) {
      count += 1;
    }
  }

  return count;
}

export function projectSalary({
  mode,
  amount,
  rank,
  promotionMonth,
  promotionYear,
  today,
  retirementDate,
}) {
  if (mode === "anticipated") {
    return amount;
  }

  let baseSalary = amount;
  let baseDate = today;

  if (mode === "rank") {
    baseSalary = RANK_SALARIES[rank].salary;
    baseDate = new Date(promotionYear, promotionMonth - 1, 1);
  }

  const raises = countJulyRaises({ baseDate, retirementDate });
  return baseSalary * (1 + RAISE_RATE) ** raises;
}

export function coveredBenefitMonths({
  birthYear,
  birthMonth,
  retirementYear,
}) {
  return (birthYear + 62 - retirementYear) * 12 + birthMonth - 1;
}

export function calculateBenefit({
  benefitServiceYears,
  retirementSalary,
  coveredMonths,
}) {
  const annual =
    BENEFIT_MULTIPLIER * benefitServiceYears * retirementSalary;

  return {
    annual,
    biweekly: annual / CHECKS_PER_YEAR,
    total: (annual / 12) * coveredMonths,
  };
}

export function calculateEstimate(input, today = new Date()) {
  const retirementDate = retirementDateForYear(input.retirementYear);
  const currentGfdYears = toServiceYears(input.currentGfd);
  const otherLgersYears =
    input.otherLgers === null ? 0 : toServiceYears(input.otherLgers);
  const projected = projectService({
    today,
    retirementDate,
    currentGfdYears,
    otherLgersYears,
  });
  const retirementSickHours =
    input.sick.mode === "current"
      ? projectSickHours({
          currentHours: input.sick.hours,
          currentWorkedYears: currentGfdYears + otherLgersYears,
          remainingYears: projected.remainingYears,
        })
      : input.sick.hours;
  const sickServiceMonths =
    sickHoursToServiceMonths(retirementSickHours);
  const sickServiceYears = sickServiceMonths / 12;
  const eligibilityServiceYears =
    projected.projectedGfdYears + otherLgersYears + sickServiceYears;
  const retirementAge = ageAtRetirement({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });
  const eligibility = evaluateEligibility({
    retirementAge,
    regularServiceRetirement: input.regularServiceRetirement,
    continuousGfd: input.continuousGfd,
    projectedGfdYears: projected.projectedGfdYears,
    eligibilityServiceYears,
  });
  const benefitServiceYears =
    input.benefitService.mode === "manual"
      ? toServiceYears(input.benefitService)
      : eligibilityServiceYears;
  const retirementSalary = projectSalary({
    ...input.salary,
    today,
    retirementDate,
  });
  const coveredMonths = coveredBenefitMonths({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });

  return {
    dates: { retirementDate, remainingYears: projected.remainingYears },
    service: {
      currentGfdYears,
      otherLgersYears,
      projectedGfdYears: projected.projectedGfdYears,
      retirementSickHours,
      sickServiceMonths,
      sickServiceYears,
      eligibilityServiceYears,
      benefitServiceYears,
    },
    retirementAge,
    eligibility,
    retirementSalary,
    coveredMonths,
    benefit: eligibility.eligible
      ? calculateBenefit({
          benefitServiceYears,
          retirementSalary,
          coveredMonths,
        })
      : null,
  };
}
```

- [ ] **Step 4: Run all calculation tests**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: all 18 tests PASS.

- [ ] **Step 5: Commit salary and benefit calculation**

```powershell
git add calculator.mjs tests/calculator.test.mjs
git commit -m "feat: calculate salary and benefit estimates"
```

---

### Task 4: Semantic calculator form and static accessibility hooks

**Files:**
- Create: `tests/structure.test.mjs`
- Create: `index.html`

**Interfaces:**
- Consumes: IDs used by `app.mjs` in Task 5.
- Produces: The complete semantic form and output slots; no calculation behavior yet.

- [ ] **Step 1: Write a failing HTML structure smoke test**

Create `tests/structure.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url);

test("calculator HTML exposes required form and accessibility hooks", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");

  for (const fragment of [
    "<title>Local 947 Special Separation Calculator</title>",
    'id="calculator-form"',
    'id="error-summary"',
    'id="retirement-year"',
    'id="birth-month"',
    'id="birth-year"',
    'id="gfd-years"',
    'id="other-service-fields"',
    'id="sick-hours"',
    'id="manual-service-fields"',
    'id="rank-fields"',
    'id="result"',
    'aria-live="polite"',
    'src="app.mjs"',
  ]) {
    assert.ok(html.includes(fragment), "Missing HTML fragment: " + fragment);
  }
});

test("the Local 947 logo path is declared", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  assert.ok(html.includes('src="assets/local-947-logo.png"'));
});
```

- [ ] **Step 2: Run the structure test and verify it fails**

Run:

```powershell
node --test tests/structure.test.mjs
```

Expected: FAIL with `ENOENT` for `index.html`.

- [ ] **Step 3: Create the semantic page shell**

Create `index.html` with this structure and these exact IDs:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Estimate Local 947 Special Separation Allowance eligibility and benefit amounts."
    />
    <title>Local 947 Special Separation Calculator</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <a class="skip-link" href="#calculator">Skip to calculator</a>

    <header class="site-header">
      <div class="masthead">
        <img
          class="brand-logo"
          src="assets/local-947-logo.png"
          alt="Professional Fire Fighters of Greensboro Local 947"
        />
        <div>
          <p class="brand-line">Professional Fire Fighters of Greensboro</p>
          <h1>Local 947 Special Separation Calculator</h1>
          <p class="header-copy">
            A private, plain-language estimate. Your entries stay in this
            browser.
          </p>
        </div>
      </div>
    </header>

    <main id="calculator" class="page-shell">
      <section aria-labelledby="requirements-title">
        <h2 id="requirements-title">Before you begin</h2>
        <p>You must meet every requirement to receive an estimate:</p>
        <ul class="requirements">
          <li>Be under age 62 on your January 31 retirement date.</li>
          <li>
            Complete at least five continuous years as a sworn Greensboro
            firefighter immediately before retirement.
          </li>
          <li>
            Have at least 50% of total creditable service as sworn Greensboro
            firefighter service.
          </li>
          <li>
            Retire on a regular, unreduced LGERS service retirement, not an
            early reduced or disability retirement.
          </li>
        </ul>
      </section>

      <form id="calculator-form" novalidate>
        <div id="error-summary" class="error-summary" tabindex="-1" hidden>
          <h2>Check your answers</h2>
          <ul id="error-list"></ul>
        </div>

        <section class="form-section" aria-labelledby="retirement-title">
          <h2 id="retirement-title">Retirement and service</h2>

          <div class="field">
            <label for="retirement-year">Estimated retirement year</label>
            <input id="retirement-year" type="number" inputmode="numeric" />
            <p class="hint">Retirement is assumed to be January 31.</p>
          </div>

          <fieldset>
            <legend>Date of birth</legend>
            <div class="field-row">
              <div class="field">
                <label for="birth-month">Month</label>
                <select id="birth-month">
                  <option value="">Select month</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
              <div class="field">
                <label for="birth-year">Year</label>
                <input id="birth-year" type="number" inputmode="numeric" />
              </div>
            </div>
          </fieldset>

          <fieldset id="regular-retirement-group">
            <legend>
              Will you retire under a regular LGERS service retirement, not a
              disability retirement?
            </legend>
            <div class="choice-row">
              <label><input type="radio" name="regular-retirement" value="yes" /> Yes</label>
              <label><input type="radio" name="regular-retirement" value="no" /> No</label>
            </div>
          </fieldset>

          <fieldset id="continuous-gfd-group">
            <legend>
              Will you have at least five continuous years as a sworn
              Greensboro firefighter immediately before retirement?
            </legend>
            <div class="choice-row">
              <label><input type="radio" name="continuous-gfd" value="yes" /> Yes</label>
              <label><input type="radio" name="continuous-gfd" value="no" /> No</label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Current sworn GFD service</legend>
            <div class="field-row">
              <div class="field">
                <label for="gfd-years">Years</label>
                <input id="gfd-years" type="number" min="0" inputmode="numeric" />
              </div>
              <div class="field">
                <label for="gfd-months">Months</label>
                <input id="gfd-months" type="number" min="0" max="11" inputmode="numeric" />
              </div>
            </div>
          </fieldset>

          <fieldset id="other-lgers-group">
            <legend>Do you have other LGERS service?</legend>
            <div class="choice-row">
              <label><input type="radio" name="other-lgers" value="yes" /> Yes</label>
              <label><input type="radio" name="other-lgers" value="na" /> N/A</label>
            </div>
          </fieldset>

          <fieldset id="other-service-fields" hidden>
            <legend>Current other LGERS service</legend>
            <div class="field-row">
              <div class="field">
                <label for="other-years">Years</label>
                <input id="other-years" type="number" min="0" inputmode="numeric" />
              </div>
              <div class="field">
                <label for="other-months">Months</label>
                <input id="other-months" type="number" min="0" max="11" inputmode="numeric" />
              </div>
            </div>
          </fieldset>

          <fieldset id="sick-mode-group">
            <legend>Which sick-leave amount are you entering?</legend>
            <div class="choice-stack">
              <label><input type="radio" name="sick-mode" value="current" /> Current sick hours</label>
              <label><input type="radio" name="sick-mode" value="retirement" /> Sick hours expected at retirement</label>
            </div>
          </fieldset>

          <div class="field">
            <label id="sick-hours-label" for="sick-hours">Sick hours</label>
            <input id="sick-hours" type="number" min="0" step="0.25" inputmode="decimal" />
          </div>

          <dl class="derived-values" aria-live="polite">
            <div><dt>Projected sick hours</dt><dd id="projected-sick-hours">-</dd></div>
            <div><dt>Sick service</dt><dd id="sick-service">-</dd></div>
            <div><dt>Projected GFD service</dt><dd id="projected-gfd-service">-</dd></div>
            <div><dt>Eligibility service</dt><dd id="eligibility-service">-</dd></div>
          </dl>
        </section>

        <section class="form-section" aria-labelledby="benefit-service-title">
          <h2 id="benefit-service-title">Benefit service value</h2>
          <fieldset id="benefit-service-mode-group">
            <legend>Which service value should the benefit equation use?</legend>
            <div class="choice-stack">
              <label><input type="radio" name="benefit-service-mode" value="calculated" /> Use calculated retirement service</label>
              <label><input type="radio" name="benefit-service-mode" value="manual" /> Enter a separate service value</label>
            </div>
          </fieldset>

          <fieldset id="manual-service-fields" hidden>
            <legend>Benefit service</legend>
            <p class="hint">This value changes the payment equation only, not eligibility.</p>
            <div class="field-row">
              <div class="field">
                <label for="benefit-years">Years</label>
                <input id="benefit-years" type="number" min="0" inputmode="numeric" />
              </div>
              <div class="field">
                <label for="benefit-months">Months</label>
                <input id="benefit-months" type="number" min="0" max="11" inputmode="numeric" />
              </div>
            </div>
          </fieldset>

          <dl class="derived-values" aria-live="polite">
            <div><dt>Benefit service used</dt><dd id="benefit-service-value">-</dd></div>
          </dl>
        </section>

        <section class="form-section" aria-labelledby="salary-title">
          <h2 id="salary-title">Retirement salary</h2>
          <fieldset id="salary-mode-group">
            <legend>How should retirement salary be estimated?</legend>
            <div class="choice-stack">
              <label><input type="radio" name="salary-mode" value="anticipated" /> Enter anticipated salary at retirement</label>
              <label><input type="radio" name="salary-mode" value="current" /> Project current salary with 4% July 1 raises</label>
              <label><input type="radio" name="salary-mode" value="rank" /> Use retirement rank and promotion date</label>
            </div>
          </fieldset>

          <div id="anticipated-salary-field" class="field" hidden>
            <label for="anticipated-salary">Anticipated annual salary</label>
            <input id="anticipated-salary" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>

          <div id="current-salary-field" class="field" hidden>
            <label for="current-salary">Current annual salary</label>
            <input id="current-salary" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>

          <fieldset id="rank-fields" hidden>
            <legend>Retirement rank and promotion date</legend>
            <div class="field">
              <label for="rank">Rank at retirement</label>
              <select id="rank">
                <option value="">Select rank</option>
              </select>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="promotion-month">Promotion month</label>
                <select id="promotion-month">
                  <option value="">Select month</option>
                </select>
              </div>
              <div class="field">
                <label for="promotion-year">Promotion year</label>
                <input id="promotion-year" type="number" inputmode="numeric" />
              </div>
            </div>
          </fieldset>

          <dl class="derived-values" aria-live="polite">
            <div><dt>Projected retirement salary</dt><dd id="projected-salary">-</dd></div>
          </dl>
        </section>

        <button class="primary-button" type="submit">
          Check eligibility and calculate
        </button>
      </form>

      <section id="result" class="result" tabindex="-1" aria-live="polite" hidden>
        <h2 id="result-title"></h2>
        <p id="result-summary"></p>
        <ul id="requirements-results" class="result-checks"></ul>

        <div id="benefit-results" hidden>
          <dl class="benefit-totals">
            <div><dt>Estimated annual benefit</dt><dd id="annual-benefit"></dd></div>
            <div><dt>Estimated gross biweekly payment</dt><dd id="biweekly-benefit"></dd></div>
            <div><dt>Estimated total through age 62 month</dt><dd id="total-benefit"></dd></div>
          </dl>
          <dl class="calculation-breakdown">
            <div><dt>Retirement salary</dt><dd id="breakdown-salary"></dd></div>
            <div><dt>Benefit service</dt><dd id="breakdown-service"></dd></div>
            <div><dt>Multiplier</dt><dd>0.0085</dd></div>
            <div><dt>Covered months</dt><dd id="breakdown-months"></dd></div>
          </dl>
        </div>

        <p class="disclaimer">
          This calculator provides an estimate only. Verify eligibility,
          service credit, salary, and payment amounts with the appropriate
          benefits authority before making a retirement decision.
        </p>
        <button id="start-over" class="secondary-button" type="button">Start over</button>
      </section>

      <details class="assumptions">
        <summary>Calculation assumptions</summary>
        <ul>
          <li>Retirement occurs January 31.</li>
          <li>Sick leave accrues at no more than eight hours per month.</li>
          <li>Salary raises are 4% on applicable July 1 dates.</li>
          <li>The benefit multiplier is 0.0085.</li>
          <li>Biweekly estimates use 26 checks per year.</li>
        </ul>
      </details>
    </main>

    <script type="module" src="app.mjs"></script>
  </body>
</html>
```

- [ ] **Step 4: Run the HTML structure test**

Run:

```powershell
node --test tests/structure.test.mjs
```

Expected: both structure tests PASS.

- [ ] **Step 5: Commit the semantic form**

```powershell
git add index.html tests/structure.test.mjs
git commit -m "feat: add accessible calculator form"
```

---

### Task 5: Input validation and browser controller

**Files:**
- Modify: `tests/calculator.test.mjs`
- Modify: `calculator.mjs`
- Create: `app.mjs`

**Interfaces:**
- Consumes: The exact form IDs from Task 4 and calculation exports from Tasks 1-3.
- Produces: `validateInput(input, today)` returning `{ [fieldId]: message }` and complete form behavior.

- [ ] **Step 1: Add failing validation tests**

Add `validateInput` to the test import, then append:

```js
function validInput() {
  return {
    retirementYear: 2030,
    birthMonth: 1,
    birthYear: 1970,
    regularServiceRetirement: true,
    continuousGfd: true,
    currentGfd: { years: 26, months: 0 },
    otherLgers: null,
    sick: { mode: "retirement", hours: 0 },
    benefitService: { mode: "calculated" },
    salary: { mode: "anticipated", amount: 100000 },
  };
}

test("accepts a complete valid input", () => {
  assert.deepEqual(
    validateInput(validInput(), new Date(2026, 6, 17)),
    {},
  );
});

test("rejects a retirement date that is not in the future", () => {
  const input = validInput();
  input.retirementYear = 2026;

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["retirement-year"],
    "Choose a retirement year whose January 31 date is in the future.",
  );
});

test("rejects invalid months and a missing other-service choice", () => {
  const input = validInput();
  input.currentGfd.months = 12;
  input.otherLgers = undefined;
  const errors = validateInput(input, new Date(2026, 6, 17));

  assert.equal(errors["gfd-months"], "Enter a month value from 0 through 11.");
  assert.equal(errors["other-lgers"], "Choose Yes or N/A.");
});

test("rejects an implausible age on the retirement date", () => {
  const input = validInput();
  input.birthYear = 2020;

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["birth-year"],
    "Enter a birth year that gives a retirement age from 18 through 100.",
  );
});

test("requires current service for historical sick projection", () => {
  const input = validInput();
  input.currentGfd = { years: 0, months: 0 };
  input.sick = { mode: "current", hours: 100 };

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["sick-hours"],
    "Enter current GFD or other LGERS service to project current sick hours.",
  );
});

test("rejects a promotion date on or after retirement", () => {
  const input = validInput();
  input.salary = {
    mode: "rank",
    rank: "captain",
    promotionMonth: 2,
    promotionYear: 2030,
  };

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["promotion-year"],
    "Enter a promotion month and year before retirement.",
  );
});
```

- [ ] **Step 2: Run tests and verify validation is missing**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: FAIL because `validateInput` is not exported.

- [ ] **Step 3: Implement explicit validation**

Append to `calculator.mjs`:

```js
function isNonnegativeWhole(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateService(value, yearsKey, monthsKey, errors) {
  if (!value || !isNonnegativeWhole(value.years)) {
    errors[yearsKey] = "Enter a nonnegative whole number of years.";
  }
  if (!value || !isNonnegativeWhole(value.months) || value.months > 11) {
    errors[monthsKey] = "Enter a month value from 0 through 11.";
  }
}

export function validateInput(input, today = new Date()) {
  const errors = {};
  const currentYear = today.getFullYear();
  let retirementDate = null;

  if (
    !Number.isInteger(input.retirementYear) ||
    input.retirementYear < currentYear ||
    input.retirementYear > currentYear + 100
  ) {
    errors["retirement-year"] = "Enter a four-digit retirement year.";
  } else {
    retirementDate = retirementDateForYear(input.retirementYear);
    if (dateNumber(retirementDate) <= dateNumber(today)) {
      errors["retirement-year"] =
        "Choose a retirement year whose January 31 date is in the future.";
    }
  }

  if (!Number.isInteger(input.birthMonth) || input.birthMonth < 1 || input.birthMonth > 12) {
    errors["birth-month"] = "Choose your birth month.";
  }
  if (
    !Number.isInteger(input.birthYear) ||
    input.birthYear < 1900 ||
    input.birthYear > currentYear
  ) {
    errors["birth-year"] = "Enter a valid four-digit birth year.";
  } else if (
    retirementDate &&
    Number.isInteger(input.birthMonth) &&
    input.birthMonth >= 1 &&
    input.birthMonth <= 12
  ) {
    const age = ageAtRetirement({
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      retirementYear: input.retirementYear,
    });
    if (age < 18 || age > 100) {
      errors["birth-year"] =
        "Enter a birth year that gives a retirement age from 18 through 100.";
    }
  }
  if (input.regularServiceRetirement === undefined) {
    errors["regular-retirement"] = "Choose Yes or No.";
  }
  if (input.continuousGfd === undefined) {
    errors["continuous-gfd"] = "Choose Yes or No.";
  }

  validateService(input.currentGfd, "gfd-years", "gfd-months", errors);

  if (input.otherLgers === undefined) {
    errors["other-lgers"] = "Choose Yes or N/A.";
  } else if (input.otherLgers !== null) {
    validateService(
      input.otherLgers,
      "other-years",
      "other-months",
      errors,
    );
  }

  if (!input.sick || !["current", "retirement"].includes(input.sick.mode)) {
    errors["sick-mode"] = "Choose current or retirement sick hours.";
  } else if (!Number.isFinite(input.sick.hours) || input.sick.hours < 0) {
    errors["sick-hours"] = "Enter nonnegative sick hours.";
  } else if (
    input.sick.mode === "current" &&
    input.currentGfd &&
    isNonnegativeWhole(input.currentGfd.years) &&
    isNonnegativeWhole(input.currentGfd.months)
  ) {
    const currentWorkedYears =
      toServiceYears(input.currentGfd) +
      (input.otherLgers && input.otherLgers !== undefined
        ? toServiceYears(input.otherLgers)
        : 0);
    if (currentWorkedYears <= 0) {
      errors["sick-hours"] =
        "Enter current GFD or other LGERS service to project current sick hours.";
    }
  }

  if (
    !input.benefitService ||
    !["calculated", "manual"].includes(input.benefitService.mode)
  ) {
    errors["benefit-service-mode"] =
      "Choose calculated or separately entered benefit service.";
  } else if (input.benefitService.mode === "manual") {
    validateService(
      input.benefitService,
      "benefit-years",
      "benefit-months",
      errors,
    );
    if (
      !errors["benefit-years"] &&
      !errors["benefit-months"] &&
      toServiceYears(input.benefitService) <= 0
    ) {
      errors["benefit-years"] =
        "Enter a benefit service value greater than zero.";
    }
  }

  if (!input.salary || !["anticipated", "current", "rank"].includes(input.salary.mode)) {
    errors["salary-mode"] = "Choose a salary estimate method.";
  } else if (input.salary.mode === "anticipated" || input.salary.mode === "current") {
    const field =
      input.salary.mode === "anticipated"
        ? "anticipated-salary"
        : "current-salary";
    if (!Number.isFinite(input.salary.amount) || input.salary.amount <= 0) {
      errors[field] = "Enter an annual salary greater than zero.";
    }
  } else {
    if (!RANK_SALARIES[input.salary.rank]) {
      errors.rank = "Choose a retirement rank.";
    }
    if (
      !Number.isInteger(input.salary.promotionMonth) ||
      input.salary.promotionMonth < 1 ||
      input.salary.promotionMonth > 12
    ) {
      errors["promotion-month"] = "Choose a promotion month.";
    }
    if (
      !Number.isInteger(input.salary.promotionYear) ||
      input.salary.promotionYear < 1900
    ) {
      errors["promotion-year"] = "Enter a four-digit promotion year.";
    } else if (
      retirementDate &&
      Number.isInteger(input.salary.promotionMonth) &&
      dateNumber(
        new Date(
          input.salary.promotionYear,
          input.salary.promotionMonth - 1,
          1,
        ),
      ) >= dateNumber(retirementDate)
    ) {
      errors["promotion-year"] =
        "Enter a promotion month and year before retirement.";
    }
  }

  return errors;
}
```

- [ ] **Step 4: Run validation tests**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: all 24 tests PASS.

- [ ] **Step 5: Implement the browser controller**

Create `app.mjs`:

```js
import {
  RANK_SALARIES,
  calculateEstimate,
  validateInput,
} from "./calculator.mjs";

const form = document.querySelector("#calculator-form");
const errorSummary = document.querySelector("#error-summary");
const errorList = document.querySelector("#error-list");
const result = document.querySelector("#result");
const benefitResults = document.querySelector("#benefit-results");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const errorTargets = {
  "retirement-year": "retirement-year",
  "birth-month": "birth-month",
  "birth-year": "birth-year",
  "regular-retirement": "regular-retirement-group",
  "continuous-gfd": "continuous-gfd-group",
  "gfd-years": "gfd-years",
  "gfd-months": "gfd-months",
  "other-lgers": "other-lgers-group",
  "other-years": "other-years",
  "other-months": "other-months",
  "sick-mode": "sick-mode-group",
  "sick-hours": "sick-hours",
  "benefit-service-mode": "benefit-service-mode-group",
  "benefit-years": "benefit-years",
  "benefit-months": "benefit-months",
  "salary-mode": "salary-mode-group",
  "anticipated-salary": "anticipated-salary",
  "current-salary": "current-salary",
  rank: "rank",
  "promotion-month": "promotion-month",
  "promotion-year": "promotion-year",
};

function element(id) {
  return document.getElementById(id);
}

function radioValue(name) {
  return form.querySelector('input[name="' + name + '"]:checked')?.value;
}

function booleanChoice(name) {
  const value = radioValue(name);
  return value === undefined ? undefined : value === "yes";
}

function numberValue(id) {
  const input = element(id);
  return input.value === "" ? Number.NaN : input.valueAsNumber;
}

function serviceValue(yearsId, monthsId) {
  return {
    years: numberValue(yearsId),
    months: numberValue(monthsId),
  };
}

function collectInput() {
  const otherMode = radioValue("other-lgers");
  const sickMode = radioValue("sick-mode");
  const benefitMode = radioValue("benefit-service-mode");
  const salaryMode = radioValue("salary-mode");
  let salary;

  if (salaryMode === "rank") {
    salary = {
      mode: salaryMode,
      rank: element("rank").value,
      promotionMonth: numberValue("promotion-month"),
      promotionYear: numberValue("promotion-year"),
    };
  } else {
    salary = {
      mode: salaryMode,
      amount:
        salaryMode === "anticipated"
          ? numberValue("anticipated-salary")
          : numberValue("current-salary"),
    };
  }

  return {
    retirementYear: numberValue("retirement-year"),
    birthMonth: numberValue("birth-month"),
    birthYear: numberValue("birth-year"),
    regularServiceRetirement: booleanChoice("regular-retirement"),
    continuousGfd: booleanChoice("continuous-gfd"),
    currentGfd: serviceValue("gfd-years", "gfd-months"),
    otherLgers:
      otherMode === "yes"
        ? serviceValue("other-years", "other-months")
        : otherMode === "na"
          ? null
          : undefined,
    sick: { mode: sickMode, hours: numberValue("sick-hours") },
    benefitService:
      benefitMode === "manual"
        ? {
            mode: benefitMode,
            ...serviceValue("benefit-years", "benefit-months"),
          }
        : { mode: benefitMode },
    salary,
  };
}

function setHidden(id, hidden) {
  element(id).hidden = hidden;
}

function updateConditionalFields() {
  setHidden("other-service-fields", radioValue("other-lgers") !== "yes");
  setHidden(
    "manual-service-fields",
    radioValue("benefit-service-mode") !== "manual",
  );

  const salaryMode = radioValue("salary-mode");
  setHidden("anticipated-salary-field", salaryMode !== "anticipated");
  setHidden("current-salary-field", salaryMode !== "current");
  setHidden("rank-fields", salaryMode !== "rank");

  const sickMode = radioValue("sick-mode");
  element("sick-hours-label").textContent =
    sickMode === "current"
      ? "Current sick hours"
      : sickMode === "retirement"
        ? "Sick hours expected at retirement"
        : "Sick hours";
}

function serviceText(years) {
  const totalMonths = Math.round(years * 12);
  const wholeYears = Math.floor(totalMonths / 12);
  const monthsOnly = totalMonths % 12;
  return wholeYears + " years, " + monthsOnly + " months";
}

function populateChoices() {
  const rank = element("rank");
  for (const [value, details] of Object.entries(RANK_SALARIES)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent =
      details.label + " - " + currency.format(details.salary);
    rank.append(option);
  }

  const promotionMonth = element("promotion-month");
  months.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = label;
    promotionMonth.append(option);
  });
}

function clearErrors() {
  errorSummary.hidden = true;
  errorList.replaceChildren();
  document.querySelectorAll(".field-error").forEach((node) => node.remove());
  document.querySelectorAll("[aria-invalid]").forEach((node) => {
    node.removeAttribute("aria-invalid");
    node.removeAttribute("aria-describedby");
  });
}

function showErrors(errors) {
  clearErrors();
  const entries = Object.entries(errors);
  if (entries.length === 0) return;

  for (const [key, message] of entries) {
    const targetId = errorTargets[key] ?? key;
    const target = element(targetId);
    const control = target.matches("input, select, button")
      ? target
      : target.querySelector("input, select, button") ?? target;
    const errorId = targetId + "-error";
    const error = document.createElement("p");
    error.id = errorId;
    error.className = "field-error";
    error.textContent = message;
    target.insertAdjacentElement("afterend", error);
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", errorId);

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + targetId;
    link.textContent = message;
    link.addEventListener("click", () => {
      requestAnimationFrame(() => control.focus());
    });
    item.append(link);
    errorList.append(item);
  }

  errorSummary.hidden = false;
  errorSummary.focus();
}

function clearPreview() {
  for (const id of [
    "projected-sick-hours",
    "sick-service",
    "projected-gfd-service",
    "eligibility-service",
    "benefit-service-value",
    "projected-salary",
  ]) {
    element(id).textContent = "-";
  }
}

function renderPreview() {
  updateConditionalFields();
  const input = collectInput();
  const errors = validateInput(input);

  if (Object.keys(errors).length > 0) {
    clearPreview();
    return;
  }

  const estimate = calculateEstimate(input);
  element("projected-sick-hours").textContent =
    Math.round(estimate.service.retirementSickHours).toLocaleString() +
    " hours";
  element("sick-service").textContent =
    serviceText(estimate.service.sickServiceYears);
  element("projected-gfd-service").textContent =
    serviceText(estimate.service.projectedGfdYears);
  element("eligibility-service").textContent =
    serviceText(estimate.service.eligibilityServiceYears);
  element("benefit-service-value").textContent =
    serviceText(estimate.service.benefitServiceYears);
  element("projected-salary").textContent =
    currency.format(estimate.retirementSalary);
}

function renderResult(estimate) {
  result.classList.toggle("result--eligible", estimate.eligibility.eligible);
  result.classList.toggle("result--ineligible", !estimate.eligibility.eligible);
  element("result-title").textContent = estimate.eligibility.eligible
    ? "You appear eligible"
    : "You do not appear eligible";
  element("result-summary").textContent = estimate.eligibility.eligible
    ? "All listed eligibility requirements passed."
    : "One or more eligibility requirements did not pass.";

  const list = element("requirements-results");
  list.replaceChildren();
  for (const check of estimate.eligibility.checks) {
    const item = document.createElement("li");
    item.className = check.passed ? "status status--pass" : "status status--fail";
    const icon = document.createElement("span");
    icon.className = "status-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = check.passed ? "✓" : "×";
    item.append(icon, document.createTextNode(check.label));
    list.append(item);
  }

  benefitResults.hidden = !estimate.eligibility.eligible;
  if (estimate.benefit) {
    element("annual-benefit").textContent = currency.format(estimate.benefit.annual);
    element("biweekly-benefit").textContent = currency.format(estimate.benefit.biweekly);
    element("total-benefit").textContent = currency.format(estimate.benefit.total);
    element("breakdown-salary").textContent = currency.format(estimate.retirementSalary);
    element("breakdown-service").textContent =
      serviceText(estimate.service.benefitServiceYears);
    element("breakdown-months").textContent = String(estimate.coveredMonths);
  }

  result.hidden = false;
  result.focus();
}

form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = collectInput();
  const errors = validateInput(input);

  if (Object.keys(errors).length > 0) {
    result.hidden = true;
    showErrors(errors);
    return;
  }

  clearErrors();
  renderResult(calculateEstimate(input));
});

element("start-over").addEventListener("click", () => {
  form.reset();
  clearErrors();
  clearPreview();
  result.hidden = true;
  updateConditionalFields();
  element("retirement-year").focus();
});

populateChoices();
updateConditionalFields();
```

- [ ] **Step 6: Run the complete automated suite**

Run:

```powershell
node --test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 7: Commit validation and browser behavior**

```powershell
git add calculator.mjs app.mjs tests/calculator.test.mjs
git commit -m "feat: wire calculator interactions"
```

---

### Task 6: Local 947 visual system, logo, responsive behavior, and motion safeguards

**Files:**
- Modify: `tests/structure.test.mjs`
- Create: `styles.css`
- Create: `assets/local-947-logo.png` by copying the user-supplied asset

**Interfaces:**
- Consumes: Classes and IDs in `index.html`.
- Produces: WCAG-aware Local 947 presentation and the durable project logo asset.

- [ ] **Step 1: Add failing visual safeguard tests**

Append to `tests/structure.test.mjs`:

```js
test("styles include focus, responsive, and reduced-motion safeguards", async () => {
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");

  for (const fragment of [
    ":focus-visible",
    "min-block-size: 44px",
    "@media (max-width: 640px)",
    "@media (prefers-reduced-motion: reduce)",
    "oklch(",
  ]) {
    assert.ok(css.includes(fragment), "Missing CSS safeguard: " + fragment);
  }
});

test("the copied Local 947 logo exists", async () => {
  await access(new URL("assets/local-947-logo.png", rootUrl));
});
```

- [ ] **Step 2: Run the structure tests and verify missing assets fail**

Run:

```powershell
node --test tests/structure.test.mjs
```

Expected: FAIL because `styles.css` and `assets/local-947-logo.png` do not exist.

- [ ] **Step 3: Copy the approved logo into the project**

Run:

```powershell
New-Item -ItemType Directory -Path 'assets' -Force
Copy-Item -LiteralPath 'C:\Users\ffhal\Downloads\654087f960e364a26859d818_greensboro_fire_logo-p-500.png' -Destination 'assets\local-947-logo.png'
```

Expected: `assets/local-947-logo.png` exists and is the user-supplied logo.

- [ ] **Step 4: Implement the approved visual system**

Create `styles.css`:

```css
:root {
  --gold: oklch(0.82 0.16 78);
  --navy: oklch(0.22 0.05 275);
  --navy-hover: oklch(0.28 0.06 275);
  --red: oklch(0.43 0.18 25);
  --red-soft: oklch(0.96 0.025 25);
  --white: oklch(1 0 0);
  --ink: oklch(0.12 0.01 275);
  --muted: oklch(0.42 0.02 275);
  --surface: oklch(0.97 0.006 275);
  --border: oklch(0.82 0.015 275);
  --focus: oklch(0.66 0.17 78);
  --radius-sm: 6px;
  --radius-md: 12px;
  --space-1: 0.5rem;
  --space-2: 0.75rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;
  --space-6: 3rem;
}

* {
  box-sizing: border-box;
}

html {
  color-scheme: light;
  font-family: "Segoe UI", system-ui, sans-serif;
  line-height: 1.5;
  background: var(--white);
  color: var(--ink);
}

body {
  margin: 0;
  min-width: 320px;
  font-size: 1rem;
}

button,
input,
select {
  font: inherit;
}

button,
input,
select,
summary,
.choice-row label,
.choice-stack label {
  min-block-size: 44px;
}

.skip-link {
  position: fixed;
  inset: var(--space-2) auto auto var(--space-2);
  z-index: 10;
  transform: translateY(-200%);
  padding: var(--space-2) var(--space-3);
  background: var(--white);
  color: var(--navy);
  border-radius: var(--radius-sm);
}

.skip-link:focus {
  transform: none;
}

.site-header {
  background: var(--navy);
  color: var(--white);
  border-block-end: 6px solid var(--gold);
}

.masthead,
.page-shell {
  width: min(100% - 2rem, 860px);
  margin-inline: auto;
}

.masthead {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-block: var(--space-4);
}

.brand-logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  flex: 0 0 auto;
}

.brand-line {
  margin: 0 0 var(--space-1);
  color: var(--gold);
  font-weight: 700;
}

h1,
h2 {
  text-wrap: balance;
}

h1 {
  margin: 0;
  max-width: 28ch;
  font-size: 2rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

h2 {
  margin: 0 0 var(--space-3);
  color: var(--navy);
  font-size: 1.4rem;
  line-height: 1.25;
}

.header-copy {
  margin: var(--space-2) 0 0;
  max-width: 68ch;
}

.page-shell {
  padding-block: var(--space-5) var(--space-6);
}

.page-shell > section,
.page-shell > details,
.form-section {
  margin-block-end: var(--space-5);
}

.form-section {
  padding-block-start: var(--space-5);
  border-block-start: 1px solid var(--border);
}

.requirements {
  padding-inline-start: 1.25rem;
}

.requirements li + li {
  margin-block-start: var(--space-2);
}

fieldset {
  min-width: 0;
  margin: 0 0 var(--space-4);
  padding: 0;
  border: 0;
}

legend,
label {
  font-weight: 650;
}

legend {
  margin-block-end: var(--space-2);
}

.field {
  margin-block-end: var(--space-4);
}

.field label {
  display: block;
  margin-block-end: var(--space-1);
}

.field-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.field-row > .field {
  flex: 1 1 220px;
}

input,
select {
  width: 100%;
  padding: 0.65rem 0.75rem;
  color: var(--ink);
  background: var(--white);
  border: 1px solid var(--muted);
  border-radius: var(--radius-sm);
}

input:hover,
select:hover {
  border-color: var(--navy);
}

:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}

.choice-row,
.choice-stack {
  display: flex;
  gap: var(--space-2);
}

.choice-stack {
  flex-direction: column;
}

.choice-row label,
.choice-stack label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.choice-row input,
.choice-stack input {
  width: 1.2rem;
  min-block-size: 1.2rem;
  accent-color: var(--navy);
}

.choice-row label:has(input:checked),
.choice-stack label:has(input:checked) {
  color: var(--ink);
  background: var(--gold);
  border-color: var(--ink);
}

.hint {
  margin: var(--space-1) 0 0;
  max-width: 70ch;
  color: var(--muted);
}

.derived-values,
.benefit-totals,
.calculation-breakdown {
  margin: var(--space-4) 0;
  background: var(--surface);
}

.derived-values > div,
.benefit-totals > div,
.calculation-breakdown > div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
}

.derived-values > div + div,
.benefit-totals > div + div,
.calculation-breakdown > div + div {
  border-block-start: 1px solid var(--border);
}

dt {
  font-weight: 650;
}

dd {
  margin: 0;
  text-align: end;
  font-variant-numeric: tabular-nums;
}

.primary-button,
.secondary-button {
  padding: 0.75rem 1.1rem;
  border-radius: var(--radius-sm);
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 180ms ease-out,
    color 180ms ease-out;
}

.primary-button {
  width: 100%;
  color: var(--white);
  background: var(--navy);
  border: 2px solid var(--navy);
}

.primary-button:hover {
  background: var(--navy-hover);
}

.secondary-button {
  color: var(--navy);
  background: var(--white);
  border: 2px solid var(--navy);
}

.secondary-button:hover {
  color: var(--white);
  background: var(--navy);
}

.error-summary,
.result {
  margin-block: var(--space-5);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}

.error-summary,
.result--ineligible {
  color: var(--red);
  background: var(--red-soft);
  border: 2px solid var(--red);
}

.error-summary h2,
.result--ineligible h2 {
  color: var(--red);
}

.field-error {
  margin: var(--space-1) 0 var(--space-3);
  color: var(--red);
  font-weight: 650;
}

[aria-invalid="true"] {
  border-color: var(--red);
}

.result--eligible {
  color: var(--ink);
  background: var(--surface);
  border: 2px solid var(--navy);
}

.result-checks {
  padding: 0;
  list-style: none;
}

.status {
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  margin-block: var(--space-2);
}

.status-icon {
  display: inline-grid;
  flex: 0 0 1.5rem;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
  font-weight: 800;
}

.status--pass .status-icon {
  color: var(--white);
  background: var(--navy);
}

.status--fail .status-icon {
  color: var(--white);
  background: var(--red);
}

.benefit-totals dd {
  font-size: 1.2rem;
  font-weight: 750;
}

.disclaimer {
  max-width: 70ch;
  font-weight: 600;
}

.assumptions {
  padding-block: var(--space-3);
  border-block: 1px solid var(--border);
}

.assumptions summary {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: 700;
}

[hidden] {
  display: none !important;
}

@media (max-width: 640px) {
  .masthead {
    align-items: flex-start;
  }

  .brand-logo {
    width: 72px;
    height: 72px;
  }

  h1 {
    font-size: 1.55rem;
  }

  .choice-row {
    flex-direction: column;
  }

  .derived-values > div,
  .benefit-totals > div,
  .calculation-breakdown > div {
    flex-direction: column;
    gap: 0.2rem;
  }

  dd {
    text-align: start;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 5: Run all automated tests**

Run:

```powershell
node --test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 6: Inspect the page at phone and desktop widths**

Run:

```powershell
py -m http.server 8080
```

Open `http://localhost:8080` and verify:

- 320px wide: no horizontal scroll; logo/title fit; controls are one column.
- 860px wide: paired fields share rows; body copy remains below 70 characters per line.
- Keyboard: skip link, every control, submit, result, and Start over are reachable with visible focus.
- Reduced motion: OS/browser reduced-motion emulation removes transitions.
- Color blindness: passed and failed states remain distinct because both have text and different icons.

Stop the server with `Ctrl+C`.

- [ ] **Step 7: Commit styling and asset**

```powershell
git add styles.css assets/local-947-logo.png tests/structure.test.mjs
git commit -m "style: apply Local 947 visual system"
```

---

### Task 7: Design-system capture, documentation, and release verification

**Files:**
- Modify: `DESIGN.md` through Impeccable scan mode
- Create: `.impeccable/design.json` through Impeccable scan mode
- Modify: `tests/structure.test.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: The completed static application.
- Produces: Exact built design tokens, reproducible commands, hosting guidance, and final verification evidence.

- [ ] **Step 1: Add a failing documentation smoke test**

Append to `tests/structure.test.mjs`:

```js
test("README documents test, preview, privacy, and maintenance", async () => {
  const readme = await readFile(new URL("README.md", rootUrl), "utf8");

  for (const fragment of [
    "node --test",
    "py -m http.server 8080",
    "No entered data is stored or transmitted",
    "RANK_SALARIES",
    "BENEFIT_MULTIPLIER",
  ]) {
    assert.ok(readme.includes(fragment), "Missing README detail: " + fragment);
  }
});
```

- [ ] **Step 2: Run the test and verify README is missing**

Run:

```powershell
node --test tests/structure.test.mjs
```

Expected: FAIL with `ENOENT` for `README.md`.

- [ ] **Step 3: Write operating and maintenance documentation**

Create `README.md`:

````markdown
# Local 947 Special Separation Calculator

A standalone browser calculator for active sworn Greensboro firefighters to
estimate apparent Fire SSA eligibility and benefit amounts.

## Privacy

No entered data is stored or transmitted. The calculator has no backend,
analytics, cookies, local storage, or network submission.

## Preview locally

From this directory:

```powershell
py -m http.server 8080
```

Open `http://localhost:8080`. Stop the server with `Ctrl+C`.

## Run checks

```powershell
node --test
```

## Host

Upload `index.html`, `styles.css`, `calculator.mjs`, `app.mjs`, and the
`assets` directory together to any static web host. Preserve the relative
paths.

## Update calculation assumptions

The editable constants are grouped in `calculator.mjs`:

- `RANK_SALARIES`: rank starting salaries
- `RAISE_RATE`: projected annual July 1 raise rate
- `BENEFIT_MULTIPLIER`: Fire SSA calculation multiplier
- `CHECKS_PER_YEAR`: gross biweekly divisor
- `MAX_SICK_ACCRUAL_PER_YEAR`: historical sick projection cap

Run `node --test` after every change. Official rules and salary values must
be reviewed before public release and whenever policy or pay schedules change.

## Important

This calculator provides an estimate only. Users must verify eligibility,
service credit, salary, and benefit values with the appropriate benefits
authority before making a retirement decision.
````

- [ ] **Step 4: Run Impeccable document in scan mode**

Invoke the `impeccable` skill with the `document` command against the completed project. Follow scan mode exactly:

- Replace the `<!-- SEED -->` version of `DESIGN.md` with the actual OKLCH colors, typography, spacing, radii, states, and components found in `styles.css` and `index.html`.
- Preserve the approved "The Union Desk" north star and all anti-references.
- Generate `.impeccable/design.json` with the exact component snippets and token metadata.
- Do not change application behavior during this step.

- [ ] **Step 5: Run the complete automated suite**

Run:

```powershell
node --test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 6: Run the final browser acceptance matrix**

Serve with `py -m http.server 8080` and verify these exact scenarios:

1. **Eligible by 30 years:** retirement age below 60, calculated service exactly 30, GFD share exactly 50%, regular service Yes, continuous GFD Yes. Result is eligible and shows all three payment values.
2. **Eligible by age 60/25 years:** age exactly 60, calculated service exactly 25, GFD share exactly 50%. Result is eligible.
3. **Age failure:** age exactly 62. Result is ineligible and shows no payment values.
4. **Disability failure:** regular service No. Result explains that regular service retirement is required and shows no payment values.
5. **Continuous-service failure:** continuous GFD No. Result explains the five-year requirement and shows no payment values.
6. **GFD-share failure:** GFD share below 50%. Result explains the percentage requirement and shows no payment values.
7. **Historical sick projection:** current sick hours show a projected balance and LGERS months with 160/161-hour behavior.
8. **Manual benefit service:** changing the manual value changes dollar estimates but leaves every eligibility check unchanged.
9. **Salary modes:** anticipated salary has no raises; current salary counts future July 1 dates; a July promotion receives its first raise the next July.
10. **Lifetime total:** covered months begin February 1 after retirement and include the full 62nd-birthday month.
11. **Error recovery:** submit an empty form, follow each error-summary link, fix values, and submit successfully.
12. **Reset:** Start over clears all inputs, derived values, errors, and results and returns focus to retirement year.

Also verify at 320px, 640px, and 1024px widths; keyboard-only navigation; one screen-reader pass; reduced-motion emulation; and protanopia/deuteranopia simulation.

- [ ] **Step 7: Check the final working tree**

Run:

```powershell
git status --short
git diff --check
```

Expected: only the Task 7 documentation/design-capture files are modified or untracked; `git diff --check` prints nothing.

- [ ] **Step 8: Commit documentation and final design capture**

```powershell
git add README.md DESIGN.md .impeccable/design.json tests/structure.test.mjs
git commit -m "docs: document calculator operation and design"
```

- [ ] **Step 9: Verify the committed result**

Run:

```powershell
node --test
git status --short
git log --oneline -8
```

Expected:

- All tests PASS with zero failures.
- `git status --short` prints nothing.
- The log shows the seven implementation commits after the design and plan commits.
