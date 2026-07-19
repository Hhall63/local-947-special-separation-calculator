# Live Employee Salary Lookup Design

## Goal

Let a member find their current rank and salary from the City of Greensboro's live employee-salary records while preserving the calculator's complete manual salary-entry path and all existing calculation behavior.

## Scope

- Add an optional current-information lookup inside **Project from FY 2025-2026 salary structure**.
- Keep **Enter my rank and salary myself** as the first and default entry method.
- Fetch current Fire records only after a member requests a search.
- Search the fetched records locally in the browser by partial name.
- Require the member to confirm a matched record before filling current rank and step or salary.
- Keep confirmed values visible and editable.
- Retain manual entry as the fallback for service failures, missing records, and records that cannot be mapped confidently.
- Do not remove or change anticipated-retirement salary entry, retirement-rank selection, promotion inputs, merit inputs, validation, projections, eligibility rules, result calculations, reset controls, or the salary-structure dialog.

## Live data source

Use the public ArcGIS table behind **People & Culture - Current Employee Salaries**:

```text
https://gis.greensboro-nc.gov/arcgis/rest/services/OpenGateCity/OpenData_HRES_DS/MapServer/1/query
```

The request will:

- filter to `DepartmentName = 'Fire'`;
- request only `Name`, `FirstName`, `MiddleInitial`, `LastName`, `NameSuffix`, `EmployeeTitle`, and `SalaryRate`;
- set `returnGeometry=false` and `f=json`;
- request up to the service's 1,000-record page size and continue from the next offset whenever ArcGIS reports that more records exist;
- bypass the browser cache so the first search in a page session requests the current service response.

The browser fetches the Fire subset once, on the first search, and retains it only in memory for that page session. Later searches reuse that response. Reloading or closing the page discards it. The feature adds no spreadsheet, generated data file, scheduled synchronization, backend, proxy, dependency, cookie, analytics, or browser storage.

The live employee table supplies a current title and salary. It does not replace the calculator's published `SALARY_STRUCTURE`, which remains the source for nonexempt rank and step mapping and future salary projection. If a new City salary no longer matches that active structure, the calculator must use the manual fallback rather than guess.

## Entry interface

Within the existing structured salary path, add a labeled two-choice fieldset above the current-rank fields:

1. **Enter my rank and salary myself**
2. **Find me in current City records**

Manual entry is selected by default and presents the existing current-rank and current-step or current-salary controls without behavioral changes.

Choosing the lookup method reveals:

- a name input;
- a **Search current records** button;
- a live status region for loading and search messages;
- an accessible list of matching records; and
- a confirmation panel for the selected record.

The first search triggers the live fetch. A loading message remains visible until the request finishes. The search button cannot submit the calculator form.

After confirmation, the existing current-rank and current-step or current-salary fields appear with the imported values. They remain normal editable form controls. The member may search again or switch to manual entry. Importing current information does not change retirement rank, promotion, merit, or other calculator inputs.

## Local name search

Require at least two non-whitespace characters before searching. Normalize the query and candidate names by lowercasing, treating punctuation as spacing, and collapsing repeated whitespace. Split the query into tokens and require every token to occur in the candidate's normalized full name. This supports partial searches such as a first name, last name, or portions of both without sending the typed name to Greensboro.

Show matching records as keyboard-accessible choices containing the public full name, employee title, and formatted annual salary. Preserve the service's name text for display. When more than 20 records match, show the first 20 in name order and ask the member to enter more of the name.

Selecting a result shows its name, title, and salary in a confirmation panel. No calculator field changes until the member activates **Use this information**.

## Rank and salary mapping

Map exact City titles to the calculator's rank keys:

| City employee title | Calculator rank |
| --- | --- |
| Fire Fighter | F01 or F02, determined by salary step |
| Fire Engineer | F04 |
| Senior Fire Inspector | F04 |
| Fire Captain | F05 |
| Asst Fire Marshal | F05 |
| Battalion Fire Chief | F06 |
| Deputy Fire Marshal | F06 |
| Asst Fire Chief | F07 |
| Fire Marshal | F07 |
| Deputy Fire Chief | F08 |
| Fire Chief | F09 |

For nonexempt ranks, `SalaryRate` must exactly equal a published step in `SALARY_STRUCTURE`:

- A Fire Fighter salary matching an F01 step maps to F01 and that step.
- A Fire Fighter salary matching an F02 step maps to F02 and that step because the live title does not distinguish Fire Fighter Sr.
- F04 and F05 salaries map to the exact step within their title's rank.

