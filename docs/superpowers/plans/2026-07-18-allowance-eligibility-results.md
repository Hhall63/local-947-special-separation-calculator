# Allowance Eligibility and Results Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show definitive ineligibility immediately, explain eligibility with actual-versus-required evidence, and present all user-facing payment values as allowances with gross biweekly allowance first.

**Architecture:** Extend the existing pure eligibility evaluator to support `true` / `false` / `null` requirement states and carry display evidence, so both immediate and submitted results use one policy path. Keep the static single-page form; the browser controller hides allowance-only inputs when any requirement is definitively false and restores them without clearing values when the answer is corrected.

**Tech Stack:** Semantic HTML, modern CSS, vanilla JavaScript ES modules, Node.js built-in test runner, Impeccable detector, dependency-free static hosting.

## Global Constraints

- Preserve all existing policy math, exact-50% behavior, salary constants, sick-leave conversion, raise rate, multiplier, and covered-month calculation.
- Use **allowance** instead of **benefit** in all visible interface copy; internal identifiers may retain `benefit`.
- Show estimated gross biweekly allowance first, estimated annual allowance second, and estimated total allowance third.
- Open the official LGERS Member Handbook in a new tab with an explicit new-tab cue: `https://www.myncretirement.com/documents/files/actives/lgers-handbook/open`.
- Do not add dependencies, a framework, backend, persistence, analytics, account, modal, wizard, or new page.
- Keep Local 947 colors, system typography, native controls, 44px targets, visible focus, reduced motion, and the card-free page structure.
- Follow red-green-refactor: no production change before its focused failing test has been observed.
- Keep the separate Impeccable audit out of this plan; run it only after implementation verification is complete.

## File Map

- `calculator.mjs`: Owns tri-state eligibility policy, evidence strings, and the unchanged allowance calculations.
- `app.mjs`: Collects partial input, synchronizes the immediate eligibility gate, renders evidence-rich results, manages focus, and announces concise previews.
- `index.html`: Owns user-facing allowance copy, form subsections, handbook links, result order, and action hooks.
- `styles.css`: Owns subsection rhythm, result hierarchy, passed/failed color separation, hidden status utility, and disclosure marker.
- `tests/calculator.test.mjs`: Verifies tri-state policy, immediate failures, evidence, and existing calculation boundaries.
- `tests/structure.test.mjs`: Verifies visible copy, markup order, handbook links, accessibility hooks, controller integration, and CSS contracts.

---

### Task 1: Tri-State Eligibility and Evidence

**Files:**
- Modify: `calculator.mjs:56-113`
- Test: `tests/calculator.test.mjs`

**Interfaces:**
- Consumes: Existing `evaluateEligibility({ retirementAge, regularServiceRetirement, continuousGfd, projectedGfdYears, eligibilityServiceYears })` callers.
- Produces: The same function returning `{ eligible, complete, failed, checks, gfdShare, unreduced }`; every check exposes `{ key, label, passed, actual, requirement, targetId }`, where `passed` is `true`, `false`, or `null`.

- [ ] **Step 1: Add failing tri-state tests**

Append these tests to `tests/calculator.test.mjs`:

