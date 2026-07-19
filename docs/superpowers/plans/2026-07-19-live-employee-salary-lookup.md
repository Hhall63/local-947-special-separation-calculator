# Live Employee Salary Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional live Greensboro Fire employee lookup that searches partial names locally, confirms a record, and fills the existing editable current-rank and current-salary controls without removing or changing manual entry.

**Architecture:** Keep record searching and salary mapping as pure functions in `calculator.mjs`. Keep the on-demand paginated ArcGIS fetch and DOM behavior in `app.mjs`, using the existing static HTML/CSS application and browser memory only. The live source supplies starting information; the existing `SALARY_STRUCTURE` remains authoritative for step mapping and projections.

**Tech Stack:** Static HTML, CSS, browser-native ES modules and Fetch API, Node.js built-in test runner, existing dependency-free DOM fixture.

## Global Constraints

- Keep **Enter my rank and salary myself** as the first and default entry method.
- Fetch only after **Search current records** is activated; never send the typed name to Greensboro.
- Store no roster, search text, or selection outside page memory.
- Require **Use this information** before changing current-rank or current-salary fields.
- Keep imported values visible and editable.
- Never guess an unsupported title or unmatched nonexempt salary step.
- Preserve anticipated salary, manual structured salary, retirement rank, promotion, merit, eligibility, calculation, preview, and reset behavior.
- Add no dependency, backend, proxy, storage, analytics, generated roster, or static spreadsheet.
- Keep WCAG 2.2 AA keyboard, focus, status, target-size, contrast, and responsive behavior.

---

### Task 1: Pure local search and salary mapping

**Files:**
- Modify: `calculator.mjs:271-350`
- Modify: `tests/calculator.test.mjs:1-20`
- Test: `tests/calculator.test.mjs`

**Interfaces:**
- Consumes: existing `SALARY_STRUCTURE` object.
- Produces: `findEmployeeSalaryRecords(records, query, limit = 20)` returning `{ matches, total }`; `mapEmployeeSalaryRecord(record)` returning `{ currentRank, currentStep, currentSalary }` or `null`.

- [ ] **Step 1: Write failing pure-function tests**

Add the imports and focused cases below to `tests/calculator.test.mjs`:

```js
import {
  findEmployeeSalaryRecords,
  mapEmployeeSalaryRecord,
} from "../calculator.mjs";

test("finds partial employee names locally without case or punctuation sensitivity", () => {
  const records = [
    { Name: "Smith, Jordan A.", FirstName: "Jordan", LastName: "Smith" },
    { Name: "Smythe, Jo", FirstName: "Jo", LastName: "Smythe" },
  ];

  assert.deepEqual(
    findEmployeeSalaryRecords(records, "jor sm").matches,
    [records[0]],
  );
  assert.deepEqual(findEmployeeSalaryRecords(records, "--").matches, []);
});

test("sorts matches and reports totals beyond the display limit", () => {
  const records = ["Zulu, Ava", "Able, Ava", "Baker, Ava"].map((Name) => ({ Name }));
  const result = findEmployeeSalaryRecords(records, "av", 2);

  assert.equal(result.total, 3);
  assert.deepEqual(result.matches.map(({ Name }) => Name), ["Able, Ava", "Baker, Ava"]);
});

test("maps exact sworn titles and salary steps without guessing", () => {
  assert.deepEqual(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Fighter", SalaryRate: 49_724 }),
    { currentRank: "f01", currentStep: 1, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Fighter", SalaryRate: 74_263 }),
    { currentRank: "f02", currentStep: 8, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Engineer", SalaryRate: 72_446 }),
    { currentRank: "f04", currentStep: 3, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Captain", SalaryRate: 83_540 }),
    { currentRank: "f05", currentStep: 2, currentSalary: null },
  );
  for (const [EmployeeTitle, currentRank, SalaryRate] of [
    ["Senior Fire Inspector", "f04", 72_446],
    ["Asst Fire Marshal", "f05", 83_540],
    ["Battalion Fire Chief", "f06", 112_011],
    ["Deputy Fire Marshal", "f06", 112_011],
    ["Asst Fire Chief", "f07", 130_000],
    ["Fire Marshal", "f07", 130_000],
    ["Deputy Fire Chief", "f08", 146_443],
    ["Fire Chief", "f09", 194_886],
  ]) {
    assert.deepEqual(mapEmployeeSalaryRecord({ EmployeeTitle, SalaryRate }), {
      currentRank,
      currentStep: null,
      currentSalary: SalaryRate,
    });
  }
});

test("rejects unsupported, unmatched, and invalid salary records", () => {
  assert.equal(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Fighter", SalaryRate: 76_906 }),
    null,
  );
  assert.equal(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Protection Specialist", SalaryRate: 60_000 }),
    null,
  );
  assert.equal(
    mapEmployeeSalaryRecord({ EmployeeTitle: "Fire Chief", SalaryRate: 300_000 }),
    null,
  );
});
```

