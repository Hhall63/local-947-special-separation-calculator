# Creditable Years and Preview Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace user-facing benefit-service terminology with approved creditable-years wording, keep valid calculated previews visible independently, remove gray preview bars, and simplify defaults and controls without changing eligibility or benefit math.

**Architecture:** Keep the static HTML/CSS/ES-module application and its existing calculation model. Extract the service-only and salary-only portions of `calculateEstimate` into small exported pure functions so the browser controller can update each preview without requiring unrelated form sections; `calculateEstimate` will reuse those functions to preserve one calculation path.

**Tech Stack:** Semantic HTML, modern CSS, vanilla JavaScript ES modules, Node.js built-in test runner, GitHub Pages.

## Global Constraints

- The City-policy 50% test remains `projected sworn GFD service / total calculated creditable service >= 0.50`.
- The 50% denominator remains `projected GFD service + other LGERS service + sick-leave service credit`.
- A separately entered creditable-years value changes the SSA equation only, never eligibility, the 30-year test, or the age-60/25-year test.
- No user-facing `benefit service`, `benefit equation`, or `payment equation` wording remains; use `creditable years of service` and `SSA equation`.
- Only form `.derived-values` rows lose the gray background. Result and final payment breakdown styling remains unchanged.
- Default GFD, other-LGERS, and separately entered service month inputs to `0`; reset restores those defaults.
- Rank options display rank names only while retaining the internal starting salaries.
- Do not change the SSA multiplier, service projection, sick-leave conversion, salary raises, eligibility rules, benefit amounts, or payment duration.
- Do not add dependencies or a build step.

## File Map

- `calculator.mjs`: Owns pure service, salary, eligibility, and benefit calculations plus validation messages.
- `app.mjs`: Collects browser input, controls conditional fields, independently renders previews, and renders submitted results.
- `index.html`: Owns approved visible copy, month defaults, semantic preview rows, and button label.
- `styles.css`: Separates white form previews from gray final result breakdowns.
- `tests/calculator.test.mjs`: Verifies pure preview calculations, policy boundaries, and validation wording.
- `tests/structure.test.mjs`: Verifies static copy, defaults, rank-option rendering, and styling contracts.

---

### Task 1: Approved copy, defaults, rank labels, and white preview rows

**Files:**
- Modify: `index.html:137-424`
- Modify: `app.mjs:165-173`
- Modify: `calculator.mjs:431-451`
- Modify: `styles.css:253-272`
- Test: `tests/structure.test.mjs`
- Test: `tests/calculator.test.mjs`

**Interfaces:**
- Consumes: Existing element IDs and internal `benefitService` property names.
- Produces: Exact approved visible copy, zero-valued month defaults, rank-only option labels, and transparent `.derived-values` containers.

- [ ] **Step 1: Add failing static-interface tests**

Append focused assertions to `tests/structure.test.mjs`:

```js
test("uses approved creditable-years copy and defaults", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const normalizedHtml = html.replace(/\s+/g, " ");

  for (const fragment of [
    "Creditable years of service",
    "Projected GFD service + other LGERS service + sick-leave service credit = creditable years of service",
    "Which creditable years of service should the SSA equation use?",
    "Use calculated creditable years of service",
    "Enter separate creditable years of service",
    "Creditable years of service used",
    "This value changes the SSA equation only, not eligibility.",
  ]) {
    assert.ok(
      normalizedHtml.includes(fragment),
      "Missing approved copy: " + fragment,
    );
  }

  assert.doesNotMatch(html, /benefit service|benefit equation|payment equation/i);
  assert.match(html, /id="gfd-months"[\s\S]{0,180}value="0"/);
  assert.match(html, /id="other-months"[\s\S]{0,180}value="0"/);
  assert.match(html, /id="benefit-months"[\s\S]{0,180}value="0"/);
  assert.match(html, /<button class="primary-button" type="submit">\s*Submit\s*<\/button>/);
});

test("rank choices show labels without starting pay", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");
  assert.ok(app.includes("option.textContent = details.label;"));
  assert.ok(!app.includes('details.label + " - " + currency.format(details.salary)'));
});

test("form previews are white while result breakdowns keep their surface", async () => {
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");
  assert.match(
    css,
    /\.benefit-totals,\s*\.calculation-breakdown\s*\{[\s\S]*?background: var\(--surface\);/,
  );
  assert.doesNotMatch(
    css,
    /\.derived-values[^\{]*\{[^}]*background:/,
  );
});
```

Add a validation-copy assertion to `tests/calculator.test.mjs`:

