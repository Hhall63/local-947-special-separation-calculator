import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const rootUrl = new URL("../", import.meta.url);

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
  assert.ok(html.includes('src="assets/local-947-logo.png"'));
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