```js
test("reports an explicit retirement-type failure before service is known", () => {
  const result = evaluateEligibility({
    regularServiceRetirement: false,
  });

  assert.equal(result.failed, true);
  assert.equal(result.complete, false);
  assert.equal(
    result.checks.find((check) => check.key === "regular-service").passed,
    false,
  );
  assert.equal(
    result.checks.find((check) => check.key === "gfd-share").passed,
    null,
  );
});

test("reports a known age failure before service and salary are known", () => {
  const result = evaluateEligibility({ retirementAge: 62 });
  const age = result.checks.find((check) => check.key === "under-62");

  assert.equal(result.failed, true);
  assert.equal(age.passed, false);
  assert.equal(age.actual, "62 years old");
  assert.equal(age.requirement, "Under age 62");
  assert.equal(age.targetId, "birth-year");
});

test("returns actual and required evidence for complete eligibility", () => {
  const result = evaluateEligibility({
    retirementAge: 60,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 20,
    eligibilityServiceYears: 30,
  });

  assert.equal(result.complete, true);
  assert.equal(result.failed, false);
  assert.equal(result.eligible, true);
  assert.equal(
    result.checks.find((check) => check.key === "gfd-share").actual,
    "66.7%",
  );
  assert.equal(
    result.checks.find((check) => check.key === "unreduced").actual,
    "30 years, 0 months at age 60",
  );
});
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```powershell
node --test --test-name-pattern "explicit retirement-type|known age failure|actual and required evidence" tests/calculator.test.mjs
```

Expected: FAIL because the current evaluator treats missing values as failures and does not return `complete`, `failed`, `actual`, `requirement`, or `targetId`.

- [ ] **Step 3: Replace the evaluator with the minimal tri-state implementation**

Add this private formatter immediately before `evaluateEligibility`, then replace the function body:

```js
function serviceText(years) {
  const totalMonths = Math.round(years * 12);
  const wholeYears = Math.floor(totalMonths / 12);
  const monthsOnly = totalMonths % 12;
  return wholeYears + " years, " + monthsOnly + " months";
}

