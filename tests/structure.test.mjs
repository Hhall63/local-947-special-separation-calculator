import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url);

let controllerFixtureId = 0;

async function controllerFixture(options = {}) {
  let document;
  const previousFetch = globalThis.fetch;
  const elements = new Map();
  const created = [];
  const controlTags = {
    "retirement-year": "input",
    "birth-month": "select",
    "birth-year": "input",
    "gfd-years": "input",
    "gfd-months": "input",
    "other-years": "input",
    "other-months": "input",
    "sick-hours": "input",
    "benefit-years": "input",
    "benefit-months": "input",
    "anticipated-salary": "input",
    "current-rank": "select",
    "employee-name-search": "input",
    "search-current-records": "button",
    "use-salary-record": "button",
    "current-step": "select",
    "current-exempt-salary": "input",
    "retirement-rank": "select",
    "promotion-month": "select",
    "promotion-year": "input",
    "merit-rate": "input",
    "clear-form-top": "button",
    "clear-form-bottom": "button",
    "calculate-button": "button",
    "edit-answers": "button",
    "start-over": "button",
    "open-salary-structure": "button",
    "close-salary-structure": "button",
    "salary-structure-dialog": "dialog",
  };

  class FakeElement {
    constructor(id = "", tagName = "div") {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this.value = "";
      this.defaultValue = "";
      this.hidden = false;
      this.disabled = false;
      this.open = false;
      this.checked = false;
      this.defaultChecked = false;
      this.dataset = {};
      this.attributes = new Map();
      this.children = [];
      this.listeners = new Map();
      this.className = "";
      this.classList = {
        toggle() {},
      };
      created.push(this);
    }

    matches(selector) {
      return selector
        .split(",")
        .map((part) => part.trim().toUpperCase())
        .includes(this.tagName);
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector) {
      return this.children.filter((child) => child.matches(selector));
    }

    append(...children) {
      this.children.push(...children);
    }

    replaceChildren(...children) {
      this.children = children;
    }

    setAttribute(name, value) {
      this.attributes.set(name, value);
    }

    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    }

    removeAttribute(name) {
      this.attributes.delete(name);
    }

    insertAdjacentElement(_position, child) {
      this.children.push(child);
    }

    remove() {
      created.splice(created.indexOf(this), 1);
      for (const item of created) {
        item.children = item.children.filter((child) => child !== this);
      }
    }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }

    dispatch(type, target = this) {
      const event = {
        type,
        target,
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      for (const listener of this.listeners.get(type) ?? []) listener(event);
      return event;
    }

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

    focus() {
      document.activeElement = this;
    }

    showModal() {
      this.open = true;
    }

    close() {
      this.open = false;
    }
  }

  const get = (id) => {
    if (!elements.has(id)) {
      elements.set(id, new FakeElement(id, controlTags[id] ?? "div"));
    }
    return elements.get(id);
  };

  const form = get("calculator-form");
  form.tagName = "FORM";
  const radios = [];
  const addRadioGroup = (name, groupId, values) => {
    const group = get(groupId);
    for (const value of values) {
      const radio = new FakeElement("", "input");
      radio.name = name;
      radio.value = value;
      radio.defaultValue = value;
      radios.push(radio);
      group.append(radio);
    }
  };

  addRadioGroup("regular-retirement", "regular-retirement-group", ["yes", "no"]);
  addRadioGroup("continuous-gfd", "continuous-gfd-group", ["yes", "no"]);
  addRadioGroup("other-lgers", "other-lgers-group", ["yes", "no"]);
  addRadioGroup("sick-mode", "sick-mode-group", ["current", "retirement"]);
  addRadioGroup("benefit-service-mode", "benefit-service-mode-group", [
    "calculated",
    "manual",
  ]);
  addRadioGroup("salary-mode", "salary-mode-group", [
    "anticipated",
    "structure",
  ]);
  addRadioGroup("current-entry-mode", "current-entry-mode-group", [
    "manual",
    "lookup",
  ]);
  const manualEntry = radios.find(
    (radio) => radio.name === "current-entry-mode" && radio.value === "manual",
  );
  manualEntry.checked = true;
  manualEntry.defaultChecked = true;

  form.querySelector = (selector) => {
    const name = selector.match(/^input\[name="([^"]+)"\]:checked$/)?.[1];
    return name
      ? radios.find((radio) => radio.name === name && radio.checked) ?? null
      : null;
  };
  form.reset = () => {
    for (const item of created) {
      item.value = item.defaultValue;
      item.checked = item.defaultChecked;
    }
  };

  document = {
    activeElement: null,
    querySelector: (selector) =>
      selector.startsWith("#") ? get(selector.slice(1)) : null,
    querySelectorAll: (selector) =>
      selector === ".field-error"
        ? created.filter((item) => item.className === "field-error")
        : selector === "[aria-invalid]"
          ? created.filter((item) => item.attributes.has("aria-invalid"))
          : [],
    getElementById: get,
    createElement: (tagName) => new FakeElement("", tagName),
  };

  for (const id of ["error-summary", "result", "benefit-results"]) {
    get(id).hidden = true;
  }
  for (const id of ["gfd-months", "other-months", "benefit-months"]) {
    get(id).value = "0";
    get(id).defaultValue = "0";
  }
  get("merit-rate").value = "4";
  get("merit-rate").defaultValue = "4";

  globalThis.document = document;
  if (options.fetch) globalThis.fetch = options.fetch;
  controllerFixtureId += 1;
  await import(
    new URL("app.mjs?controller-fixture=" + controllerFixtureId, rootUrl)
  );

  const setRadio = (name, value) => {
    for (const radio of radios.filter((item) => item.name === name)) {
      radio.checked = radio.value === value;
    }
  };
  const setEligibilityInputs = (gfdYears = "1") => {
    get("retirement-year").value = "2030";
    get("birth-month").value = "1";
    get("birth-year").value = "1970";
    get("gfd-years").value = gfdYears;
    get("sick-hours").value = "0";
    setRadio("regular-retirement", "yes");
    setRadio("continuous-gfd", "yes");
    setRadio("other-lgers", "no");
    setRadio("sick-mode", "retirement");
  };
  const setAllowanceInputs = () => {
    setRadio("benefit-service-mode", "calculated");
    setRadio("salary-mode", "anticipated");
    get("anticipated-salary").value = "100000";
  };

  return {
    document,
    form,
    get,
    setRadio,
    setEligibilityInputs,
    setAllowanceInputs,
    cleanup() {
      delete globalThis.document;
      if (previousFetch === undefined) {
        delete globalThis.fetch;
      } else {
        globalThis.fetch = previousFetch;
      }
    },
  };
}

