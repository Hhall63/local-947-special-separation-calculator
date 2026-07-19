import test from "node:test";
import assert from "node:assert/strict";

import * as calculator from "../calculator.mjs";

import {
  RANK_SALARIES,
  ageAtRetirement,
  calculateBenefit,
  calculateEstimate,
  countJulyRaises,
  coveredBenefitMonths,
  evaluateEligibility,
  formatServiceYears,
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

test("formats completed service months without rounding up", () => {
  assert.equal(formatServiceYears(29.99), "29 years, 11 months");
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

test("converts sick hours using the approved eight-hour minimum and partial-block rule", () => {
  const cases = [
    [0, 0],
    [0.99, 0],
    [1, 0],
    [7.99, 0],
    [8, 1],
    [159.99, 1],
    [160, 1],
    [160.75, 1],
    [161, 2],
    [319.99, 2],
    [320, 2],
    [320.75, 2],
    [321, 3],
  ];

  for (const [hours, months] of cases) {
    assert.equal(sickHoursToServiceMonths(hours), months, `${hours} hours`);
  }
  assert.throws(() => sickHoursToServiceMonths(-0.25), RangeError);
});

test("sick conversion follows the approved rule for every quarter hour through 600 days", () => {
  for (let quarters = 0; quarters <= 19_200; quarters += 1) {
    const hours = quarters / 4;
    const fullMonths = Math.floor(hours / 160);
    const remainder = hours - fullMonths * 160;
    const expected = hours < 8 ? 0 : fullMonths + (remainder >= 1 ? 1 : 0);
    assert.equal(sickHoursToServiceMonths(hours), expected, `${hours} hours`);
  }
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

test("calculates service without unrelated eligibility or salary fields", () => {
  assert.equal(typeof calculator.calculateService, "function");
  const service = calculator.calculateService(
    {
      retirementYear: 2030,
      currentGfd: { years: 20, months: 0 },
      otherLgers: { years: 4, months: 0 },
      sick: { mode: "retirement", hours: 320 },
    },
    new Date(2026, 0, 31),
  );

  assert.equal(service.projectedGfdYears, 24);
  assert.equal(service.sickServiceMonths, 2);
  assert.equal(service.eligibilityServiceYears, 28 + 2 / 12);
});

test("calculates salary without unrelated service or eligibility fields", () => {
  assert.equal(typeof calculator.calculateRetirementSalary, "function");
  assert.equal(
    calculator.calculateRetirementSalary(
      {
        retirementYear: 2030,
        salary: { mode: "anticipated", amount: 123456 },
      },
      new Date(2026, 6, 17),
    ),
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
  assert.equal(errors["other-lgers"], "Choose Yes or No.");
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

test("reports an explicit retirement-type failure before service is known", () => {
  const result = evaluateEligibility({
    regularServiceRetirement: false,
  });

  assert.equal(result.failed, true);
  assert.equal(result.complete, false);
  assert.equal(
    result.checks.find((check) => check.key === "regular-service").passed,
    false,
  );
  assert.equal(
    result.checks.find((check) => check.key === "gfd-share").passed,
    null,
  );
});

test("reports a known age failure before service and salary are known", () => {
  const result = evaluateEligibility({ retirementAge: 62 });
  const age = result.checks.find((check) => check.key === "under-62");

  assert.equal(result.failed, true);
  assert.equal(age.passed, false);
  assert.equal(age.actual, "62 years old");
  assert.equal(age.requirement, "Under age 62");
  assert.equal(age.targetId, "birth-year");
});

test("returns actual and required evidence for complete eligibility", () => {
  const result = evaluateEligibility({
    retirementAge: 60,
    regularServiceRetirement: true,
    continuousGfd: true,
    projectedGfdYears: 20,
    eligibilityServiceYears: 30,
  });

  assert.equal(result.complete, true);
  assert.equal(result.failed, false);
  assert.equal(result.eligible, true);
  assert.equal(
    result.checks.find((check) => check.key === "gfd-share").actual,
    "66.7%",
  );
  assert.equal(
    result.checks.find((check) => check.key === "unreduced").actual,
    "30 years, 0 months at age 60",
  );
});

test("passes unreduced retirement at 30 years without age", () => {
  const result = evaluateEligibility({ eligibilityServiceYears: 30 });
  const unreduced = result.checks.find((check) => check.key === "unreduced");

  assert.equal(unreduced.passed, true);
  assert.equal(unreduced.actual, "30 years, 0 months");
});

test("resolves service-only unreduced boundaries without age", () => {
  const belowMinimum = evaluateEligibility({
    eligibilityServiceYears: 24 + 11 / 12,
  }).checks.find((check) => check.key === "unreduced");
  const ageDependent = evaluateEligibility({ eligibilityServiceYears: 25 })
    .checks.find((check) => check.key === "unreduced");

  assert.equal(belowMinimum.passed, false);
  assert.equal(belowMinimum.actual, "24 years, 11 months");
  assert.equal(ageDependent.passed, null);
  assert.equal(ageDependent.actual, null);
});

test("does not round a failing GFD share up to 50 percent", () => {
  const result = evaluateEligibility({
    projectedGfdYears: 12.49,
    eligibilityServiceYears: 25,
  });
  const share = result.checks.find((check) => check.key === "gfd-share");

  assert.equal(share.passed, false);
  assert.equal(share.actual, "49.9%");
});

test("does not round 29.99 service years up to 30 years", () => {
  const result = evaluateEligibility({
    retirementAge: 59,
    eligibilityServiceYears: 29.99,
  });
  const unreduced = result.checks.find((check) => check.key === "unreduced");

  assert.equal(unreduced.passed, false);
  assert.equal(unreduced.actual, "29 years, 11 months at age 59");
});

test("does not round 24.99 service years up to 25 years", () => {
  const result = evaluateEligibility({ eligibilityServiceYears: 24.99 });
  const unreduced = result.checks.find((check) => check.key === "unreduced");

  assert.equal(unreduced.passed, false);
  assert.equal(unreduced.actual, "24 years, 11 months");
});

test("returns the allowance coverage dates without changing covered months", () => {
  const result = calculateEstimate(
    {
      retirementYear: 2030,
      birthMonth: 2,
      birthYear: 1969,
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

  assert.equal(result.coveredMonths, 13);
  assert.deepEqual(result.coverage, {
    startYear: 2030,
    startMonth: 2,
    endYear: 2031,
    endMonth: 2,
  });
});
