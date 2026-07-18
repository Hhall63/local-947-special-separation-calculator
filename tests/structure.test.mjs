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