test("calculator HTML exposes required form and accessibility hooks", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");

  for (const fragment of [
    "<title>Local 947 Special Separation Calculator</title>",
    'id="calculator-form"',
    'id="error-summary"',
    'id="retirement-year"',
    'id="birth-month"',
    'id="birth-year"',
    'id="gfd-years"',
    'id="other-service-fields"',
    'id="sick-hours"',
    'id="manual-service-fields"',
    'id="salary-structure-fields"',
    'id="result"',
    'aria-live="polite"',
    'src="app.mjs"',
  ]) {
    assert.ok(html.includes(fragment), "Missing HTML fragment: " + fragment);
  }
});

test("includes the accessible live salary lookup and local-search privacy copy", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");
  const readme = await readFile(new URL("README.md", rootUrl), "utf8");
  const normalizedReadme = readme.replace(/\s+/g, " ");

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
    'id="salary-lookup-results"',
    'id="salary-lookup-confirmation"',
    'id="use-salary-record"',
    "How this works:",
    "public records database",
    "does not send or save the name you type",
    'href="https://data.greensboro-nc.gov/datasets/greensboro::people-culture-current-employee-salaries/explore"',
  ]) {
    assert.ok(html.includes(fragment), "Missing salary lookup HTML: " + fragment);
  }
  assert.match(
    html,
    /name="current-entry-mode"[\s\S]*?value="manual"[\s\S]*?checked/,
  );
  assert.match(
    html,
    /id="salary-lookup-status"[^>]*role="status"[^>]*aria-live="polite"/,
  );
  assert.match(css, /\.salary-lookup\s*\{/);
  assert.match(css, /\.salary-lookup-result\s*\{/);
  for (const fragment of [
    "No entered data is stored or transmitted",
    "retrieves public Fire salary records",
    "searches names locally",
  ]) {
    assert.ok(
      normalizedReadme.includes(fragment),
      "Missing privacy detail: " + fragment,
    );
  }
});

