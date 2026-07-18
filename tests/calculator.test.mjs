import test from "node:test";
import assert from "node:assert/strict";

import {
  RANK_SALARIES,
  ageAtRetirement,
  calculateBenefit,
  calculateEstimate,
  countJulyRaises,
  coveredBenefitMonths,
  evaluateEligibility,
  projectService,
  projectSalary,
  projectSickHours,
  retirementDateForYear,
  sickHoursToServiceMonths,
  toServiceYears,
  validateInput,
  yearFractionActualActual,
} from "../calculator.mjs";

test("converts separate years and months to decimal years", () => {
  assert.equal(toServiceYears({ years: 12, months: 6 }), 12.5);
});

test("matches Microsoft's YEARFRAC Actual/Actual leap-year example", () => {
  const result = yearFractionActualActual(
    new Date(2012, 0, 1),
    new Date(2012, 6, 30),
  );

  assert.ok(Math.abs(result - 0.5765027322404371) < 1e-12);
});

test("adds remaining time only to GFD service", () => {
  const result = projectService({
    today: new Date(2026, 0, 31),
    retirementDate: new Date(2030, 0, 31),
    currentGfdYears: 20,
    otherLgersYears: 4,
  });

  assert.equal(result.remainingYears, 4);
  assert.equal(result.projectedGfdYears, 24);
  assert.equal(result.otherLgersYears, 4);
});

