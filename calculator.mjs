export const HOURS_PER_SICK_MONTH = 160;
export const MAX_SICK_ACCRUAL_PER_YEAR = 96;

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

  const historicalNetRate = Math.min(
    currentHours / currentWorkedYears,
    MAX_SICK_ACCRUAL_PER_YEAR,
  );

  return currentHours + historicalNetRate * remainingYears;
}

export function sickHoursToServiceMonths(hours) {
  if (hours < 0) {
    throw new RangeError("Sick hours cannot be negative.");
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

export const RANK_SALARIES = Object.freeze({
  srff: { label: "SrFF", salary: 56_434 },
  engineerInspector: {
    label: "Engineer / Sr Fire Insp.",
    salary: 66_980,
  },
  captain: {
    label: "Captain / Asst. Fire Marshal",
    salary: 80_327,
  },
  battalionChief: {
    label: "Batt. Chief / Dep. Fire Marshal",
    salary: 94_040,
  },
  assistantChief: {
    label: "Assistant Fire Chief / Fire Marshal",
    salary: 120_373,
  },
  deputyChief: { label: "Deputy Fire Chief", salary: 135_395 },
  fireChief: { label: "Fire Chief", salary: 180_183 },
});

export const RAISE_RATE = 0.04;
export const BENEFIT_MULTIPLIER = 0.0085;
export const CHECKS_PER_YEAR = 26;

function dateNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function retirementDateForYear(year) {
  return new Date(year, 0, 31);
}

export function countJulyRaises({ baseDate, retirementDate }) {
  const base = dateNumber(baseDate);
  const retirement = dateNumber(retirementDate);
  let count = 0;

  for (
    let year = baseDate.getFullYear();
    year <= retirementDate.getFullYear();
    year += 1
  ) {
    const raise = Date.UTC(year, 6, 1);
    if (raise > base && raise < retirement) {
      count += 1;
    }
  }

  return count;
}

export function projectSalary({
  mode,
  amount,
  rank,
  promotionMonth,
  promotionYear,
  today,
  retirementDate,
}) {
  if (mode === "anticipated") {
    return amount;
  }

  let baseSalary = amount;
  let baseDate = today;

  if (mode === "rank") {
    baseSalary = RANK_SALARIES[rank].salary;
    baseDate = new Date(promotionYear, promotionMonth - 1, 1);
  }

  const raises = countJulyRaises({ baseDate, retirementDate });
  return baseSalary * (1 + RAISE_RATE) ** raises;
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
  return projectSalary({
    ...input.salary,
    today,
    retirementDate: retirementDateForYear(input.retirementYear),
  });
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
    !["anticipated", "current", "rank"].includes(input.salary.mode)
  ) {
    errors["salary-mode"] = "Choose a salary estimate method.";
  } else if (
    input.salary.mode === "anticipated" ||
    input.salary.mode === "current"
  ) {
    const field =
      input.salary.mode === "anticipated"
        ? "anticipated-salary"
        : "current-salary";
    if (!Number.isFinite(input.salary.amount) || input.salary.amount <= 0) {
      errors[field] = "Enter an annual salary greater than zero.";
    }
  } else {
    if (!RANK_SALARIES[input.salary.rank]) {
      errors.rank = "Choose a retirement rank.";
    }
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
      dateNumber(
        new Date(
          input.salary.promotionYear,
          input.salary.promotionMonth - 1,
          1,
        ),
      ) >= dateNumber(retirementDate)
    ) {
      errors["promotion-year"] =
        "Enter a promotion month and year before retirement.";
    }
  }

  return errors;
}
