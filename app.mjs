import {
  RANK_SALARIES,
  ageAtRetirement,
  calculateEstimate,
  calculateRetirementSalary,
  calculateService,
  evaluateEligibility,
  formatServiceYears,
  toServiceYears,
  validateInput,
} from "./calculator.mjs";

const form = document.querySelector("#calculator-form");
const errorSummary = document.querySelector("#error-summary");
const errorList = document.querySelector("#error-list");
const result = document.querySelector("#result");
const benefitResults = document.querySelector("#benefit-results");

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const errorTargets = {
  "retirement-year": "retirement-year",
  "birth-month": "birth-month",
  "birth-year": "birth-year",
  "regular-retirement": "regular-retirement-group",
  "continuous-gfd": "continuous-gfd-group",
  "gfd-years": "gfd-years",
  "gfd-months": "gfd-months",
  "other-lgers": "other-lgers-group",
  "other-years": "other-years",
  "other-months": "other-months",
  "sick-mode": "sick-mode-group",
  "sick-hours": "sick-hours",
  "benefit-service-mode": "benefit-service-mode-group",
  "benefit-years": "benefit-years",
  "benefit-months": "benefit-months",
  "salary-mode": "salary-mode-group",
  "anticipated-salary": "anticipated-salary",
  "current-salary": "current-salary",
  rank: "rank",
  "promotion-month": "promotion-month",
  "promotion-year": "promotion-year",
};

const serviceErrorKeys = new Set([
  "retirement-year",
  "gfd-years",
  "gfd-months",
  "other-lgers",
  "other-years",
  "other-months",
  "sick-mode",
  "sick-hours",
]);

const salaryErrorKeys = new Set([
  "retirement-year",
  "salary-mode",
  "anticipated-salary",
  "current-salary",
  "rank",
  "promotion-month",
  "promotion-year",
]);

function element(id) {
  return document.getElementById(id);
}

function radioValue(name) {
  return form.querySelector('input[name="' + name + '"]:checked')?.value;
}

function booleanChoice(name) {
  const value = radioValue(name);
  return value === undefined ? undefined : value === "yes";
}

function numberValue(id) {
  const input = element(id);
  return input.value === "" ? Number.NaN : Number(input.value);
}

function serviceValue(yearsId, monthsId) {
  return {
    years: numberValue(yearsId),
    months: numberValue(monthsId),
  };
}

function collectInput() {
  const otherMode = radioValue("other-lgers");
  const sickMode = radioValue("sick-mode");
  const benefitMode = radioValue("benefit-service-mode");
  const salaryMode = radioValue("salary-mode");
  let salary;

  if (salaryMode === "rank") {
    salary = {
      mode: salaryMode,
      rank: element("rank").value,
      promotionMonth: numberValue("promotion-month"),
      promotionYear: numberValue("promotion-year"),
    };
  } else {
    salary = {
      mode: salaryMode,
      amount:
        salaryMode === "anticipated"
          ? numberValue("anticipated-salary")
          : numberValue("current-salary"),
    };
  }

  return {
    retirementYear: numberValue("retirement-year"),
    birthMonth: numberValue("birth-month"),
    birthYear: numberValue("birth-year"),
    regularServiceRetirement: booleanChoice("regular-retirement"),
    continuousGfd: booleanChoice("continuous-gfd"),
    currentGfd: serviceValue("gfd-years", "gfd-months"),
    otherLgers:
      otherMode === "yes"
        ? serviceValue("other-years", "other-months")
        : otherMode === "no"
          ? null
          : undefined,
    sick: { mode: sickMode, hours: numberValue("sick-hours") },
    benefitService:
      benefitMode === "manual"
        ? {
            mode: benefitMode,
            ...serviceValue("benefit-years", "benefit-months"),
          }
        : { mode: benefitMode },
    salary,
  };
}

function setHidden(id, hidden) {
  element(id).hidden = hidden;
}

function updateConditionalFields() {
  setHidden("other-service-fields", radioValue("other-lgers") !== "yes");
  setHidden(
    "manual-service-fields",
    radioValue("benefit-service-mode") !== "manual",
  );

  const salaryMode = radioValue("salary-mode");
  setHidden("anticipated-salary-field", salaryMode !== "anticipated");
  setHidden("current-salary-field", salaryMode !== "current");
  setHidden("rank-fields", salaryMode !== "rank");

  const sickMode = radioValue("sick-mode");
  element("sick-hours-label").textContent =
    sickMode === "current"
      ? "Current sick hours"
      : sickMode === "retirement"
        ? "Sick hours expected at retirement"
        : "Sick hours";
}

