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

test("uses approved creditable-years copy and defaults", async () => {
  const html = await readFile(new URL("index.html", rootUrl), "utf8");
  const normalizedHtml = html.replace(/\s+/g, " ");

  for (const fragment of [
    "Creditable years of service",
    "Projected GFD service + other LGERS service + sick-leave service credit = creditable years of service",
    "Which creditable years of service should the SSA equation use?",
    "Use calculated creditable years of service",
    "Enter separate creditable years of service",
    "Creditable years of service used",
    "This value changes the SSA equation only, not eligibility.",
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
    /<button class="primary-button" type="submit">\s*Submit\s*<\/button>/,
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
  ]) {
    assert.ok(css.includes(fragment), "Missing CSS safeguard: " + fragment);
  }
});

test("the copied Local 947 logo exists", async () => {
  await access(new URL("assets/local-947-logo.png", rootUrl));
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
