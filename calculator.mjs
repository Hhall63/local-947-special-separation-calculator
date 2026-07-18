export const HOURS_PER_SICK_MONTH = 160;
export const MAX_SICK_ACCRUAL_PER_YEAR = 96;

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

export function yearFractionActualActual(startDate, endDate) {
  let cursor = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  if (end <= cursor) {
    throw new RangeError("End date must be after start date.");
  }

  let fraction = 0;

  while (cursor < end) {
    const year = cursor.getUTCFullYear();
    const nextYear = new Date(Date.UTC(year + 1, 0, 1));
    const segmentEnd = nextYear < end ? nextYear : end;
    const days = (segmentEnd - cursor) / DAY_MS;
    fraction += days / (isLeapYear(year) ? 366 : 365);
    cursor = segmentEnd;
  }

  return fraction;
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

  const fullMonths = Math.floor(hours / HOURS_PER_SICK_MONTH);
  const remainingHours = hours - fullMonths * HOURS_PER_SICK_MONTH;
  return fullMonths + (remainingHours >= 1 ? 1 : 0);
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

export function evaluateEligibility({
  retirementAge,
  regularServiceRetirement,
  continuousGfd,
  projectedGfdYears,
  eligibilityServiceYears,
}) {
  const gfdShare =
    eligibilityServiceYears > 0
      ? projectedGfdYears / eligibilityServiceYears
      : 0;
  const unreduced =
    eligibilityServiceYears >= 30 ||
    (retirementAge >= 60 && eligibilityServiceYears >= 25);

  const checks = [
    {
      key: "under-62",
      label: "Under age 62 on the January 31 retirement date",
      passed: retirementAge < 62,
    },
    {
      key: "regular-service",
      label: "Regular LGERS service retirement, not disability retirement",
      passed: regularServiceRetirement === true,
    },
    {
      key: "continuous-gfd",
      label:
        "At least five continuous years as a sworn Greensboro firefighter immediately before retirement",
      passed: continuousGfd === true && projectedGfdYears >= 5,
    },
    {
      key: "gfd-share",
      label: "At least 50% of total creditable service is sworn GFD service",
      passed: gfdShare >= 0.5,
    },
    {
      key: "unreduced",
      label:
        "Unreduced LGERS service retirement: 30 years, or age 60 with 25 years",
      passed: unreduced,
    },
  ];

  return {
    eligible: checks.every((check) => check.passed),
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

export function calculateEstimate(input, today = new Date()) {
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
  const retirementAge = ageAtRetirement({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });
  const eligibility = evaluateEligibility({
    retirementAge,
    regularServiceRetirement: input.regularServiceRetirement,
    continuousGfd: input.continuousGfd,
    projectedGfdYears: projected.projectedGfdYears,
    eligibilityServiceYears,
  });
  const benefitServiceYears =
    input.benefitService.mode === "manual"
      ? toServiceYears(input.benefitService)
      : eligibilityServiceYears;
  const retirementSalary = projectSalary({
    ...input.salary,
    today,
    retirementDate,
  });
  const coveredMonths = coveredBenefitMonths({
    birthYear: input.birthYear,
    birthMonth: input.birthMonth,
    retirementYear: input.retirementYear,
  });

  return {
    dates: { retirementDate, remainingYears: projected.remainingYears },
    service: {
      currentGfdYears,
      otherLgersYears,
      projectedGfdYears: projected.projectedGfdYears,
      retirementSickHours,
      sickServiceMonths,
      sickServiceYears,
      eligibilityServiceYears,
      benefitServiceYears,
    },
    retirementAge,
    eligibility,
    retirementSalary,
    coveredMonths,
    benefit: eligibility.eligible
      ? calculateBenefit({
          benefitServiceYears,
          retirementSalary,
          coveredMonths,
        })
      : null,
  };
}
