# Salary Lookup Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the salary prediction choices and make employee lookup the default every time the prediction path is selected.

**Architecture:** Keep the existing nested native radio groups and controller flow. Update static copy and defaults in `index.html`, then extend the existing form change handler so only a change to the structured salary mode reselects lookup before rendering.

**Tech Stack:** Static HTML, browser-native JavaScript modules, Node's built-in test runner.

## Global Constraints

- The salary mode label must be exactly **Predict from my current salary**.
- The lookup choice label must be exactly **Look up my information**.
- Selecting the structured salary mode must select lookup every time.
- Manual salary entry must remain selectable until the user leaves and returns to the structured salary mode.
- Do not change lookup, projection, validation, calculation, privacy, or reset behavior.
- Add no dependency or new abstraction.

---

### Task 1: Rename and default the salary lookup flow

**Files:**
- Modify: `index.html:480-535`
- Modify: `app.mjs:872-880`
- Test: `tests/structure.test.mjs:190-210, 311-345, 730-790`

**Interfaces:**
- Consumes: existing `salary-mode` and `current-entry-mode` native radio groups.
- Produces: `current-entry-mode === "lookup"` whenever `salary-mode` changes to `structure`.

- [ ] **Step 1: Write the failing regression checks**

Change the static HTML expectations to require the two new labels and require `checked` on the lookup radio instead of the manual radio. Add a controller test that selects `structure`, manually changes to `manual`, switches to `anticipated`, and selects `structure` again; assert lookup is selected after each structured-mode selection while manual remains selected until the user leaves that mode.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/structure.test.mjs`

Expected: FAIL because the old labels and manual checked default remain, and returning to structured mode does not reselect lookup.

- [ ] **Step 3: Apply the minimum implementation**

In `index.html`, replace the two labels and move `checked` from the manual current-entry radio to the lookup radio.

In the existing form `change` listener, detect a checked `salary-mode` radio with value `structure`, then select only the `current-entry-mode` radio whose value is `lookup` before calling `renderPreview(true)`:

```js
form.addEventListener("change", (event) => {
  if (
    event.target.name === "salary-mode" &&
    event.target.value === "structure" &&
    event.target.checked
  ) {
    for (const input of element("current-entry-mode-group").querySelectorAll("input")) {
      input.checked = input.value === "lookup";
    }
  }
  renderPreview(true);
});
```

- [ ] **Step 4: Run focused and complete verification**

Run: `node --test tests/structure.test.mjs`

Expected: all structure tests PASS.

Run: `node --test`

Expected: 120 or more tests PASS with zero failures.

Run: `node --check app.mjs` and `node --check calculator.mjs`

Expected: both commands exit 0.

- [ ] **Step 5: Review and commit**

Run: `git diff --check` and review the diff against `docs/superpowers/specs/2026-07-19-salary-lookup-default-design.md`.

Commit only the design, plan, implementation, and regression test files.

### Task 2: Publish and verify

**Files:**
- No source changes.

**Interfaces:**
- Consumes: verified `master` commit.
- Produces: updated GitHub Pages site.

- [ ] **Step 1: Push the verified commit**

Run: `git push origin master`

Expected: `master` advances to the new commit.

- [ ] **Step 2: Verify the live site**

Wait for the Pages deployment for the pushed commit, then verify the live `index.html` contains both new labels and the lookup checked default. Verify live `app.mjs` contains the structured-mode reselection condition.
