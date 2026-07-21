import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import * as calculator from "../calculator.mjs";

import {
  SALARY_STRUCTURE,
  ageAtRetirement,
  calculateBenefit,
  calculateEstimate,
  coveredBenefitMonths,
  evaluateEligibility,
  findEmployeeSalaryRecords,
  formatServiceYears,
  mapEmployeeSalaryRecord,
  projectService,
  projectStructuredSalary,
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

test("round-trips every valid service month", () => {
  for (let years = 0; years <= 40; years += 1) {
    for (let months = 0; months <= 11; months += 1) {
      assert.equal(
        formatServiceYears(toServiceYears({ years, months })),
        `${years} years, ${months} months`,
      );
    }
  }
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

test("matches Excel Actual/Actual for a multi-year range", () => {
  const result = yearFractionActualActual(
    new Date(2026, 6, 18),
    new Date(2030, 0, 31),
  );
  assert.ok(Math.abs(result - 3.54052573932092) < 1e-12);
});

test("handles Actual/Actual date classes and invalid ranges", () => {
  assert.equal(yearFractionActualActual(new Date(2026, 0, 31), new Date(2027, 0, 31)), 1);
  assert.ok(Math.abs(yearFractionActualActual(new Date(2024, 1, 29), new Date(2025, 1, 28)) - 365 / 366) < 1e-12);
  assert.throws(() => yearFractionActualActual(new Date(2026, 0, 31), new Date(2026, 0, 31)), RangeError);
  assert.throws(() => yearFractionActualActual(new Date(2026, 1, 1), new Date(2026, 0, 31)), RangeError);
});

test("Actual/Actual is independent of daylight-saving time zones", () => {
  const moduleUrl = new URL("../calculator.mjs", import.meta.url).href;
  const script = `
    import { yearFractionActualActual } from ${JSON.stringify(moduleUrl)};
    console.log(yearFractionActualActual(new Date(2026, 2, 8), new Date(2030, 0, 31)));
  `;
  const values = ["America/New_York", "UTC"].map((TZ) =>
    execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      env: { ...process.env, TZ },
    }).trim(),
  );
  assert.equal(values[0], values[1]);
});

test("adds remaining time only to GFD service", () => {
  const result = projectService({
    today: new Date(2026, 0, 31),
    retirementDate: new Date(2030, 0, 31),
    currentGfdYears: 20,
    otherLgersYears: 4,
  });

  assert.ok(Math.abs(result.remainingYears - 4.000547645125958) < 1e-12);
  assert.ok(Math.abs(result.projectedGfdYears - 24.00054764512596) < 1e-12);
  assert.equal(result.otherLgersYears, 4);
});

test("projects zero current sick hours as zero", () => {
  assert.equal(
    projectSickHours({
      currentHours: 0,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    0,
  );
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

test("projects current sick hours at an uncapped historical net rate", () => {
  assert.equal(
    projectSickHours({
      currentHours: 1200,
      currentWorkedYears: 10,
      remainingYears: 2,
    }),
    1440,
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

for (const hours of [Number.NaN, Infinity, -Infinity]) {
  test(`rejects non-finite sick hours: ${hours}`, () => {
    assert.throws(() => sickHoursToServiceMonths(hours), RangeError);
  });
}

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
      birthYear: 1969,
      birthMonth: 1,
      retirementYear: 2030,
    }),
    61,
  );
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

test("rejects nonpositive current worked years", () => {
  for (const currentWorkedYears of [0, -1]) {
    assert.throws(
      () =>
        projectSickHours({
          currentHours: 480,
          currentWorkedYears,
          remainingYears: 2,
        }),
      RangeError,
    );
  }
});

test("calculates age and covered months for every birth month", () => {
  for (let birthMonth = 1; birthMonth <= 12; birthMonth += 1) {
    const age = ageAtRetirement({
      birthYear: 1970,
      birthMonth,
      retirementYear: 2030,
    });
    assert.equal(age, birthMonth === 1 ? 60 : 59);
    assert.equal(
      coveredBenefitMonths({
        birthYear: 1970,
        birthMonth,
        retirementYear: 2030,
      }),
      24 + birthMonth - 1,
    );
  }
});

test("evaluates every required-choice combination", () => {
  const choices = [true, false, undefined];
  for (const regularServiceRetirement of choices) {
    for (const continuousGfd of choices) {
      const result = evaluateEligibility({
        retirementAge: 60,
        regularServiceRetirement,
        continuousGfd,
        projectedGfdYears: 20,
        eligibilityServiceYears: 30,
      });
      assert.equal(
        result.complete,
        regularServiceRetirement !== undefined &&
          continuousGfd !== undefined,
      );
      assert.equal(
        result.failed,
        regularServiceRetirement === false || continuousGfd === false,
      );
      assert.equal(
        result.eligible,
        regularServiceRetirement === true && continuousGfd === true,
      );
    }
  }
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

test("composite month values pass exact 25- and 30-year thresholds", () => {
  const twentyFive = 12.5 + (10 + 8 / 12) + 22 / 12;
  const thirty = 17.5 + (10 + 8 / 12) + 22 / 12;

  assert.equal(twentyFive, 24.999999999999996);
  assert.equal(evaluateEligibility({ retirementAge: 60, eligibilityServiceYears: twentyFive }).unreduced, true);
  assert.equal(evaluateEligibility({ retirementAge: 59, eligibilityServiceYears: thirty }).unreduced, true);
});

test("composite month values pass the exact five-year threshold", () => {
  const exactFive = 1 / 12 + (4 + 1 / 12) + 10 / 12;
  const check = evaluateEligibility({
    continuousGfd: true,
    projectedGfdYears: exactFive,
  }).checks.find((item) => item.key === "continuous-gfd");

  assert.equal(exactFive, 4.999999999999999);
  assert.equal(check.passed, true);
});

test("composite month values pass an exact 50 percent GFD share", () => {
  const projectedGfdYears = 12.5;
  const eligibilityServiceYears = projectedGfdYears + (10 + 7 / 12) + 23 / 12;
  const result = evaluateEligibility({ projectedGfdYears, eligibilityServiceYears });
  const share = result.checks.find((check) => check.key === "gfd-share");

  assert.equal(result.gfdShare, 0.49999999999999994);
  assert.equal(share.passed, true);
  assert.equal(share.actual, "50.0%");
});

test("service and share tolerance does not admit a full-month miss", () => {
  for (const [years, expected] of [
    [4 + 11 / 12, false],
    [5, true],
    [5 + 1 / 12, true],
  ]) {
    const check = evaluateEligibility({
      continuousGfd: true,
      projectedGfdYears: years,
    }).checks.find((item) => item.key === "continuous-gfd");
    assert.equal(check.passed, expected, `${years} projected GFD years`);
  }

  for (const [age, years, expected] of [
    [60, 24 + 11 / 12, false],
    [60, 25, true],
    [60, 25 + 1 / 12, true],
    [59, 29 + 11 / 12, false],
    [59, 30, true],
    [59, 30 + 1 / 12, true],
  ]) {
    assert.equal(
      evaluateEligibility({ retirementAge: age, eligibilityServiceYears: years }).unreduced,
      expected,
      `${years} years at age ${age}`,
    );
  }

  for (const [gfdYears, expected] of [
    [12.5 - 1 / 12, false],
    [12.5, true],
    [12.5 + 1 / 12, true],
  ]) {
    const check = evaluateEligibility({
      projectedGfdYears: gfdYears,
      eligibilityServiceYears: 25,
    }).checks.find((item) => item.key === "gfd-share");
    assert.equal(check.passed, expected, `${gfdYears} of 25 years`);
  }
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

test("creates the January 31 retirement date for a year", () => {
  assert.deepEqual(retirementDateForYear(2030), new Date(2030, 0, 31));
});

test("uses the FY 2025-2026 sworn fire salary structure", () => {
  assert.deepEqual(
    SALARY_STRUCTURE.f01.steps,
    [49_724, 51_713, 53_782, 55_933, 58_170],
  );
  assert.equal(SALARY_STRUCTURE.f05.steps.at(-1), 105_705);
  assert.equal(SALARY_STRUCTURE.f06.greenMax, 123_751);
  assert.equal(SALARY_STRUCTURE.f09.rangeMax, 265_045);
});

test("finds partial employee names locally without case or punctuation sensitivity", () => {
  const records = [
    { Name: "Smith, Jordan A.", FirstName: "Jordan", LastName: "Smith" },
    { Name: "Smythe, Jo", FirstName: "Jo", LastName: "Smythe" },
  ];

  assert.deepEqual(
    findEmployeeSalaryRecords(records, "jor sm").matches,
    [records[0]],
  );
  assert.deepEqual(findEmployeeSalaryRecords(records, "--").matches, []);
});

test("sorts employee matches and reports totals beyond the display limit", () => {
  const records = ["Zulu, Ava", "Able, Ava", "Baker, Ava"].map((Name) => ({
    Name,
  }));
  const result = findEmployeeSalaryRecords(records, "av", 2);

  assert.equal(result.total, 3);
  assert.deepEqual(result.matches.map(({ Name }) => Name), [
    "Able, Ava",
    "Baker, Ava",
  ]);
});

test("maps exact sworn titles and salary steps without guessing", () => {
  assert.deepEqual(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Fighter",
      SalaryRate: 49_724,
    }),
    { currentRank: "f01", currentStep: 1, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Fighter",
      SalaryRate: 74_263,
    }),
    { currentRank: "f02", currentStep: 8, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Engineer",
      SalaryRate: 72_446,
    }),
    { currentRank: "f04", currentStep: 3, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Captain",
      SalaryRate: 83_540,
    }),
    { currentRank: "f05", currentStep: 2, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Senior Fire Inspector",
      SalaryRate: 72_446,
    }),
    { currentRank: "f04", currentStep: 3, currentSalary: null },
  );
  assert.deepEqual(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Asst Fire Marshal",
      SalaryRate: 83_540,
    }),
    { currentRank: "f05", currentStep: 2, currentSalary: null },
  );

  for (const [EmployeeTitle, currentRank, SalaryRate] of [
    ["Battalion Fire Chief", "f06", 112_011],
    ["Deputy Fire Marshal", "f06", 112_011],
    ["Asst Fire Chief", "f07", 130_000],
    ["Fire Marshal", "f07", 130_000],
    ["Deputy Fire Chief", "f08", 146_443],
    ["Fire Chief", "f09", 194_886],
  ]) {
    assert.deepEqual(mapEmployeeSalaryRecord({ EmployeeTitle, SalaryRate }), {
      currentRank,
      currentStep: null,
      currentSalary: SalaryRate,
    });
  }
});

test("rejects unsupported, unmatched, and invalid salary records", () => {
  assert.equal(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Fighter",
      SalaryRate: 76_906,
    }),
    null,
  );
  assert.equal(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Protection Specialist",
      SalaryRate: 60_000,
    }),
    null,
  );
  assert.equal(
    mapEmployeeSalaryRecord({
      EmployeeTitle: "Fire Chief",
      SalaryRate: 300_000,
    }),
    null,
  );
});