export function evaluateEligibility({
  retirementAge,
  regularServiceRetirement,
  continuousGfd,
  projectedGfdYears,
  eligibilityServiceYears,
}) {
  const hasAge = Number.isFinite(retirementAge);
  const hasProjectedGfd = Number.isFinite(projectedGfdYears);
  const hasEligibilityService = Number.isFinite(eligibilityServiceYears);
  const gfdShare =
    hasProjectedGfd && hasEligibilityService && eligibilityServiceYears > 0
      ? projectedGfdYears / eligibilityServiceYears
      : null;
  const unreduced =
    hasAge && hasEligibilityService
      ? eligibilityServiceYears >= 30 ||
        (retirementAge >= 60 && eligibilityServiceYears >= 25)
      : null;
  const continuousPassed =
    continuousGfd === false
      ? false
      : continuousGfd === true && hasProjectedGfd
        ? projectedGfdYears >= 5
        : null;

  const checks = [
    {
      key: "under-62",
      label: "Age on the January 31 retirement date",
      passed: hasAge ? retirementAge < 62 : null,
      actual: hasAge ? retirementAge + " years old" : null,
      requirement: "Under age 62",
      targetId: "birth-year",
    },
    {
      key: "regular-service",
      label: "Regular LGERS service retirement",
      passed:
        regularServiceRetirement === undefined
          ? null
          : regularServiceRetirement === true,
      actual:
        regularServiceRetirement === undefined
          ? null
          : regularServiceRetirement
            ? "Yes"
            : "No",
      requirement: "Regular service retirement, not disability retirement",
      targetId: "regular-retirement-group",
    },
    {
      key: "continuous-gfd",
      label: "Continuous sworn GFD service",
      passed: continuousPassed,
      actual:
        continuousGfd === undefined
          ? null
          : continuousGfd === false
            ? "No"
            : hasProjectedGfd
              ? "Yes; " + serviceText(projectedGfdYears) + " projected GFD service"
              : "Yes",
      requirement: "At least five continuous years immediately before retirement",
      targetId: "continuous-gfd-group",
    },
    {
      key: "gfd-share",
      label: "Sworn GFD share of total creditable service",
      passed: gfdShare === null ? null : gfdShare >= 0.5,
      actual: gfdShare === null ? null : (gfdShare * 100).toFixed(1) + "%",
      requirement: "At least 50%",
      targetId: "gfd-years",
    },
    {
      key: "unreduced",
      label: "Unreduced LGERS service retirement",
      passed: unreduced,
      actual:
        unreduced === null
          ? null
          : serviceText(eligibilityServiceYears) + " at age " + retirementAge,
      requirement: "30 years, or age 60 with at least 25 years",
      targetId: "gfd-years",
    },
  ];
  const complete = checks.every((check) => check.passed !== null);
  const failed = checks.some((check) => check.passed === false);

  return {
    eligible: complete && !failed,
    complete,
    failed,
    checks,
    gfdShare,
    unreduced,
  };
}
```

- [ ] **Step 4: Run the calculator tests and verify green**

Run:

```powershell
node --test tests/calculator.test.mjs
```

Expected: all calculator tests PASS, including exact 50%, under-62, 30-year, and age-60/25-year boundaries.

- [ ] **Step 5: Commit the policy slice**

```powershell
git add -- calculator.mjs tests/calculator.test.mjs
git -c user.name=Codex -c user.email=codex@local commit -m "feat: expose partial eligibility evidence"
```

---

### Task 2: Allowance Copy, Result Markup, and Visual Hierarchy

**Files:**
- Modify: `index.html:5-457`
- Modify: `styles.css:109-453`
- Test: `tests/structure.test.mjs`

**Interfaces:**
- Consumes: Existing element IDs read by `app.mjs`.
- Produces: New IDs `benefit-service-section`, `salary-section`, `calculate-button`, `result-title`, `preview-status`, `edit-answers`, and `allowance-coverage`; existing amount IDs remain unchanged.

- [ ] **Step 1: Add failing copy and structure tests**

Append this test to `tests/structure.test.mjs`:

```js
test("uses allowance copy, official guidance, and the approved result order", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const normalized = html.replace(/\s+/g, " ");

  for (const fragment of [
    "Local Governmental Employees’ Retirement System (LGERS)",
    "Calculate my allowance estimate",
    "Estimated gross biweekly allowance",
    "Estimated annual allowance",
    "Estimated total allowance",
    "Reloading this page clears your entries",
    "official LGERS Member Handbook (opens in a new tab)",
    'id="benefit-service-section"',
    'id="salary-section"',
    'id="calculate-button"',
    'id="edit-answers"',
    'id="preview-status"',
  ]) {
    assert.ok(normalized.includes(fragment), "Missing interface copy: " + fragment);
  }

  assert.ok(
    html.indexOf("Estimated gross biweekly allowance") <
      html.indexOf("Estimated annual allowance"),
  );
  assert.ok(
    html.indexOf("Estimated annual allowance") <
      html.indexOf("Estimated total allowance"),
  );
  assert.match(
    html,
    /href="https:\/\/www\.myncretirement\.com\/documents\/files\/actives\/lgers-handbook\/open"[^>]*target="_blank"[^>]*rel="noopener"/,
  );
  assert.doesNotMatch(
    normalized,
    />[^<]*\bbenefit(s)?\b[^<]*</i,
    "Visible interface copy must use allowance",
  );
});

test("uses one preview status region and accessible result focus", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");

  assert.doesNotMatch(html, /<dl[^>]*aria-live=/);
  assert.match(
    html,
    /id="preview-status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  );
  assert.match(html, /<h2 id="result-title" tabindex="-1"><\/h2>/);
  assert.doesNotMatch(html, /id="result"[^>]*aria-live=/);
});
```

Extend the existing CSS test with:

```js
for (const fragment of [
  ".form-subheading",
  ".visually-hidden",
  ".allowance-primary",
  ".result--ineligible .status--pass",
  ".assumptions summary::before",
]) {
  assert.ok(css.includes(fragment), "Missing revised style: " + fragment);
}
```

- [ ] **Step 2: Run the structure tests and verify red**

Run:

```powershell
node --test --test-name-pattern "allowance copy|one preview status|styles include" tests/structure.test.mjs
```

Expected: FAIL on missing allowance copy, IDs, handbook links, result order, status region, and styles.

- [ ] **Step 3: Apply the exact HTML contract**

Make these focused changes in `index.html`:

```html
<meta
  name="description"
  content="Estimate Local 947 Special Separation Allowance eligibility and allowance amounts."
