import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url);

let controllerFixtureId = 0;

async function controllerFixture() {
  let document;
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
    "current-salary": "input",
    rank: "select",
    "promotion-month": "select",
    "promotion-year": "input",
    "calculate-button": "button",
    "edit-answers": "button",
    "start-over": "button",
  };

  class FakeElement {
    constructor(id = "", tagName = "div") {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this.value = "";
      this.defaultValue = "";
      this.hidden = false;
      this.disabled = false;
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

    removeAttribute(name) {
      this.attributes.delete(name);
    }

    insertAdjacentElement(_position, child) {
      this.children.push(child);
    }

    remove() {}

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

    focus() {
      document.activeElement = this;
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
    "current",
    "rank",
  ]);

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

  globalThis.document = document;
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
    'id="rank-fields"',
    'id="result"',
    'aria-live="polite"',
    'src="app.mjs"',
  ]) {
    assert.ok(html.includes(fragment), "Missing HTML fragment: " + fragment);
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

test("browser controller wires validation, calculation, results, and reset", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");

  for (const fragment of [
    "validateInput",
    "calculateEstimate",
    "updateConditionalFields",
    "renderPreview",
    "renderResult",
    'element("start-over")',
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
});

test("rank choices show labels without starting pay", async () => {
  const app = await readFile(new URL("app.mjs", rootUrl), "utf8");
  assert.ok(app.includes("option.textContent = details.label;"));
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
    "official LGERS Member Handbook (opens in a new tab)",
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
    /href="https:\/\/www\.myncretirement\.com\/documents\/files\/actives\/lgers-handbook\/open"[^>]*target="_blank"[^>]*rel="noopener"/,
  );
  assert.doesNotMatch(
    normalized,
    />[^<]*\bbenefit(s)?\b[^<]*</i,
    "Visible interface copy must use allowance",
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
    "RANK_SALARIES",
    "BENEFIT_MULTIPLIER",
  ]) {
    assert.ok(readme.includes(fragment), "Missing README detail: " + fragment);
  }
});
