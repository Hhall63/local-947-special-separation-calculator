import {
  RANK_SALARIES,
  calculateEstimate,
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
        : otherMode === "na"
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

function serviceText(years) {
  const totalMonths = Math.round(years * 12);
  const wholeYears = Math.floor(totalMonths / 12);
  const monthsOnly = totalMonths % 12;
  return wholeYears + " years, " + monthsOnly + " months";
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
    const control = target.matches("input, select, button")
      ? target
      : target.querySelector("input, select, button") ?? target;
    const errorId = targetId + "-error";
    const error = document.createElement("p");
    error.id = errorId;
    error.className = "field-error";
    error.textContent = message;
    target.insertAdjacentElement("afterend", error);
    control.setAttribute("aria-invalid", "true");
    control.setAttribute("aria-describedby", errorId);

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

function renderPreview() {
  updateConditionalFields();
  const input = collectInput();
  const errors = validateInput(input);

  if (Object.keys(errors).length > 0) {
    clearPreview();
    return;
  }

  const estimate = calculateEstimate(input);
  element("projected-sick-hours").textContent =
    Math.round(estimate.service.retirementSickHours).toLocaleString() +
    " hours";
  element("sick-service").textContent =
    serviceText(estimate.service.sickServiceYears);
  element("projected-gfd-service").textContent =
    serviceText(estimate.service.projectedGfdYears);
  element("eligibility-service").textContent =
    serviceText(estimate.service.eligibilityServiceYears);
  element("benefit-service-value").textContent =
    serviceText(estimate.service.benefitServiceYears);
  element("projected-salary").textContent =
    currency.format(estimate.retirementSalary);
}

function renderResult(estimate) {
  result.classList.toggle(
    "result--eligible",
    estimate.eligibility.eligible,
  );
  result.classList.toggle(
    "result--ineligible",
    !estimate.eligibility.eligible,
  );
  element("result-title").textContent = estimate.eligibility.eligible
    ? "You appear eligible"
    : "You do not appear eligible";
  element("result-summary").textContent = estimate.eligibility.eligible
    ? "All listed eligibility requirements passed."
    : "One or more eligibility requirements did not pass.";

  const list = element("requirements-results");
  list.replaceChildren();
  for (const check of estimate.eligibility.checks) {
    const item = document.createElement("li");
    item.className = check.passed
      ? "status status--pass"
      : "status status--fail";
    const icon = document.createElement("span");
    icon.className = "status-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = check.passed ? "✓" : "×";
    item.append(icon, document.createTextNode(check.label));
    list.append(item);
  }

  benefitResults.hidden = !estimate.eligibility.eligible;
  if (estimate.benefit) {
    element("annual-benefit").textContent = currency.format(
      estimate.benefit.annual,
    );
    element("biweekly-benefit").textContent = currency.format(
      estimate.benefit.biweekly,
    );
    element("total-benefit").textContent = currency.format(
      estimate.benefit.total,
    );
    element("breakdown-salary").textContent = currency.format(
      estimate.retirementSalary,
    );
    element("breakdown-service").textContent = serviceText(
      estimate.service.benefitServiceYears,
    );
    element("breakdown-months").textContent = String(estimate.coveredMonths);
  }

  result.hidden = false;
  result.focus();
}

form.addEventListener("input", renderPreview);
form.addEventListener("change", renderPreview);
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

element("start-over").addEventListener("click", () => {
  form.reset();
  clearErrors();
  clearPreview();
  result.hidden = true;
  updateConditionalFields();
  element("retirement-year").focus();
});

populateChoices();
updateConditionalFields();
