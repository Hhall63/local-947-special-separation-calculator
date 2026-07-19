# Sick Leave and Salary Projection Design

## Goal

Improve the allowance estimate by projecting sick leave from each member's actual historical bank growth and by reproducing the City of Greensboro FY 2025-2026 sworn-fire salary structure for nonexempt and exempt members.

## Scope

- Replace the 96-hour sick projection cap with the member's uncapped historical net rate.
- Replace the generic 4% salary projection and starting-rank projection with a table-driven structured salary estimate.
- Retain anticipated retirement salary as a manual override.
- Support the member's current rank and one expected promotion to the rank anticipated at retirement.
- Add an accessible salary-structure dialog within the existing calculator design.
- Do not change eligibility rules, sick-hour-to-service conversion, benefit-service choice, allowance multiplier, or result calculations.

## Sick leave projection

When the member enters current sick hours:

```text
historical yearly net rate = current sick hours / completed GFD and other LGERS service years
projected retirement sick hours = current sick hours + historical yearly net rate * remaining service years
```

The rate has no maximum. It reflects the member's historical combination of earned sick leave, sick usage, and vacation or holiday leave rolled into the sick bank. The existing requirement for positive completed service remains. Entering sick hours expected at retirement continues to bypass projection.

The assumptions text will explain this calculation without referring to a 96-hour cap.

## Salary source

The active source is **City of Greensboro FY 2025-2026 Fire Sworn Salary Structure, effective October 15, 2025**. It remains active until manually replaced.

### Nonexempt step values

| Grade | Rank | Steps | Progression maximum |
| --- | --- | --- | --- |
| F01 | Fire Fighter | 49,724; 51,713; 53,782; 55,933; 58,170 | Step 5 |
| F02 | Fire Fighter Sr | 56,434; 58,691; 61,039; 63,481; 66,020; 68,661; 71,407; 74,263 | Step 8 |
| F04 | Sr Fire Inspector / Fire Engineer | 66,980; 69,660; 72,446; 75,344; 78,358; 81,492; 84,752; 88,142 | Step 8 |
| F05 | Fire Captain / Asst Fire Marshal | 80,327; 83,540; 86,882; 90,357; 93,972; 97,730; 101,640; 105,705 | Step 8 |

The published Range Maximum is shown in the dialog for reference but is not an automatic step: F02 83,013; F04 98,527; F05 118,160.

### Exempt ranges

| Grade | Rank | Range Min | Green Zone Min | Control Point | Green Zone Max | Range Max |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| F06 | Battalion Chief / Deputy Fire Marshal | 77,303 | 94,040 | 101,714 | 123,751 | 138,331 |
| F07 | Assistant Fire Chief / Fire Marshal | 98,948 | 120,373 | 130,195 | 158,402 | 177,065 |
| F08 | Deputy Fire Chief | 111,297 | 135,395 | 146,443 | 178,170 | 199,162 |
| F09 | Fire Chief | 148,113 | 180,183 | 194,886 | 237,109 | 265,045 |

## Structured salary rules

### Starting information

- A nonexempt member selects current rank and current step.
- An exempt member selects current rank and enters actual current annual salary.
- If the current or expected retirement rank is exempt, the member can edit an expected annual merit rate that defaults to 4%.
- The expected retirement rank may match the current rank or represent one future promotion.
- A different retirement rank requires an expected promotion month and year and must be above the current grade.

### Annual progression

- November 1 is the estimated annual raise date because City Hall's actual raise-release dates vary.
- Each November 1 strictly after the projection base date and strictly before the January 31 retirement date applies one progression.
- Nonexempt members advance one step and stop at Step 5 for F01 or Step 8 for F02-F05.
- Exempt members receive the entered merit percentage and stop at the rank's Green Zone Maximum.
- A zero merit percentage is valid. Negative percentages are invalid.
- Existing exempt salaries above Green Zone Maximum are not reduced; they remain unchanged unless a promotion occurs.

### Promotion

