export const HOURS_PER_SICK_MONTH = 160;

const NUMERIC_TOLERANCE = 1e-9;

function isAtLeast(value, minimum) {
  return value >= minimum - NUMERIC_TOLERANCE;
}

const DAY_MS = 86_400_000;

export function toServiceYears({ years, months }) {
  return Number(years) + Number(months) / 12;
}

function toUtcDate(date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}

function isFebruary29(date) {
  return date.getUTCMonth() === 1 && date.getUTCDate() === 29;
}

function isNoMoreThanOneYear(start, end) {
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  if (startYear === endYear) return true;
  if (endYear !== startYear + 1) return false;

  const startMonth = start.getUTCMonth();
  const endMonth = end.getUTCMonth();
  return (
    startMonth > endMonth ||
    (startMonth === endMonth && start.getUTCDate() >= end.getUTCDate())
  );
}

function includesFebruary29(start, end) {
  for (
    let year = start.getUTCFullYear();
    year <= end.getUTCFullYear();
    year += 1
  ) {
    if (!isLeapYear(year)) continue;
    const leapDay = new Date(Date.UTC(year, 1, 29));
    if (leapDay >= start && leapDay <= end) return true;
  }
  return false;
}

function actualActualYearLength(start, end) {
  if (isNoMoreThanOneYear(start, end)) {
    const sameLeapYear =
      start.getUTCFullYear() === end.getUTCFullYear() &&
      isLeapYear(start.getUTCFullYear());
    return sameLeapYear || isFebruary29(start) || isFebruary29(end) || includesFebruary29(start, end)
      ? 366
      : 365;
  }

  let days = 0;
  let years = 0;
  for (
    let year = start.getUTCFullYear();
    year <= end.getUTCFullYear();
    year += 1
  ) {
    days += daysInYear(year);
    years += 1;
  }
  return days / years;
}

export function yearFractionActualActual(startDate, endDate) {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);
  if (end <= start) throw new RangeError("End date must be after start date.");

  const actualDays = (end - start) / DAY_MS;
  return actualDays / actualActualYearLength(start, end);
}

export function projectService({
  today,
  retirementDate,
  currentGfdYears,
  otherLgersYears,
}) {
  const remainingYears = yearFractionActualActual(today, retirementDate);

  return {
    remainingYears,
    projectedGfdYears: currentGfdYears + remainingYears,
    otherLgersYears,
  };
}

export function projectSickHours({
  currentHours,
  currentWorkedYears,
  remainingYears,
}) {
  if (currentWorkedYears <= 0) {
    throw new RangeError(
      "Current worked service must be greater than zero.",
    );
  }

  const historicalNetRate = currentHours / currentWorkedYears;

  return currentHours + historicalNetRate * remainingYears;
}

export function sickHoursToServiceMonths(hours) {
  if (!Number.isFinite(hours) || hours < 0) {
    throw new RangeError("Sick hours must be finite and nonnegative.");
  }
  if (!isAtLeast(hours, 8)) return 0;

  const fullMonths = Math.floor(hours / HOURS_PER_SICK_MONTH);
  const remainingHours = hours - fullMonths * HOURS_PER_SICK_MONTH;
  return fullMonths + (isAtLeast(remainingHours, 1) ? 1 : 0);
}

export function ageAtRetirement({
  birthYear,
  birthMonth,
  retirementYear,
}) {
  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    throw new RangeError("Birth month must be from 1 through 12.");
  }

  return retirementYear - birthYear - (birthMonth > 1 ? 1 : 0);
}

export function formatServiceYears(years) {
  const months = years * 12;
  const totalMonths = Math.floor(
    months + Number.EPSILON * Math.abs(months),
  );
  const wholeYears = Math.floor(totalMonths / 12);
  const monthsOnly = totalMonths % 12;
  return wholeYears + " years, " + monthsOnly + " months";
}