```js
test("validation uses creditable-years terminology", () => {
  const input = validInput();
  input.benefitService = { mode: undefined };
  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["benefit-service-mode"],
    "Choose calculated or separately entered creditable years of service.",
  );

  input.benefitService = { mode: "manual", years: 0, months: 0 };
  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["benefit-years"],
    "Enter creditable years of service greater than zero.",
  );
});
```

- [ ] **Step 2: Run the new tests and verify red status**

Run: `node --test tests/structure.test.mjs tests/calculator.test.mjs`

Expected: FAIL on the old benefit-service copy, blank month defaults, long submit label, salary-bearing rank labels, shared gray selector, and old validation messages.

- [ ] **Step 3: Apply the approved HTML copy and defaults**

In `index.html`, keep existing IDs and replace only visible text. The section must read:

```html
<section class="form-section" aria-labelledby="benefit-service-title">
  <h2 id="benefit-service-title">Creditable years of service</h2>
  <p class="hint">
    Projected GFD service + other LGERS service + sick-leave service credit =
    creditable years of service
  </p>
  <fieldset id="benefit-service-mode-group">
    <legend>
      Which creditable years of service should the SSA equation use?
    </legend>
    <div class="choice-stack">
      <label>
        <input type="radio" name="benefit-service-mode" value="calculated" />
        Use calculated creditable years of service
      </label>
      <label>
        <input type="radio" name="benefit-service-mode" value="manual" />
        Enter separate creditable years of service
      </label>
    </div>
  </fieldset>

  <fieldset id="manual-service-fields" hidden>
    <legend>Creditable years of service</legend>
    <p class="hint">This value changes the SSA equation only, not eligibility.</p>
    <div class="field-row">
      <div class="field">
        <label for="benefit-years">Years</label>
        <input
          id="benefit-years"
          type="number"
          min="0"
          inputmode="numeric"
        />
      </div>
      <div class="field">
        <label for="benefit-months">Months</label>
        <input
          id="benefit-months"
          type="number"
          min="0"
          max="11"
          value="0"
          inputmode="numeric"
        />
      </div>
    </div>
  </fieldset>

  <dl class="derived-values" aria-live="polite">
    <div>
      <dt>Creditable years of service used</dt>
      <dd id="benefit-service-value">-</dd>
    </div>
  </dl>
</section>
```

Also change the result breakdown label to `Creditable years of service`, the submit text to `Submit`, and add `value="0"` to `gfd-months`, `other-months`, and `benefit-months`. Native `form.reset()` will then restore all three zero defaults.

- [ ] **Step 4: Simplify rank labels and validation wording**

In `app.mjs`, replace the rank option assignment with:

```js
option.textContent = details.label;
```

In `calculator.mjs`, set the two messages to:

```js
errors["benefit-service-mode"] =
  "Choose calculated or separately entered creditable years of service.";
```

```js
errors["benefit-years"] =
  "Enter creditable years of service greater than zero.";
```

- [ ] **Step 5: Remove only the form-preview background**

Split the CSS selector while preserving layout, padding, and dividers:

```css
.derived-values,
.benefit-totals,
.calculation-breakdown {
  margin: var(--space-4) 0;
}

.benefit-totals,
.calculation-breakdown {
  background: var(--surface);
}
```

- [ ] **Step 6: Run tests and verify green status**

Run: `node --test tests/structure.test.mjs tests/calculator.test.mjs`

Expected: all tests PASS; existing exact-50% and below-50% tests remain green.

- [ ] **Step 7: Commit the interface slice**

```powershell
git add -- index.html app.mjs calculator.mjs styles.css tests/structure.test.mjs tests/calculator.test.mjs
git -c user.name=Codex -c user.email=codex@local commit -m "feat: clarify creditable service inputs"
```

---

### Task 2: Independent calculated previews

**Files:**
- Modify: `calculator.mjs:252-327`
- Modify: `app.mjs:1-5,229-266`
- Test: `tests/calculator.test.mjs`
- Test: `tests/structure.test.mjs`

**Interfaces:**
- Consumes: Existing `projectService`, `projectSickHours`, `sickHoursToServiceMonths`, `projectSalary`, `retirementDateForYear`, `toServiceYears`, and full-form `validateInput`.
- Produces: `calculateService(input, today = new Date()) -> service details` and `calculateRetirementSalary(input, today = new Date()) -> number`; `calculateEstimate` reuses both functions.

- [ ] **Step 1: Add failing pure-function tests for incomplete-form previews**

