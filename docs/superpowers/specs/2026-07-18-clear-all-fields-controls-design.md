# Clear All Fields Controls Design

## Goal

Add two clearly labeled **Clear all fields** controls to the calculator form: one near the top of the form and one beside the primary calculation action. Both controls perform the same reset and recovery behavior.

## Placement and layout

- The top control appears immediately after the form's required-fields instruction and before the error summary.
- The bottom control appears in an action row beside **Calculate my allowance estimate**.
- Both use the existing secondary-button appearance and retain the existing 44-pixel minimum target size and focus treatment.
- The bottom action row wraps on narrow screens so neither label clips or causes horizontal scrolling.

## Behavior

- Activating either control resets form controls to their initial values, including the intentional zero-month defaults.
- It clears validation messages, derived previews, automatic or submitted results, and announcement state.
- It restores allowance-only sections and the Calculate button if an ineligibility result had hidden them.
- It restores conditional-field visibility from the reset selections and moves focus to the retirement-year field.
- It does not show a confirmation dialog.
- The existing **Start over** result action uses the same shared reset routine, avoiding three separate reset implementations.

## Implementation

- Add `clear-form-top` and `clear-form-bottom` buttons with `type="button"` inside the existing form.
- Extract the current **Start over** click-handler body into one small `resetCalculator()` function.
- Bind both new buttons and **Start over** to that function.
- Add only the minimal action-row CSS needed for side-by-side desktop layout and mobile wrapping.

## Error handling and accessibility

- Reset remains a deliberate button action; it does not run during ordinary form input or validation.
- Both controls use native buttons, visible labels, existing keyboard focus styles, and no custom role.
- Focus returns to the first form field after reset so keyboard and screen-reader users receive a predictable restart point.

## Verification

- Add an event-driven regression proving each new control invokes the shared reset behavior.
- Verify inputs/defaults, errors, previews, result mode, hidden sections, Calculate enabled state, and focus are reset.
- Run the complete Node test suite, module syntax checks, `git diff --check`, and the Impeccable detector.
- Publish `master`, then confirm the live page contains both controls.

## Out of scope

- No confirmation modal.
- No new dependency or reusable button component.
- No changes to eligibility thresholds, allowance math, or result wording.