For exempt ranks, use `SalaryRate` as the editable current annual salary after confirming that it is finite, positive, and within the existing published range validation.

Do not use nearest-step matching, fuzzy title matching, or salary inference. Unsupported titles, nonexempt salaries that do not equal a published step, and exempt salaries that fail existing validation are unmappable.

## Confirmation and field updates

The confirmation panel always shows the selected public name, title, and salary before import.

For a mappable record, **Use this information** will:

- set the existing current-rank value;
- populate and select the exact current step for a nonexempt rank, or populate the current annual salary for an exempt rank;
- run the existing progressive-disclosure and preview update flow; and
- announce that the current information was filled and remains editable.

The import writes only current-rank and current-step or current-salary values. Existing downstream values remain untouched and continue through current validation rules.

For an unmappable record, show **We found your record but couldn't match it confidently. Enter your rank and salary yourself.** Do not show an enabled import action and do not partially change calculator fields.

## Errors and fallback

Handle these states in plain language through the lookup status region:

- fewer than two search characters;
- loading current City records;
- no matching names;
- multiple matches;
- more than 20 matches;
- an unmappable selected record;
- a network or HTTP failure;
- an ArcGIS error response;
- malformed or incomplete response data; and
- a retry after failure.

A failed request leaves all calculator fields unchanged and keeps **Enter my rank and salary myself** available. A later search retries the request. No lookup failure becomes a calculator-wide validation error or prevents manual calculation.

Reset and Start over clear the lookup method, name, results, confirmation, status, and imported current values through the existing form-reset flow. Manual entry returns as the selected method. The already fetched roster may remain in page memory until reload because it is public source data and avoids a repeated request; no selected identity or search text remains visible after reset.

## Privacy and source copy

Update the interface and README privacy language to explain:

- entered information is not stored or transmitted;
- when the member requests a lookup, the browser retrieves public Fire salary records directly from the City of Greensboro;
- name matching occurs locally, so the typed search name is not sent to the City;
- the records remain only in page memory and disappear when the page is refreshed or closed; and
- no account, analytics, cookies, local storage, backend submission, or static spreadsheet is introduced.

Include a link to the City's dataset near the lookup. Do not claim an exact refresh timestamp because the service does not expose one in the returned employee fields.

## Accessibility

- Use a semantic fieldset and legend for the two entry methods.
- Keep the name input explicitly labeled and provide descriptive button text.
- Use `aria-live="polite"` for loading, result-count, no-result, import-success, and recoverable failure messages.
- Render search results as native interactive controls with visible keyboard focus and a clear selected state that does not rely on color.
- Move focus to the results heading after a successful search and to the confirmation heading after selecting a result.
- Associate errors and instructions with the name input through the existing error-description pattern.
- Preserve existing touch-target, contrast, reduced-motion, and responsive-layout requirements.

## Code boundaries

- Keep local name normalization, matching, title mapping, and salary-to-step mapping as pure functions in `calculator.mjs` beside `SALARY_STRUCTURE`.
- Keep the ArcGIS request, page-session roster variable, lookup event handling, rendering, confirmation, field updates, focus, reset, and live messages in `app.mjs`.
- Keep semantic lookup markup in `index.html` and reuse existing tokens and form styles in `styles.css`.
- Add no module, class, dependency, proxy, cache layer, generalized API client, or configurable mapping system.

## Verification

- Unit-test every supported exact title mapping.
- Test Fire Fighter differentiation between F01 and F02 using exact salary steps.
- Test every nonexempt rank's exact step mapping and reject unmatched salaries.
- Test exempt rank and salary mapping, including invalid and out-of-range salaries.
- Test case-insensitive partial first-name, last-name, and multi-token matching.
- Test duplicate names, no results, the 20-result display limit, and malformed records.
- Test combining a paginated ArcGIS response without omitting or duplicating records.
- Structurally test both entry labels, manual default selection, accessible lookup regions, confirmation copy, privacy copy, and source link.
- Browser-test loading, results, selection, confirmation, editable imported fields, repeat search, mode switching, retry, focus movement, live announcements, reset, and manual fallback.
- Confirm lookup failures never modify current fields or block the existing manual calculation.
- Run the complete Node test suite and JavaScript syntax checks.
- Verify the real Greensboro endpoint allows the production origin, returns the expected fields, and can populate representative nonexempt and exempt records before publication.
- Regression-test anticipated salary entry, structured manual entry, retirement-rank and promotion behavior, merit handling, projection previews, eligibility, calculation results, and all reset controls.