export function evaluateEligibility({
  retirementAge,
  regularServiceRetirement,
  continuousGfd,
  projectedGfdYears,
  eligibilityServiceYears,
}) {
  const hasAge = Number.isFinite(retirementAge);
  const hasProjectedGfd = Number.isFinite(projectedGfdYears);
  const hasEligibilityService = Number.isFinite(eligibilityServiceYears);
  const gfdShare =
    hasProjectedGfd && hasEligibilityService && eligibilityServiceYears > 0
      ? projectedGfdYears / eligibilityServiceYears
      : null;
  const gfdSharePassed =
    hasProjectedGfd && hasEligibilityService && eligibilityServiceYears > 0
      ? isAtLeast(projectedGfdYears * 2, eligibilityServiceYears)
      : null;
  const unreduced =
    !hasEligibilityService
      ? null
      : isAtLeast(eligibilityServiceYears, 30)
        ? true
        : !isAtLeast(eligibilityServiceYears, 25)
          ? false
          : hasAge
            ? retirementAge >= 60
            : null;
  const continuousPassed =
    continuousGfd === false
      ? false
      : continuousGfd === true && hasProjectedGfd
        ? isAtLeast(projectedGfdYears, 5)
        : null;

  const checks = [
    {
      key: "under-62",
      label: "Age on the January 31 retirement date",
      passed: hasAge ? retirementAge < 62 : null,
      actual: hasAge ? retirementAge + " years old" : null,
      requirement: "Under age 62",
      targetId: "birth-year",
    },
    {
      key: "regular-service",
      label: "Regular LGERS service retirement",
      passed:
        regularServiceRetirement === undefined
          ? null
          : regularServiceRetirement === true,
      actual:
        regularServiceRetirement === undefined
          ? null
          : regularServiceRetirement
            ? "Yes"
            : "No",
      requirement: "Regular service retirement, not disability retirement",
      targetId: "regular-retirement-group",
    },
    {
      key: "continuous-gfd",
      label: "Continuous sworn GFD service",
      passed: continuousPassed,
      actual:
        continuousGfd === undefined
          ? null
          : continuousGfd === false
            ? "No"
            : hasProjectedGfd
              ? "Yes; " + formatServiceYears(projectedGfdYears) + " projected GFD service"
              : "Yes",
      requirement: "At least five continuous years immediately before retirement",
      targetId: "continuous-gfd-group",
    },
    {
      key: "gfd-share",
      label: "Sworn GFD share of total creditable service",
      passed: gfdSharePassed,
      actual:
        gfdShare === null
          ? null
          : (gfdSharePassed === false
              ? Math.floor(gfdShare * 1000) / 10
              : gfdShare * 100
            ).toFixed(1) + "%",
      requirement: "At least 50%",
      targetId: "gfd-years",
    },
    {
      key: "unreduced",
      label: "Unreduced LGERS service retirement",
      passed: unreduced,
      actual:
        unreduced === null
          ? null
          : formatServiceYears(eligibilityServiceYears) +
            (hasAge ? " at age " + retirementAge : ""),
      requirement: "30 years, or age 60 with at least 25 years",
      targetId: "gfd-years",
    },
  ];
  const complete = checks.every((check) => check.passed !== null);
  const failed = checks.some((check) => check.passed === false);

  return {
    eligible: complete && !failed,
    complete,
    failed,
    checks,
    gfdShare,
    unreduced,
  };
}