/>
```

Use this guidance immediately below `Before you begin`:

```html
<p>
  The Special Separation Allowance requires every condition below. You can
  still use the calculator to see which conditions pass and which do not.
</p>
<p>
  Have your retirement year, birth month and year, current GFD and other
  service, sick hours, and salary or rank information ready.
</p>
<p class="privacy-note">
  Reloading this page clears your entries because nothing is stored.
</p>
<p>
  Review definitions and retirement rules in the
  <a
    href="https://www.myncretirement.com/documents/files/actives/lgers-handbook/open"
    target="_blank"
    rel="noopener"
  >official LGERS Member Handbook (opens in a new tab)</a>.
</p>
```

Expand the first requirement to:

```html
Retire under the Local Governmental Employees’ Retirement System (LGERS) on
a regular, unreduced service retirement—not an early reduced or disability
retirement.
```

Insert these headings inside the first form section before their related controls:

```html
<h3 class="form-subheading">Retirement date and age</h3>
<h3 class="form-subheading">Eligibility questions</h3>
<h3 class="form-subheading">Service and sick leave</h3>
```

Change the other-service choices to `Yes` and `No`, with the No input retaining the internal zero-service meaning:

```html
<label><input type="radio" name="other-lgers" value="yes" /> Yes</label>
<label><input type="radio" name="other-lgers" value="no" /> No—only GFD service</label>
```

Remove `aria-live` from every preview `<dl>` and add one status node after the preview lists:

```html
<p
  id="preview-status"
  class="visually-hidden"
  role="status"
  aria-live="polite"
  aria-atomic="true"
></p>
```

Add `id="benefit-service-section"` and use allowance copy in that section:

```html
<section
  id="benefit-service-section"
  class="form-section"
  aria-labelledby="benefit-service-title"
>
  <h2 id="benefit-service-title">Creditable service used for the allowance</h2>
  <p class="hint">
    Projected GFD service + other LGERS service + sick-leave service credit =
    creditable service.
  </p>
</section>
```

Keep the existing native radios and manual years/months fields between the
hint and closing `section`, and replace their visible text with these exact
phrases:

```text
Which creditable service should the allowance calculation use?
Use calculated creditable service
Enter separate creditable service
This value changes the allowance calculation only, not eligibility.
Creditable service used for the allowance
```

Add `id="salary-section"` to the retirement salary section and replace the submit button with:

```html
<button id="calculate-button" class="primary-button" type="submit">
  Calculate my allowance estimate
</button>
```

Replace the result opening and amount block with:

```html
<section id="result" class="result" aria-labelledby="result-title" hidden>
  <h2 id="result-title" tabindex="-1"></h2>
  <p id="result-summary"></p>
  <ul id="requirements-results" class="result-checks"></ul>

  <div id="benefit-results" hidden>
    <dl class="benefit-totals">
      <div class="allowance-primary">
        <dt>Estimated gross biweekly allowance</dt>
        <dd id="biweekly-benefit"></dd>
      </div>
      <div>
        <dt>Estimated annual allowance</dt>
        <dd id="annual-benefit"></dd>
      </div>
      <div>
        <dt>Estimated total allowance</dt>
        <dd id="total-benefit"></dd>
      </div>
    </dl>
    <p id="allowance-coverage" class="allowance-coverage"></p>
    <dl class="calculation-breakdown">
      <div>
        <dt>Retirement salary</dt>
        <dd id="breakdown-salary"></dd>
      </div>
      <div>
        <dt>Creditable service used for the allowance</dt>
        <dd id="breakdown-service"></dd>
      </div>
      <div>
        <dt>Allowance multiplier</dt>
        <dd>0.0085</dd>
      </div>
      <div>
        <dt>Covered months</dt>
        <dd id="breakdown-months"></dd>
      </div>
    </dl>
  </div>

  <p class="disclaimer">
    This calculator provides an estimate only. Verify your information and
    eligibility using the
    <a
      href="https://www.myncretirement.com/documents/files/actives/lgers-handbook/open"
      target="_blank"
      rel="noopener"
    >official LGERS Member Handbook (opens in a new tab)</a>
    and the appropriate retirement authority before making a retirement decision.
  </p>
  <div class="result-actions">
    <button id="edit-answers" class="secondary-button" type="button">
      Change answers
    </button>
    <button id="start-over" class="secondary-button" type="button">
      Start over
    </button>
  </div>