test("top and bottom Clear all fields controls share the complete reset", async (t) => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  assert.doesNotMatch(html, /A private, plain-language estimate\./);
  assert.match(html, /Your entries stay in this browser\./);
  const requiredFieldsIndex = html.indexOf(
    "All questions currently shown are required.",
  );
  const topClearIndex = html.indexOf('id="clear-form-top"');
  const errorSummaryIndex = html.indexOf('id="error-summary"');
  assert.ok(requiredFieldsIndex >= 0);
  assert.ok(requiredFieldsIndex < topClearIndex);
  assert.ok(topClearIndex < errorSummaryIndex);
  assert.match(
    html.slice(topClearIndex, errorSummaryIndex),
    /id="clear-form-top"[\s\S]*Clear all fields/,
  );

  const formActions = html.match(
    /<div class="form-actions">([\s\S]*?)<\/div>/,
  )?.[1];
  assert.ok(formActions);
  assert.match(formActions, /id="calculate-button"/);
  assert.match(formActions, /id="clear-form-bottom"[\s\S]*Clear all fields/);

  const fixture = await controllerFixture();
  t.after(fixture.cleanup);

  const previewIds = [
    "projected-sick-hours",
    "sick-service",
    "projected-gfd-service",
    "eligibility-service",
    "benefit-service-value",
    "projected-salary",
  ];
  const monthDefaults = ["gfd-months", "other-months", "benefit-months"];
  const emptyDefaults = [
    "retirement-year",
    "birth-month",
    "birth-year",
    "gfd-years",
    "other-years",
    "sick-hours",
    "benefit-years",
    "anticipated-salary",
    "current-rank",
    "current-step",
    "current-exempt-salary",
    "retirement-rank",
    "promotion-month",
    "promotion-year",
  ];
  const radioGroups = [
    "regular-retirement-group",
    "continuous-gfd-group",
    "other-lgers-group",
    "sick-mode-group",
    "benefit-service-mode-group",
    "salary-mode-group",
  ];

  for (const id of ["clear-form-top", "clear-form-bottom"]) {
    fixture.get("start-over").dispatch("click");
    fixture.form.dispatch("submit");

    fixture.setEligibilityInputs("1");
    fixture.setAllowanceInputs();
    fixture.get("sick-hours").value = "160.75";
    fixture.form.dispatch("change", fixture.get("gfd-years"));
    assert.equal(
      fixture.get("projected-sick-hours").textContent,
      "160.75 hours",
    );
    for (const [fieldId, value] of Object.entries({
      "gfd-months": "7",
      "other-years": "1",
      "other-months": "8",
      "sick-hours": "20",
      "benefit-years": "2",
      "benefit-months": "9",
      "anticipated-salary": "100000",
      "current-rank": "f02",
      "current-step": "3",
      "current-exempt-salary": "90000",
      "retirement-rank": "f05",
      "promotion-month": "6",
      "promotion-year": "2025",
    })) {
      fixture.get(fieldId).value = value;
    }

    assert.equal(fixture.get("error-summary").hidden, false);
    assert.ok(fixture.get("error-list").children.length > 0);
    assert.ok(fixture.document.querySelectorAll(".field-error").length > 0);
    assert.ok(fixture.document.querySelectorAll("[aria-invalid]").length > 0);
    for (const previewId of previewIds) {
      assert.notEqual(fixture.get(previewId).textContent, "-", previewId);
    }
    assert.notEqual(fixture.get("preview-status").textContent, "");
    assert.equal(fixture.get("result").hidden, false);
    assert.equal(fixture.get("result").dataset.mode, "automatic");
    assert.notEqual(fixture.get("result-title").textContent, "");
    assert.notEqual(fixture.get("result-summary").textContent, "");
    assert.ok(fixture.get("requirements-results").children.length > 0);
    assert.equal(fixture.get("other-service-fields").hidden, true);
    assert.equal(fixture.get("manual-service-fields").hidden, true);
    assert.equal(fixture.get("anticipated-salary-field").hidden, false);
    assert.equal(fixture.get("benefit-service-section").hidden, true);
    assert.equal(fixture.get("salary-section").hidden, true);
    assert.equal(fixture.get("calculate-button").hidden, true);
    assert.equal(fixture.get("calculate-button").disabled, true);
    assert.equal(fixture.document.activeElement, fixture.get("result-title"));

    fixture.get(id).dispatch("click");

    assert.equal(fixture.get("error-summary").hidden, true);
    assert.equal(fixture.get("error-list").children.length, 0);
    assert.equal(fixture.document.querySelectorAll(".field-error").length, 0);
    assert.equal(fixture.document.querySelectorAll("[aria-invalid]").length, 0);
    for (const previewId of previewIds) {
      assert.equal(fixture.get(previewId).textContent, "-");
    }
    assert.equal(fixture.get("preview-status").textContent, "");
    assert.equal(fixture.get("result").hidden, true);
    assert.equal(fixture.get("result").dataset.mode, "");
    assert.equal(fixture.get("benefit-service-section").hidden, false);
    assert.equal(fixture.get("salary-section").hidden, false);
    assert.equal(fixture.get("other-service-fields").hidden, true);
    assert.equal(fixture.get("manual-service-fields").hidden, true);
    assert.equal(fixture.get("anticipated-salary-field").hidden, true);
    assert.equal(fixture.get("salary-structure-fields").hidden, true);
    assert.equal(fixture.get("current-step-field").hidden, true);
    assert.equal(fixture.get("current-exempt-salary-field").hidden, true);
    assert.equal(fixture.get("retirement-rank-field").hidden, true);
    assert.equal(fixture.get("promotion-date-fields").hidden, true);
    assert.equal(fixture.get("merit-rate-field").hidden, true);
    assert.equal(fixture.get("sick-hours-field").hidden, true);
    assert.equal(fixture.get("service-preview").hidden, true);
    assert.equal(fixture.get("benefit-service-details").hidden, true);
    assert.equal(fixture.get("salary-preview").hidden, true);
    assert.equal(fixture.get("calculate-button").hidden, false);
    assert.equal(fixture.get("calculate-button").disabled, false);
    assert.equal(fixture.get("sick-hours-label").textContent, "Sick hours");
    for (const fieldId of monthDefaults) {
      assert.equal(fixture.get(fieldId).value, "0");
    }
    for (const fieldId of emptyDefaults) {
      assert.equal(fixture.get(fieldId).value, "");
    }
    assert.equal(fixture.get("merit-rate").value, "4");
    for (const groupId of radioGroups) {
      assert.ok(
        fixture.get(groupId).children.every((control) => !control.checked),
      );
    }
    assert.equal(fixture.document.activeElement, fixture.get("retirement-year"));

    fixture.setEligibilityInputs("26");
    fixture.setAllowanceInputs();
    fixture.form.dispatch("submit");
    fixture.get("edit-answers").dispatch("click");
    assert.equal(fixture.document.activeElement, fixture.get("retirement-year"));

    const gfdYears = fixture.get("gfd-years");
    gfdYears.value = "1";
    gfdYears.focus();
    fixture.form.dispatch("change", gfdYears);
    assert.equal(fixture.document.activeElement, fixture.get("result-title"));
  }
});

test("projected sick-hour preview does not cross credit boundaries", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  fixture.setEligibilityInputs("26");

  for (const [hours, expectedHours, expectedService] of [
    [160.75, "160.75 hours", "0 years, 1 months"],
    [7.999999999999999, "8 hours", "0 years, 1 months"],
    [8 - 1e-9, "8 hours", "0 years, 1 months"],
    [1.15, "1.15 hours", "0 years, 0 months"],
    [7.999, "7.99 hours", "0 years, 0 months"],
    [160.999, "160.99 hours", "0 years, 1 months"],
    [320.999, "320.99 hours", "0 years, 2 months"],
  ]) {
    await t.test(`${hours} hours`, () => {
      fixture.get("sick-hours").value = String(hours);
      fixture.form.dispatch("input", fixture.get("sick-hours"));
      assert.equal(
        fixture.get("projected-sick-hours").textContent,
        expectedHours,
      );
      assert.equal(fixture.get("sick-service").textContent, expectedService);
    });
  }
});

test("the Local 947 logo path is declared", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  assert.match(
    html,
    /src="assets\/local-947-logo\.png"\s+alt=""/,
    "The logo repeats the adjacent brand text, so it must be decorative",
  );
});

