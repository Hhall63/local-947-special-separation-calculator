# Calculator Section Hierarchy Design

## Goal

Make the calculator read as a deliberate three-stage worksheet without changing eligibility rules, allowance math, fields, or the established Local 947 visual system.

## Direction

Use the existing flat "Union Desk" style. The calculator keeps its navy, gold, white, and red roles; its native form controls; and its single-column flow. The improvement is structural rather than decorative:

1. Add a compact three-stage guide before the questions: **Eligibility**, **Creditable service**, and **Allowance estimate**.
2. Give each matching form section a small stage marker, a concise purpose statement, and consistent section spacing/rules.
3. Divide the first dense stage into visibly named working groups: retirement date and age, eligibility questions, and service and sick leave.
4. Keep calculated-value rows as a worksheet table, but use clear pending language rather than unlabeled dashes where appropriate.

The stage numbers are intentional: they describe the real calculation sequence rather than serving as decorative scaffolding.

## Requested Copy

- Change **Eligibility service** to **Total Creditable Service**.
- Change **Sick service** to **Sick hours to Creditable Service**.

## Accessibility and responsive behavior

- The guide is a concise ordered list with the current stage represented in plain text; it does not become a custom navigation control.
- Existing headings, fieldsets, legends, labels, focus treatment, touch targets, and validation behavior remain intact.
- Stage guidance wraps cleanly on narrow screens; it adds no horizontal scrolling or desktop-only dependence.

## Out of scope

- No calculation, validation, result, or persistence changes.
- No new dependencies, cards, shadows, gradients, decorative animation, or redesigned controls.
- No changes to benefit terminology outside the two specified labels and supporting stage descriptions.

## Verification

- Extend the structural test to assert the revised labels and stage hierarchy.
- Run the Node test suite, syntax checks, `git diff --check`, and the existing design detector.
- Capture desktop and mobile browser screenshots to check grouping, wrapping, focus, and horizontal overflow.
