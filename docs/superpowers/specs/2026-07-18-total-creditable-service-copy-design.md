# Creditable Years and Preview Copy Design

## Goal

Clarify the service value used in the SSA calculation, keep calculated
previews visible without gray bars, and simplify several form defaults and
labels. The City-policy 50% eligibility calculation remains unchanged.

## Policy-verified 50% rule

The City of Greensboro Fire SSA policy requires at least 50% of total
creditable service to be service as a sworn Greensboro firefighter. The
calculator therefore continues to use:

`projected sworn GFD service / total calculated creditable service >= 0.50`

The numerator contains projected sworn GFD service only. The denominator is:

`projected GFD service + other LGERS service + sick-leave service credit`

Exact 50% passes. A separately entered service value is used only by the SSA
payment calculation and never changes this test, the 30-year test, or the
age-60/25-year test.

## Approved interface copy

The section heading is **Creditable years of service**. Directly below it,
always show:

> Projected GFD service + other LGERS service + sick-leave service credit =
> creditable years of service

The question and choices are:

- **Which creditable years of service should the SSA equation use?**
- **Use calculated creditable years of service**
- **Enter separate creditable years of service**

When the separate value is selected, its fieldset legend is **Creditable years
of service** and its clarification is:

> This value changes the SSA equation only, not eligibility.

The calculated preview is labeled **Creditable years of service used**. The
result breakdown is labeled **Creditable years of service**. Validation errors
also use “creditable years of service”; no user-facing “benefit service” wording
remains.

The primary form button reads **Submit**.

## Calculated previews

The existing preview rows and their calculated values remain. Their gray
background is removed so they sit on the white page; thin row dividers and the
existing label/value alignment remain.

Each preview updates independently as soon as its own required values are
valid:

- Service previews require the retirement year, GFD service, the other-LGERS
  choice and values when applicable, and sick-leave mode and hours.
- Creditable years used requires either a valid calculated service preview or
  valid separately entered years and months.
- Retirement salary requires the retirement year and the selected salary
  method's own inputs.

An incomplete later section must not clear an earlier valid calculation.
Before a preview has enough information, its value remains a dash. Input-time
previewing does not display validation errors; the existing Submit action still
shows the complete error summary.

## Input defaults and rank choices

Default these numeric month inputs to `0`:

- Current sworn GFD service months
- Other LGERS service months
- Separately entered creditable years of service months

Form reset restores those month fields to `0`.

The retirement-rank dropdown displays rank names only. Starting salaries remain
in the internal rank table and continue to drive the existing salary
calculation, but dollar values are not included in user-facing option labels.

## Behavior boundaries

The SSA multiplier, service projection, sick-leave conversion, salary raises,
eligibility rules, benefit amounts, and payment-duration calculations do not
change. Internal identifiers may retain existing names where they are not
user-facing; the terminology change does not justify calculation-layer churn.

Only `.derived-values` blocks beneath form inputs lose their gray background.
The eligible/ineligible result container and final payment breakdown retain
their current styling.

## Accessibility

The service equation is ordinary visible text immediately after the section
heading. Preview values remain in live regions and continue using semantic
definition lists. Removing the background does not remove labels, values,
dividers, focus treatment, error text, or screen-reader announcements.

## Verification and release

- Add failing tests for the approved terminology, SSA-equation wording, Submit
  label, zero month defaults, rank-only choices, and white preview styling.
- Add focused tests proving service and salary previews can update without a
  completely valid form.
- Retain the exact-50%, below-50%, other-LGERS, sick-credit, and manual-service
  eligibility coverage.
- Run the full Node suite and both module syntax checks.
- Run browser acceptance for progressive previews, reset defaults, submission,
  eligibility, and responsive layout.
- Push `master`, wait for GitHub Pages to build the exact commit, then verify the
  revised wording and calculations on the public site before handoff.