export const SALARY_STRUCTURE = Object.freeze({
  f01: Object.freeze({
    grade: 1,
    label: "Fire Fighter",
    type: "nonexempt",
    steps: Object.freeze([49_724, 51_713, 53_782, 55_933, 58_170]),
    rangeMax: null,
  }),
  f02: Object.freeze({
    grade: 2,
    label: "Fire Fighter Sr",
    type: "nonexempt",
    steps: Object.freeze([
      56_434, 58_691, 61_039, 63_481, 66_020, 68_661, 71_407, 74_263,
    ]),
    rangeMax: 83_013,
  }),
  f04: Object.freeze({
    grade: 4,
    label: "Sr Fire Inspector / Fire Engineer",
    type: "nonexempt",
    steps: Object.freeze([
      66_980, 69_660, 72_446, 75_344, 78_358, 81_492, 84_752, 88_142,
    ]),
    rangeMax: 98_527,
  }),
  f05: Object.freeze({
    grade: 5,
    label: "Fire Captain / Asst Fire Marshal",
    type: "nonexempt",
    steps: Object.freeze([
      80_327, 83_540, 86_882, 90_357, 93_972, 97_730, 101_640, 105_705,
    ]),
    rangeMax: 118_160,
  }),
  f06: Object.freeze({
    grade: 6,
    label: "Battalion Chief / Deputy Fire Marshal",
    type: "exempt",
    rangeMin: 77_303,
    greenMin: 94_040,
    controlPoint: 101_714,
    greenMax: 123_751,
    rangeMax: 138_331,
  }),
  f07: Object.freeze({
    grade: 7,
    label: "Assistant Fire Chief / Fire Marshal",
    type: "exempt",
    rangeMin: 98_948,
    greenMin: 120_373,
    controlPoint: 130_195,
    greenMax: 158_402,
    rangeMax: 177_065,
  }),
  f08: Object.freeze({
    grade: 8,
    label: "Deputy Fire Chief",
    type: "exempt",
    rangeMin: 111_297,
    greenMin: 135_395,
    controlPoint: 146_443,
    greenMax: 178_170,
    rangeMax: 199_162,
  }),
  f09: Object.freeze({
    grade: 9,
    label: "Fire Chief",
    type: "exempt",
    rangeMin: 148_113,
    greenMin: 180_183,
    controlPoint: 194_886,
    greenMax: 237_109,
    rangeMax: 265_045,
  }),
});

export function isExemptRank(rank) {
  return SALARY_STRUCTURE[rank]?.type === "exempt";
}

export const BENEFIT_MULTIPLIER = 0.0085;
export const CHECKS_PER_YEAR = 26;

function dateNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function nearestStepIndex(steps, target) {
  let nearest = 0;
  for (let index = 1; index < steps.length; index += 1) {
    if (
      Math.abs(steps[index] - target) <=
      Math.abs(steps[nearest] - target)
    ) {
      nearest = index;
    }
  }
  return nearest;
}

export function projectStructuredSalary({
  currentRank,
  currentStep,
  currentSalary,
  retirementRank,
  promotionMonth,
  promotionYear,
  meritRate,
  today,
  retirementDate,
}) {
  let rank = currentRank;
  let details = SALARY_STRUCTURE[rank];
  let stepIndex = details.type === "nonexempt" ? currentStep - 1 : null;
  let salary =
    stepIndex === null ? currentSalary : details.steps[stepIndex];
  const targetRank = retirementRank;
  const promotionDate =
    targetRank === currentRank
      ? null
      : new Date(promotionYear, promotionMonth - 1, 1);
  let targetActive = rank === targetRank;
  const atMaximum = () =>
    details.type === "nonexempt"
      ? stepIndex === details.steps.length - 1
      : salary >= details.greenMax;
  let maximumDate = null;
  let maximumStatus = targetActive && atMaximum()
    ? "already"
    : "not-before-retirement";

  const events = [];
  if (
    promotionDate &&
    dateNumber(promotionDate) > dateNumber(today) &&
    dateNumber(promotionDate) < dateNumber(retirementDate)
  ) {
    events.push({ type: "promotion", date: promotionDate });
  }
  for (
    let year = today.getFullYear();
    year <= retirementDate.getFullYear();
    year += 1
  ) {
    const date = new Date(year, 10, 1);
    if (
      dateNumber(date) > dateNumber(today) &&
      dateNumber(date) < dateNumber(retirementDate)
    ) {
      events.push({ type: "raise", date });
    }
  }
  events.sort((left, right) => {
    const difference = dateNumber(left.date) - dateNumber(right.date);
    if (difference !== 0) return difference;
    return left.type === "promotion" ? -1 : 1;
  });

  for (const event of events) {
    if (event.type === "promotion") {
      rank = targetRank;
      details = SALARY_STRUCTURE[rank];
      targetActive = true;
      if (details.type === "nonexempt") {
        stepIndex = nearestStepIndex(details.steps, salary * 1.05);
        salary = details.steps[stepIndex];
      } else {
        stepIndex = null;
        salary = details.greenMin;
      }
    } else {
      if (
        promotionDate &&
        dateNumber(event.date) === dateNumber(promotionDate)
      ) {
        continue;
      }
      if (details.type === "nonexempt") {
        stepIndex = Math.min(stepIndex + 1, details.steps.length - 1);
        salary = details.steps[stepIndex];
      } else if (salary < details.greenMax) {
        salary = Math.min(
          salary * (1 + meritRate / 100),
          details.greenMax,
        );
      }
    }

    if (
      targetActive &&
      maximumStatus === "not-before-retirement" &&
      atMaximum()
    ) {
      maximumDate = event.date;
      maximumStatus = "reached";
    }
  }

  return {
    salary,
    rank,
    step: stepIndex === null ? null : stepIndex + 1,
    maximumDate,
    maximumStatus,
  };
}

