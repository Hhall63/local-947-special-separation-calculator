# Local 947 Special Separation Calculator Design

Date: 2026-07-17
Status: Approved design

## Purpose

Build a standalone, browser-only calculator titled **Local 947 Special Separation Calculator** for active sworn Greensboro firefighters. A firefighter should be able to complete it without assistance in about three minutes and understand:

- Whether they appear eligible for the Fire SSA
- Every reason they do or do not appear eligible
- Their estimated annual, biweekly, and total benefit when eligible

The calculator is an estimate, not an official benefit determination. It stores and transmits no user data.

## Delivery and architecture

Use a dependency-free static web application:

- Semantic HTML for content and native form controls
- CSS for the responsive Local 947 visual system
- Browser JavaScript modules for form behavior and calculations
- Node's built-in test runner for calculation checks
- No framework, backend, database, analytics, cookies, or local storage

Keep pure calculation functions separate from DOM behavior so the rules can be tested without a browser. Expected implementation artifacts are:

- `index.html`
- `styles.css`
- `calculator.mjs`
- `app.mjs`
- `calculator.test.mjs`
- `assets/local-947-logo.png`
- A short `README.md` with local preview, test, and hosting instructions

## Page structure

The page is one progressive form with these regions:

1. **Branded header:** Local 947 logo, page title, privacy statement, and estimate disclaimer.
2. **Eligibility requirements:** A plain-language checklist of all qualifying rules.
3. **Retirement and service:** Retirement timing, birth month/year, retirement type, continuous GFD service, current GFD service, other LGERS service, and sick leave.
4. **Benefit service value:** Choice between the calculator's projected service and a separately entered value used only for the benefit equation.
5. **Retirement salary:** Choice among anticipated retirement salary, current salary, or retirement rank and promotion date.
6. **Result:** Eligibility decision and reasons; payment estimates only when eligible.

Use open sections separated by spacing and rules rather than nested or repeated decorative cards.

## Inputs

### Retirement and identity

- Estimated retirement year
  - Retirement date is always January 31 of that year.
  - The resulting date must be later than the current browser date.
- Birth month and year
  - A full birth date is unnecessary because retirement is always January 31.
- Regular LGERS service retirement: Yes/No
  - The prompt must state that disability retirement does not qualify.
- At least five continuous years immediately before retirement as a sworn Greensboro firefighter: Yes/No

### Current service

- Current sworn GFD service: separate years and months fields
- Other current LGERS service: Yes/N/A
  - When Yes, show separate years and months fields.
  - When N/A, use zero.

Both values are service already earned as of the current browser date. Future time through retirement is added only to GFD service because the audience is an active GFD firefighter expected to remain employed through retirement. Other LGERS service remains fixed.

### Sick leave

Choice: **Current sick hours** or **Sick hours expected at retirement**.

- Current sick hours are projected through the retirement date using the historical-rate method below.
- Expected retirement sick hours are used directly.
- Accept nonnegative hours. Fractions below a full hour do not trigger LGERS's partial-block extra month.

### Benefit service value

Choice: **Use calculated retirement service** or **Enter benefit service**.

- Calculated mode uses the projected eligibility creditable service.
- Manual mode accepts separate years and months and replaces only the service value displayed in the benefit calculation and used by the `0.0085` equation.
- Manual mode never changes the 30-year test, the age-60/25-year test, or the 50% GFD-service test.

### Retirement salary

Choice among:

1. **Anticipated salary at retirement:** Enter an annual amount and use it directly.
2. **Current annual salary:** Enter an annual amount and apply future July 1 raises through the last July 1 before retirement.
3. **Rank at retirement:** Choose a rank and promotion month/year. Treat the first day of the selected month as the promotion date, use the listed starting salary as the salary on that date, and apply July 1 raises strictly after that date and before retirement. A July promotion therefore receives its first projected raise the following July.

Starting salaries:

| Rank | Starting salary |
| --- | ---: |
| SrFF | $56,434 |
| Engineer / Sr Fire Insp. | $66,980 |
| Captain / Asst. Fire Marshal | $80,327 |
| Batt. Chief / Dep. Fire Marshal | $94,040 |
| Assistant Fire Chief / Fire Marshal | $120,373 |
| Deputy Fire Chief | $135,395 |
| Fire Chief | $180,183 |