Import `calculateRetirementSalary` and `calculateService` in `tests/calculator.test.mjs`, then add:

```js
test("calculates service without unrelated eligibility or salary fields", () => {
  const service = calculateService(
    {
      retirementYear: 2030,
      currentGfd: { years: 20, months: 0 },
      otherLgers: { years: 4, months: 0 },
      sick: { mode: "retirement", hours: 320 },
    },
    new Date(2026, 0, 31),
  );

  assert.equal(service.projectedGfdYears, 24);
  assert.equal(service.sickServiceMonths, 2);
  assert.equal(service.eligibilityServiceYears, 28 + 2 / 12);
});

test("calculates salary without unrelated service or eligibility fields", () => {
  assert.equal(
    calculateRetirementSalary(
      {
        retirementYear: 2030,
        salary: { mode: "anticipated", amount: 123456 },
      },
      new Date(2026, 6, 17),
    ),
    123456,
  );
});
```

In `tests/structure.test.mjs`, require the controller hooks:

```js
for (const fragment of [
  "calculateService",
  "calculateRetirementSalary",
  "serviceErrorKeys",
  "salaryErrorKeys",
]) {
  assert.ok(app.includes(fragment), "Missing progressive preview hook: " + fragment);
}
```

- [ ] **Step 2: Run the focused tests and verify red status**

Run: `node --test tests/calculator.test.mjs tests/structure.test.mjs`

Expected: FAIL because the two pure preview functions and controller hooks do not exist.

- [ ] **Step 3: Extract service-only and salary-only calculations**

Add these exported functions in `calculator.mjs` before `calculateEstimate`:

```js
export function calculateService(input, today = new Date()) {
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
  const sickServiceMonths = sickHoursToServiceMonths(retirementSickHours);
  const sickServiceYears = sickServiceMonths / 12;

  return {
    currentGfdYears,
    otherLgersYears,
    remainingYears: projected.remainingYears,
    projectedGfdYears: projected.projectedGfdYears,
    retirementSickHours,
    sickServiceMonths,
    sickServiceYears,
    eligibilityServiceYears:
      projected.projectedGfdYears + otherLgersYears + sickServiceYears,
  };
}

export function calculateRetirementSalary(input, today = new Date()) {
  return projectSalary({
    ...input.salary,
    today,
    retirementDate: retirementDateForYear(input.retirementYear),
  });
}
```

Refactor `calculateEstimate` to call those functions and preserve its public result shape:

```js
export function calculateEstimate(input, today = new Date()) {
  const retirementDate = retirementDateForYear(input.retirementYear);
  const service = calculateService(input, today);
  const retirementAge = ageAtRetirement({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });
  const eligibility = evaluateEligibility({
    retirementAge,
    regularServiceRetirement: input.regularServiceRetirement,
    continuousGfd: input.continuousGfd,
    projectedGfdYears: service.projectedGfdYears,
    eligibilityServiceYears: service.eligibilityServiceYears,
  });
  const benefitServiceYears =
    input.benefitService.mode === "manual"
      ? toServiceYears(input.benefitService)
      : service.eligibilityServiceYears;
  const retirementSalary = calculateRetirementSalary(input, today);
  const coveredMonths = coveredBenefitMonths({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });

  return {
    dates: { retirementDate, remainingYears: service.remainingYears },
    service: { ...service, benefitServiceYears },
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

- [ ] **Step 4: Render each preview from only its own valid inputs**

Import the new functions and `toServiceYears` in `app.mjs`. Add the exact relevant error-key sets:

```js
const serviceErrorKeys = new Set([
  "retirement-year",
  "gfd-years",
  "gfd-months",
  "other-lgers",
  "other-years",
  "other-months",
  "sick-mode",
  "sick-hours",
]);

const salaryErrorKeys = new Set([
  "retirement-year",
  "salary-mode",
  "anticipated-salary",
  "current-salary",
  "rank",
  "promotion-month",
  "promotion-year",
]);