test("projects current sick hours at the historical net rate", () => {
  assert.equal(
    projectSickHours({
      currentHours: 480,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    576,
  );
});

test("caps historical sick accumulation at 96 hours per year", () => {
  assert.equal(
    projectSickHours({
      currentHours: 1200,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    1392,
  );
});

test("converts sick hours using the LGERS partial-block rule", () => {
  assert.equal(sickHoursToServiceMonths(0), 0);
  assert.equal(sickHoursToServiceMonths(160), 1);
  assert.equal(sickHoursToServiceMonths(160.75), 1);
  assert.equal(sickHoursToServiceMonths(161), 2);
  assert.equal(sickHoursToServiceMonths(320), 2);
});

test("calculates age on January 31 from birth month and year", () => {
  assert.equal(
    ageAtRetirement({
      birthYear: 1970,
      birthMonth: 1,
      retirementYear: 2030,
    }),
    60,
  );
  assert.equal(
    ageAtRetirement({
      birthYear: 1970,
      birthMonth: 2,
      retirementYear: 2030,
    }),
    59,
  );
});

test("qualifies at exactly 30 years regardless of age", () => {
  const result = evaluateEligibility({
    retirementAge: 55,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 20,
    eligibilityServiceYears: 30,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.unreduced, true);
});

test("qualifies at exactly age 60 with 25 years", () => {
  const result = evaluateEligibility({
    retirementAge: 60,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 12.5,
    eligibilityServiceYears: 25,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.gfdShare, 0.5);
});

test("fails when GFD service is below 50 percent", () => {
  const result = evaluateEligibility({
    retirementAge: 60,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 12.49,
    eligibilityServiceYears: 25,
  });

  assert.equal(result.eligible, false);
  assert.equal(
    result.checks.find((check) => check.key === "gfd-share").passed,
    false,
  );
});

test("fails each nonnumeric eligibility requirement independently", () => {
  const result = evaluateEligibility({
    retirementAge: 62,
    regularServiceRetirement: false,
    continuousGfd: false,
    projectedGfdYears: 4.99,
    eligibilityServiceYears: 30,
  });

  assert.equal(result.eligible, false);
  assert.deepEqual(
    result.checks
      .filter((check) => !check.passed)
      .map((check) => check.key),
    ["under-62", "regular-service", "continuous-gfd", "gfd-share"],
  );
});

test("counts July 1 raises after the base date and before retirement", () => {
  assert.equal(
    countJulyRaises({
      baseDate: new Date(2026, 6, 17),
      retirementDate: new Date(2030, 0, 31),
    }),
    3,
  );
});

test("a July promotion receives its first raise the following July", () => {
  assert.equal(
    projectSalary({
      mode: "rank",
      rank: "captain",
      promotionMonth: 7,
      promotionYear: 2027,
      today: new Date(2026, 6, 17),
      retirementDate: new Date(2030, 0, 31),
    }),
    RANK_SALARIES.captain.salary * 1.04 ** 2,
  );
});

test("uses anticipated salary directly", () => {
  assert.equal(
    projectSalary({
      mode: "anticipated",
      amount: 123456,
      today: new Date(2026, 6, 17),
      retirementDate: new Date(2030, 0, 31),
    }),
    123456,
  );
});

test("counts covered months through the end of the age-62 month", () => {
  assert.equal(
    coveredBenefitMonths({
      birthYear: 1968,
      birthMonth: 1,
      retirementYear: 2029,
    }),
    12,
  );
  assert.equal(
    coveredBenefitMonths({
      birthYear: 1968,
      birthMonth: 2,
      retirementYear: 2030,
    }),
    1,
  );
});

test("calculates annual, biweekly, and monthly-prorated totals", () => {
  assert.deepEqual(
    calculateBenefit({
      benefitServiceYears: 30,
      retirementSalary: 100000,
      coveredMonths: 12,
    }),
    {
      annual: 25500,
      biweekly: 25500 / 26,
      total: 25500,
    },
  );
});

test("manual benefit service changes payments without changing eligibility", () => {
  const estimate = calculateEstimate(
    {
      retirementYear: 2030,
      birthMonth: 1,
      birthYear: 1970,
      regularServiceRetirement: true,
      continuousGfd: true,
      currentGfd: { years: 26, months: 0 },
      otherLgers: null,
      sick: { mode: "retirement", hours: 0 },
      benefitService: { mode: "manual", years: 28, months: 0 },
      salary: { mode: "anticipated", amount: 100000 },
    },
    new Date(2026, 0, 31),
  );

  assert.equal(estimate.service.eligibilityServiceYears, 30);
  assert.equal(estimate.service.benefitServiceYears, 28);
  assert.equal(estimate.eligibility.eligible, true);
  assert.equal(estimate.benefit.annual, 23800);
});

test("returns no benefit when the applicant is ineligible", () => {
  const estimate = calculateEstimate(
    {
      retirementYear: 2030,
      birthMonth: 1,
      birthYear: 1968,
      regularServiceRetirement: true,
      continuousGfd: true,
      currentGfd: { years: 26, months: 0 },
      otherLgers: null,
      sick: { mode: "retirement", hours: 0 },
      benefitService: { mode: "calculated" },
      salary: { mode: "anticipated", amount: 100000 },
    },
    new Date(2026, 0, 31),
  );

  assert.equal(estimate.retirementAge, 62);
  assert.equal(estimate.eligibility.eligible, false);
  assert.equal(estimate.benefit, null);
});

function validInput() {
  return {
    retirementYear: 2030,
    birthMonth: 1,
    birthYear: 1970,
    regularServiceRetirement: true,
    continuousGfd: true,
    currentGfd: { years: 26, months: 0 },
    otherLgers: null,
    sick: { mode: "retirement", hours: 0 },
    benefitService: { mode: "calculated" },
    salary: { mode: "anticipated", amount: 100000 },
  };
}

test("accepts a complete valid input", () => {
  assert.deepEqual(
    validateInput(validInput(), new Date(2026, 6, 17)),
    {},
  );
});

test("rejects a retirement date that is not in the future", () => {
  const input = validInput();
  input.retirementYear = 2026;

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["retirement-year"],
    "Choose a retirement year whose January 31 date is in the future.",
  );
});

test("rejects invalid months and a missing other-service choice", () => {
  const input = validInput();
  input.currentGfd.months = 12;
  input.otherLgers = undefined;
  const errors = validateInput(input, new Date(2026, 6, 17));

  assert.equal(errors["gfd-months"], "Enter a month value from 0 through 11.");
  assert.equal(errors["other-lgers"], "Choose Yes or N/A.");
});

test("rejects an implausible age on the retirement date", () => {
  const input = validInput();
  input.birthYear = 2020;

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["birth-year"],
    "Enter a birth year that gives a retirement age from 18 through 100.",
  );
});

test("requires current service for historical sick projection", () => {
  const input = validInput();
  input.currentGfd = { years: 0, months: 0 };
  input.sick = { mode: "current", hours: 100 };

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["sick-hours"],
    "Enter current GFD or other LGERS service to project current sick hours.",
  );
});

test("validation uses creditable-years terminology", () => {
  const input = validInput();
  input.benefitService = { mode: undefined };
  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["benefit-service-mode"],
    "Choose calculated or separately entered creditable years of service.",
  );

  input.benefitService = { mode: "manual", years: 0, months: 0 };
  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["benefit-years"],
    "Enter creditable years of service greater than zero.",
  );
});

test("rejects a promotion date on or after retirement", () => {
  const input = validInput();
  input.salary = {
    mode: "rank",
    rank: "captain",
    promotionMonth: 2,
    promotionYear: 2030,
  };

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["promotion-year"],
    "Enter a promotion month and year before retirement.",
  );
});
