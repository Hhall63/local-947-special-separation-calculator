import {
  SALARY_STRUCTURE,
  ageAtRetirement,
  calculateEstimate,
  calculateRetirementSalary,
  calculateService,
  evaluateEligibility,
  formatServiceYears,
  isExemptRank,
  projectStructuredSalary,
  retirementDateForYear,
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
const hoursFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});
const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function nonnegativeHoursForDisplay(hours) {
  const ceiling = Math.ceil(hours);
  if (hours >= ceiling - 1e-9) return ceiling;

  const hundredths = hours * 100;
  return Math.floor(
    hundredths + Number.EPSILON * Math.abs(hundredths),
  ) / 100;
}

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
  "current-rank": "current-rank",
  "current-step": "current-step",
  "current-exempt-salary": "current-exempt-salary",
  "retirement-rank": "retirement-rank",
  "promotion-month": "promotion-month",
  "promotion-year": "promotion-year",
  "merit-rate": "merit-rate",
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
  "current-rank",
  "current-step",
  "current-exempt-salary",
  "retirement-rank",
  "promotion-month",
  "promotion-year",
  "merit-rate",
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

  if (salaryMode === "structure") {
    salary = {
      mode: salaryMode,
      currentRank: element("current-rank").value,
      currentStep: numberValue("current-step"),
      currentSalary: numberValue("current-exempt-salary"),
      retirementRank: element("retirement-rank").value,
      promotionMonth: numberValue("promotion-month"),
      promotionYear: numberValue("promotion-year"),
      meritRate: numberValue("merit-rate"),
    };
  } else {
    salary = {
      mode: salaryMode,
      amount: numberValue("anticipated-salary"),
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

function hasNonnegativeInput(id) {
  const value = element(id).value.trim();
  return value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function updateConditionalFields(errors) {
  setHidden("other-service-fields", radioValue("other-lgers") !== "yes");
  const benefitMode = radioValue("benefit-service-mode");
  setHidden(
    "manual-service-fields",
    benefitMode !== "manual",
  );
  setHidden("benefit-service-details", !benefitMode);

  const salaryMode = radioValue("salary-mode");
  setHidden("anticipated-salary-field", salaryMode !== "anticipated");
  const structureMode = salaryMode === "structure";
  setHidden("salary-structure-fields", !structureMode);
  const currentRank = element("current-rank").value;
  const retirementRank = element("retirement-rank").value;
  const currentDetails = SALARY_STRUCTURE[currentRank];
  const retirementDetails = SALARY_STRUCTURE[retirementRank];
  populateStepChoices(currentRank);
  setHidden(
    "current-step-field",
    !structureMode || currentDetails?.type !== "nonexempt",
  );
  setHidden(
    "current-exempt-salary-field",
    !structureMode || currentDetails?.type !== "exempt",
  );
  setHidden("retirement-rank-field", !structureMode || !currentDetails);
  setHidden(
    "promotion-date-fields",
    !structureMode ||
      !currentDetails ||
      !retirementDetails ||
      currentRank === retirementRank,
  );
  setHidden(
    "merit-rate-field",
    !structureMode ||
      (!isExemptRank(currentRank) && !isExemptRank(retirementRank)),
  );
  setHidden(
    "salary-preview",
    !errors || !salaryMode || hasAnyError(errors, salaryErrorKeys),
  );

  const sickMode = radioValue("sick-mode");
  setHidden("sick-hours-field", !sickMode);
  setHidden(
    "service-preview",
    !sickMode || !hasNonnegativeInput("sick-hours"),
  );
  element("sick-hours-label").textContent =
    sickMode === "current"
      ? "Current sick hours"
      : sickMode === "retirement"
        ? "Sick hours expected at retirement"
        : "Sick hours";
}

function populateStepChoices(rank) {
  const select = element("current-step");
  if (select.dataset.rank === rank) return;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select current step";
  select.replaceChildren(placeholder);
  const details = SALARY_STRUCTURE[rank];
  if (details?.type === "nonexempt") {
    details.steps.forEach((salary, index) => {
      const option = document.createElement("option");
      option.value = String(index + 1);
      option.textContent =
        "Step " + (index + 1) + " - " + currency.format(salary);
      select.append(option);
    });
  }
  select.value = "";
  select.dataset.rank = rank;
}

function populateChoices() {
  for (const selectId of ["current-rank", "retirement-rank"]) {
    const select = element(selectId);
    for (const [value, details] of Object.entries(SALARY_STRUCTURE)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent =
        "F" + String(details.grade).padStart(2, "0") + " - " + details.label;
      select.append(option);
    }
  }

  const promotionMonth = element("promotion-month");
  months.forEach((label, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1);
    option.textContent = label;
    promotionMonth.append(option);
  });
}

function appendTableCell(row, tag, text, scope) {
  const cell = document.createElement(tag);
  cell.textContent = text;
  if (scope) cell.setAttribute("scope", scope);
  row.append(cell);
}

function populateSalaryStructureDialog() {
  const nonexemptBody = element("nonexempt-salary-body");
  const exemptBody = element("exempt-salary-body");
  for (const details of Object.values(SALARY_STRUCTURE)) {
    const row = document.createElement("tr");
    appendTableCell(
      row,
      "th",
      "F" + String(details.grade).padStart(2, "0"),
      "row",
    );
    appendTableCell(row, "td", details.label);
    if (details.type === "nonexempt") {
      for (let index = 0; index < 8; index += 1) {
        appendTableCell(
          row,
          "td",
          details.steps[index] ? currency.format(details.steps[index]) : "-",
        );
      }
      appendTableCell(
        row,
        "td",
        details.rangeMax ? currency.format(details.rangeMax) : "-",
      );
      nonexemptBody.append(row);
    } else {
      for (const value of [
        details.rangeMin,
        details.greenMin,
        details.controlPoint,
        details.greenMax,
        details.rangeMax,
      ]) {
        appendTableCell(row, "td", currency.format(value));
      }
      exemptBody.append(row);
    }
  }
}

function clearErrors() {
  errorSummary.hidden = true;
  errorList.replaceChildren();
  document.querySelectorAll(".field-error").forEach((node) => node.remove());
  document.querySelectorAll("[aria-invalid]").forEach((node) => {
    node.removeAttribute("aria-invalid");
    const descriptions = (node.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter((id) => id && id !== node.dataset.validationErrorId);
    if (descriptions.length) {
      node.setAttribute("aria-describedby", descriptions.join(" "));
    } else {
      node.removeAttribute("aria-describedby");
    }
    delete node.dataset.validationErrorId;
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
      const descriptions = new Set(
        (itemControl.getAttribute("aria-describedby") ?? "")
          .split(/\s+/)
          .filter(Boolean),
      );
      descriptions.add(errorId);
      itemControl.setAttribute("aria-describedby", [...descriptions].join(" "));
      itemControl.dataset.validationErrorId = errorId;
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
    "salary-position",
    "salary-maximum",
  ]) {
    element(id).textContent = "-";
  }
}

function hasAnyError(errors, keys) {
  return Object.keys(errors).some((key) => keys.has(key));
}

let automaticFailureFocused = false;
let firstFailedTargetId = null;

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

function syncEligibilityGate(
  eligibility,
  service,
  retirementAge,
  allowFocus,
) {
  const failedChecks = eligibility.checks.filter(
    (check) => check.passed === false,
  );
  const failed = failedChecks.length > 0;

  setHidden("benefit-service-section", failed);
  setHidden("salary-section", failed);
  setHidden("calculate-button", failed);
  element("calculate-button").disabled = failed;

  if (!failed) {
    automaticFailureFocused = false;
    firstFailedTargetId = null;
    if (result.dataset.mode === "automatic") {
      result.hidden = true;
      result.dataset.mode = "";
    }
    return;
  }

  const shouldFocus = allowFocus && !automaticFailureFocused;
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
      focus: shouldFocus,
    },
  );
  if (shouldFocus) automaticFailureFocused = true;
}

function renderPreview(announce = false) {
  if (result.dataset.mode === "submitted") {
    result.hidden = true;
    result.dataset.mode = "";
  }
  const input = collectInput();
  const errors = validateInput(input);
  updateConditionalFields(errors);
  const service = hasAnyError(errors, serviceErrorKeys)
    ? null
    : calculateService(input);
  const preview = buildEligibilityPreview(input, errors, service);
  syncEligibilityGate(
    preview.eligibility,
    service,
    preview.retirementAge,
    announce,
  );

  element("projected-sick-hours").textContent = service
    ? hoursFormat.format(
        nonnegativeHoursForDisplay(service.retirementSickHours),
      ) + " hours"
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

  const salaryValid = !hasAnyError(errors, salaryErrorKeys);
  const salaryProjection =
    salaryValid && input.salary.mode === "structure"
      ? projectStructuredSalary({
          ...input.salary,
          today: new Date(),
          retirementDate: retirementDateForYear(input.retirementYear),
        })
      : null;
  element("projected-salary").textContent = salaryValid
    ? currency.format(
        salaryProjection?.salary ?? calculateRetirementSalary(input),
      )
    : "-";
  setHidden("salary-position-row", !salaryProjection);
  setHidden("salary-maximum-row", !salaryProjection);
  if (salaryProjection) {
    const details = SALARY_STRUCTURE[salaryProjection.rank];
    element("salary-position").textContent =
      "F" +
      String(details.grade).padStart(2, "0") +
      " - " +
      (salaryProjection.step === null
        ? "Exempt"
        : "Step " + salaryProjection.step);
    element("salary-maximum").textContent =
      salaryProjection.maximumStatus === "already"
        ? "Already at maximum"
        : salaryProjection.maximumStatus === "reached"
          ? "Reached " + dateFormat.format(salaryProjection.maximumDate)
          : "Does not reach maximum before retirement";
  }

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
  if (element("calculate-button").disabled) return;

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
  const target = element(firstFailedTargetId ?? "retirement-year");
  const control = target.matches("input, select, button")
    ? target
    : target.querySelector("input, select, button") ?? target;
  control.focus();
});

function resetCalculator() {
  form.reset();
  if (element("salary-structure-dialog").open) {
    element("salary-structure-dialog").close();
  }
  clearErrors();
  clearPreview();
  element("preview-status").textContent = "";
  result.hidden = true;
  result.dataset.mode = "";
  automaticFailureFocused = false;
  firstFailedTargetId = null;
  setHidden("benefit-service-section", false);
  setHidden("salary-section", false);
  setHidden("calculate-button", false);
  element("calculate-button").disabled = false;
  updateConditionalFields();
  element("retirement-year").focus();
}

for (const id of ["clear-form-top", "clear-form-bottom", "start-over"]) {
  element(id).addEventListener("click", resetCalculator);
}

const salaryStructureDialog = element("salary-structure-dialog");
const salaryStructureOpener = element("open-salary-structure");
salaryStructureOpener.addEventListener("click", () => {
  salaryStructureDialog.showModal();
});
element("close-salary-structure").addEventListener("click", () => {
  salaryStructureDialog.close();
  salaryStructureOpener.focus();
});
salaryStructureDialog.addEventListener("close", () => {
  salaryStructureOpener.focus();
});

populateChoices();
populateSalaryStructureDialog();
updateConditionalFields();