export function retirementDateForYear(year) {
  return new Date(year, 0, 31);
}

export function coveredBenefitMonths({
  birthYear,
  birthMonth,
  retirementYear,
}) {
  return (birthYear + 62 - retirementYear) * 12 + birthMonth - 1;
}

export function calculateBenefit({
  benefitServiceYears,
  retirementSalary,
  coveredMonths,
}) {
  const annual =
    BENEFIT_MULTIPLIER * benefitServiceYears * retirementSalary;

  return {
    annual,
    biweekly: annual / CHECKS_PER_YEAR,
    total: (annual / 12) * coveredMonths,
  };
}

export function calculateService(input, today = new Date()) {
  const retirementDate = retirementDateForYear(input.retirementYear);
  const currentGfdYears = toServiceYears(input.currentGfd);
  const otherLgersYears =
    input.otherLgers === null ? 0 : toServiceYears(input.otherLgers);
  const projected = projectService({
    today,
    retirementDate,
    currentGfdYears,
    otherLgersYears,
  });
  const retirementSickHours =
    input.sick.mode === "current"
      ? projectSickHours({
          currentHours: input.sick.hours,
          currentWorkedYears: currentGfdYears + otherLgersYears,
          remainingYears: projected.remainingYears,
        })
      : input.sick.hours;
  const sickServiceMonths =
    sickHoursToServiceMonths(retirementSickHours);
  const sickServiceYears = sickServiceMonths / 12;
  const eligibilityServiceYears =
    projected.projectedGfdYears + otherLgersYears + sickServiceYears;

  return {
    currentGfdYears,
    otherLgersYears,
    remainingYears: projected.remainingYears,
    projectedGfdYears: projected.projectedGfdYears,
    retirementSickHours,
    sickServiceMonths,
    sickServiceYears,
    eligibilityServiceYears,
  };
}

export function calculateRetirementSalary(input, today = new Date()) {
  if (input.salary.mode === "anticipated") return input.salary.amount;
  const retirementDate = retirementDateForYear(input.retirementYear);
  return projectStructuredSalary({
    ...input.salary,
    today,
    retirementDate,
  }).salary;
}