- [ ] **Step 2: Run the focused tests and verify red**

Run:

```powershell
node --test --test-name-pattern="employee names|salary steps|unsupported|display limit" tests/calculator.test.mjs
```

Expected: FAIL because `findEmployeeSalaryRecords` and `mapEmployeeSalaryRecord` are not exported.

- [ ] **Step 3: Add the minimum pure implementation**

Add beside `SALARY_STRUCTURE` in `calculator.mjs`:

```js
const EMPLOYEE_TITLE_RANKS = Object.freeze({
  "Fire Engineer": "f04",
  "Senior Fire Inspector": "f04",
  "Fire Captain": "f05",
  "Asst Fire Marshal": "f05",
  "Battalion Fire Chief": "f06",
  "Deputy Fire Marshal": "f06",
  "Asst Fire Chief": "f07",
  "Fire Marshal": "f07",
  "Deputy Fire Chief": "f08",
  "Fire Chief": "f09",
});

function normalizedEmployeeName(record) {
  return [
    record.Name,
    record.FirstName,
    record.MiddleInitial,
    record.LastName,
    record.NameSuffix,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findEmployeeSalaryRecords(records, query, limit = 20) {
  const terms = normalizedEmployeeName({ Name: query }).split(" ").filter(Boolean);
  if (terms.join("").length < 2) return { matches: [], total: 0 };

  const allMatches = records
    .filter((record) => {
      const name = normalizedEmployeeName(record);
      return name && terms.every((term) => name.includes(term));
    })
    .sort((left, right) =>
      String(left.Name ?? "").localeCompare(String(right.Name ?? ""), "en-US"),
    );

  return { matches: allMatches.slice(0, limit), total: allMatches.length };
}

export function mapEmployeeSalaryRecord(record) {
  const salary = Number(record.SalaryRate);
  if (!Number.isFinite(salary) || salary <= 0) return null;

  const rankCandidates =
    record.EmployeeTitle === "Fire Fighter"
      ? ["f01", "f02"]
      : [EMPLOYEE_TITLE_RANKS[record.EmployeeTitle]].filter(Boolean);

  for (const currentRank of rankCandidates) {
    const details = SALARY_STRUCTURE[currentRank];
    if (details.type === "nonexempt") {
      const stepIndex = details.steps.indexOf(salary);
      if (stepIndex >= 0) {
        return { currentRank, currentStep: stepIndex + 1, currentSalary: null };
      }
    } else if (salary <= details.rangeMax) {
      return { currentRank, currentStep: null, currentSalary: salary };
    }
  }

  return null;
}
```

- [ ] **Step 4: Run the focused and complete calculator tests**

Run:

```powershell
node --test --test-name-pattern="employee names|salary steps|unsupported|display limit" tests/calculator.test.mjs
node --test tests/calculator.test.mjs
```

Expected: PASS for both commands.

- [ ] **Step 5: Commit the pure behavior**

```powershell
git add calculator.mjs tests/calculator.test.mjs
git commit -m "feat: map live employee salary records"
```

---

### Task 2: Accessible lookup markup, privacy copy, and styles