test("advances nonexempt steps on November 1 and stops at the maximum", () => {
  const result = projectStructuredSalary({
    currentRank: "f02",
    currentStep: 7,
    retirementRank: "f02",
    meritRate: 4,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2028, 0, 31),
  });

  assert.equal(result.salary, 74_263);
  assert.equal(result.step, 8);
  assert.deepEqual(result.maximumDate, new Date(2026, 10, 1));
  assert.equal(result.maximumStatus, "reached");
});

test("does not count a November raise that is before the projection base", () => {
  const result = projectStructuredSalary({
    currentRank: "f02",
    currentStep: 1,
    retirementRank: "f02",
    meritRate: 4,
    today: new Date(2026, 10, 2),
    retirementDate: new Date(2030, 0, 31),
  });

  assert.equal(result.step, 4);
  assert.equal(result.salary, 63_481);
  assert.equal(result.maximumStatus, "not-before-retirement");
});

test("promotes nonexempt salary to the step closest to a 5 percent increase", () => {
  const result = projectStructuredSalary({
    currentRank: "f02",
    currentStep: 8,
    retirementRank: "f04",
    promotionMonth: 12,
    promotionYear: 2027,
    meritRate: 4,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2028, 0, 31),
  });

  assert.equal(result.rank, "f04");
  assert.equal(result.step, 5);
  assert.equal(result.salary, 78_358);
});

