# Calculator Math and Logic Hardening Design

Date: 2026-07-19  
Status: Approved

## Purpose

Complete a full logic review of the Local 947 Special Separation Calculator, correct every confirmed P1 and P2 arithmetic defect, and leave durable automated coverage for every meaningful input class and policy boundary.

The policies already supplied and approved by the product owner are authoritative for this calculator. This work verifies and implements those policies; it does not replace them with external interpretations.

## Scope

Correct five confirmed defects:

1. Fewer than eight total sick hours currently produce one creditable-service month.
2. Exact 25-year and 30-year composite service totals can fail eligibility because of floating-point representation.
3. An exact 50% GFD share can be calculated and displayed below 50% for the same reason.
4. Multi-year projected service does not implement the documented Excel `YEARFRAC(..., 1)` Actual/Actual method.
5. Whole-hour rounding in the projected-sick-hours preview can contradict the service credit calculated from the full-precision value.

Retain the approved age, eligibility, salary, allowance, payment-frequency, coverage-duration, validation, and privacy policies unchanged.

## Sick-leave policy

Use this exact calculator policy:

- Fewer than eight total sick hours produce zero service months.
- Eight total sick hours begin the first service month.
- Every complete 160-hour block produces one service month.
- After a complete 160-hour block, a remaining portion of at least one hour produces one additional service month.
- A remaining portion below one hour does not produce an additional month.

Equivalent calculation:

```text
if hours < 8:
  serviceMonths = 0
else:
  fullMonths = floor(hours / 160)
  remainingHours = hours - fullMonths * 160
  serviceMonths = fullMonths + (remainingHours >= 1 ? 1 : 0)
```

Required examples:

| Sick hours | Service months |
| ---: | ---: |
| 0 | 0 |
| 0.99 | 0 |
| 1 | 0 |
| 7.99 | 0 |
| 8 | 1 |
| 159.99 | 1 |
| 160 | 1 |
| 160.75 | 1 |
| 161 | 2 |
| 319.99 | 2 |
| 320 | 2 |
| 320.75 | 2 |
| 321 | 3 |

The rule remains centralized in `sickHoursToServiceMonths()` so the live preview, eligibility decision, and allowance calculation cannot diverge.

## Numeric boundary policy

Use one small, shared tolerance-aware comparison for derived floating-point service values. Apply it only where arithmetic composition can introduce representational noise:

- five years of projected GFD service;
- 25 and 30 years of creditable service;
- the 50% GFD-service share;
- sick-hour boundaries reached through projection math.

The tolerance must cover machine-level representation error without admitting a real input one month, one quarter-hour, or one day below a threshold. Compare the 50% rule by cross-multiplying GFD service and total service before applying the tolerance, avoiding an unnecessary division-based classification error.

Displayed eligibility evidence must use the same normalized values and classification as the decision.

## Excel Actual/Actual projection

Keep the approved `YEARFRAC(today, retirementDate, 1)` policy and make the implementation match Excel:

- Count actual UTC-normalized calendar days between the dates.
- For a range no longer than one year under Excel's definition, divide by 365 or 366 according to the applicable leap-day rules.
- For a longer range, divide by the average length of every calendar year crossed, including the start and end years.
- Equal or reversed dates remain invalid for this calculator and throw `RangeError`.

Future time continues to increase GFD service only. Other LGERS service remains fixed.

## Projected sick-hours preview

Continue calculating with the full-precision projected value. Display up to two decimal places instead of rounding to a whole hour so the preview does not imply a boundary the underlying value has not reached.

No currency-display behavior changes.

## Verification design

Use Node's built-in test runner and data-driven tests. “All possibilities” means every finite choice and discrete input domain, plus every meaningful boundary/equivalence class for numeric domains; it does not mean sampling arbitrary real numbers.

Required coverage:

- All service-month inputs from 0 through 11 and representative year values.
- Composite service totals one month below, exactly at, and one month above 5, 25, and 30 years.
- Exact, immediately-below, and immediately-above 50% GFD share assembled from separate GFD, other-service, and sick-service inputs.
- The full sick-hour boundary table above, negative rejection, repeated 160-hour blocks, and quarter-hour inputs across the supported range.
- Single-year, leap-year, February 29, multi-year, exact-anniversary, equal-date, reversed-date, and daylight-saving-independent Actual/Actual cases.
- Historical sick projection at zero, below the cap, exactly at the cap, above the cap, and with invalid worked service.
- All birth months and the age boundaries 59, 60, 61, and 62.
- Every Yes/No/missing eligibility choice combination and each independent eligibility failure.
- Every salary mode, every configured rank, zero/one/multiple July raises, and June 30/July 1/July 2 boundaries.
- Covered-month calculations for every birth month and the last eligible retirement year.
- Annual, biweekly, and total allowance identities with integer and fractional service/salary values.
- Every validation field's missing, nonnumeric, fractional, negative, lower-bound, and upper-bound classes where applicable.
- Integrated estimates proving the corrected sick rule and composite numeric boundaries affect preview, eligibility, and allowance output consistently.

Tests must reproduce each confirmed defect before the production fix, then pass after the minimal implementation.

## Delivery

Implement in an isolated `codex/` worktree using subagent-driven development:

1. One fresh implementer writes failing tests, applies the minimal production correction, and runs focused and full verification.
2. A fresh task reviewer checks policy compliance and test strength.
3. A fresh whole-branch reviewer checks the complete diff before merge.
4. Root reruns the full suite and syntax/diff checks, fast-forwards `master`, pushes, and verifies the cache-busted live HTML and JavaScript.

No new dependency, framework, abstraction layer, UI component, policy option, or unrelated refactor is permitted.