function hasAnyError(errors, keys) {
  return Object.keys(errors).some((key) => keys.has(key));
}
```

Replace the all-or-nothing `renderPreview` body with:

```js
function renderPreview() {
  updateConditionalFields();
  const input = collectInput();
  const errors = validateInput(input);
  const service = hasAnyError(errors, serviceErrorKeys)
    ? null
    : calculateService(input);

  element("projected-sick-hours").textContent = service
    ? Math.round(service.retirementSickHours).toLocaleString() + " hours"
    : "-";
  element("sick-service").textContent = service
    ? serviceText(service.sickServiceYears)
    : "-";
  element("projected-gfd-service").textContent = service
    ? serviceText(service.projectedGfdYears)
    : "-";
  element("eligibility-service").textContent = service
    ? serviceText(service.eligibilityServiceYears)
    : "-";

  let creditableYears = null;
  if (
    input.benefitService.mode === "manual" &&
    !errors["benefit-years"] &&
    !errors["benefit-months"]
  ) {
    creditableYears = toServiceYears(input.benefitService);
  } else if (
    input.benefitService.mode === "calculated" &&
    service
  ) {
    creditableYears = service.eligibilityServiceYears;
  }
  element("benefit-service-value").textContent =
    creditableYears === null ? "-" : serviceText(creditableYears);

  element("projected-salary").textContent = hasAnyError(
    errors,
    salaryErrorKeys,
  )
    ? "-"
    : currency.format(calculateRetirementSalary(input));
}
```

Keep `clearPreview()` for Start over. Full submit validation and error rendering remain unchanged.

- [ ] **Step 5: Run the complete automated suite and syntax checks**

Run:

```powershell
node --test
node --check calculator.mjs
node --check app.mjs
```

Expected: all tests PASS and both syntax checks exit `0`. Confirm the exact-50%, below-50%, manual-service-is-SSA-only, sick-credit, and rank-raise tests are still present and green.

- [ ] **Step 6: Commit the progressive preview slice**

```powershell
git add -- calculator.mjs app.mjs tests/calculator.test.mjs tests/structure.test.mjs
git -c user.name=Codex -c user.email=codex@local commit -m "feat: update calculator previews independently"
```

---

### Task 3: Browser acceptance and GitHub Pages release

**Files:**
- Verify: `index.html`
- Verify: `app.mjs`
- Verify: `calculator.mjs`
- Verify: `styles.css`
- Verify: `tests/*.test.mjs`

**Interfaces:**
- Consumes: The completed static site on local HTTP and `origin/master` GitHub Pages deployment.
- Produces: A verified public release built from the exact pushed commit.

- [ ] **Step 1: Run the repository verification commands from a clean source state**

Run:

```powershell
node --test
node --check calculator.mjs
node --check app.mjs
git diff --check
git status --short
```

Expected: all tests PASS, syntax checks and diff check exit `0`, and only the intentionally untracked `tmp/` PDF render directory may remain.

- [ ] **Step 2: Serve and inspect the calculator locally**

Run: `python -m http.server 8080`

In the browser at `http://localhost:8080`, verify:

1. All approved copy appears and no visible benefit-service wording remains.
2. GFD, other-LGERS, and separate-service month inputs start at `0` and return to `0` after Start over.
3. The rank dropdown contains names only and no dollar sign.
4. A complete service section shows sick, GFD, and total creditable calculations before birth, eligibility, or salary sections are complete.
5. A valid salary section shows projected salary even while service or birth fields are incomplete.
6. Switching to separately entered creditable years shows that value without changing policy eligibility calculations.
7. Form preview rows are white with labels, values, and dividers intact; eligible/ineligible and final payment blocks retain their existing styled backgrounds.
8. Submitting a complete exact-50% example shows eligible; adding enough other LGERS or sick credit to drop sworn GFD below 50% shows ineligible and explains the failed requirement.
9. Keyboard focus, live values, 320px layout, and a wide desktop layout remain usable; browser console has no errors.

- [ ] **Step 3: Confirm the release diff before push**

Run:

```powershell
git log --oneline -5
git diff origin/master..HEAD -- index.html app.mjs calculator.mjs styles.css tests docs
```

Expected: the diff contains only the approved spec/plan, terminology/default/style updates, pure preview extraction, tests, and no generated PDF renders.

- [ ] **Step 4: Push the verified commits**

Run: `git push origin master`

Expected: `master -> master` succeeds.

- [ ] **Step 5: Wait for GitHub Pages to build the exact commit**

Run: `gh api repos/Hhall63/local-947-special-separation-calculator/pages/builds/latest`

Expected: the returned build reaches `status: built` and its commit SHA equals `git rev-parse HEAD`.

- [ ] **Step 6: Verify the public site**

Open `https://hhall63.github.io/local-947-special-separation-calculator/` with a cache-busting query. Repeat the approved copy, progressive preview, rank-label, exact-50%, below-50%, reset, layout, and console checks against the public build.

- [ ] **Step 7: Record the completed release**

If browser verification reveals no source changes, do not create an empty commit. Report the exact deployed SHA, automated test count, public URL, policy-logic result, and any intentionally untracked local PDF render files.