function populateChoices() {
  const rank = element("rank");
  for (const [value, details] of Object.entries(RANK_SALARIES)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = details.label;
    rank.append(option);
  }

  const promotionMonth = element("promotion-month");
  months.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = label;
    promotionMonth.append(option);
  });
}

function clearErrors() {
  errorSummary.hidden = true;
  errorList.replaceChildren();
  document.querySelectorAll(".field-error").forEach((node) => node.remove());
  document.querySelectorAll("[aria-invalid]").forEach((node) => {
    node.removeAttribute("aria-invalid");
    node.removeAttribute("aria-describedby");
  });
}

function showErrors(errors) {
  clearErrors();
  const entries = Object.entries(errors);
  if (entries.length === 0) return;

  for (const [key, message] of entries) {
    const targetId = errorTargets[key] ?? key;
    const target = element(targetId);
    const controls = target.matches("input, select, button")
      ? [target]
      : [...target.querySelectorAll("input, select, button")];
    const control = controls[0] ?? target;
    const errorId = targetId + "-error";
    const error = document.createElement("p");
    error.id = errorId;
    error.className = "field-error";
    error.textContent = message;
    target.insertAdjacentElement("afterend", error);
    for (const itemControl of controls) {
      itemControl.setAttribute("aria-invalid", "true");
      itemControl.setAttribute("aria-describedby", errorId);
    }

    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + targetId;
    link.textContent = message;
    link.addEventListener("click", () => {
      requestAnimationFrame(() => control.focus());
    });
    item.append(link);
    errorList.append(item);
  }

  errorSummary.hidden = false;
  errorSummary.focus();
}

function clearPreview() {
  for (const id of [
    "projected-sick-hours",
    "sick-service",
    "projected-gfd-service",
    "eligibility-service",
    "benefit-service-value",
    "projected-salary",
  ]) {
    element(id).textContent = "-";
  }
}

function hasAnyError(errors, keys) {
  return Object.keys(errors).some((key) => keys.has(key));
}

let automaticFailureSignature = "";
let firstFailedTargetId = "retirement-year";

const ageErrorKeys = new Set([
  "retirement-year",
  "birth-month",
  "birth-year",
]);

function buildEligibilityPreview(input, errors, service) {
  const retirementAge = hasAnyError(errors, ageErrorKeys)
    ? undefined
    : ageAtRetirement({
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        retirementYear: input.retirementYear,
      });

  return {
    retirementAge,
    eligibility: evaluateEligibility({
      retirementAge,
      regularServiceRetirement: input.regularServiceRetirement,
      continuousGfd: input.continuousGfd,
      projectedGfdYears: service?.projectedGfdYears,
      eligibilityServiceYears: service?.eligibilityServiceYears,
    }),
  };
}

function syncEligibilityGate(eligibility, service, retirementAge) {
  const failedChecks = eligibility.checks.filter(
    (check) => check.passed === false,
  );
  const failed = failedChecks.length > 0;

  setHidden("benefit-service-section", failed);
  setHidden("salary-section", failed);
  setHidden("calculate-button", failed);

  if (!failed) {
    automaticFailureSignature = "";
    if (result.dataset.mode === "automatic") {
      result.hidden = true;
      result.dataset.mode = "";
    }
    return;
  }

  const signature = failedChecks.map((check) => check.key).join("|");
  firstFailedTargetId = failedChecks[0].targetId;
  renderResult(
    {
      eligibility: {
        ...eligibility,
        eligible: false,
        checks: eligibility.checks.filter((check) => check.passed !== null),
      },
      service,
      retirementAge,
      benefit: null,
    },
    {
      automatic: true,
      focus: signature !== automaticFailureSignature,
    },
  );
  automaticFailureSignature = signature;
}

