# Clear All Fields Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add top and bottom Clear all fields controls that reuse the calculator's complete reset behavior.

**Architecture:** Keep reset ownership in `app.mjs` by extracting the existing Start over handler into one `resetCalculator()` function. Two native buttons inside the form and the existing result action call that function; a small flex action layout handles desktop and mobile placement.

**Tech Stack:** Semantic HTML, CSS, native ES modules, Node's built-in test runner.

## Global Constraints

- The top control appears after the required-fields instruction and before the error summary.
- The bottom control appears beside Calculate on wide screens and wraps safely on narrow screens.
- Reset returns controls to initial defaults, including zero-month defaults, and clears errors, previews, results, announcements, and failure state.
- Reset restores conditional sections, enables Calculate, and focuses retirement year.
- No confirmation dialog, dependency, reusable component, policy-math change, or result-copy change.

---

### Task 1: Add and publish the shared clear-fields controls

**Files:**
- Modify: `index.html:76-82,478-489`
- Modify: `styles.css:314-345,464-468,494-533`
- Modify: `app.mjs:526-549`
- Test: `tests/structure.test.mjs:13-32,308-344`

**Interfaces:**
- Consumes: Existing `form`, `clearErrors()`, `clearPreview()`, `setHidden()`, `updateConditionalFields()`, and `element()` functions.
- Produces: `resetCalculator(): void`, plus `clear-form-top` and `clear-form-bottom` button IDs.

- [ ] **Step 1: Write the failing structure and controller regression**

Add both button IDs to `controlTags`:

```js
"clear-form-top": "button",
"clear-form-bottom": "button",
```

Add a test that first asserts the two placements exist and then exercises both real click handlers:

```js
test("top and bottom Clear all fields controls share the complete reset", async (t) => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  assert.match(html, /id="clear-form-top"[\s\S]*Clear all fields/);
  assert.match(
    html,
    /id="calculate-button"[\s\S]*id="clear-form-bottom"[\s\S]*Clear all fields/,
  );

  const fixture = await controllerFixture();
  t.after(fixture.cleanup);

  for (const id of ["clear-form-top", "clear-form-bottom"]) {
    fixture.setEligibilityInputs("1");
    fixture.get("result").hidden = false;
    fixture.get("result").dataset.mode = "automatic";
    fixture.get("benefit-service-section").hidden = true;
    fixture.get("salary-section").hidden = true;
    fixture.get("calculate-button").hidden = true;
    fixture.get("calculate-button").disabled = true;

    fixture.get(id).dispatch("click");

    assert.equal(fixture.get("retirement-year").value, "");
    assert.equal(fixture.get("gfd-months").value, "0");
    assert.equal(fixture.get("result").hidden, true);
    assert.equal(fixture.get("result").dataset.mode, "");
    assert.equal(fixture.get("benefit-service-section").hidden, false);
    assert.equal(fixture.get("salary-section").hidden, false);
    assert.equal(fixture.get("calculate-button").hidden, false);
    assert.equal(fixture.get("calculate-button").disabled, false);
    assert.equal(fixture.document.activeElement, fixture.get("retirement-year"));
  }
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```powershell
node --test --test-name-pattern "top and bottom Clear all fields" tests/structure.test.mjs
```

Expected: FAIL because the two button IDs and handlers do not exist.

- [ ] **Step 3: Add the two controls and the minimal responsive action layout**

Add the top action immediately after the required-fields note:

```html
<div class="form-top-actions">
  <button id="clear-form-top" class="secondary-button" type="button">
    Clear all fields
  </button>
</div>
```

Wrap the final actions:

```html
<div class="form-actions">
  <button id="calculate-button" class="primary-button" type="submit">
    Calculate my allowance estimate
  </button>
  <button id="clear-form-bottom" class="secondary-button" type="button">
    Clear all fields
  </button>
</div>
```

Add the smallest layout rules:

```css
.form-top-actions,
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.form-top-actions {
  justify-content: flex-end;
  margin-block-end: var(--space-3);
}

.form-actions .primary-button {
  flex: 1 1 22rem;
  width: auto;
}

@media (max-width: 640px) {
  .form-top-actions > button,
  .form-actions > button {
    width: 100%;
  }
}
```

- [ ] **Step 4: Reuse one reset function for all three controls**

Replace the existing Start over listener with:

```js
function resetCalculator() {
  form.reset();
  clearErrors();
  clearPreview();
  element("preview-status").textContent = "";
  result.hidden = true;
  result.dataset.mode = "";
  automaticFailureFocused = false;
  firstFailedTargetId = null;
  setHidden("benefit-service-section", false);
  setHidden("salary-section", false);
  setHidden("calculate-button", false);
  element("calculate-button").disabled = false;
  updateConditionalFields();
  element("retirement-year").focus();
}

for (const id of ["clear-form-top", "clear-form-bottom", "start-over"]) {
  element(id).addEventListener("click", resetCalculator);
}
```

- [ ] **Step 5: Run focused and full verification**

Run:

```powershell
node --test --test-name-pattern "top and bottom Clear all fields" tests/structure.test.mjs
node --test
node --check app.mjs
node --check calculator.mjs
git diff --check
node C:\Users\ffhal\.agents\skills\impeccable\scripts\detect.mjs --json index.html styles.css
```

Expected: the focused regression passes, all tests pass, syntax and diff checks exit 0, and the detector reports no new P1/P2 findings. The two existing P3 type-ramp advisories may remain.

- [ ] **Step 6: Commit and publish**

```powershell
git add index.html styles.css app.mjs tests/structure.test.mjs
git commit -m "feat: add clear all fields controls"
git push origin master
```

After GitHub Pages updates, request the live calculator with a cache-busting query and verify both `clear-form-top` and `clear-form-bottom` are present.