test("visible and conditional questions expose required and year-format cues", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const controls = html.match(/<(?:input|select)\b[^>]*>/g) ?? [];
  const fieldsets = html.match(/<fieldset\b[^>]*>/g) ?? [];

  assert.ok(controls.length > 0);
  assert.ok(
    controls.every((control) => /\brequired\b/.test(control)),
    "Every visible or conditionally visible form control must be required",
  );
  assert.ok(fieldsets.length > 0);
  assert.ok(
    fieldsets
      .filter((fieldset) => /aria-required="true"/.test(fieldset))
      .every((fieldset) => /role="radiogroup"/.test(fieldset)),
    "ARIA required semantics belong on radio groups",
  );
  for (const id of [
    "regular-retirement-group",
    "continuous-gfd-group",
    "other-lgers-group",
    "sick-mode-group",
    "benefit-service-mode-group",
    "salary-mode-group",
  ]) {
    assert.match(
      html,
      new RegExp(
        '<fieldset[^>]*id="' + id + '"[^>]*role="radiogroup"[^>]*aria-required="true"',
      ),
    );
  }
  assert.match(html, /All questions currently shown are required\./);
  assert.match(
    html,
    /id="retirement-year"[^>]*aria-describedby="retirement-year-hint"/,
  );
  assert.match(html, /id="retirement-year-hint"[^>]*>[\s\S]*January 31/);
  assert.match(html, /Estimated retirement year \(4 digits\)/);
  assert.match(html, /Date of birth[\s\S]*Year \(4 digits\)/);
  assert.match(html, /Promotion year \(4 digits\)/);
  assert.match(html, /id="birth-month"[^>]*autocomplete="bday-month"/);
  assert.match(html, /id="birth-year"[^>]*autocomplete="bday-year"/);
});

test("validation appends and removes only its error description", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  const retirementYear = fixture.get("retirement-year");
  retirementYear.setAttribute("aria-describedby", "retirement-year-hint");

  fixture.form.dispatch("submit");

  assert.equal(
    retirementYear.getAttribute("aria-describedby"),
    "retirement-year-hint retirement-year-error",
  );
  assert.equal(retirementYear.getAttribute("aria-invalid"), "true");

  fixture.get("start-over").dispatch("click");

  assert.equal(
    retirementYear.getAttribute("aria-describedby"),
    "retirement-year-hint",
  );
  assert.equal(retirementYear.getAttribute("aria-invalid"), null);
});

test("browser controller wires validation, calculation, results, and reset", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");

  for (const fragment of [
    "validateInput",
    "calculateEstimate",
    "updateConditionalFields",
    "renderPreview",
    "renderResult",
    "resetCalculator",
  ]) {
    assert.ok(app.includes(fragment), "Missing controller hook: " + fragment);
  }
});

test("browser controller reads numeric inputs and selects", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");

  assert.ok(
    app.includes("Number(input.value)"),
    "Numeric form values must work for both input and select controls",
  );
});

test("browser controller supports independent service and salary previews", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");

  for (const fragment of [
    "calculateService",
    "calculateRetirementSalary",
    "serviceErrorKeys",
    "salaryErrorKeys",
  ]) {
    assert.ok(
      app.includes(fragment),
      "Missing progressive preview hook: " + fragment,
    );
  }
});

test("progressively reveals dependent calculator inputs and summaries", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);

  assert.equal(fixture.get("sick-hours-field").hidden, true);
  assert.equal(fixture.get("service-preview").hidden, true);
  assert.equal(fixture.get("benefit-service-details").hidden, true);
  assert.equal(fixture.get("salary-preview").hidden, true);

  fixture.setRadio("sick-mode", "current");
  fixture.form.dispatch("change", fixture.get("sick-mode-group"));
  assert.equal(fixture.get("sick-hours-field").hidden, false);
  assert.equal(fixture.get("service-preview").hidden, true);

  fixture.get("sick-hours").value = "160";
  fixture.form.dispatch("input", fixture.get("sick-hours"));
  assert.equal(fixture.get("service-preview").hidden, false);

  fixture.setRadio("benefit-service-mode", "manual");
  fixture.form.dispatch("change", fixture.get("benefit-service-mode-group"));
  assert.equal(fixture.get("benefit-service-details").hidden, false);
  assert.equal(fixture.get("manual-service-fields").hidden, false);

  fixture.setRadio("salary-mode", "anticipated");
  fixture.form.dispatch("change", fixture.get("salary-mode-group"));
  assert.equal(fixture.get("salary-preview").hidden, true);

  fixture.get("retirement-year").value = "2030";
  fixture.get("anticipated-salary").value = "100000";
  fixture.form.dispatch("input", fixture.get("anticipated-salary"));
  assert.equal(fixture.get("salary-preview").hidden, false);
});

test("reveals salary structure fields and renders step progression", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);

  assert.equal(fixture.get("salary-structure-fields").hidden, true);
  fixture.setRadio("salary-mode", "structure");
  fixture.form.dispatch("change", fixture.get("salary-mode-group"));
  assert.equal(fixture.get("salary-structure-fields").hidden, false);

  fixture.get("current-rank").value = "f02";
  fixture.form.dispatch("change", fixture.get("current-rank"));
  assert.equal(fixture.get("current-step-field").hidden, false);
  assert.equal(fixture.get("current-exempt-salary-field").hidden, true);
  assert.equal(fixture.get("retirement-rank-field").hidden, false);
  assert.equal(fixture.get("merit-rate-field").hidden, true);

  fixture.get("retirement-year").value = "2028";
  fixture.get("current-step").value = "7";
  fixture.get("retirement-rank").value = "f02";
  fixture.form.dispatch("input", fixture.get("current-step"));

  assert.equal(fixture.get("promotion-date-fields").hidden, true);
  assert.equal(fixture.get("salary-preview").hidden, false);
  assert.equal(fixture.get("projected-salary").textContent, "$74,263.00");
  assert.equal(fixture.get("salary-position").textContent, "F02 - Step 8");
  assert.equal(
    fixture.get("salary-maximum").textContent,
    "Reached November 1, 2026",
  );
});

