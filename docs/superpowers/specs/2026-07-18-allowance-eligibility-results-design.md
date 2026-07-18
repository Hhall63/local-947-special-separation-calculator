# Allowance Eligibility and Results Design

Date: 2026-07-18
Status: Approved interaction design

## Goal

Correct every P1 and P2 issue from the `index-html` Impeccable critique while
preserving the existing Fire Special Separation Allowance calculations,
privacy model, static architecture, and Local 947 design system.

The revised calculator must stop asking for allowance-only inputs as soon as a
definitive eligibility failure is known, explain every result with the user's
actual values, and use **allowance** instead of **benefit** in all visible copy.

## Chosen Approach

Use a progressive eligibility gate inside the existing single-page form.

This was selected over two alternatives:

- An inline warning would leave irrelevant allowance fields visible and would
  not fully correct the primary flow problem.
- A multi-step wizard would add navigation and state-management complexity to a
  calculator that otherwise works well as one page.

No dependency, framework, backend, persistence, account, modal, or new page is
needed.

## Eligibility State Model

Extend the existing eligibility evaluation so each requirement can be:

- `true`: enough information is present and the requirement passes.
- `false`: enough information is present and the requirement fails.
- `null`: the information required for that requirement is not complete yet.

The evaluator remains the single source of policy truth. The browser
controller must not duplicate the age, service-share, continuity, or
unreduced-retirement rules.

The overall states are:

1. **Pending:** no known failures and one or more requirements remain unknown.
2. **Eligible:** every requirement is known and passes.
3. **Ineligible:** any known requirement fails, even if other requirements are
   still unknown.

Existing complete-input behavior and calculation boundaries remain unchanged.
Exact 50% GFD service still passes. The manual creditable-service value still
changes only the allowance calculation, never eligibility.

## Immediate Ineligibility Flow

Whenever input or selection changes, evaluate the eligibility information that
is currently available.

If any requirement is definitively false:

- Hide the creditable-service-for-allowance section, retirement-salary
  section, and Calculate my allowance estimate button.
- Show the ineligible result immediately without requiring allowance-only
  fields.
- Move focus to the result heading only when the failure first becomes known;
  do not repeatedly steal focus on later input events.
- List failed known requirements first and known passed requirements second.
- Omit requirements whose inputs are still unknown.
- Provide **Change answers**, which hides the result and focuses the first
  failed requirement's control without clearing any values.
- Preserve **Start over**, which clears the entire form and returns focus to
  the retirement-year field.

When the user corrects the failed input and no known failures remain, hide the
automatic result and restore the allowance-only fields. Previously entered
values remain available.

When all eligibility requirements pass, keep the allowance-only fields visible
and require their valid values before the final allowance calculation.

## Result Evidence

Every known requirement row must show:

- The requirement name.
- The user's actual answer or calculated value.
- The required threshold or qualifying condition.
- A check or cross plus explicit passed/failed wording.

Calculated examples include:

- Age on the January 31 retirement date: `59`; required: under `62`.
- Creditable service: `30 years, 2 months`; required: `30 years`, or age `60`
  with `25 years`.
- Sworn GFD share: `67.0%`; required: at least `50%`.

This evidence is derived from the existing calculation result; it must not use
a separate approximation path.

The ineligible result uses an ink/navy body color. Red is reserved for the
outcome heading, border, failed rows, and cross icons. Passed rows remain navy
and ink so they cannot look failed.

## Eligible Allowance Hierarchy

Show all three requested allowance values in this order:

1. **Estimated gross biweekly allowance** — the lead planning value.
2. **Estimated annual allowance** — supporting value.
3. **Estimated total allowance** — supporting value.

The lead value receives modest additional typographic emphasis without using a
hero-metric card. The total is paired with the covered period: February 1
after retirement through the end of the user's age-62 month. The calculation
breakdown remains visually subordinate.

## Copy and Documentation

All visible interface copy uses **allowance** instead of **benefit**. Internal
function names, constants, element IDs, and CSS classes may retain `benefit`
where changing them would add risk without changing what users see.

Required copy changes include:

- Expand Local Governmental Employees' Retirement System (LGERS) on first use.
- Define unreduced retirement and creditable service in plain language.
- Replace “SSA equation” with “allowance calculation.”
- Replace “Submit” with **Calculate my allowance estimate**.
- Replace “Yes / N/A” for other LGERS service with **Yes / No** and clarify
  that No means no service outside GFD.
- Replace “You must meet every requirement to receive an estimate” with copy
  explaining that the allowance requires every listed condition.
- State what information the user should have ready: retirement year, birth
  month/year, current service, sick hours, and salary or rank information.
- Warn that reloading the page clears entries because nothing is stored.

Link to the official LGERS Member Handbook:

`https://www.myncretirement.com/documents/files/actives/lgers-handbook/open`

The link appears near the eligibility guidance and in the result verification
direction. It opens in a new tab with an explicit new-tab cue so the user's
unpersisted calculator entries are not lost.

## Form Structure and Live Feedback

Keep the current open, card-free page. Divide the long Retirement and service
section with three visible subheadings:

1. Retirement date and age
2. Eligibility questions
3. Service and sick leave

Replace bare preview dashes with concise pending guidance where practical.
Remove `aria-live` from the full definition lists. Use one atomic, visually
hidden polite-status message for completed preview changes. Update visual
previews on input, but announce only settled changes such as select/radio
changes or a numeric field's change event.

The result itself is not also a live region when its heading receives focus;
this avoids duplicate announcements.

## Accessibility and Interaction Details

- Focus the result heading, matching the approved calculator specification.
- Keep linked summary errors and inline errors.
- Associate radio-group errors with the group, not only the first radio.
- Keep native controls, 44px targets, visible focus, reduced motion, and the
  existing mobile stacking behavior.
- Preserve explicit icons and passed/failed text; color never carries status
  alone.
- Give the Calculation assumptions summary a visible disclosure marker.
- Avoid redundant logo announcement when the adjacent organization name
  supplies the same information.

## Testing Strategy

Follow red-green-refactor with Node's built-in test runner.

Add failing pure-calculation tests first for:

- Unknown eligibility values remaining `null`.
- An explicit No producing an immediate failed requirement without salary or
  allowance inputs.
- A known age failure appearing before service and salary are complete.
- Complete eligible and ineligible evaluations preserving existing boundaries.
- Evidence values and thresholds for age, service, and GFD share.

Add failing structure/controller tests first for:

- Allowance terminology and absence of visible benefit wording.
- Official handbook links and new-tab disclosure.
- Gross-biweekly, annual, and total ordering.
- Change answers and immediate-result controller hooks.
- Plain-language LGERS expansion, Yes/No copy, subheadings, reload warning, and
  Calculate my allowance estimate label.
- One concise preview live region instead of live definition lists.
- Correct ineligible/pass color selectors and visible assumptions marker.

Then run the full suite plus syntax checks. Browser acceptance must cover:

- Immediate failure from each definitive requirement.
- Correcting a failure and recovering preserved allowance inputs.
- Full eligible calculation and the three allowance values.
- Full calculated ineligibility with actual-versus-required evidence.
- Change answers, Start over, validation recovery, keyboard focus, 320px and
  desktop layout, and a clean browser console.

The separate Impeccable audit occurs only after these changes and verification
are complete.

## Out of Scope

- Changing policy rules, salary constants, sick-leave conversion, raise rate,
  multiplier, or payment-duration math.
- Storing form data locally or remotely.
- Adding City contact information not supplied or verified for this release.
- Adding a wizard, progress bar, analytics, PDF export, or account system.
