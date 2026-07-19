# Local 947 Special Separation Calculator

A standalone browser calculator for active sworn Greensboro firefighters to
estimate apparent Fire SSA eligibility and benefit amounts.

## Privacy

No entered data is stored or transmitted. The calculator has no backend,
analytics, cookies, local storage, or network submission. All calculations run
in the user's browser.

## Preview locally

From this directory, start any static web server. With Python 3:

```powershell
python -m http.server 8080
```

Open `http://localhost:8080`. Stop the server with `Ctrl+C`. If your Python
launcher is named `py` or has a full path, substitute that command for
`python`.

## Run checks

```powershell
node --test
node --check app.mjs
```

## Host

Upload these files together to any static web host, preserving their relative
paths:

- `index.html`
- `styles.css`
- `calculator.mjs`
- `app.mjs`
- `assets/local-947-logo.png`

No server-side application or build step is required.

## Update calculation assumptions

The editable constants are grouped in `calculator.mjs`:

- `SALARY_STRUCTURE`: FY 2025-2026 nonexempt steps and exempt ranges
- `BENEFIT_MULTIPLIER`: Fire SSA calculation multiplier
- `CHECKS_PER_YEAR`: gross biweekly divisor

Structured salary estimates use November 1 as the estimated annual raise date.
The active salary source is the City of Greensboro FY 2025-2026 Fire Sworn
Salary Structure, effective October 15, 2025. When a new structure is adopted,
update `SALARY_STRUCTURE`, the salary-dialog effective date, and the matching
Calculation assumptions copy together.

Run `node --test` after every change. Official rules and salary values must be
reviewed before public release and whenever policy or pay schedules change.

## Important

This calculator provides an estimate only. Users must verify eligibility,
service credit, salary, and benefit values with the appropriate benefits
authority before making a retirement decision.