export function calculateEstimate(input, today = new Date()) {
  const retirementDate = retirementDateForYear(input.retirementYear);
  const service = calculateService(input, today);
  const retirementAge = ageAtRetirement({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });
  const eligibility = evaluateEligibility({
    retirementAge,
    regularServiceRetirement: input.regularServiceRetirement,
    continuousGfd: input.continuousGfd,
    projectedGfdYears: service.projectedGfdYears,
    eligibilityServiceYears: service.eligibilityServiceYears,
  });
  const benefitServiceYears =
    input.benefitService.mode === "manual"
      ? toServiceYears(input.benefitService)
      : service.eligibilityServiceYears;
  const retirementSalary = calculateRetirementSalary(input, today);
  const coveredMonths = coveredBenefitMonths({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });

  return {
    dates: { retirementDate, remainingYears: service.remainingYears },
    service: {
      ...service,
      benefitServiceYears,
    },
    retirementAge,
    eligibility,
    retirementSalary,
    coveredMonths,
    coverage: {
      startYear: input.retirementYear,
      startMonth: 2,
      endYear: input.birthYear + 62,
      endMonth: input.birthMonth,
    },
    benefit: eligibility.eligible
      ? calculateBenefit({
          benefitServiceYears,
          retirementSalary,
          coveredMonths,
        })
      : null,
  };
}