**Files:**
- Modify: `index.html:43-45`
- Modify: `index.html:504-536`
- Modify: `styles.css:333-383`
- Modify: `tests/structure.test.mjs:252-275`
- Modify: `tests/structure.test.mjs:1038-1050`
- Modify: `README.md:5-12`

**Interfaces:**
- Consumes: existing structured salary container and form styling.
- Produces: DOM IDs used by Task 3: `current-entry-mode-group`, `salary-lookup-fields`, `employee-name-search`, `search-current-records`, `salary-lookup-status`, `salary-lookup-results-heading`, `salary-lookup-results`, `salary-lookup-confirmation`, `salary-lookup-confirmation-title`, `salary-lookup-confirmation-copy`, `use-salary-record`, and `current-rank-field`.

- [ ] **Step 1: Write failing structure and privacy assertions**

Extend the calculator HTML structure test with:

```js
for (const fragment of [
  'id="current-entry-mode-group"',
  'name="current-entry-mode"',
  'value="manual"',
  "Enter my rank and salary myself",
  'value="lookup"',
  "Find me in current City records",
  'id="salary-lookup-fields"',
  'id="employee-name-search"',
  'id="search-current-records"',
  'id="salary-lookup-status"',
  'aria-live="polite"',
  'id="salary-lookup-results"',
  'id="salary-lookup-confirmation"',
  'id="use-salary-record"',
  'href="https://data.greensboro-nc.gov/datasets/greensboro::people-culture-current-employee-salaries/explore"',
]) {
  assert.ok(html.includes(fragment), "Missing salary lookup HTML: " + fragment);
}
assert.match(html, /name="current-entry-mode"[\s\S]*value="manual"[\s\S]*checked/);
assert.match(css, /\.salary-lookup\s*\{/);
assert.match(css, /\.salary-lookup-result\s*\{/);
```

Update the README test fragments to require:

```js
"retrieves public Fire salary records",
"searches names locally",
"No entered data is stored or transmitted",
```

- [ ] **Step 2: Run the structure tests and verify red**

Run:

```powershell
node --test --test-name-pattern="calculator HTML|README documents" tests/structure.test.mjs
```

Expected: FAIL because the lookup markup, styles, and updated privacy text do not exist.

- [ ] **Step 3: Add semantic lookup markup and exact approved labels**

Insert this fieldset at the start of `#salary-structure-fields`, add `id="current-rank-field"` to the current-rank wrapper, and keep the existing rank, step, salary, retirement, promotion, and merit controls unchanged:

```html
<fieldset id="current-entry-mode-group">
  <legend>How would you like to enter your current information?</legend>
  <div class="choice-stack">
    <label>
      <input type="radio" name="current-entry-mode" value="manual" checked required />
      Enter my rank and salary myself
    </label>
    <label>
      <input type="radio" name="current-entry-mode" value="lookup" />
      Find me in current City records
    </label>
  </div>
</fieldset>

<div id="salary-lookup-fields" class="salary-lookup calculation-panel" hidden>
  <div class="field">
    <label for="employee-name-search">Your name</label>
    <input
      id="employee-name-search"
      type="search"
      autocomplete="name"
      aria-describedby="salary-lookup-help salary-lookup-status"
    />
    <p id="salary-lookup-help" class="hint">
      Enter at least two letters. The calculator retrieves current public Fire
      salary records, then searches your name only in this browser.
    </p>
  </div>
  <button id="search-current-records" class="secondary-button" type="button">
    Search current records
  </button>
  <p
    id="salary-lookup-status"
    class="hint"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  ></p>
  <div id="salary-lookup-results-region" hidden>
    <h3 id="salary-lookup-results-heading" tabindex="-1">Matching records</h3>
    <ul id="salary-lookup-results" class="salary-lookup-results"></ul>
  </div>
  <div id="salary-lookup-confirmation" class="salary-lookup-confirmation" hidden>
    <h3 id="salary-lookup-confirmation-title" tabindex="-1">Confirm this record</h3>
    <p id="salary-lookup-confirmation-copy"></p>
    <button id="use-salary-record" class="secondary-button" type="button">
      Use this information
    </button>
  </div>
  <p class="hint">
    Source:
    <a
      href="https://data.greensboro-nc.gov/datasets/greensboro::people-culture-current-employee-salaries/explore"
      target="_blank"
      rel="noopener"
    >City of Greensboro current employee salaries (opens in a new tab)</a>.
  </p>
</div>
```

