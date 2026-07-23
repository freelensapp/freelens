/**
 * Copyright (c) Freelens Authors. All rights reserved.
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

// 400 Gregorian years have exactly 146097 days and 4800 months. moment used
// these ratios to normalize a duration into years/months/days; we reproduce
// them so the output matches the previous moment-based implementation.
const DAYS_TO_MONTHS = 4800 / 146097;
const MONTHS_TO_DAYS = 146097 / 4800;
const DAYS_PER_YEAR = 146097 / 400;

interface DurationParts {
  asSeconds: number;
  asMinutes: number;
  asHours: number;
  asDays: number;
  asYears: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
}

/**
 * Breaks a millisecond duration into the total and remainder components that
 * moment's `Duration` exposed, using moment's normalization rules.
 */
function getDurationParts(timeValue: number): DurationParts {
  const totalSeconds = Math.floor(timeValue / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const monthsFromDays = Math.floor(totalDays * DAYS_TO_MONTHS);

  return {
    asSeconds: timeValue / 1000,
    asMinutes: timeValue / 60000,
    asHours: timeValue / 3_600_000,
    asDays: timeValue / 86_400_000,
    asYears: timeValue / 86_400_000 / DAYS_PER_YEAR,
    seconds: totalSeconds % 60,
    minutes: totalMinutes % 60,
    hours: totalHours % 24,
    days: totalDays - Math.ceil(monthsFromDays * MONTHS_TO_DAYS),
  };
}

/**
 * This function formats durations in a more human readable form.
 * @param timeValue the duration in milliseconds to format
 */
export function formatDuration(timeValue: number, compact = true) {
  const duration = getDurationParts(timeValue);
  const seconds = Math.floor(duration.asSeconds);
  const separator = compact ? "" : " ";

  if (seconds < 0) {
    return "0s";
  } else if (seconds < 60 * 2) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(duration.asMinutes);

  if (minutes < 10) {
    const seconds = duration.seconds;

    return getMeaningfulValues([minutes, seconds], ["m", "s"], separator);
  } else if (minutes < 60 * 3) {
    if (!compact) {
      return getMeaningfulValues([minutes, duration.seconds], ["m", "s"]);
    }

    return `${minutes}m`;
  }

  const hours = Math.floor(duration.asHours);

  if (hours < 8) {
    const minutes = duration.minutes;

    return getMeaningfulValues([hours, minutes], ["h", "m"], separator);
  } else if (hours < 48) {
    if (compact) {
      return `${hours}h`;
    } else {
      return getMeaningfulValues([hours, duration.minutes], ["h", "m"]);
    }
  }

  const days = Math.floor(duration.asDays);

  if (days < 8) {
    const hours = duration.hours;

    if (compact) {
      return getMeaningfulValues([days, hours], ["d", "h"], separator);
    } else {
      return getMeaningfulValues([days, hours, duration.minutes], ["d", "h", "m"]);
    }
  }
  const years = Math.floor(duration.asYears);

  if (years < 2) {
    if (compact) {
      return `${days}d`;
    } else {
      return getMeaningfulValues([days, duration.hours, duration.minutes], ["d", "h", "m"]);
    }
  } else if (years < 8) {
    const days = duration.days;

    if (compact) {
      return getMeaningfulValues([years, days], ["y", "d"], separator);
    }
  }

  if (compact) {
    return `${years}y`;
  }

  return getMeaningfulValues([years, duration.days, duration.hours, duration.minutes], ["y", "d", "h", "m"]);
}

function getMeaningfulValues(values: number[], suffixes: string[], separator = " ") {
  return values
    .map((a, i): [number, string] => [a, suffixes[i]])
    .filter(([dur]) => dur > 0)
    .map(([dur, suf]) => dur + suf)
    .join(separator);
}