test("fetches Fire records without the typed name and imports only after confirmation", async (t) => {
  const requested = [];
  const fixture = await controllerFixture({
    fetch: async (url, options) => {
      requested.push({ url: String(url), options });
      return {
        ok: true,
        async json() {
          return {
            features: [
              {
                attributes: {
                  Name: "Smith, Jordan A.",
                  FirstName: "Jordan",
                  LastName: "Smith",
                  EmployeeTitle: "Fire Fighter",
                  SalaryRate: 56_434,
                },
              },
            ],
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
  assert.equal(fixture.get("salary-lookup-fields").hidden, false);
  assert.equal(fixture.get("current-rank-field").hidden, true);
  fixture.form.dispatch("submit");
  assert.equal(
    fixture.document.activeElement,
    fixture.get("employee-name-search"),
  );
  assert.match(
    fixture.get("salary-lookup-status").textContent,
    /search.*confirm/i,
  );

  fixture.get("employee-name-search").value = "jor sm";
  await fixture.get("search-current-records").dispatchAsync("click");

  assert.equal(requested.length, 1);
  assert.doesNotMatch(requested[0].url, /jor|smith/i);
  assert.match(requested[0].url, /DepartmentName/);
  assert.equal(requested[0].options.cache, "no-store");
  assert.equal(fixture.get("current-rank").value, "");
  assert.equal(fixture.get("salary-lookup-results").children.length, 1);
  assert.equal(
    fixture.document.activeElement,
    fixture.get("salary-lookup-results-heading"),
  );

  const resultButton = fixture
    .get("salary-lookup-results")
    .children[0].children[0];
  assert.equal(resultButton.getAttribute("aria-pressed"), "false");
  resultButton.dispatch("click");
  assert.equal(resultButton.getAttribute("aria-pressed"), "true");
  assert.match(resultButton.textContent, /selected/i);
  assert.equal(fixture.get("current-rank").value, "");
  assert.equal(
    fixture.document.activeElement,
    fixture.get("salary-lookup-confirmation-title"),
  );

  fixture.get("use-salary-record").dispatch("click");
  assert.equal(fixture.get("current-rank").value, "f02");
  assert.equal(fixture.get("current-step").value, "1");
  assert.equal(fixture.get("current-rank-field").hidden, false);
  assert.match(
    fixture.get("salary-lookup-status").textContent,
    /filled.*edit/i,
  );
});

test("paginates the ArcGIS response and reuses the roster for later searches", async (t) => {
  const pages = [
    {
      features: [
        {
          attributes: {
            Name: "Able, Ava",
            EmployeeTitle: "Fire Captain",
            SalaryRate: 83_540,
          },
        },
      ],
      exceededTransferLimit: true,
    },
    {
      features: [
        {
          attributes: {
            Name: "Baker, Ava",
            EmployeeTitle: "Fire Captain",
            SalaryRate: 83_540,
          },
        },
      ],
      exceededTransferLimit: false,
    },
  ];
  let requestCount = 0;
  const fixture = await controllerFixture({
    fetch: async () => ({
      ok: true,
      async json() {
        return pages[requestCount++];
      },
    }),
  });
  t.after(fixture.cleanup);

  fixture.get("employee-name-search").value = "able";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(requestCount, 2);
  assert.equal(fixture.get("salary-lookup-results").children.length, 1);

  fixture.get("employee-name-search").value = "baker";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(requestCount, 2);
  assert.equal(fixture.get("salary-lookup-results").children.length, 1);

  fixture.get("employee-name-search").value = "missing";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(requestCount, 2);
  assert.equal(fixture.get("salary-lookup-results").children.length, 0);
  assert.match(fixture.get("salary-lookup-status").textContent, /no matching/i);
});

test("rejects ArcGIS errors and malformed pages without changing fields", async (t) => {
  const payloads = [
    { error: { message: "service error" } },
    { features: [{ attributes: null }], exceededTransferLimit: false },
    {
      features: [
        {
          attributes: {
            Name: " ",
            EmployeeTitle: "Fire Fighter",
            SalaryRate: 56_434,
          },
        },
      ],
      exceededTransferLimit: false,
    },
    {
      features: [
        {
          attributes: {
            Name: "Smith, Jordan",
            EmployeeTitle: " ",
            SalaryRate: 56_434,
          },
        },
      ],
      exceededTransferLimit: false,
    },
    {
      features: [
        {
          attributes: {
            Name: "Smith, Jordan",
            EmployeeTitle: "Fire Fighter",
            SalaryRate: null,
          },
        },
      ],
      exceededTransferLimit: false,
    },
  ];
  let requestCount = 0;
  const fixture = await controllerFixture({
    fetch: async () => ({
      ok: true,
      async json() {
        return payloads[requestCount++];
      },
    }),
  });
  t.after(fixture.cleanup);
  fixture.get("employee-name-search").value = "smith";

  for (const _payload of payloads) {
    await fixture.get("search-current-records").dispatchAsync("click");
    assert.match(
      fixture.get("salary-lookup-status").textContent,
      /couldn't be loaded/i,
    );
    assert.equal(fixture.get("current-rank").value, "");
  }
  assert.equal(requestCount, payloads.length);
});

test("reset ignores a salary lookup response that finishes later", async (t) => {
  let resolvePayload;
  const payload = new Promise((resolve) => {
    resolvePayload = resolve;
  });
  const fixture = await controllerFixture({
    fetch: async () => ({
      ok: true,
      json: () => payload,
    }),
  });
  t.after(fixture.cleanup);

  fixture.get("employee-name-search").value = "smith";
  const search = fixture.get("search-current-records").dispatchAsync("click");
  fixture.get("clear-form-bottom").dispatch("click");
  resolvePayload({
    features: [
      {
        attributes: {
          Name: "Smith, Jordan",
          EmployeeTitle: "Fire Fighter",
          SalaryRate: 56_434,
        },
      },
    ],
    exceededTransferLimit: false,
  });
  await search;

  assert.equal(fixture.get("salary-lookup-status").textContent, "");
  assert.equal(fixture.get("salary-lookup-results").children.length, 0);
  assert.equal(fixture.get("salary-lookup-results-region").hidden, true);
});

test("validates lookup text and leaves manual entry available after an unmappable retry", async (t) => {
  let attempts = 0;
  const fixture = await controllerFixture({
    fetch: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return {
        ok: true,
        async json() {
          return {
            features: [
              {
                attributes: {
                  Name: "Outlier, Avery",
                  EmployeeTitle: "Fire Fighter",
                  SalaryRate: 76_906,
                },
              },
            ],
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

  fixture.get("employee-name-search").value = "a";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(attempts, 0);
  assert.match(fixture.get("salary-lookup-status").textContent, /two letters/i);

  fixture.get("employee-name-search").value = "outlier";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(attempts, 1);
  assert.match(fixture.get("salary-lookup-status").textContent, /couldn't be loaded/i);
  assert.equal(fixture.get("current-rank").value, "");

  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(attempts, 2);
  fixture
    .get("salary-lookup-results")
    .children[0].children[0].dispatch("click");
  assert.equal(fixture.get("use-salary-record").disabled, true);
  assert.match(fixture.get("salary-lookup-status").textContent, /couldn't match/i);

  fixture.setRadio("current-entry-mode", "manual");
  fixture.form.dispatch("change", fixture.get("current-entry-mode-group"));
  assert.equal(fixture.get("current-rank-field").hidden, false);
});

test("reset clears lookup identity while retaining the page-memory roster", async (t) => {
  let requestCount = 0;
  const fixture = await controllerFixture({
    fetch: async () => {
      requestCount += 1;
      return {
        ok: true,
        async json() {
          return {
            features: [
              {
                attributes: {
                  Name: "Smith, Jordan",
                  EmployeeTitle: "Fire Fighter",
                  SalaryRate: 56_434,
                },
              },
            ],
            exceededTransferLimit: false,
          };
        },
      };
    },
  });
  t.after(fixture.cleanup);

  fixture.get("employee-name-search").value = "smith";
  await fixture.get("search-current-records").dispatchAsync("click");
  fixture
    .get("salary-lookup-results")
    .children[0].children[0].dispatch("click");
  fixture.get("use-salary-record").dispatch("click");
  fixture.get("clear-form-bottom").dispatch("click");

  assert.equal(
    fixture.form.querySelector('input[name="current-entry-mode"]:checked').value,
    "manual",
  );
  assert.equal(fixture.get("employee-name-search").value, "");
  assert.equal(fixture.get("salary-lookup-results").children.length, 0);
  assert.equal(fixture.get("salary-lookup-confirmation").hidden, true);
  assert.equal(fixture.get("salary-lookup-status").textContent, "");
  assert.equal(fixture.get("current-rank").value, "");

  fixture.get("employee-name-search").value = "smith";
  await fixture.get("search-current-records").dispatchAsync("click");
  assert.equal(requestCount, 1);
});

test("opens, closes, and resets the salary structure dialog", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  const dialog = fixture.get("salary-structure-dialog");
  const opener = fixture.get("open-salary-structure");

  opener.dispatch("click");
  assert.equal(dialog.open, true);
  fixture.get("close-salary-structure").dispatch("click");
  assert.equal(dialog.open, false);
  assert.equal(fixture.document.activeElement, opener);

  opener.dispatch("click");
  fixture.get("clear-form-bottom").dispatch("click");
  assert.equal(dialog.open, false);
});

test("includes the active salary structure and approved assumptions", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");
  const normalized = html.replace(/\s+/g, " ");

  for (const fragment of [
    'id="open-salary-structure"',
    'id="salary-structure-dialog"',
    'id="close-salary-structure"',
    'id="nonexempt-salary-body"',
    'id="exempt-salary-body"',
    "FY 2025-2026 Fire Sworn Salary Structure",
    "Effective October 15, 2025",
    "Current sick hours are projected using your uncapped historical net rate.",
    "November 1 is used as the estimated annual raise date because the dates City Hall releases raises vary.",
    "Salary values use the FY 2025-2026 structure effective October 15, 2025 until this calculator is manually updated.",
  ]) {
    assert.ok(normalized.includes(fragment), fragment);
  }
  assert.match(css, /\.salary-dialog\s*\{/);
  assert.match(css, /\.table-scroll\s*\{[^}]*overflow-x:\s*auto;/s);
  assert.match(css, /\.salary-table\s*\{/);
});

test("controller gates allowance inputs and renders eligibility evidence", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");

  for (const fragment of [
    "evaluateEligibility",
    "buildEligibilityPreview",
    "syncEligibilityGate",
    'setHidden("benefit-service-section"',
    'setHidden("salary-section"',
    'setHidden("calculate-button"',
    "check.actual",
    "check.requirement",
    'element("edit-answers")',
    'element("result-title").focus()',
    'element("preview-status")',
    'otherMode === "no"',
  ]) {
    assert.ok(app.includes(fragment), "Missing eligibility gate hook: " + fragment);
  }
});

test("automatic eligibility waits for a settled edit before moving focus", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  fixture.setEligibilityInputs("1");
  const gfdYears = fixture.get("gfd-years");
  gfdYears.focus();

  fixture.form.dispatch("input", gfdYears);

  assert.equal(fixture.get("result").hidden, false);
  assert.equal(fixture.get("calculate-button").disabled, true);
  assert.equal(fixture.document.activeElement, gfdYears);

  fixture.form.dispatch("change", gfdYears);
  assert.equal(fixture.document.activeElement, fixture.get("result-title"));

  gfdYears.focus();
  fixture.form.dispatch("change", gfdYears);
  assert.equal(fixture.document.activeElement, gfdYears);
});

test("adding a second known failure updates the result without moving focus again", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  fixture.setEligibilityInputs("26");
  fixture.setRadio("regular-retirement", "no");

  fixture.form.dispatch("change", fixture.get("regular-retirement-group"));
  assert.equal(fixture.get("result-summary").textContent.startsWith("1 known"), true);
  assert.equal(fixture.document.activeElement, fixture.get("result-title"));

  fixture.setRadio("continuous-gfd", "no");
  const continuousGroup = fixture.get("continuous-gfd-group");
  continuousGroup.focus();
  fixture.form.dispatch("change", continuousGroup);

  assert.equal(fixture.get("result-summary").textContent.startsWith("2 known"), true);
  assert.equal(fixture.document.activeElement, continuousGroup);
});

test("automatic eligibility blocks implicit submission without replacing its result", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  fixture.setEligibilityInputs("1");
  fixture.form.dispatch("input", fixture.get("gfd-years"));

  const event = fixture.form.dispatch("submit");

  assert.equal(event.defaultPrevented, true);
  assert.equal(fixture.get("calculate-button").disabled, true);
  assert.equal(fixture.get("result").hidden, false);
  assert.equal(fixture.get("result").dataset.mode, "automatic");
  assert.equal(fixture.get("error-summary").hidden, true);
});

test("editing an eligible submission clears stale allowance totals", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  fixture.setEligibilityInputs("26");
  fixture.setAllowanceInputs();

  fixture.form.dispatch("submit");
  assert.equal(fixture.get("result").dataset.mode, "submitted");
  assert.equal(fixture.get("result").hidden, false);

  const salary = fixture.get("anticipated-salary");
  salary.value = "101000";
  salary.focus();
  fixture.form.dispatch("input", salary);

  assert.equal(fixture.get("result").hidden, true);
  assert.equal(fixture.get("result").dataset.mode, "");
  assert.equal(fixture.document.activeElement, salary);
});

test("correcting a failure clears its historical Change answers target", async (t) => {
  const fixture = await controllerFixture();
  t.after(fixture.cleanup);
  fixture.setEligibilityInputs("1");
  fixture.setAllowanceInputs();
  fixture.form.dispatch("change", fixture.get("gfd-years"));

  fixture.get("gfd-years").value = "26";
  fixture.form.dispatch("change", fixture.get("gfd-years"));
  fixture.form.dispatch("submit");
  fixture.get("edit-answers").dispatch("click");

  assert.equal(
    fixture.document.activeElement,
    fixture.get("retirement-year"),
  );

  fixture.get("gfd-years").value = "1";
  fixture.form.dispatch("change", fixture.get("gfd-years"));
  fixture.get("start-over").dispatch("click");
  fixture.setEligibilityInputs("26");
  fixture.setAllowanceInputs();
  fixture.form.dispatch("submit");
  fixture.get("edit-answers").dispatch("click");

  assert.equal(
    fixture.document.activeElement,
    fixture.get("retirement-year"),
  );
});

test("uses approved creditable-service copy and defaults", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const normalizedHtml = html.replace(/\s+/g, " ");

  for (const fragment of [
    "Creditable service used for the allowance",
    "Projected GFD service + other LGERS service + sick-leave service credit = creditable service.",
    "Which creditable service should the allowance calculation use?",
    "Use calculated creditable service",
    "Enter separate creditable service",
    "This value changes the allowance calculation only, not eligibility.",
  ]) {
    assert.ok(
      normalizedHtml.includes(fragment),
      "Missing approved copy: " + fragment,
    );
  }

  assert.doesNotMatch(html, /benefit service|benefit equation|payment equation/i);
  assert.match(html, /id="gfd-months"[\s\S]{0,180}value="0"/);
  assert.match(html, /id="other-months"[\s\S]{0,180}value="0"/);
  assert.match(html, /id="benefit-months"[\s\S]{0,180}value="0"/);
  assert.match(
    html,
    /<button id="calculate-button" class="primary-button" type="submit">\s*Calculate my allowance estimate\s*<\/button>/,
  );

  for (const fragment of [
    "Eligibility",
    "Creditable service",
    "Allowance estimate",
    "Total Creditable Service",
    "Sick hours to Creditable Service",
  ]) {
    assert.ok(
      normalizedHtml.includes(fragment),
      "Missing worksheet copy: " + fragment,
    );
  }

  assert.match(
    html,
    /<ol class="form-stages" aria-label="How the estimate is built">/,
  );
  assert.match(html, /class="section-heading"/);
  assert.match(html, /class="form-group"/);
});

test("rank choices show grade and label without starting pay", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");
  assert.ok(app.includes('"F" + String(details.grade).padStart(2, "0")'));
  assert.ok(
    !app.includes('details.label + " - " + currency.format(details.salary)'),
  );
});

test("form previews are white while result breakdowns keep their surface", async () => {
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");
  assert.match(
    css,
    /\.benefit-totals,\s*\.calculation-breakdown\s*\{[\s\S]*?background: var\(--surface\);/,
  );
  assert.doesNotMatch(css, /\.derived-values[^\{]*\{[^}]*background:/);
});

test("styles include focus, responsive, and reduced-motion safeguards", async () => {
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");

  for (const fragment of [
    ":focus-visible",
    "min-block-size: 44px",
    "clip-path: inset(50%)",
    "@media (max-width: 640px)",
    "@media (prefers-reduced-motion: reduce)",
    "oklch(",
    ".form-subheading",
    ".visually-hidden",
    ".allowance-primary",
    ".result--ineligible .status--pass",
    ".assumptions summary::before",
  ]) {
    assert.ok(css.includes(fragment), "Missing CSS safeguard: " + fragment);
  }
});

test("the copied Local 947 logo exists", async () => {
  await access(new URL("assets/local-947-logo.png", rootUrl));
});

test("focus uses brand-aware two-color contrast on every calculator surface", async () => {
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");

  assert.match(css, /--focus:\s*oklch\(/);
  assert.match(css, /--navy:\s*oklch\(/);
  assert.match(
    css,
    /:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--focus\);[^}]*box-shadow:\s*0 0 0 7px var\(--navy\);[^}]*\}/s,
  );
});

test("uses allowance copy, official guidance, and the approved result order", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const normalized = html.replace(/\s+/g, " ");

  for (const fragment of [
    "Local Governmental Employees’ Retirement System (LGERS)",
    "Calculate my allowance estimate",
    "Estimated gross biweekly allowance",
    "Estimated annual allowance",
    "Estimated total allowance",
    "Reloading this page clears your entries",
    "Member Handbook (opens in a new tab)",
    'id="benefit-service-section"',
    'id="salary-section"',
    'id="calculate-button"',
    'id="edit-answers"',
    'id="preview-status"',
  ]) {
    assert.ok(normalized.includes(fragment), "Missing interface copy: " + fragment);
  }

  assert.ok(
    html.indexOf("Estimated gross biweekly allowance") <
      html.indexOf("Estimated annual allowance"),
  );
  assert.ok(
    html.indexOf("Estimated annual allowance") <
      html.indexOf("Estimated total allowance"),
  );
  assert.ok(
    normalized.indexOf("Local Governmental Employees") <
      normalized.indexOf("LGERS"),
    "The first visible LGERS use must expand the acronym",
  );
  assert.doesNotMatch(normalized, /\u00e2\u20ac\u2122/);
  assert.match(
    html,
    /href="https:\/\/www\.myncretirement\.gov\/systems-funds\/local-governmental-employees-retirement-system-lgers\/lgers-handbook"[^>]*target="_blank"[^>]*rel="noopener"/,
  );
  assert.doesNotMatch(
    normalized,
    />[^<]*\bbenefit(s)?\b[^<]*</i,
    "Visible interface copy must use allowance",
  );

  assert.equal(
    (html.match(/class="estimate-notice(?: estimate-notice--result)?"/g) ?? [])
      .length,
    2,
  );
  assert.equal(
    (html.match(/Information provided by this calculator is an estimate only\./g) ?? [])
      .length,
    2,
  );
});

test("uses approved progressive disclosure layout and copy", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const css = await readFile(new URL("styles.css", rootUrl), "utf8");
  const normalizedHtml = html.replace(/\s+/g, " ");
  const normalizeText = (value) =>
    value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const notices = [...html.matchAll(/<aside class="estimate-notice[^"]*">([\s\S]*?)<\/aside>/g)]
    .map((match) => normalizeText(match[1]));

  assert.deepEqual(notices, [
    "Estimate only. Information provided by this calculator is an estimate only. It is not an official allowance determination.",
    "Estimate only. Information provided by this calculator is an estimate only. It is not an official allowance determination.",
  ]);
  assert.match(
    html,
    /class="field field--compact"[\s\S]*?for="retirement-year"/,
  );
  for (const id of [
    "service-preview",
    "benefit-service-details",
    "salary-preview",
  ]) {
    assert.match(
      html,
      new RegExp('id="' + id + '"[^>]*class="[^"]*calculation-panel'),
    );
  }
  assert.ok(
    normalizedHtml.includes(
      "Current sick hours are projected using your uncapped historical net rate. The rate is based on current sick hours and completed GFD and other LGERS service, then applied through retirement.",
    ),
  );
  assert.ok(!normalizedHtml.includes("caps that rate at 96 hours per year"));
  assert.match(css, /\.form-subheading\s*\{[^}]*text-align:\s*center;/s);
  assert.match(css, /\.field--compact\s*\{[^}]*max-width:\s*18rem;/s);
  assert.match(
    css,
    /\.calculation-panel\s*\{[^}]*background:\s*var\(--surface\);[^}]*border:\s*1px solid var\(--border\);/s,
  );
  assert.match(
    css,
    /\.estimate-notice\s*\{[^}]*color:\s*var\(--red\);[^}]*background:\s*var\(--red-soft\);[^}]*border:[^;]*var\(--red\);/s,
  );
});

test("uses one preview status region and accessible result focus", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");

  assert.doesNotMatch(html, /<dl[^>]*aria-live=/);
  assert.match(
    html,
    /id="preview-status"[^>]*aria-live="polite"[^>]*aria-atomic="true"/,
  );
  assert.match(html, /<h2 id="result-title" tabindex="-1"><\/h2>/);
  assert.doesNotMatch(html, /id="result"[^>]*aria-live=/);
});

test("README documents test, preview, privacy, and maintenance", async () => {
  const readme = await readFile(new URL("README.md", rootUrl), "utf8");

  for (const fragment of [
    "node --test",
    "http.server 8080",
    "No entered data is stored or transmitted",
    "SALARY_STRUCTURE",
    "BENEFIT_MULTIPLIER",
  ]) {
    assert.ok(readme.includes(fragment), "Missing README detail: " + fragment);
  }
});