</section>
```

Change assumptions copy from benefit to allowance, including `The allowance multiplier is 0.0085` and `Gross biweekly allowance uses 26 payments per year`.

- [ ] **Step 4: Add the minimal aligned styles**

Add these rules to `styles.css`, using only existing tokens:

```css
.form-subheading {
  margin: var(--space-5) 0 var(--space-3);
  color: var(--ink);
  font-size: 1rem;
  line-height: 1.5;
}

.privacy-note {
  color: var(--muted);
  font-weight: 650;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.result--ineligible {
  color: var(--ink);
  background: var(--red-soft);
  border: 2px solid var(--red);
}

.result--ineligible h2,
.result--ineligible .status--fail {
  color: var(--red);
}

.result--ineligible .status--pass {
  color: var(--ink);
}

.status-copy {
  display: grid;
  gap: 0.15rem;
}

.status-evidence {
  color: var(--muted);
}

.result--ineligible .status-evidence {
  color: var(--ink);
}

.allowance-primary {
  color: var(--navy);
  border-block: 2px solid var(--navy);
}

.allowance-primary dd {
  font-size: 1.4rem;
}

.allowance-coverage {
  max-width: 70ch;
  color: var(--muted);
}

.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.assumptions summary::before {
  content: "▸";
  margin-inline-end: var(--space-1);
}

.assumptions[open] summary::before {
  content: "▾";
}
```

Remove `.result--ineligible` from the shared red-text selector so only the heading and failed rows are red.

- [ ] **Step 5: Run structure tests and verify green**

Run:

```powershell
node --test tests/structure.test.mjs
```

Expected: all structure tests PASS.

- [ ] **Step 6: Commit the static-interface slice**

```powershell
git add -- index.html styles.css tests/structure.test.mjs
git -c user.name=Codex -c user.email=codex@local commit -m "feat: clarify allowance form and results"
```

---

### Task 3: Immediate Eligibility Gate and Accessible Result Rendering

**Files:**
- Modify: `app.mjs:1-396`
- Modify: `calculator.mjs:291-354`
- Test: `tests/structure.test.mjs`
- Test: `tests/calculator.test.mjs`

**Interfaces:**
- Consumes: Task 1 tri-state `evaluateEligibility(...)`; Task 2 IDs and evidence markup.
- Produces: Controller functions `buildEligibilityPreview(input, errors, service)`, `syncEligibilityGate(eligibility, service, retirementAge)`, and `renderResult(estimate, options)`; `calculateEstimate` also returns a `coverage` object.

- [ ] **Step 1: Add failing coverage and controller-hook tests**

Append to `tests/calculator.test.mjs`:

```js
test("returns the allowance coverage dates without changing covered months", () => {
  const result = calculateEstimate(
    {
      retirementYear: 2030,
      birthMonth: 2,
      birthYear: 1969,
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

  assert.equal(result.coveredMonths, 13);
  assert.deepEqual(result.coverage, {
    startYear: 2030,
    startMonth: 2,
    endYear: 2031,
    endMonth: 2,
  });
});
```

Append to `tests/structure.test.mjs`:

```js
test("controller gates allowance inputs and renders eligibility evidence", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");

  for (const fragment of [
    "evaluateEligibility",
    "buildEligibilityPreview",
    "syncEligibilityGate",
    'setHidden("benefit-service-section"',
    'setHidden("salary-section"',
    'setHidden("calculate-button"',
    "check.actual",
    "check.requirement",
    'element("edit-answers")',
    'element("result-title").focus()',
    'element("preview-status")',
    'otherMode === "no"',
  ]) {
    assert.ok(app.includes(fragment), "Missing eligibility gate hook: " + fragment);
  }
});
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```powershell
node --test --test-name-pattern "coverage dates|controller gates" tests/calculator.test.mjs tests/structure.test.mjs
```

Expected: FAIL because `coverage`, immediate gate functions, evidence rendering, and controller hooks do not exist.

- [ ] **Step 3: Return coverage metadata from the existing calculation path**

In `calculateEstimate`, add this property beside `coveredMonths` without changing the existing calculation:

```js
coverage: {
  startYear: input.retirementYear,
  startMonth: 2,
  endYear: input.birthYear + 62,
  endMonth: input.birthMonth,
},
```

- [ ] **Step 4: Import eligibility helpers and accept the No value**

Add `ageAtRetirement` and `evaluateEligibility` to the existing import list in `app.mjs`.

Change only the other-service mapping in `collectInput`:

```js
otherLgers:
  otherMode === "yes"
    ? serviceValue("other-years", "other-months")
    : otherMode === "no"
      ? null
      : undefined,
```

- [ ] **Step 5: Add partial eligibility construction and gate synchronization**

Add these state variables and functions after `hasAnyError`:

```js
let automaticFailureSignature = "";
let firstFailedTargetId = "retirement-year";

const ageErrorKeys = new Set([
  "retirement-year",
  "birth-month",
  "birth-year",
]);

function buildEligibilityPreview(input, errors, service) {
  const retirementAge = hasAnyError(errors, ageErrorKeys)
    ? undefined
    : ageAtRetirement({
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        retirementYear: input.retirementYear,
      });

  return {
    retirementAge,
    eligibility: evaluateEligibility({
      retirementAge,
      regularServiceRetirement: input.regularServiceRetirement,
      continuousGfd: input.continuousGfd,
      projectedGfdYears: service?.projectedGfdYears,
      eligibilityServiceYears: service?.eligibilityServiceYears,
    }),
  };
}

function syncEligibilityGate(eligibility, service, retirementAge) {
  const failedChecks = eligibility.checks.filter(
    (check) => check.passed === false,
  );
  const failed = failedChecks.length > 0;

  setHidden("benefit-service-section", failed);
  setHidden("salary-section", failed);
  setHidden("calculate-button", failed);

  if (!failed) {
    automaticFailureSignature = "";
    if (result.dataset.mode === "automatic") {
      result.hidden = true;
      result.dataset.mode = "";
    }
    return;
  }

  const signature = failedChecks.map((check) => check.key).join("|");
  firstFailedTargetId = failedChecks[0].targetId;
  renderResult(
    {
      eligibility: {
        ...eligibility,
        eligible: false,
        checks: eligibility.checks.filter((check) => check.passed !== null),
      },
      service,
      retirementAge,
      benefit: null,
    },
    {
      automatic: true,
      focus: signature !== automaticFailureSignature,
    },
  );
  automaticFailureSignature = signature;
}
```

- [ ] **Step 6: Render failed checks first with evidence**

Replace `renderResult` with this signature and ordering behavior while retaining the existing currency assignments:

```js
function renderResult(estimate, { automatic = false, focus = true } = {}) {
  const eligible = estimate.eligibility.eligible;
  result.classList.toggle("result--eligible", eligible);
  result.classList.toggle("result--ineligible", !eligible);
  result.dataset.mode = automatic ? "automatic" : "submitted";

  element("result-title").textContent = eligible
    ? "You appear eligible for the allowance"
    : "You do not appear eligible for the allowance";

  const failedCount = estimate.eligibility.checks.filter(
    (check) => check.passed === false,
  ).length;
  element("result-summary").textContent = eligible
    ? "Your entries pass every listed eligibility requirement."
    : failedCount +
      " known eligibility requirement" +
      (failedCount === 1 ? " did" : "s did") +
      " not pass. Change your answers if any entry is incorrect.";

  const checks = [...estimate.eligibility.checks].sort(
    (left, right) => Number(left.passed) - Number(right.passed),
  );
  const list = element("requirements-results");
  list.replaceChildren();
  for (const check of checks) {
    const item = document.createElement("li");
    item.className = check.passed
      ? "status status--pass"
      : "status status--fail";

    const icon = document.createElement("span");
    icon.className = "status-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = check.passed ? "✓" : "×";

    const copy = document.createElement("span");
    copy.className = "status-copy";
    const label = document.createElement("strong");
    label.textContent = check.label + (check.passed ? " — passed" : " — failed");
    const evidence = document.createElement("span");
    evidence.className = "status-evidence";
    evidence.textContent =
      "Your result: " + check.actual + ". Requirement: " + check.requirement + ".";
    copy.append(label, evidence);
    item.append(icon, copy);
    list.append(item);
  }

  benefitResults.hidden = !eligible;
  if (estimate.benefit) {
    element("biweekly-benefit").textContent = currency.format(
      estimate.benefit.biweekly,
    );
    element("annual-benefit").textContent = currency.format(
      estimate.benefit.annual,
    );
    element("total-benefit").textContent = currency.format(
      estimate.benefit.total,
    );
    element("allowance-coverage").textContent =
      "Covers " +
      estimate.coveredMonths +
      " months, from February " +
      estimate.coverage.startYear +
      " through the end of " +
      months[estimate.coverage.endMonth - 1] +
      " " +
      estimate.coverage.endYear +
      ".";
    element("breakdown-salary").textContent = currency.format(
      estimate.retirementSalary,
    );
    element("breakdown-service").textContent = serviceText(
      estimate.service.benefitServiceYears,
    );
    element("breakdown-months").textContent = String(estimate.coveredMonths);
  }

  result.hidden = false;
  if (focus) element("result-title").focus();
}
```

- [ ] **Step 7: Integrate the gate and concise preview status**

Change `renderPreview` to accept `announce = false`. After service calculation, call:

```js
const preview = buildEligibilityPreview(input, errors, service);
syncEligibilityGate(
  preview.eligibility,
  service,
  preview.retirementAge,
);
```

At the end of `renderPreview`, announce only settled changes:

```js
if (announce) {
  const updated = [];
  if (service) updated.push("service");
  if (creditableYears !== null) updated.push("creditable service");
  if (!hasAnyError(errors, salaryErrorKeys)) updated.push("salary");
  element("preview-status").textContent = updated.length
    ? "Updated " + updated.join(", ") + " estimates."
    : "";
}
```

Replace the form listeners with:

```js
form.addEventListener("input", () => renderPreview(false));
form.addEventListener("change", () => renderPreview(true));
```

- [ ] **Step 8: Correct radio-group error association and result actions**

In `showErrors`, replace the single-control assignment with all controls in the target:

```js
const controls = target.matches("input, select, button")
  ? [target]
  : [...target.querySelectorAll("input, select, button")];
const control = controls[0] ?? target;
```

Set `aria-invalid` and `aria-describedby` on every control:

```js
for (const itemControl of controls) {
  itemControl.setAttribute("aria-invalid", "true");
  itemControl.setAttribute("aria-describedby", errorId);
}
```

Add the Change answers handler before Start over:

```js
element("edit-answers").addEventListener("click", () => {
  result.hidden = true;
  const target = element(firstFailedTargetId);
  const control = target.matches("input, select, button")
    ? target
    : target.querySelector("input, select, button") ?? target;
  control.focus();
});
```

Update Start over to clear `automaticFailureSignature`, restore the allowance sections and calculate button, and then focus retirement year:

```js
automaticFailureSignature = "";
setHidden("benefit-service-section", false);
setHidden("salary-section", false);
setHidden("calculate-button", false);
```

- [ ] **Step 9: Run both test files and verify green**

Run:

```powershell
node --test tests/calculator.test.mjs tests/structure.test.mjs
```

Expected: all tests PASS with no warnings.

- [ ] **Step 10: Commit the interaction slice**

```powershell
git add -- app.mjs calculator.mjs tests/calculator.test.mjs tests/structure.test.mjs
git -c user.name=Codex -c user.email=codex@local commit -m "feat: show immediate allowance eligibility"
```

---

### Task 4: Full Verification and Browser Acceptance

**Files:**
- Verify: `index.html`
- Verify: `styles.css`
- Verify: `calculator.mjs`
- Verify: `app.mjs`
- Verify: `tests/*.test.mjs`

**Interfaces:**
- Consumes: Completed Tasks 1-3.
- Produces: Verified phase-one implementation ready for the separate Impeccable audit.

- [ ] **Step 1: Run the complete automated suite and syntax checks**

Run:

```powershell
node --test
node --check calculator.mjs
node --check app.mjs
git diff --check
```

Expected: every test passes; both syntax checks and `git diff --check` exit 0.

- [ ] **Step 2: Run the deterministic design detector**

Run:

```powershell
node C:\Users\ffhal\.agents\skills\impeccable\scripts\detect.mjs --json index.html
```

Expected: exit 0 with `[]`. If it returns findings, correct only findings caused by this implementation, rerun the relevant tests, and rerun the detector.

- [ ] **Step 3: Serve the static calculator locally**

Run in a background terminal:

```powershell
python -m http.server 8080
```

Record the process/session so it can be stopped after acceptance.

- [ ] **Step 4: Verify the immediate-failure paths**

At `http://127.0.0.1:8080/`, verify each path independently:

1. Choose No for regular LGERS retirement: the ineligible result appears immediately, allowance-only inputs hide, focus moves once, and Change answers returns to the radio.
2. Choose No for continuous GFD service: the same behavior occurs with the correct evidence.
3. Enter an age of 62 or older on retirement date: the result appears without salary inputs.
4. Complete service inputs below 50% GFD: actual percentage and 50% requirement are shown.
5. Complete service inputs below the unreduced-retirement threshold: actual age/service and qualifying threshold are shown.
6. Correct each failure: the result hides, allowance-only inputs return, and previously entered values remain.

Expected: no console errors, repeated focus jumps, or red passed text.

- [ ] **Step 5: Verify the eligible allowance path**

Use a complete eligible example and verify:

- The result heading receives focus.
- Gross biweekly allowance appears first and has modest emphasis.
- Annual and total allowance remain visible.
- The coverage sentence names February after retirement through the age-62 month.
- Every requirement shows actual and required evidence.
- The calculation breakdown values match the displayed estimates.
- Both handbook links open a new tab and leave entered values intact.

- [ ] **Step 6: Verify accessibility and responsive behavior**

Verify keyboard-only completion, Change answers, Start over, error-summary links, the visible assumptions marker, and no duplicate result announcement by DOM inspection. Inspect at 320px, 640px, and a wide desktop viewport with no horizontal scrolling or clipped text.

- [ ] **Step 7: Stop the local server and report cleanup**

Stop the exact recorded server session with Ctrl+C and verify port 8080 no longer listens.

- [ ] **Step 8: Inspect final scope**

Run:

```powershell
git status --short
git log --oneline -5
```

Expected: only the intentionally untracked `.impeccable/critique/` snapshot and `tmp/` render directory may remain; implementation files are committed. Do not add either untracked directory.

Report the final test count, commit IDs, detector result, browser-verification limitations, and readiness for the separate Impeccable audit.