function isNonnegativeWhole(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateService(value, yearsKey, monthsKey, errors) {
  if (!value || !isNonnegativeWhole(value.years)) {
    errors[yearsKey] = "Enter a nonnegative whole number of years.";
  }
  if (!value || !isNonnegativeWhole(value.months) || value.months > 11) {
    errors[monthsKey] = "Enter a month value from 0 through 11.";
  }
}

export function validateInput(input, today = new Date()) {
  const errors = {};
  const currentYear = today.getFullYear();
  let retirementDate = null;

  if (
    !Number.isInteger(input.retirementYear) ||
    input.retirementYear < currentYear ||
    input.retirementYear > currentYear + 100
  ) {
    errors["retirement-year"] = "Enter a four-digit retirement year.";
  } else {
    retirementDate = retirementDateForYear(input.retirementYear);
    if (dateNumber(retirementDate) <= dateNumber(today)) {
      errors["retirement-year"] =
        "Choose a retirement year whose January 31 date is in the future.";
    }
  }

  if (
    !Number.isInteger(input.birthMonth) ||
    input.birthMonth < 1 ||
    input.birthMonth > 12
  ) {
    errors["birth-month"] = "Choose your birth month.";
  }
  if (
    !Number.isInteger(input.birthYear) ||
    input.birthYear < 1900 ||
    input.birthYear > currentYear
  ) {
    errors["birth-year"] = "Enter a valid four-digit birth year.";
  } else if (
    retirementDate &&
    Number.isInteger(input.birthMonth) &&
    input.birthMonth >= 1 &&
    input.birthMonth <= 12
  ) {
    const age = ageAtRetirement({
      birthYear: input.birthYear,
      birthMonth: input.birthMonth,
      retirementYear: input.retirementYear,
    });
    if (age < 18 || age > 100) {
      errors["birth-year"] =
        "Enter a birth year that gives a retirement age from 18 through 100.";
    }
  }
  if (input.regularServiceRetirement === undefined) {
    errors["regular-retirement"] = "Choose Yes or No.";
  }
  if (input.continuousGfd === undefined) {
    errors["continuous-gfd"] = "Choose Yes or No.";
  }

  validateService(input.currentGfd, "gfd-years", "gfd-months", errors);

  if (input.otherLgers === undefined) {
    errors["other-lgers"] = "Choose Yes or No.";
  } else if (input.otherLgers !== null) {
    validateService(
      input.otherLgers,
      "other-years",
      "other-months",
      errors,
    );
  }

  if (!input.sick || !["current", "retirement"].includes(input.sick.mode)) {
    errors["sick-mode"] = "Choose current or retirement sick hours.";
  } else if (!Number.isFinite(input.sick.hours) || input.sick.hours < 0) {
    errors["sick-hours"] = "Enter nonnegative sick hours.";
  } else if (
    input.sick.mode === "current" &&
    input.currentGfd &&
    isNonnegativeWhole(input.currentGfd.years) &&
    isNonnegativeWhole(input.currentGfd.months)
  ) {
    const currentWorkedYears =
      toServiceYears(input.currentGfd) +
      (input.otherLgers && input.otherLgers !== undefined
        ? toServiceYears(input.otherLgers)
        : 0);
    if (currentWorkedYears <= 0) {
      errors["sick-hours"] =
        "Enter current GFD or other LGERS service to project current sick hours.";
    }
  }

  if (
    !input.benefitService ||
    !["calculated", "manual"].includes(input.benefitService.mode)
  ) {
    errors["benefit-service-mode"] =
      "Choose calculated or separately entered creditable years of service.";
  } else if (input.benefitService.mode === "manual") {
    validateService(
      input.benefitService,
      "benefit-years",
      "benefit-months",
      errors,
    );
    if (
      !errors["benefit-years"] &&
      !errors["benefit-months"] &&
      toServiceYears(input.benefitService) <= 0
    ) {
      errors["benefit-years"] =
        "Enter creditable years of service greater than zero.";
    }
  }

  if (
    !input.salary ||
    !["anticipated", "structure"].includes(
      input.salary.mode,
    )
  ) {
    errors["salary-mode"] = "Choose a salary estimate method.";
  } else if (input.salary.mode === "structure") {
    const current = SALARY_STRUCTURE[input.salary.currentRank];
    const retirement = SALARY_STRUCTURE[input.salary.retirementRank];
    if (!current) {
      errors["current-rank"] = "Choose your current rank.";
    } else if (current.type === "nonexempt") {
      if (
        !Number.isInteger(input.salary.currentStep) ||
        input.salary.currentStep < 1 ||
        input.salary.currentStep > current.steps.length
      ) {
        errors["current-step"] = "Choose your current salary step.";
      }
    } else if (
      !Number.isFinite(input.salary.currentSalary) ||
      input.salary.currentSalary <= 0 ||
      input.salary.currentSalary > current.rangeMax
    ) {
      errors["current-exempt-salary"] =
        "Enter your current annual salary within the published range.";
    }

    if (!retirement) {
      errors["retirement-rank"] = "Choose your expected retirement rank.";
    } else if (current && retirement.grade < current.grade) {
      errors["retirement-rank"] =
        "Choose your current rank or a higher retirement rank.";
    }

    if (
      (current?.type === "exempt" || retirement?.type === "exempt") &&
      (!Number.isFinite(input.salary.meritRate) || input.salary.meritRate < 0)
    ) {
      errors["merit-rate"] = "Enter an expected merit rate of 0% or more.";
    }

    if (current && retirement && current !== retirement) {
      if (
        !Number.isInteger(input.salary.promotionMonth) ||
        input.salary.promotionMonth < 1 ||
        input.salary.promotionMonth > 12
      ) {
        errors["promotion-month"] = "Choose a promotion month.";
      }
      if (
        !Number.isInteger(input.salary.promotionYear) ||
        input.salary.promotionYear < 1900
      ) {
        errors["promotion-year"] = "Enter a four-digit promotion year.";
      } else if (
        retirementDate &&
        Number.isInteger(input.salary.promotionMonth) &&
        input.salary.promotionMonth >= 1 &&
        input.salary.promotionMonth <= 12
      ) {
        const promotionDate = new Date(
          input.salary.promotionYear,
          input.salary.promotionMonth - 1,
          1,
        );
        if (
          dateNumber(promotionDate) <= dateNumber(today) ||
          dateNumber(promotionDate) >= dateNumber(retirementDate)
        ) {
          errors["promotion-year"] =
            "Enter a promotion month and year after today and before retirement.";
        }
      }
    }
  } else if (input.salary.mode === "anticipated") {
    const field = "anticipated-salary";
    if (!Number.isFinite(input.salary.amount) || input.salary.amount <= 0) {
      errors[field] = "Enter an annual salary greater than zero.";
    }
  }

  return errors;
}