- [ ] **Step 4: Add minimum responsive styles**

Add to `styles.css`:

```css
.salary-lookup {
  margin-block-end: var(--space-4);
}

.salary-lookup h3 {
  margin-block: var(--space-3) var(--space-2);
  color: var(--navy);
  font-size: 1rem;
}

.salary-lookup-results {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

.salary-lookup-result {
  width: 100%;
  text-align: start;
}

.salary-lookup-confirmation {
  margin-block-start: var(--space-3);
  padding-block-start: var(--space-3);
  border-block-start: 1px solid var(--border);
}
```

- [ ] **Step 5: Update privacy copy without weakening the existing contract**

Change the opening privacy note to:

```html
<p class="privacy-note">
  Your entries stay in this browser. If you use the salary lookup, this page
  retrieves public Fire salary records from the City and searches names
  locally. Reloading this page clears your entries and the retrieved records.
</p>
```

Replace the README privacy section with:

```markdown
## Privacy

No entered data is stored or transmitted. The calculator has no backend,
analytics, cookies, local storage, or network submission. All calculations run
in the user's browser. If a member requests salary lookup, the browser retrieves
public Fire salary records directly from the City of Greensboro and searches
names locally. The typed name is not sent to the City, and refreshing or closing
the page discards the retrieved records.
```

- [ ] **Step 6: Run structure tests**

Run:

