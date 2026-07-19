# Calculator Section Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the calculator form read as a deliberate three-stage worksheet and rename its two sick-service preview labels.

**Architecture:** Keep the single native HTML form and existing JavaScript IDs unchanged. Add static semantic stage markup and lightweight CSS that uses existing tokens; expand the existing structure test to protect the visible copy and hierarchy.

**Tech Stack:** Static HTML, CSS custom properties, Node.js built-in test runner.

## Global Constraints

- Do not change eligibility rules, allowance math, form validation, result behavior, or data storage.
- Use existing Local 947 color, spacing, radius, focus, and reduced-motion tokens only.
- Do not add dependencies, cards, shadows, gradients, decorative animation, or custom controls.
- Use these exact labels: **Total Creditable Service** and **Sick hours to Creditable Service**.

---

### Task 1: Add worksheet stages and protect the revised copy

**Files:**
- Modify: `index.html:73-420`
- Modify: `styles.css:117-175`
- Modify: `tests/structure.test.mjs:691-720`

**Interfaces:**
- Consumes: Existing `#calculator-form`, `.form-section`, `.form-subheading`, `.derived-values`, and every calculator input ID.
- Produces: Static `.form-stages`, `.section-heading`, `.step-number`, and `.form-group` hooks; no JavaScript API changes.

- [ ] **Step 1: Extend the structural test with the new required content**

```js
for (const fragment of [
  "Eligibility",
  "Creditable service",
  "Allowance estimate",
  "Total Creditable Service",
  "Sick hours to Creditable Service",
]) {
  assert.ok(normalizedHtml.includes(fragment), "Missing worksheet copy: " + fragment);
}

assert.match(html, /<ol class="form-stages" aria-label="How the estimate is built">/);
assert.match(html, /class="section-heading"/);
assert.match(html, /class="form-group"/);
```

- [ ] **Step 2: Run the focused test and verify it fails before the markup changes**

Run: `node --test --test-name-pattern "uses approved creditable-service copy and defaults" tests/structure.test.mjs`

Expected: FAIL because the stage markup and requested labels do not yet exist.

- [ ] **Step 3: Add minimal semantic worksheet markup and the two requested labels**

Insert this directly after the existing required-fields message and before the top clear button:

```html
<ol class="form-stages" aria-label="How the estimate is built">
  <li><span class="step-number">1</span><span><strong>Eligibility</strong><small>Retirement date and qualifying service</small></span></li>
  <li><span class="step-number">2</span><span><strong>Creditable service</strong><small>Service used to determine the allowance</small></span></li>
  <li><span class="step-number">3</span><span><strong>Allowance estimate</strong><small>Salary and estimated payment</small></span></li>
</ol>
```

Wrap each of the three current form sections in its existing section element with a `.section-heading` containing the matching step number, `h2`, and one-sentence purpose. Wrap the three working groups in the first section with `.form-group` divs; keep every existing input, fieldset, ID, name, and `aria-*` attribute intact. Replace only:

```html
<dt>Sick service</dt>
<dt>Eligibility service</dt>
```

with:

```html
<dt>Sick hours to Creditable Service</dt>
<dt>Total Creditable Service</dt>
```

- [ ] **Step 4: Add token-based hierarchy styles**

Add styles that make `.form-stages` a three-column grid on wide screens and a stacked list at `640px` or below. Use `.step-number` for a compact navy square/rounded marker, `.section-heading` for heading-plus-purpose alignment, and `.form-group` for a top rule and tokenized vertical spacing. Do not apply backgrounds, shadows, or large radii to `.form-group`.

```css
.form-stages { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); }
.form-stages li, .section-heading { display: grid; grid-template-columns: auto 1fr; gap: var(--space-2); }
.step-number { display: grid; place-items: center; inline-size: 2rem; block-size: 2rem; color: var(--white); background: var(--navy); border-radius: var(--radius-sm); font-weight: 700; }
.form-group { margin-block-start: var(--space-4); padding-block-start: var(--space-4); border-block-start: 1px solid var(--border); }
```

- [ ] **Step 5: Run focused and full verification**

Run:

```powershell
node --test --test-name-pattern "uses approved creditable-service copy and defaults" tests/structure.test.mjs
node --test
node --check app.mjs
git diff --check
node C:/Users/ffhal/.agents/skills/impeccable/scripts/detect.mjs --json index.html styles.css
```

Expected: all tests pass, JavaScript syntax passes, no whitespace errors, and the detector reports no new quality rule hits.

- [ ] **Step 6: Capture desktop and mobile screenshots**

Use the existing static-server/browser workflow to capture 1440px and 390px widths. Confirm that the stage guide, long labels, grouped preview rows, and buttons wrap without horizontal overflow.

- [ ] **Step 7: Commit the focused implementation**

```powershell
git add index.html styles.css tests/structure.test.mjs docs/superpowers/specs/2026-07-19-calculator-section-hierarchy-design.md docs/superpowers/plans/2026-07-19-calculator-section-hierarchy.md
git commit -m "feat: clarify calculator form sections"
```

## Self-review

- Spec coverage: Task 1 covers the three stages, the dense first-stage groupings, both requested labels, accessibility, responsive behavior, and every verification item.
- Placeholder scan: no TBD, TODO, or unspecified implementation action remains.
- Type consistency: no JavaScript types or interfaces change; the plan preserves all current DOM IDs and form-control names.