test("chooses the higher nonexempt step when promotion distances tie", () => {
  const midpoint = (80_327 + 83_540) / 2;
  const result = projectStructuredSalary({
    currentRank: "f06",
    currentSalary: midpoint / 1.05,
    retirementRank: "f05",
    promotionMonth: 12,
    promotionYear: 2026,
    meritRate: 0,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2027, 0, 31),
  });

  assert.equal(result.step, 2);
  assert.equal(result.salary, 83_540);
});

test("caps exempt merit raises at Green Zone Maximum", () => {
  const result = projectStructuredSalary({
    currentRank: "f06",
    currentSalary: 120_000,
    retirementRank: "f06",
    meritRate: 4,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2028, 0, 31),
  });

  assert.equal(result.salary, 123_751);
  assert.deepEqual(result.maximumDate, new Date(2026, 10, 1));
  assert.equal(result.maximumStatus, "reached");
});

test("does not reduce an existing exempt salary above Green Zone Maximum", () => {
  const result = projectStructuredSalary({
    currentRank: "f06",
    currentSalary: 130_000,
    retirementRank: "f06",
    meritRate: 4,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2028, 0, 31),
  });

  assert.equal(result.salary, 130_000);
  assert.equal(result.maximumStatus, "already");
});

test("starts every exempt promotion at Green Zone Minimum", () => {
  const result = projectStructuredSalary({
    currentRank: "f05",
    currentStep: 8,
    retirementRank: "f06",
    promotionMonth: 6,
    promotionYear: 2027,
    meritRate: 4,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2028, 0, 31),
  });

  assert.equal(result.rank, "f06");
  assert.equal(result.salary, 97_801.6);
  assert.equal(result.step, null);
  assert.equal(result.maximumStatus, "not-before-retirement");
});

