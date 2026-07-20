# Streamlined Salary Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the redundant salary-record confirmation step, rename the structured salary choice, and show a green search-ready state without changing salary mapping or calculator results.

**Architecture:** Keep the existing ArcGIS fetch, local matching, and mapping functions unchanged. Update the existing controller so a result click applies the same field writes formerly performed by the confirmation button, and derive the search button's visual state directly from the existing two-character validation rule.

**Tech Stack:** Static HTML, CSS with existing OKLCH tokens, browser-native JavaScript modules, Node's built-in test runner.

## Global Constraints

- The structured salary choice label must be exactly **Use my salary now**.
- The search-ready state begins at the existing two-alphanumeric-character minimum.
- Clicking a mappable result must fill only the current rank and current step or current annual salary, exactly as today.
- Imported fields remain visible and editable.
- Unmappable records change no calculator fields and retain the manual-entry fallback.
- Add no dependency, backend, storage, or new salary inference.
- Preserve WCAG 2.2 AA focus, touch-target, contrast, live-status, and non-color selection cues.

---

### Task 1: Labels and search-ready state

**Files:**
- Modify: `index.html:482-595`
- Modify: `styles.css:1-410`
- Modify: `app.mjs:123-140, 829-861, 918-930`
- Test: `tests/structure.test.mjs:318-340, 739-817`

**Interfaces:**
- Consumes: `#employee-name-search`, `#search-current-records`, and the existing two-alphanumeric-character search rule.
- Produces: `data-search-ready="true|false"` on `#search-current-records`.

- [ ] **Step 1: Write failing structure and controller assertions**

Update the static HTML expectations to require `Use my salary now`. Add controller assertions that dispatch `input` on `#employee-name-search` and expect `search-current-records.dataset.searchReady` to remain `"false"` for one alphanumeric character, become `"true"` for two, and return to `"false"` after reset. Add a CSS assertion for `#search-current-records[data-search-ready="true"]`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/structure.test.mjs`

Expected: FAIL because the old label remains and no `data-search-ready` behavior or green selector exists.

- [ ] **Step 3: Implement the minimum interface change**

In `index.html`, replace the structured salary choice text with `Use my salary now`.

In `app.mjs`, add and reuse:

```js
function hasSearchableEmployeeName(value) {
  return value.replace(/[^a-z0-9]/gi, "").length >= 2;
}

function updateSalarySearchButton() {
  element("search-current-records").dataset.searchReady = String(
    hasSearchableEmployeeName(element("employee-name-search").value),
  );
}
```

Use `hasSearchableEmployeeName(query)` in the existing click validation, listen for `input` on the name field, initialize the state once, and call `updateSalarySearchButton()` during reset.

In `styles.css`, add dark-green and hover tokens with white-text contrast, then style only the ready state:

```css
#search-current-records[data-search-ready="true"] {
  color: var(--white);
  background: var(--search-ready);
  border-color: var(--search-ready);
}

#search-current-records[data-search-ready="true"]:hover {
  background: var(--search-ready-hover);
  border-color: var(--search-ready-hover);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/structure.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- index.html styles.css app.mjs tests/structure.test.mjs
git commit -m "feat: clarify salary lookup actions"
```

### Task 2: Import immediately from a selected match

**Files:**
- Modify: `index.html:574-597`
- Modify: `styles.css:396-410`
- Modify: `app.mjs:26-30, 374-441, 863-929`
- Test: `tests/structure.test.mjs:19-40, 318-340, 739-1075`

**Interfaces:**
- Consumes: `mapEmployeeSalaryRecord(record)` and the existing result button click.
- Produces: the same `current-rank`, `current-step`, or `current-exempt-salary` values previously written by `#use-salary-record`.

- [ ] **Step 1: Write failing immediate-import assertions**

Remove confirmation IDs from static expectations and assert that the HTML does not contain `salary-lookup-confirmation` or `use-salary-record`. Change the successful controller test so clicking the result button immediately expects `current-rank === "f02"`, `current-step === "1"`, visible current fields, and the existing editable-success status. Change the unmappable test to assert that clicking its result leaves `current-rank` empty. Update reset coverage to select a result without dispatching a confirmation click.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/structure.test.mjs`

Expected: FAIL because result selection still waits for `#use-salary-record` and confirmation markup remains.

- [ ] **Step 3: Remove confirmation and reuse the existing import writes**

Delete the confirmation block from `index.html` and `.salary-lookup-confirmation` from `styles.css`. Remove `selectedSalaryRecord` and `selectedSalaryMapping` state and every confirmation/reset reference from `app.mjs`.

Inside `showSalaryRecord(record, selectedButton)`, preserve the selected button's visible `Selected` text and `aria-pressed` state, then map and apply immediately:

```js
const mapping = mapEmployeeSalaryRecord(record);
if (!mapping) {
  element("salary-lookup-status").textContent =
    "We found your record but couldn't match it confidently. Enter your rank and salary yourself.";
  return;
}

salaryLookupConfirmed = true;
element("current-rank").value = mapping.currentRank;
populateStepChoices(mapping.currentRank);
element("current-step").value = mapping.currentStep
  ? String(mapping.currentStep)
  : "";
element("current-exempt-salary").value = mapping.currentSalary ?? "";
renderPreview(true);
element("salary-lookup-status").textContent =
  "Current rank and salary filled. Review or edit them before calculating.";
element("current-rank").focus();
```

Update the guarded-submit message to remove the word `confirm`.

- [ ] **Step 4: Run the focused and complete tests**

Run: `node --test tests/structure.test.mjs`

Expected: PASS.

Run: `node --test`

Expected: all tests PASS with zero failures.

Run: `node --check app.mjs` and `node --check calculator.mjs`

Expected: both exit 0.

- [ ] **Step 5: Commit**

```powershell
git add -- index.html styles.css app.mjs tests/structure.test.mjs
git commit -m "feat: import selected salary record immediately"
```

### Task 3: Merge and deploy

**Files:**
- No source changes.

**Interfaces:**
- Consumes: the verified feature branch.
- Produces: updated `master` and the GitHub Pages site.

- [ ] **Step 1: Verify branch and diff hygiene**

Run: `git diff --check c5fc0b3..HEAD` and `git status --short`

Expected: no diff errors and no feature files left uncommitted.

- [ ] **Step 2: Merge locally and rerun verification on `master`**

Fast-forward the feature branch into `master`, then run `node --test`, `node --check app.mjs`, and `node --check calculator.mjs`.

Expected: all tests pass and both syntax checks exit 0.

- [ ] **Step 3: Deploy and verify live output**

Push `master` to `origin`, wait for the GitHub Pages build for the pushed commit to report `built`, and verify the live HTML contains `Use my salary now` with no confirmation markup. Verify the live JavaScript contains `dataset.searchReady` behavior and no `use-salary-record` handler.
