# Progressive Calculator Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center and compact the form hierarchy, progressively reveal dependent inputs and summaries, align disclaimer copy/styling, and explain current sick-hour projection.

**Architecture:** Preserve the static HTML form and calculation module. Add IDs to the existing dependent regions and let the existing `updateConditionalFields()` / `renderPreview()` path own every visibility decision so input, change, reset, and automatic eligibility all remain consistent.

**Tech Stack:** Static HTML, CSS custom properties, JavaScript ES modules, Node.js built-in test runner.

## Global Constraints

- Do not change eligibility rules, sick-hour conversion, salary projection, allowance math, validation messages, or result behavior.
- Both disclaimer banners must use exactly: **Estimate only. Information provided by this calculator is an estimate only. It is not an official allowance determination.**
- Use existing Cool Surface, Cool Border, Soft Service Red, and Service Red tokens.
- Do not add dependencies, animation, new controls, or a wizard flow.
- Reset and Start over must return every dependent region to its initial hidden state.

---

### Task 1: Test and implement progressive visibility

**Files:**
- Modify: `tests/structure.test.mjs`
- Modify: `index.html`
- Modify: `app.mjs`

**Interfaces:**
- Consumes: `radioValue(name)`, `numberValue(id)`, `setHidden(id, hidden)`, `validateInput(input)`, `salaryErrorKeys`, and the existing form `input` / `change` listeners.
- Produces: DOM regions `sick-hours-field`, `service-preview`, `benefit-service-details`, and `salary-preview`; helper `hasNonnegativeInput(id): boolean`.

- [x] **Step 1: Add a failing event-driven visibility test**

Add a test that proves:

```js
assert.equal(fixture.get("sick-hours-field").hidden, true);
assert.equal(fixture.get("service-preview").hidden, true);
assert.equal(fixture.get("benefit-service-details").hidden, true);
assert.equal(fixture.get("salary-preview").hidden, true);

fixture.setRadio("sick-mode", "current");
fixture.form.dispatch("change", fixture.get("sick-mode-group"));
assert.equal(fixture.get("sick-hours-field").hidden, false);
assert.equal(fixture.get("service-preview").hidden, true);

fixture.get("sick-hours").value = "160";
fixture.form.dispatch("input", fixture.get("sick-hours"));
assert.equal(fixture.get("service-preview").hidden, false);

fixture.setRadio("benefit-service-mode", "manual");
fixture.form.dispatch("change", fixture.get("benefit-service-mode-group"));
assert.equal(fixture.get("benefit-service-details").hidden, false);
assert.equal(fixture.get("manual-service-fields").hidden, false);

fixture.setRadio("salary-mode", "anticipated");
fixture.form.dispatch("change", fixture.get("salary-mode-group"));
assert.equal(fixture.get("salary-preview").hidden, true);
fixture.get("retirement-year").value = "2030";
fixture.get("anticipated-salary").value = "100000";
fixture.form.dispatch("input", fixture.get("anticipated-salary"));
assert.equal(fixture.get("salary-preview").hidden, false);
```

Extend the existing reset test to require all four regions to return to `hidden === true`.

- [x] **Step 2: Run the focused tests and verify RED**

Run: `node --test --test-name-pattern "progressively reveals|complete reset" tests/structure.test.mjs`

Expected: FAIL because the new region IDs and visibility behavior do not exist.

- [x] **Step 3: Add the region IDs and initial hidden state**

Use the existing nodes rather than creating new components:

```html
<div id="sick-hours-field" class="field" hidden>...</div>
<dl id="service-preview" class="derived-values calculation-panel" hidden>...</dl>
<div id="benefit-service-details" class="calculation-panel" hidden>
  <fieldset id="manual-service-fields" hidden>...</fieldset>
  <dl class="derived-values">...</dl>
</div>
<dl id="salary-preview" class="derived-values calculation-panel" hidden>...</dl>
```

- [x] **Step 4: Implement all visibility decisions in the shared preview path**

Add:

```js
function hasNonnegativeInput(id) {
  const value = element(id).value.trim();
  return value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}
```

In `updateConditionalFields()`, show `sick-hours-field` only when a sick mode exists and show `benefit-service-details` only when a benefit-service mode exists. In `renderPreview()`, show `service-preview` when `hasNonnegativeInput("sick-hours")` and show `salary-preview` only when the selected salary path has no `salaryErrorKeys` errors.

- [x] **Step 5: Run focused tests and verify GREEN**

Run: `node --test --test-name-pattern "progressively reveals|complete reset" tests/structure.test.mjs`

Expected: both tests pass.

### Task 2: Test and implement the visual/copy polish

**Files:**
- Modify: `tests/structure.test.mjs`
- Modify: `index.html`
- Modify: `styles.css`

**Interfaces:**
- Consumes: Existing tokens `--surface`, `--border`, `--red-soft`, `--red`, `--radius-sm`, and `--space-*`.
- Produces: `.field--compact`, `.calculation-panel`, centered `.form-subheading`, matched `.estimate-notice` copy, and sick-projection assumption copy.

- [x] **Step 1: Add failing structural assertions**

Assert that the retirement field has `field field--compact`, all new summary regions have `calculation-panel`, both disclaimer asides normalize to identical text, and Calculation assumptions contains the approved sick-projection sentence.

- [x] **Step 2: Run the structural test and verify RED**

Run: `node --test --test-name-pattern "approved result order|visible and conditional" tests/structure.test.mjs`

Expected: FAIL because the compact field, matched banner copy, panel hooks, and assumption copy are missing.

- [x] **Step 3: Implement the minimal markup and CSS**

```css
.form-subheading { text-align: center; }
.field--compact { max-width: 18rem; }
.calculation-panel { padding: var(--space-3); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.estimate-notice { color: var(--red); background: var(--red-soft); border-color: var(--red); }
```

Replace the result disclaimer body with the exact top-banner copy and add the approved current-hours projection sentence to the assumptions list.

- [x] **Step 4: Run focused and full verification**

Run:

```powershell
node --test
node --check app.mjs
node --check calculator.mjs
git diff --check
node C:/Users/ffhal/.agents/skills/impeccable/scripts/detect.mjs --json index.html styles.css
```

Expected: 97 or more tests pass, syntax and whitespace checks exit 0, and the detector reports no new findings.

- [x] **Step 5: Render desktop/mobile states and publish**

Capture 1440px and 390px views covering initial, selected, complete, and reset states; verify no horizontal overflow. Commit only the source, test, spec, and plan files, push `master`, then confirm the live page contains the new region IDs, exact disclaimer copy twice, and the sick-projection assumption.

## Self-review

- Spec coverage: Tasks 1 and 2 cover all seven requested changes, identical disclaimer copy, reset behavior, and deployment verification.
- Placeholder scan: no TBD, TODO, or unspecified behavior remains.
- Interface consistency: all named IDs and `hasNonnegativeInput()` are defined once and used by the existing shared render path.