test("does not apply an annual raise on the promotion date", () => {
  const result = projectStructuredSalary({
    currentRank: "f05",
    currentStep: 8,
    retirementRank: "f06",
    promotionMonth: 11,
    promotionYear: 2027,
    meritRate: 4,
    today: new Date(2026, 6, 19),
    retirementDate: new Date(2028, 0, 31),
  });

  assert.equal(result.salary, 94_040);
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

  assert.ok(
    Math.abs(service.projectedGfdYears - 24.00054764512596) < 1e-12,
  );
  assert.equal(service.sickServiceMonths, 2);
  assert.ok(
    Math.abs(service.eligibilityServiceYears - 28.167214311792627) < 1e-12,
  );
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

test("calculates a structured salary without unrelated calculator fields", () => {
  assert.equal(
    calculator.calculateRetirementSalary(
      {
        retirementYear: 2028,
        salary: {
          mode: "structure",
          currentRank: "f02",
          currentStep: 7,
          retirementRank: "f02",
          meritRate: 4,
        },
      },
      new Date(2026, 6, 19),
    ),
    74_263,
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

test("uses displayed completed service months for allowance payments", () => {
  const benefitServiceYears = 31.52982;
  const result = calculateBenefit({
    benefitServiceYears,
    retirementSalary: 123_751,
    coveredMonths: 36,
  });

  assert.equal(formatServiceYears(benefitServiceYears), "31 years, 6 months");
  assert.equal(Number(result.annual.toFixed(2)), 33_134.33);
  assert.equal(Number(result.biweekly.toFixed(2)), 1_274.4);
  assert.equal(Number(result.total.toFixed(2)), 99_402.99);
});

test("preserves payment precision for completed service months", () => {
  for (const coveredMonths of [1, 13, 24]) {
    const result = calculateBenefit({
      benefitServiceYears: 25 + 7 / 12,
      retirementSalary: 98_765.43,
      coveredMonths,
    });
    const annual = 0.0085 * (25 + 7 / 12) * 98_765.43;
    assert.equal(result.annual, annual);
    assert.equal(result.biweekly, annual / 26);
    assert.equal(result.total, (annual / 12) * coveredMonths);
  }
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

  assert.ok(
    Math.abs(estimate.service.eligibilityServiceYears - 30.00054764512596) <
      1e-12,
  );
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

test("validates every calculator input class", () => {
  const cases = [
    ["retirement-year", (input) => { input.retirementYear = Number.NaN; }],
    ["birth-month", (input) => { input.birthMonth = 0; }],
    ["birth-year", (input) => { input.birthYear = 1899; }],
    ["regular-retirement", (input) => { input.regularServiceRetirement = undefined; }],
    ["continuous-gfd", (input) => { input.continuousGfd = undefined; }],
    ["gfd-years", (input) => { input.currentGfd.years = -1; }],
    ["gfd-years", (input) => { input.currentGfd.years = 1.5; }],
    ["gfd-months", (input) => { input.currentGfd.months = 12; }],
    ["other-lgers", (input) => { input.otherLgers = undefined; }],
    ["other-years", (input) => { input.otherLgers = { years: -1, months: 0 }; }],
    ["other-months", (input) => { input.otherLgers = { years: 0, months: 12 }; }],
    ["sick-mode", (input) => { input.sick.mode = undefined; }],
    ["sick-hours", (input) => { input.sick.hours = -0.25; }],
    ["benefit-service-mode", (input) => { input.benefitService.mode = undefined; }],
    ["benefit-years", (input) => { input.benefitService = { mode: "manual", years: 0, months: 0 }; }],
    ["benefit-months", (input) => { input.benefitService = { mode: "manual", years: 1, months: 12 }; }],
    ["anticipated-salary", (input) => { input.salary = { mode: "anticipated", amount: 0 }; }],
  ];

  for (const [expectedKey, mutate] of cases) {
    const input = structuredClone(validInput());
    mutate(input);
    const errors = validateInput(input, new Date(2026, 6, 17));
    assert.ok(errors[expectedKey], `Expected ${expectedKey}`);
  }
});

test("accepts every supported sick and salary mode", () => {
  const salaryCases = [
    { mode: "anticipated", amount: 100_000 },
    {
      mode: "structure",
      currentRank: "f02",
      currentStep: 4,
      retirementRank: "f02",
      meritRate: 4,
    },
  ];
  const sickCases = [
    { mode: "retirement", hours: 160.75 },
    { mode: "current", hours: 160.75 },
  ];

  for (const salary of salaryCases) {
    for (const sick of sickCases) {
      const input = structuredClone(validInput());
      input.salary = salary;
      input.sick = sick;
      assert.deepEqual(validateInput(input, new Date(2026, 6, 17)), {});
    }
  }
});

test("accepts valid nonexempt and exempt structured salary inputs", () => {
  const salaryCases = [
    {
      mode: "structure",
      currentRank: "f02",
      currentStep: 4,
      retirementRank: "f02",
      meritRate: 4,
    },
    {
      mode: "structure",
      currentRank: "f06",
      currentSalary: 110_000,
      retirementRank: "f07",
      promotionMonth: 6,
      promotionYear: 2028,
      meritRate: 3.5,
    },
  ];

  for (const salary of salaryCases) {
    const input = structuredClone(validInput());
    input.salary = salary;
    assert.deepEqual(validateInput(input, new Date(2026, 6, 17)), {});
  }
});

test("validates structured salary ranks, pay, merit, and promotion", () => {
  const cases = [
    ["current-rank", { currentRank: "" }],
    ["current-step", { currentRank: "f02", currentStep: 9 }],
    ["current-exempt-salary", { currentRank: "f06", currentSalary: 0 }],
    ["current-exempt-salary", { currentRank: "f06", currentSalary: 140_000 }],
    ["merit-rate", { currentRank: "f06", currentSalary: 110_000, meritRate: -1 }],
    ["retirement-rank", { currentRank: "f05", currentStep: 2, retirementRank: "f02" }],
    ["promotion-month", { retirementRank: "f04", promotionMonth: 0 }],
    ["promotion-year", { retirementRank: "f04", promotionMonth: 6, promotionYear: 2026 }],
    ["promotion-year", { retirementRank: "f04", promotionMonth: 2, promotionYear: 2030 }],
  ];

  for (const [expectedKey, override] of cases) {
    const input = structuredClone(validInput());
    input.salary = {
      mode: "structure",
      currentRank: "f02",
      currentStep: 4,
      retirementRank: "f02",
      meritRate: 4,
      ...override,
    };
    assert.ok(
      validateInput(input, new Date(2026, 6, 17))[expectedKey],
      expectedKey,
    );
  }
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

test("rejects a structured promotion date on or after retirement", () => {
  const input = validInput();
  input.salary = {
    mode: "structure",
    currentRank: "f02",
    currentStep: 4,
    retirementRank: "f04",
    promotionMonth: 2,
    promotionYear: 2030,
    meritRate: 4,
  };

  assert.equal(
    validateInput(input, new Date(2026, 6, 17))["promotion-year"],
    "Enter a promotion month and year after today and before retirement.",
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

test("integrated estimates preserve service and allowance identities", () => {
  const cases = [
    {
      otherLgers: null,
      sick: { mode: "retirement", hours: 161 },
      benefitService: { mode: "calculated" },
      salary: { mode: "anticipated", amount: 100_000 },
      expectedSickMonths: 2,
      expectedRetirementSalary: 100_000,
    },
    {
      otherLgers: { years: 2, months: 6 },
      sick: { mode: "current", hours: 320.75 },
      benefitService: { mode: "calculated" },
      salary: {
        mode: "structure",
        currentRank: "f06",
        currentSalary: 90_000,
        retirementRank: "f06",
        meritRate: 4,
      },
      expectedSickMonths: 3,
      expectedRetirementSalary: 105_287.27040000001,
    },
    {
      otherLgers: null,
      sick: { mode: "retirement", hours: 8 },
      benefitService: { mode: "manual", years: 28, months: 6 },
      salary: {
        mode: "structure",
        currentRank: "f05",
        currentStep: 1,
        retirementRank: "f06",
        promotionMonth: 1,
        promotionYear: 2029,
        meritRate: 4,
      },
      expectedSickMonths: 1,
      expectedRetirementSalary: 97_801.6,
    },
  ];

  for (const {
    expectedSickMonths,
    expectedRetirementSalary,
    ...overrides
  } of cases) {
    const estimate = calculateEstimate(
      { ...validInput(), ...overrides },
      new Date(2026, 6, 17),
    );
    assert.equal(estimate.service.sickServiceMonths, expectedSickMonths);
    assert.equal(estimate.retirementSalary, expectedRetirementSalary);
    assert.equal(
      estimate.service.sickServiceYears,
      estimate.service.sickServiceMonths / 12,
    );
    assert.ok(estimate.benefit);
    assert.equal(estimate.benefit.biweekly, estimate.benefit.annual / 26);
    assert.equal(
      estimate.benefit.total,
      (estimate.benefit.annual / 12) * estimate.coveredMonths,
    );
  }
});

test("withholds the allowance for every eligibility failure class", () => {
  const cases = [
    ["under-62", (input) => { input.birthYear = 1968; }],
    ["regular-service", (input) => { input.regularServiceRetirement = false; }],
    ["continuous-gfd", (input) => { input.continuousGfd = false; }],
    ["gfd-share", (input) => { input.otherLgers = { years: 40, months: 0 }; }],
    ["unreduced", (input) => { input.currentGfd = { years: 20, months: 0 }; }],
  ];

  for (const [failedKey, mutate] of cases) {
    const input = structuredClone(validInput());
    mutate(input);
    const estimate = calculateEstimate(input, new Date(2026, 6, 17));
    assert.equal(estimate.benefit, null, failedKey);
    assert.equal(
      estimate.eligibility.checks.find((check) => check.key === failedKey)
        .passed,
      false,
      failedKey,
    );
  }
});

test("integrated eligibility accepts exact composite service and share thresholds", () => {
  const cases = [
    {
      label: "25 years at age 60",
      today: new Date(2029, 0, 31),
      expectedServiceYears: 25,
      input: {
        ...validInput(),
        currentGfd: { years: 11, months: 6 },
        otherLgers: { years: 10, months: 8 },
        sick: { mode: "retirement", hours: 3_361 },
      },
    },
    {
      label: "30 years under age 60",
      today: new Date(2029, 0, 31),
      expectedServiceYears: 30,
      input: {
        ...validInput(),
        birthYear: 1971,
        currentGfd: { years: 16, months: 6 },
        otherLgers: { years: 10, months: 8 },
        sick: { mode: "retirement", hours: 3_361 },
      },
    },
    {
      label: "exactly 50 percent GFD",
      today: new Date(2029, 0, 31),
      expectedServiceYears: 25,
      expectedGfdShare: 0.5,
      input: {
        ...validInput(),
        currentGfd: { years: 11, months: 6 },
        otherLgers: { years: 10, months: 7 },
        sick: { mode: "retirement", hours: 3_521 },
      },
    },
  ];

  for (const {
    label,
    today,
    expectedServiceYears,
    expectedGfdShare,
    input,
  } of cases) {
    const estimate = calculateEstimate(input, today);
    assert.ok(
      Math.abs(
        estimate.service.eligibilityServiceYears - expectedServiceYears,
      ) < 1e-12,
      label,
    );
    if (expectedGfdShare !== undefined) {
      assert.ok(
        Math.abs(estimate.eligibility.gfdShare - expectedGfdShare) < 1e-12,
        label,
      );
    }
    assert.equal(estimate.eligibility.eligible, true, label);
    assert.ok(estimate.benefit, label);
  }
});

test("integrated service preserves every sick-hour boundary", () => {
  for (const [hours, months] of [
    [7.99, 0],
    [8, 1],
    [160.75, 1],
    [161, 2],
  ]) {
    const input = validInput();
    input.sick = { mode: "retirement", hours };
    assert.equal(
      calculateEstimate(input, new Date(2029, 0, 31)).service
        .sickServiceMonths,
      months,
      `${hours} hours`,
    );
  }
});

test("integrated service uses the Excel multi-year projection fraction", () => {
  const estimate = calculateEstimate(validInput(), new Date(2026, 6, 18));
  assert.ok(
    Math.abs(estimate.dates.remainingYears - 3.54052573932092) < 1e-12,
  );
});