```powershell
node --test --test-name-pattern="calculator HTML|README documents" tests/structure.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the interface shell**

```powershell
git add index.html styles.css README.md tests/structure.test.mjs
git commit -m "feat: add employee salary lookup interface"
```

---

### Task 3: On-demand ArcGIS fetch, local results, and confirmed import

**Files:**
- Modify: `app.mjs:1-15`
- Modify: `app.mjs:197-243`
- Modify: `app.mjs:679-746`
- Modify: `tests/structure.test.mjs:9-245`
- Test: `tests/structure.test.mjs`

**Interfaces:**
- Consumes: `findEmployeeSalaryRecords` and `mapEmployeeSalaryRecord` from Task 1; lookup DOM IDs from Task 2.
- Produces: one page-memory roster, paginated `fetchSalaryRecords()`, local result rendering, confirmation, editable field import, retry behavior, and complete reset.

- [ ] **Step 1: Extend the DOM fixture and write failing controller tests**

Add the lookup controls to `controlTags`, add the `current-entry-mode` radio group with manual checked by default, preserve and restore `globalThis.fetch`, and add an async dispatcher:

```js
async dispatchAsync(type, target = this) {
  const event = {
    type,
    target,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  for (const listener of this.listeners.get(type) ?? []) {
    await listener(event);
  }
  return event;
}
```

Add controller tests using an injected fetch stub:

```js
test("fetches current Fire records without sending the typed name and imports after confirmation", async (t) => {
  const requested = [];
  const fixture = await controllerFixture({
    fetch: async (url, options) => {
      requested.push({ url: String(url), options });
      return {
        ok: true,
        async json() {
          return {
            features: [{ attributes: {
              Name: "Smith, Jordan A.",
              FirstName: "Jordan",
              LastName: "Smith",
              EmployeeTitle: "Fire Fighter",
              SalaryRate: 56_434,
            } }],
            exceededTransferLimit: false,
          };
        },
      };
    },
  });
  t.after(fixture.cleanup);

  fixture.setRadio("salary-mode", "structure");
  fixture.setRadio("current-entry-mode", "lookup");
  fixture.form.dispatch("change", fixture.get("current-entry-mode-group"));
  fixture.get("employee-name-search").value = "jor sm";
  await fixture.get("search-current-records").dispatchAsync("click");

  assert.equal(requested.length, 1);
  assert.doesNotMatch(requested[0].url, /jor|smith/i);
  assert.equal(requested[0].options.cache, "no-store");
  assert.equal(fixture.get("current-rank").value, "");
  assert.equal(fixture.get("salary-lookup-results").children.length, 1);

  fixture.get("salary-lookup-results").children[0].children[0].dispatch("click");
  assert.equal(fixture.get("current-rank").value, "");
  fixture.get("use-salary-record").dispatch("click");
  assert.equal(fixture.get("current-rank").value, "f02");
  assert.equal(fixture.get("current-step").value, "1");
  assert.equal(fixture.get("current-rank-field").hidden, false);
});

test("paginates once, reuses the roster, and leaves fields unchanged on failures", async (t) => {
  let requestCount = 0;
  const fixture = await controllerFixture({
    fetch: async () => ({
      ok: true,
      async json() {
        requestCount += 1;
        return requestCount === 1
          ? { features: [{ attributes: { Name: "Able, A" } }], exceededTransferLimit: true }
          : { features: [{ attributes: { Name: "Baker, B" } }], exceededTransferLimit: false };
      },
    }),
  });
  t.after(fixture.cleanup);

  fixture.get("employee-name-search").value = "able";
  await fixture.get("search-current-records").dispatchAsync("click");
  fixture.get("employee-name-search").value = "baker";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(requestCount, 2);
  assert.equal(fixture.get("current-rank").value, "");
});
```

Add separate cases for fewer than two characters, no matches, an ArcGIS `{ error }` response, a rejected fetch followed by retry, and an unmappable selected record with a disabled **Use this information** button.

- [ ] **Step 2: Run controller tests and verify red**

Run:

```powershell
node --test --test-name-pattern="current Fire records|paginates|salary lookup" tests/structure.test.mjs
```

Expected: FAIL because the controller has no roster fetch or lookup handlers.

- [ ] **Step 3: Import pure helpers and add the paginated fetch**

Add the imports and page-memory state in `app.mjs`:

```js
import {
  findEmployeeSalaryRecords,
  mapEmployeeSalaryRecord,
} from "./calculator.mjs";

const SALARY_RECORDS_URL =
  "https://gis.greensboro-nc.gov/arcgis/rest/services/OpenGateCity/OpenData_HRES_DS/MapServer/1/query";
let salaryRecords = null;
let selectedSalaryRecord = null;
let selectedSalaryMapping = null;
let salaryLookupConfirmed = false;

async function fetchSalaryRecords() {
  const records = [];
  let offset = 0;
  let more = true;

  while (more) {
    const params = new URLSearchParams({
      where: "DepartmentName = 'Fire'",
      outFields:
        "Name,FirstName,MiddleInitial,LastName,NameSuffix,EmployeeTitle,SalaryRate",
      returnGeometry: "false",
      orderByFields: "ES_ID",
      resultOffset: String(offset),
      resultRecordCount: "1000",
      f: "json",
    });
    const response = await fetch(SALARY_RECORDS_URL + "?" + params, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("salary service HTTP error");
    const payload = await response.json();
    if (payload.error || !Array.isArray(payload.features)) {
      throw new Error("salary service response error");
    }
    const page = payload.features.map(({ attributes }) => attributes);
    if (payload.exceededTransferLimit && page.length === 0) {
      throw new Error("salary service pagination error");
    }
    records.push(...page);
    offset += page.length;
    more = payload.exceededTransferLimit === true;
  }

  return records;
}
```

- [ ] **Step 4: Add lookup rendering and confirmation handlers**

Add small DOM functions and handlers in `app.mjs`:

```js
function clearSalaryLookupResults() {
  element("salary-lookup-results").replaceChildren();
  setHidden("salary-lookup-results-region", true);
  setHidden("salary-lookup-confirmation", true);
  selectedSalaryRecord = null;
  selectedSalaryMapping = null;
}

function showSalaryRecord(record) {
  selectedSalaryRecord = record;
  selectedSalaryMapping = mapEmployeeSalaryRecord(record);
  element("salary-lookup-confirmation-copy").textContent =
    `${record.Name} — ${record.EmployeeTitle}, ${currency.format(record.SalaryRate)} annually.`;
  element("use-salary-record").disabled = !selectedSalaryMapping;
  setHidden("salary-lookup-confirmation", false);
  element("salary-lookup-status").textContent = selectedSalaryMapping
    ? "Review this public record, then confirm before filling your fields."
    : "We found your record but couldn't match it confidently. Enter your rank and salary yourself.";
  element("salary-lookup-confirmation-title").focus();
}

function renderSalaryLookupResults({ matches, total }) {
  clearSalaryLookupResults();
  if (total === 0) {
    element("salary-lookup-status").textContent =
      "No matching Fire salary records were found. Try more or different letters, or enter your information yourself.";
    return;
  }
  const list = element("salary-lookup-results");
  for (const record of matches) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button salary-lookup-result";
    button.textContent =
      `${record.Name} — ${record.EmployeeTitle}, ${currency.format(record.SalaryRate)}`;
    button.addEventListener("click", () => showSalaryRecord(record));
    item.append(button);
    list.append(item);
  }
  setHidden("salary-lookup-results-region", false);
  element("salary-lookup-status").textContent =
    total > matches.length
      ? `Showing ${matches.length} of ${total} matches. Enter more of your name to narrow the list.`
      : `${total} matching record${total === 1 ? "" : "s"} found.`;
  element("salary-lookup-results-heading").focus();
}

element("search-current-records").addEventListener("click", async () => {
  const query = element("employee-name-search").value;
  if (query.replace(/\s/g, "").length < 2) {
    clearSalaryLookupResults();
    element("salary-lookup-status").textContent =
      "Enter at least two letters of your name.";
    element("employee-name-search").focus();
    return;
  }

  element("salary-lookup-status").textContent = "Loading current City records…";
  element("search-current-records").disabled = true;
  try {
    salaryRecords ??= await fetchSalaryRecords();
    renderSalaryLookupResults(findEmployeeSalaryRecords(salaryRecords, query));
  } catch {
    salaryRecords = null;
    clearSalaryLookupResults();
    element("salary-lookup-status").textContent =
      "Current City records couldn't be loaded. Try again or enter your rank and salary yourself.";
  } finally {
    element("search-current-records").disabled = false;
  }
});

element("use-salary-record").addEventListener("click", () => {
  if (!selectedSalaryRecord || !selectedSalaryMapping) return;
  salaryLookupConfirmed = true;
  element("current-rank").value = selectedSalaryMapping.currentRank;
  populateStepChoices(selectedSalaryMapping.currentRank);
  element("current-step").value = selectedSalaryMapping.currentStep
    ? String(selectedSalaryMapping.currentStep)
    : "";
  element("current-exempt-salary").value =
    selectedSalaryMapping.currentSalary ?? "";
  renderPreview(true);
  element("salary-lookup-status").textContent =
    "Current rank and salary filled. Review or edit them before calculating.";
  element("current-rank").focus();
});
```

Update `updateConditionalFields` to show the lookup panel only for the lookup entry method and show current inputs for manual entry or a confirmed lookup:

```js
const currentEntryMode = radioValue("current-entry-mode");
const currentInputsVisible =
  structureMode && (currentEntryMode === "manual" || salaryLookupConfirmed);
setHidden("salary-lookup-fields", !structureMode || currentEntryMode !== "lookup");
setHidden("current-rank-field", !currentInputsVisible);
```

Use `currentInputsVisible` in the current-step, current-exempt-salary, retirement-rank, promotion, merit, and structured preview visibility conditions. Before normal form submission, if lookup mode is selected without a confirmed record, set the lookup message, focus the search input, and return without changing other fields.

The exact visibility changes are:

```js
setHidden(
  "current-step-field",
  !currentInputsVisible || currentDetails?.type !== "nonexempt",
);
setHidden(
  "current-exempt-salary-field",
  !currentInputsVisible || currentDetails?.type !== "exempt",
);
setHidden(
  "retirement-rank-field",
  !currentInputsVisible || !currentDetails,
);
setHidden(
  "promotion-date-fields",
  !currentInputsVisible ||
    !currentDetails ||
    !retirementDetails ||
    currentRank === retirementRank,
);
setHidden(
  "merit-rate-field",
  !currentInputsVisible ||
    (!isExemptRank(currentRank) && !isExemptRank(retirementRank)),
);
setHidden(
  "salary-preview",
  !currentInputsVisible ||
    !errors ||
    !salaryMode ||
    hasAnyError(errors, salaryErrorKeys),
);
```

Add this guard after `event.preventDefault()` in the submit handler:

```js
if (
  radioValue("salary-mode") === "structure" &&
  radioValue("current-entry-mode") === "lookup" &&
  !salaryLookupConfirmed
) {
  element("salary-lookup-status").textContent =
    "Search for your record and confirm it, or enter your rank and salary yourself.";
  element("employee-name-search").focus();
  return;
}
```

- [ ] **Step 5: Extend reset without discarding the fetched roster**

Add to `resetCalculator()` after `form.reset()`:

```js
salaryLookupConfirmed = false;
selectedSalaryRecord = null;
selectedSalaryMapping = null;
element("salary-lookup-results").replaceChildren();
element("salary-lookup-status").textContent = "";
setHidden("salary-lookup-results-region", true);
setHidden("salary-lookup-confirmation", true);
```

The form reset clears the search text and restores manual entry. Keep `salaryRecords` in memory so another search in the same page session does not repeat the network request.

- [ ] **Step 6: Run focused and complete tests**

Run:

```powershell
node --test --test-name-pattern="current Fire records|paginates|salary lookup" tests/structure.test.mjs
node --test
node --check app.mjs
node --check calculator.mjs
```

Expected: every command passes.

- [ ] **Step 7: Commit the working lookup**

```powershell
git add app.mjs tests/structure.test.mjs
git commit -m "feat: fill current salary from live records"
```

---

### Task 4: Rendered, live-service, and regression verification

**Files:**
- Modify only if verification exposes a defect: `index.html`, `styles.css`, `app.mjs`, `calculator.mjs`, and their existing tests.

**Interfaces:**
- Consumes: complete feature from Tasks 1-3.
- Produces: verified desktop/mobile behavior and evidence that the production-origin request remains usable.

- [ ] **Step 1: Run the complete local checks from a clean code diff**

Run:

```powershell
node --test
node --check app.mjs
node --check calculator.mjs
git diff --check
```

Expected: all tests and syntax checks pass; `git diff --check` prints nothing.

- [ ] **Step 2: Start the static site and verify the live flow**

Run:

```powershell
python -m http.server 8080
```

In a browser at `http://localhost:8080`, verify:

1. Manual entry remains selected and behaves exactly as before.
2. Lookup does not fetch until **Search current records** is activated.
3. A partial name shows the expected Fire matches.
4. Selecting a match changes no calculator fields.
5. **Use this information** fills an exact nonexempt step or exempt salary.
6. Imported fields remain editable.
7. An unmappable record cannot be imported and manual entry remains available.
8. A simulated offline request shows the retry/manual message without losing inputs.
9. Clear all fields and Start over reset visible lookup state.
10. Keyboard focus and live status messages follow the approved flow.

- [ ] **Step 3: Check desktop and mobile layouts**

At approximately 1280×900 and 390×844, verify no page-level horizontal overflow, 44px targets, visible focus, readable result buttons, wrapped confirmation copy, and unchanged salary-structure dialog behavior.

- [ ] **Step 4: Verify the live source contract**

Confirm the first request contains `DepartmentName = 'Fire'`, only approved output fields, no typed name, `returnGeometry=false`, and paginates when `exceededTransferLimit` is true. Confirm the response contains representative Fire Fighter, Fire Captain, and exempt records and the production origin receives an allowed cross-origin response.

- [ ] **Step 5: Commit only if verification required a fix**

If verification required changes, add the failing regression test with the fix and commit the touched files:

```powershell
git add index.html styles.css app.mjs calculator.mjs README.md tests/calculator.test.mjs tests/structure.test.mjs
git commit -m "fix: harden live salary lookup"
```

If no fix was needed, do not create an empty commit.