function renderPreview(announce = false) {
  updateConditionalFields();
  const input = collectInput();
  const errors = validateInput(input);
  const service = hasAnyError(errors, serviceErrorKeys)
    ? null
    : calculateService(input);
  const preview = buildEligibilityPreview(input, errors, service);
  syncEligibilityGate(
    preview.eligibility,
    service,
    preview.retirementAge,
  );

  element("projected-sick-hours").textContent = service
    ? Math.round(service.retirementSickHours).toLocaleString() + " hours"
    : "-";
  element("sick-service").textContent = service
    ? formatServiceYears(service.sickServiceYears)
    : "-";
  element("projected-gfd-service").textContent = service
    ? formatServiceYears(service.projectedGfdYears)
    : "-";
  element("eligibility-service").textContent = service
    ? formatServiceYears(service.eligibilityServiceYears)
    : "-";

  let creditableYears = null;
  if (
    input.benefitService.mode === "manual" &&
    !errors["benefit-years"] &&
    !errors["benefit-months"]
  ) {
    creditableYears = toServiceYears(input.benefitService);
  } else if (
    input.benefitService.mode === "calculated" &&
    service
  ) {
    creditableYears = service.eligibilityServiceYears;
  }
  element("benefit-service-value").textContent =
    creditableYears === null ? "-" : formatServiceYears(creditableYears);

  element("projected-salary").textContent = hasAnyError(
    errors,
    salaryErrorKeys,
  )
    ? "-"
    : currency.format(calculateRetirementSalary(input));

  if (announce) {
    const updated = [];
    if (service) updated.push("service");
    if (creditableYears !== null) updated.push("creditable service");
    if (!hasAnyError(errors, salaryErrorKeys)) updated.push("salary");
    element("preview-status").textContent = updated.length
      ? "Updated " + updated.join(", ") + " estimates."
      : "";
  }
}

function renderResult(estimate, { automatic = false, focus = true } = {}) {
  const eligible = estimate.eligibility.eligible;
  result.classList.toggle("result--eligible", eligible);
  result.classList.toggle("result--ineligible", !eligible);
  result.dataset.mode = automatic ? "automatic" : "submitted";

  element("result-title").textContent = eligible
    ? "You appear eligible for the allowance"
    : "You do not appear eligible for the allowance";

  const failedCount = estimate.eligibility.checks.filter(
    (check) => check.passed === false,
  ).length;
  element("result-summary").textContent = eligible
    ? "Your entries pass every listed eligibility requirement."
    : failedCount +
      " known eligibility requirement" +
      (failedCount === 1 ? " did" : "s did") +
      " not pass. Change your answers if any entry is incorrect.";

  const checks = [...estimate.eligibility.checks].sort(
    (left, right) => Number(left.passed) - Number(right.passed),
  );
  const list = element("requirements-results");
  list.replaceChildren();
  for (const check of checks) {
    const item = document.createElement("li");
    item.className = check.passed
      ? "status status--pass"
      : "status status--fail";
    const icon = document.createElement("span");
    icon.className = "status-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = check.passed ? "✓" : "×";
    const copy = document.createElement("span");
    copy.className = "status-copy";
    const label = document.createElement("strong");
    label.textContent = check.label + (check.passed ? " — passed" : " — failed");
    const evidence = document.createElement("span");
    evidence.className = "status-evidence";
    evidence.textContent =
      "Your result: " + check.actual + ". Requirement: " + check.requirement + ".";
    copy.append(label, evidence);
    item.append(icon, copy);
    list.append(item);
  }

  benefitResults.hidden = !eligible;
  if (estimate.benefit) {
    element("biweekly-benefit").textContent = currency.format(
      estimate.benefit.biweekly,
    );
    element("annual-benefit").textContent = currency.format(
      estimate.benefit.annual,
    );
    element("total-benefit").textContent = currency.format(
      estimate.benefit.total,
    );
    element("allowance-coverage").textContent =
      "Covers " +
      estimate.coveredMonths +
      " months, from February " +
      estimate.coverage.startYear +
      " through the end of " +
      months[estimate.coverage.endMonth - 1] +
      " " +
      estimate.coverage.endYear +
      ".";
    element("breakdown-salary").textContent = currency.format(
      estimate.retirementSalary,
    );
    element("breakdown-service").textContent = formatServiceYears(
      estimate.service.benefitServiceYears,
    );
    element("breakdown-months").textContent = String(estimate.coveredMonths);
  }

  result.hidden = false;
  if (focus) element("result-title").focus();
}

form.addEventListener("input", () => renderPreview(false));
form.addEventListener("change", () => renderPreview(true));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = collectInput();
  const errors = validateInput(input);

  if (Object.keys(errors).length > 0) {
    result.hidden = true;
    showErrors(errors);
    return;
  }

  clearErrors();
  renderResult(calculateEstimate(input));
});

element("edit-answers").addEventListener("click", () => {
  result.hidden = true;
  const target = element(firstFailedTargetId);
  const control = target.matches("input, select, button")
    ? target
    : target.querySelector("input, select, button") ?? target;
  control.focus();
});

element("start-over").addEventListener("click", () => {
  form.reset();
  clearErrors();
  clearPreview();
  result.hidden = true;
  automaticFailureSignature = "";
  setHidden("benefit-service-section", false);
  setHidden("salary-section", false);
  setHidden("calculate-button", false);
  updateConditionalFields();
  element("retirement-year").focus();
});

populateChoices();
updateConditionalFields();
