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
