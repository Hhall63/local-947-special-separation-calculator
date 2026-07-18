# Total Creditable Service Copy Design

## Goal

Replace the calculator's user-facing “Benefit service” terminology with
“Total creditable service” and define the term where every user can see it.

## Approved interface copy

The section heading is **Total creditable service**. Directly below it, always
show this concise equation:

> Projected GFD service + other LGERS service + sick-leave service credit =
> total creditable service

The two choices are:

- **Use calculated total creditable service**
- **Enter a separate total creditable service value**

When the separate value is selected, retain the clarification:

> This value changes the payment equation only, not eligibility.

The derived value and result breakdown are labeled **Total creditable service
used** and **Total creditable service**, respectively. Validation errors also
use the new terminology.

## Behavior

This is a copy-only change. The calculated value remains projected GFD service
plus other LGERS service plus sick-leave service credit. A separately entered
value continues to affect only the payment equation; it does not affect the
30-year test, the age-60/25-year test, or the 50% GFD-service test.

Internal identifiers and calculation function names remain unchanged to avoid
unnecessary code churn.

## Accessibility and layout

The equation is ordinary visible text immediately after the section heading,
so it is available to visual and screen-reader users without opening help text
or selecting a mode. It uses the existing hint styling and responsive layout.

## Verification

- Add a structure test for the heading, equation, choice labels, and result
  labels.
- Update validation-message tests for the new terminology where applicable.
- Run the full Node test suite and module syntax checks.
- Push `master`, wait for GitHub Pages to build the exact commit, then verify
  the new equation on the live site.