- Only one expected promotion is supported.
- Promotion must occur after today and before retirement.
- A promotion into a nonexempt rank starts at the published step closest to 105% of salary immediately before promotion. An exact tie chooses the higher step.
- Every promotion into an exempt rank starts at that rank's Green Zone Minimum.
- A promotion on November 1 sets the promotional salary only; annual progression begins on the following November 1.
- After promotion, progression uses the target rank's step ceiling or Green Zone Maximum.

### Projection result

The structured preview shows:

- Projected retirement salary.
- Final nonexempt step or exempt salary.
- The date on which the member reaches the applicable maximum, including a promotion date that lands directly on the final step.
- **Already at maximum** when the starting value is at the ceiling.
- **Does not reach maximum before retirement** when the ceiling is not reached during the projection.

The manual anticipated-retirement salary path continues to use the entered amount directly and does not show step or maximum details.

## Salary-section interface

The salary section retains two choices:

1. **Enter anticipated salary at retirement**
2. **Project from FY 2025-2026 salary structure**

The structured path uses progressive disclosure:

- Show current rank first.
- Show current step only for nonexempt ranks.
- Show current salary only for exempt ranks.
- Show expected retirement rank after current-rank information is valid.
- Show promotion date only when retirement rank differs.
- Show merit percentage when either the current or retirement rank is exempt.
- Show the existing gray projection panel only when all required salary data is valid.

The section includes a **View FY 2025-2026 salary structure** button beside the source effective date. It opens a native modal dialog containing responsive, accessible HTML tables for nonexempt steps and exempt ranges plus short progression notes. The dialog uses the existing navy, red, gold, Cool Surface, Cool Border, typography, spacing, button, focus, and border-radius rules. It introduces no new visual system, shadows, or animation.

On narrow screens, each table scrolls horizontally inside its own labeled region without causing page-level horizontal overflow. The dialog has a visible Close button, closes with Escape, and restores focus to the opening button.

## Validation and errors

- Structured mode requires current rank and retirement rank.
- Nonexempt current rank requires a valid published step.
- Exempt current rank requires a positive current salary not above Range Maximum.
- Merit rate must be finite and at least 0%.
- A changed retirement rank requires a valid future promotion month/year before retirement.
- Retirement rank must not be below current rank.
- All errors continue through the existing summary, inline message, focus, and `aria-describedby` behavior.
- Reset and Start over clear the new inputs, close the dialog if open, and restore the salary section's initial hidden state.

## Assumptions copy

The assumptions section will state:

- Current sick hours are projected using the member's uncapped historical net rate based on current sick hours and completed GFD and other LGERS service.
- November 1 is used as the estimated annual raise date because the dates City Hall releases raises vary.
- Salary values come from the FY 2025-2026 structure effective October 15, 2025 and remain in use until the calculator is manually updated.
- Nonexempt progression stops at Step 5 for F01 or Step 8 for F02-F05.
- Exempt merit defaults to 4%, is editable and discretionary, and stops at Green Zone Maximum.
- Every modeled promotion into an exempt rank starts at Green Zone Minimum.
- Actual pay actions and salary structures may differ; the calculator remains an estimate only.

## Code boundaries

- Keep salary-structure constants and pure projection functions in `calculator.mjs` so the calculation and dialog share one data source.
- Keep DOM collection, conditional visibility, dialog population, preview rendering, reset, and validation display in `app.mjs`.
- Keep semantic form and dialog markup in `index.html` and reuse existing CSS tokens in `styles.css`.
- Add no dependency and no career-timeline abstraction. The model handles current rank plus at most one expected promotion.

## Verification

- Unit-test uncapped sick projection, every nonexempt step ceiling, November 1 boundaries, closest-step promotion including tie behavior, exempt merit compounding, Green Zone Maximum caps, promotion-day handling, and maximum-date messages.
- Validate all new input modes and invalid rank, step, salary, merit-rate, and promotion combinations.
- Browser-test progressive disclosure, preview content, dialog open/close/focus restoration, reset behavior, and error wiring.
- Structurally test the active table values, effective date, assumptions wording, and reuse of established visual hooks.
- Run the complete Node test suite, JavaScript syntax checks, whitespace validation, Impeccable design detection, and desktop/mobile browser checks before pushing `master`.
- Verify the live GitHub Pages response contains the new salary mode, source date, dialog, uncapped sick explanation, and projection-result fields.