The salary increase assumption is 4% compounded on each applicable July 1. Retirement occurs before July 1 of the retirement year, so there is no retirement-year raise.

## Calculation rules

### Date and service representation

Perform calculations at full precision and round only displayed values. Convert entered service to years as:

`entered years + entered months / 12`

Let:

- `today` be the browser's current local date
- `retirementDate` be January 31 of the selected retirement year
- `remainingYears` be the Actual/Actual year fraction equivalent to Excel `YEARFRAC(today, retirementDate, 1)`
- `currentGfdYears` be current sworn GFD service
- `otherLgersYears` be current other LGERS service or zero

Reference: [Microsoft Support - YEARFRAC function](https://support.microsoft.com/en-us/excel/functions/yearfrac-function).

Then:

`projectedGfdYears = currentGfdYears + remainingYears`

### Sick-hour projection

When current sick hours `V` are selected:

`currentWorkedYears = currentGfdYears + otherLgersYears`

`historicalNetRate = min(V / currentWorkedYears, 96)`

`retirementSickHours = V + historicalNetRate * remainingYears`

The 96-hour cap reflects the standard accrual rate of eight hours per month. Current worked service must be greater than zero for this mode.

When expected retirement sick hours are selected:

`retirementSickHours = entered retirement sick hours`

### LGERS sick-credit conversion

With an eight-hour sick day, 20 sick days equal 160 hours. LGERS awards one service month for every complete 160-hour block and one additional month when the remaining block contains at least one full hour.

`fullSickMonths = floor(retirementSickHours / 160)`

`remainingSickHours = retirementSickHours - fullSickMonths * 160`

`sickServiceMonths = fullSickMonths + (remainingSickHours >= 1 ? 1 : 0)`

`sickServiceYears = sickServiceMonths / 12`

Reference: [My NC Retirement - Adding to Your Creditable Service](https://www.myncretirement.com/systems-funds/local-governmental-employees-retirement-system-lgers/lgers-leo-handbook/qualifying-benefits/adding-your-creditable-service).

### Eligibility creditable service

`eligibilityServiceYears = projectedGfdYears + otherLgersYears + sickServiceYears`

The manual benefit-service entry never replaces this value.

### Age on retirement date

Because retirement is January 31 and only birth month/year are collected:

`retirementAge = retirementYear - birthYear - (birthMonth > January ? 1 : 0)`

A January birthday has occurred by January 31; a February through December birthday has not.

### Eligibility decision

The firefighter appears eligible only when every condition passes:

1. `retirementAge < 62`
2. Regular LGERS service retirement is Yes
3. Continuous sworn GFD service confirmation is Yes
4. `projectedGfdYears >= 5`
5. `projectedGfdYears / eligibilityServiceYears >= 0.50`
6. Either:
   - `eligibilityServiceYears >= 30`, or
   - `retirementAge >= 60` and `eligibilityServiceYears >= 25`

Display each condition separately with passed/failed text. Do not communicate status by color alone.

Reference: [My NC Retirement - LGERS Member Handbook](https://www.myncretirement.com/documents/files/actives/lgers-handbook/open).

### Benefit service

`benefitServiceYears = manual benefit service when selected; otherwise eligibilityServiceYears`

The result breakdown must label manual mode clearly so it cannot be mistaken for the service value used to determine eligibility.

### Salary projection

Count every July 1 date that is strictly after the selected salary base date and strictly before January 31 of the retirement year.

`retirementSalary = baseSalary * 1.04 ^ applicableRaiseCount`

- Anticipated salary mode uses the entered amount directly and applies no raises.
- Current salary mode uses today as the base date.
- Rank mode uses the first day of the promotion month as the base date and the selected rank's starting salary.

### Benefit amounts

Only calculate and display payment amounts when all eligibility conditions pass.

`annualBenefit = 0.0085 * benefitServiceYears * retirementSalary`

`biweeklyBenefit = annualBenefit / 26`

Let the 62nd birthday year be `birthYear + 62`. Covered months begin February 1 after retirement and include the entire 62nd-birthday month:

`coveredMonths = (birthYear + 62 - retirementYear) * 12 + birthMonth - 1`

`totalBenefit = annualBenefit / 12 * coveredMonths`

Display currency to two decimal places, but retain full precision through the calculation.

## Interaction behavior

- Conditional choices reveal only their relevant fields.
- Read-only derived lines update as valid inputs change:
  - Projected sick hours
  - Sick service in years and months
  - Projected GFD service at retirement
  - Eligibility creditable service
  - Benefit service value
  - Projected retirement salary
- One primary button checks eligibility and calculates the benefit.
- On submission, move focus to the result heading.
- A secondary Start over action clears the form and result.
- Do not persist or transmit any entered value.

## Results

### Eligible

Show:

- "You appear eligible"
- A passed checklist for every requirement
- Estimated annual benefit
- Estimated gross biweekly payment based on 26 checks per year
- Estimated total paid from February 1 after retirement through the end of the 62nd-birthday month
- A calculation breakdown containing retirement salary, benefit service, annual multiplier, and covered months
- An estimate-only disclaimer and verification direction

### Not eligible

Show:

- "You do not appear eligible"
- Every failed requirement in plain language
- No annual, biweekly, or total payment values
- The estimate-only disclaimer and verification direction

## Validation and errors

Use inline errors next to the relevant field and an accessible summary at submission. Validate at minimum:

- Retirement date is after today
- Birth month/year is present and plausible
- Years are nonnegative whole numbers
- Months are whole numbers from 0 through 11
- Sick hours and salaries are nonnegative numeric values
- Current worked service is greater than zero when projecting current sick hours
- Manual benefit service is greater than zero when selected
- Promotion date is before retirement when rank mode is selected
- All required Yes/No decisions are answered

Errors must explain how to fix the input. Do not silently clamp or reinterpret invalid values.

## Visual system

Follow `PRODUCT.md` and `DESIGN.md`.

- Compact navy masthead with the Local 947 logo and white title
- White main working surface
- Navy for primary controls and structure
- Gold for brand identity and selected states
- Red only for failed requirements, errors, and limited urgent emphasis
- Black for primary text
- `Segoe UI`, `system-ui`, sans-serif typography
- Minimum 16px body text and 44px interactive targets
- Open sections, simple dividers, restrained rounding, and no decorative shadows
- No gradients, flames, sirens, distressed type, glassmorphism, nested cards, or sales-page styling

Status always combines color with an icon and explicit text for color-blind support.

## Responsive and accessible behavior

Meet WCAG 2.2 AA.

- Semantic headings, fieldsets, legends, labels, descriptions, and buttons
- Complete keyboard access with visible focus indicators
- Screen-reader announcement of errors, eligibility, and updated results
- Sufficient text and control contrast
- Status conveyed by text and shape/icon as well as color
- Single-column phone layout with no horizontal scrolling
- Related years/months fields may share a row when space allows
- Motion limited to 150-200 ms state transitions
- Remove nonessential transitions under `prefers-reduced-motion: reduce`

## Verification

Use Node's built-in test runner. Automated tests must cover:

- Retirement-age calculation for January and later-month birthdays
- Under-62 failure boundary
- Exactly 30 years of creditable service
- Exactly age 60 with 25 years of creditable service
- Exactly 50% GFD service
- 160 sick hours producing one month
- 161 sick hours producing two months
- A remainder below one full hour not producing an extra month
- Historical sick projection and its 96-hour annual cap
- Applicable July 1 raise counting before and after the base date
- No retirement-year raise
- Manual benefit service changing payment amounts without changing eligibility
- Annual, biweekly, covered-month, and total calculations
- No payment output for an ineligible result

Browser verification must cover:

- Keyboard-only completion
- Screen-reader labels and result announcements
- WCAG contrast
- Common color-vision-deficiency simulations
- Reduced-motion behavior
- Layout at small-phone, tablet, and desktop widths
- Conditional field reveal, error recovery, result focus, and Start over

## Assumptions and maintenance

- The user is an active sworn Greensboro firefighter and remains in that role until retirement.
- Other LGERS service entered as of today does not grow after today.
- Eight hours equals one sick day for this calculator.
- Sick leave accrues at a maximum gross rate of eight hours per month.
- All retirement dates are January 31.
- The rank salaries, 4% annual raise assumption, and `0.0085` benefit multiplier are editable constants grouped in one clearly labeled block.
- The page must visibly disclose the salary and calculation assumptions so users know what drives the estimate.
- Official rules and salary constants should be reviewed before public release and whenever policy or pay schedules change.
